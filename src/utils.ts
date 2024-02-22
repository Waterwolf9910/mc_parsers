/**
 * An XZ position
 * 
 * Used for region and chunk positions
 */
export interface XZPosition {
    x: number,
    z: number
}

/**
 * An XYZ Position
 * 
 * Used for block positions
 */
export interface XYZPosition {
    x: number,
    y: number,
    z: number
}

/**
 * A List of known NBT and Compression Magic Headers
 * 
 * *all nbt files start with 0x0a00*
 */
export const known_formats = [
    '0x7801',
    '0x785e',
    '0x789c',
    '0x78da',
    '0x1f8b',
    '0x0a00'
]

/**The version of minecraft to format for*/
export let version = "1.20"

/**Check to throw on errors within execution */
export let throw_on_errors = true

/**
 * @package
 */
export let send_error = <T>(msg: string | Error, ret: T = undefined as T) => {
    if (throw_on_errors) {
        let err = msg
        if (typeof msg == 'string') {
            err = new Error(msg)
            Error.captureStackTrace(err, send_error)
        }
        
        throw err
    }
    console.error(msg)
    return ret;
}

/**
 * Converts a block position to a chunk position
 * @param pos the block position
 * @returns the chunk position
 */
export let blockPosToChunk = (pos: XYZPosition): XZPosition => {
    return {
        x: Math.floor(pos.x / 16),
        z: Math.floor(pos.z / 16)
    }
}

/**
 * Converts a chunk position to its region position
 * @param pos the chunk positoin
 * @returns the region position
 */
export let chunkPosToRegion = (pos: XZPosition): XZPosition => {
    return {
        x: Math.floor(pos.x / 32),
        z: Math.floor(pos.z / 32)
    }
}

/**
 * Converts a bit int array to a Buffer
 * @param array inital bigint array
 * @returns a Buffer
 */
export let bigintToBuf = (array: bigint[]): Buffer => {
    return Buffer.from((new BigInt64Array(array)).buffer).swap64()
}

/**
 * JSON.stringify with a bigint replacer
 * @see JSON.stringify
 */
export let jsonify = (value: any) => {
    return JSON.stringify(value, (k, v) => {
        if (typeof v == 'bigint') {
            return v.toString()
        }
        return v
    }, 4)
}

/**
 * Converts a block position to a palette index
 * @param pos the block position
 * @returns a palette index
 */
export let getIndexFromBlockCoord = (pos: XYZPosition): number => {
    return (pos.y * 16 * 16 + pos.z * 16 + pos.x) % 4096 + 1
}

export let x2 = (pos: XYZPosition) => {
    // let pos2 = blockPosToChunk(pos)
    // let section_y = pos.y % 16
    // console.log(section_y)
    // return {x: pos.x - (pos2.x << 4), y: section_y, z: pos.z - (pos2.z << 4)}
    // return (pos.y >> 8) | (pos.z >> 4) | pos.x
    return (pos.y * 16*16 + pos.z * 16 + pos.x) % 4096 + 1
}


export let getMajorVer = () => parseInt(version.split('.')[0]) || 1
export let getMinorVer = () => parseInt(version.split('.')[1]) || 20
