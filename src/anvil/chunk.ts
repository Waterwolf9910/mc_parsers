import * as nbt from "../nbt.js"
import * as utils from "../utils.js"

export interface BlockStateData {
    data: nbt.LongArrayTag,
    palette: nbt.ListTag<nbt.NBTTagType.COMPOUND>
}

/**
 * https://minecraft.wiki/w/Chunk_format
 */
export class Chunk {
    public static readonly BLOCKS_PER_CHUNK_SECTION = 16*16*16
    private nbt: nbt.CompoundTag
    private data_ver: number = 0
    public size: number = 0
    public readonly maxY: number = 16
    public readonly minY: number = 0
    constructor(buf: Buffer) {
        let header = '0x' + buf[5].toString(16).padStart(2, '0') + buf[6].toString(16).padStart(2, '0')
        if (!utils.known_formats.includes(header)) { //@ts-ignore
            return utils.sendError("Unknown nbt header", {});
        }
        this.nbt = <nbt.CompoundTag> nbt.NBTReader.read(buf.subarray(5, 8192 * 2))
        this.data_ver = <number> this.nbt.value.DataVersion.value
        this.size = buf.readUInt32BE(0)
        if (utils.getMinorVer() < 16) {
            this.nbt = <nbt.CompoundTag> this.nbt.value.Level
        } else {
            this.minY = <number> this.nbt.value.yPos.value
            this.maxY = <number> this.sections.value[this.sections.value.length -1].value.Y!.value
        }
        // let ntohp = (n:number) => n.toString(16).padStart(2, '0')
        // let ntoh = (s:number) => '0x' + ntohp(s)
        // console.log(buf.readInt32BE(1), this.size, buf.readInt32BE(), buf.readUint32BE(), parseInt('0x' + ntohp(buf[0]) + ntohp(buf[1]) + ntohp(buf[2]) + ntohp(buf[3])) , parseInt('0x' + ntohp(buf[0]) + ntohp(buf[1]) + ntohp(buf[2]) + ntohp(buf[3]) + ntohp(buf[4])))
        // console.log(ntoh(buf[1 + this.size + 10]), ntoh(buf[1 + this.size + 9]), ntoh(buf[1 + this.size + 8]), ntoh(buf[1 + this.size + 7]), ntoh(buf[1 + this.size + 6]) , ntoh(buf[1 + this.size + 5]), ntoh(buf[1 + this.size + 4]), ntoh(buf[1 + this.size + 3]), ntoh(buf[1 + this.size + 2]), ntoh(buf[1 + this.size + 1]), ntoh(buf[1 + this.size]))
        // let buf2 = zlib.unzipSync(buf.subarray(5, 8192))
        // let buf3 = zlib.inflateSync(buf.subarray(8192 + 5, 8192*2))
        // console.log(buf2, buf3)
        // debugger;
        // let _buf: Buffer
        // if (header != '0x0a00') {
        //     _buf = zlib.unzipSync(buf.subarray(5, this.size))
        // }
        // _buf ??= buf.subarray(5, this.size);

    }
    
    public getBlock() {

    }

    public getSortedSections(): nbt.CompoundTag[] {
        if (utils.getMajorVer() <= 1 && utils.getMinorVer() <= 16) {
            return utils.sendError("Version's lower than 1.16 not yet supported", [])!
        }
        let tags = this.sections.value
            .map((c, i) => {
                return {y: c.value.Y as nbt.ByteTag | undefined, i}
            })
            .filter(c => c.y)
        return tags.sort((a, b) => a.y?.value! - b.y?.value!).map(v => this.sections.value[v.i])
    }

    public getBlockStates(need_palette = false) {
        let data: { [section_y: number]: BlockStateData} = {}
        let sections = this.getSortedSections().filter(v => v.value.block_states)
        for (let section of sections) {
            let block_states = <nbt.CompoundTag> section.value.block_states
            if (need_palette && !block_states.value.palette) {
                continue;
            }
            data[<number> section.value.Y.value] = {
                data: <nbt.LongArrayTag> block_states.value.data,
                palette: <nbt.ListTag<nbt.NBTTagType.COMPOUND>> block_states.value.palette
            }
        }

        return data
    }

    public test(y: number) {
        // let ss = this.getSortedSections()
        // let s = ss.find(v => (<nbt.ByteTag> v.value.Y).value == y)
        let block_states = this.getBlockStates(true)[y]
        if (!block_states) { return }
        let names = block_states.palette.value.filter(v => v.value.name)
    }
    
    public getBlocks<T = number>(block_states: BlockStateData, convert: (x: number) => T = x => x as T, limit?: number): T[] {
        if (!block_states.data) {
            return Array(Math.min(limit ?? Chunk.BLOCKS_PER_CHUNK_SECTION, Chunk.BLOCKS_PER_CHUNK_SECTION)).fill(0)
        }
        let len = block_states.palette.value.length - 1
        let bpe = Math.max(Math.ceil(Math.log2(len +1)), 4)
        // let bpe = Math.max(len.toString(2).length, 4)
        let mask = BigInt((1 << bpe) - 1)
        let r: T[] = []
        let _limit = Math.min(limit ?? Chunk.BLOCKS_PER_CHUNK_SECTION, Chunk.BLOCKS_PER_CHUNK_SECTION)

        let remainder = ''
        for (let i = 0; i < block_states.data.value.length; ++i) {
            if (r.length >= _limit) {
                break;
            }
            let data = block_states.data.value[i]
            if (utils.getMinorVer() >= 16) {
                for (let j = 0n; j < Math.floor(64 / bpe); ++j) {
                    r.push(convert(parseInt(
                        ((data >> (j * BigInt(bpe) + 64n % 4n)) & mask)
                            .toString())))
                    if (r.length >= _limit) {
                        break;
                    }
                }
            } else { 
                let val = remainder + data.toString(2).padStart(64 - remainder.length, '0')
                while (val.length > bpe) {
                    r.push(convert(
                        parseInt(val.slice(0, bpe), 2)
                    ))
                    val = val.slice(bpe)
                }
                remainder = val
            }
        }
        return r;
    }
    
    public get data_version(): number {
        return <number> this.nbt.value.DataVersion.value
    }

    public get position(): utils.XZPosition {
        return {
            x: (<nbt.IntTag> this.nbt.value.xPos).value,
            z: (<nbt.IntTag> this.nbt.value.zPos).value
        }
    }

    public get status(): string {
        return <string> this.nbt.value.Status.value
    }

    public get last_update(): bigint {
        return <bigint> this.nbt.value.LastUpdate.value
    }

    public get sections(): nbt.ListTag<nbt.NBTTagType.COMPOUND> {
        return <nbt.ListTag<nbt.NBTTagType.COMPOUND>> this.nbt.value.sections
    }

    public get block_entities(): nbt.ListTag<nbt.NBTTagType.COMPOUND> {
        return <nbt.ListTag<nbt.NBTTagType.COMPOUND>> this.nbt.value.block_entities
    }

    public get heightmaps(): nbt.CompoundTag {
        return <nbt.CompoundTag> this.nbt.value.Heightmaps
    }

    public get block_ticks(): nbt.ListTag<nbt.NBTTagType.COMPOUND> {
        return <nbt.ListTag<nbt.NBTTagType.COMPOUND>> this.nbt.value.block_ticks
    }

    public get fluid_ticks(): nbt.ListTag<nbt.NBTTagType.COMPOUND> {
        return <nbt.ListTag<nbt.NBTTagType.COMPOUND>> this.nbt.value.fluid_ticks
    }

    public get inhabited_time(): bigint {
        return <bigint> this.nbt.value.InhabitedTime.value
    }

    public get post_processing(): nbt.ListTag<nbt.NBTTagType.LIST> {
        return <nbt.ListTag<nbt.NBTTagType.LIST>> this.nbt.value.PostProcessing 
    }

    public get structures(): nbt.CompoundTag {
        return <nbt.CompoundTag> this.nbt.value.structures
    }

}
