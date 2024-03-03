import * as utils from "../utils.js"
import * as chunk from "./chunk.js"

export class Region {
    /** 2, 1024 long 4-byte ints */
    public readonly header_length = 2 * 1024 * 4
    /** Buffer containing locations and timestamps */
    private header_buf: Buffer
    /**
     * A map of chunks by their coordinates
     * 
     * Keys are the chunk's world pos converted positive -> `(Math.abs(z) << 16) | Math.abs(x)`
     * 
     * Recover by doing `z = key >> 16; x = key & 0xff` (negativity will be lost)
     */
    public readonly chunks: { [key: number]: chunk.Chunk} = {} // TODO: posibly switch to [key: chunk_status]: {[key: number]: chunk.Chunk}

    private position: utils.XZPosition
    constructor(buf: Buffer, full_only = true) {
        this.header_buf = buf.subarray(0, this.header_length)
        let pos = this.header_length;
        while (true) {
            try {
                let _chunk = new chunk.Chunk(buf.subarray(pos))
                this.position ??= utils.chunkPosToRegion(_chunk.position)
                let index = (Math.abs(_chunk.position.z) << 16) | Math.abs(_chunk.position.x)
                if ((!full_only || _chunk.status == 'full' || _chunk.status == 'minecraft:full') && !this.chunks[index]) {
                    this.chunks[index] = _chunk
                }
            } catch {}
            pos += 4096
            if (pos >= buf.length) {
                break;
            }
        }
        if (Object.keys(this.chunks).length == 0) {
            //@ts-ignore
            return utils.sendError("No chunks found in this region", {})
        }
    }

    public getChunkData(pos: utils.XZPosition): chunk.Chunk {
        return this.chunks[(Math.abs(pos.z) << 16) | Math.abs(pos.x)]
    }

    public isEmpty(): boolean {
        return Object.keys(this.chunks).length == 0
    }
}
