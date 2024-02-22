import zlib = require('zlib')
import * as utils from "./utils"

export enum NBTTagType {
    END = 0,
    BYTE,
    SHORT,
    INT,
    LONG,
    FLOAT,
    DOUBLE,
    BYTE_ARRAY,
    STRING,
    LIST,
    COMPOUND,
    INT_ARRAY,
    LONG_ARRAY
}

interface RawNBTTag {
    type: NBTTagType,
    name?: string,
    value?: any
}

export interface ByteTag extends RawNBTTag {
    type: NBTTagType.BYTE,
    value: number
}

export interface ShortTag extends RawNBTTag {
    type: NBTTagType.SHORT,
    value: number
}

export interface IntTag extends RawNBTTag {
    type: NBTTagType.INT,
    value: number
}

export interface LongTag extends RawNBTTag {
    type: NBTTagType.LONG,
    value: bigint
}

export interface FloatTag extends RawNBTTag {
    type: NBTTagType.FLOAT,
    value: number
}

export interface DoubleTag extends RawNBTTag {
    type: NBTTagType.DOUBLE,
    value: number
}

export interface ByteArrayTag extends RawNBTTag {
    type: NBTTagType.BYTE_ARRAY,
    value: number[]
}

export interface StringTag extends RawNBTTag {
    type: NBTTagType.STRING,
    value: string
}
export interface ListTag<T extends NBTTagType> extends RawNBTTag {
    type: NBTTagType.LIST,
    list_type: T
    value: Extract<NBTTag, {type: T}>[]
}

export interface CompoundTag extends RawNBTTag {
    type: NBTTagType.COMPOUND,
    value: {[key: string]: NBTTag}
}

export interface IntArrayTag extends RawNBTTag {
    type: NBTTagType.INT_ARRAY,
    value: number[]
}

export interface LongArrayTag extends RawNBTTag {
    type: NBTTagType.LONG_ARRAY,
    value: bigint[]
}

export interface EmptyTag extends RawNBTTag {
    type: NBTTagType.END,
    value?: never
    name?: never
}

export type NBTTag = ByteTag | ShortTag | IntTag | LongTag | FloatTag | DoubleTag | ByteArrayTag | StringTag | ListTag<NBTTagType> | CompoundTag | IntArrayTag | LongArrayTag | EmptyTag
export type TagInfo = { type: NBTTagType, name: string, list_type?: NBTTagType }

/**
 * A class to read a nbt buffer and decode it
 * 
 * Each byte returned is signed, do `byte & 0xFF` to get unsigned version
 */
export class NBTReader {

    /** The buffer containing the NBT file */
    private buf: Buffer
    /** The current position in the buffer */
    public pos = 0

    constructor (buf: Buffer) {
        let header = '0x' + buf[0].toString(16).padStart(2, '0') + buf[1].toString(16).padStart(2, '0')
        if (!utils.known_formats.includes(header)) {
            //@ts-ignore
            return utils.send_error("Unknown nbt file", {});
        }
        if (header != '0x0a00') {
            this.buf = zlib.unzipSync(buf)
            return this
        }
        this.buf = buf;
    }

    /**
     * Reads the buffer to get the tag name and type
     * @returns TagInfo
     */
    readTagInfo(): TagInfo {
        let list_type: NBTTagType | undefined = undefined
        // let name: string = ''
        let type = this.buf[this.pos]
        this.pos++
        if (type == NBTTagType.END) {
            return {
                type,
                name: '',
                list_type: undefined
            }
        }
        let name_len = this.buf.readInt16BE(this.pos) // Name is a 16 bit (2 byte) int
        this.pos += 2
        let name = String.fromCharCode(...this.buf.subarray(this.pos, this.pos + name_len)) // Convert a section of the buffer to string
        // for (let i = 0; i < name_len; ++i) {
        //     name += String.fromCharCode(this.buf[this.pos + i]) // Convert
        // }
        this.pos += name_len

        // Get the type of list
        if (type == NBTTagType.LIST) {
            list_type = this.buf.readInt8(this.pos)
            this.pos++
        }

        return {
            name,
            type,
            list_type
        }
    }

    // read_amt: {[key: number]: {pushby: number, name: string}} = {
    //     [NBTTagType.BYTE]: { pushby: 1, name: 'readInt8'},
    //     [NBTTagType.SHORT]: { pushby: 2, name: 'readInt16BE' },
    //     [NBTTagType.INT]: { pushby: 4, name: 'readInt32BE' },
    //     [NBTTagType.FLOAT]: { pushby: 4, name: 'readFloatBE' },
    //     [NBTTagType.LONG]: { pushby: 8, name: 'readBigInt64BE' },
    //     [NBTTagType.DOUBLE]: { pushby: 8, name: 'readDoubleBE' }
    // }
    parse_map: {[key: number]: (read_info?: boolean) => NBTTag} = {
        [NBTTagType.BYTE]: (...a) => this.readByte(...a),
        [NBTTagType.SHORT]: (...a) => this.readShort(...a),
        [NBTTagType.INT]: (...a) => this.readInt(...a),
        [NBTTagType.FLOAT]: (...a) => this.readFloat(...a),
        [NBTTagType.LONG]: (...a) => this.readLong(...a),
        [NBTTagType.DOUBLE]: (...a) => this.readDouble(...a),
        [NBTTagType.STRING]: (...a) => this.readString(...a),
        [NBTTagType.COMPOUND]: (...a) => this.readCompound(...a),
        [NBTTagType.BYTE_ARRAY]: (...a) => this.readByteArray(...a),
        [NBTTagType.INT_ARRAY]: (...a) => this.readIntArray(...a),
        [NBTTagType.LONG_ARRAY]: (...a) => this.readLongArray(...a),
    }

    /**
     * Gets the byte at the current location.
     * 
     * DOES **NOT** PUSH READ POSITION
     * @returns The number and hex string  of the current byte
     */
    public readRaw(): {str: string, num: number} {
        return {
            str: '0x' + this.buf[this.pos].toString(16),
            num: this.buf.readInt8(this.pos)
        }
    }

    public readByte(read_info = false): ByteTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.BYTE
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.BYTE) {
                return utils.send_error("The next component is not a byte", {type: NBTTagType.BYTE, value: 0, name: ''})
            }
        }

        return {
            name: info.name,
            type: NBTTagType.BYTE,
            value: this.buf.readInt8(this.pos++)
        }
    }

    public readShort(read_info = false): ShortTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.SHORT
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.SHORT) {
                return utils.send_error("The next component is not a short", { type: NBTTagType.SHORT, value: 0, name: '' })
            }
        }

        let value = this.buf.readInt16BE(this.pos)
        this.pos += 2 //this.read_amt[NBTTagType.SHORT].pushby
        
        return {
            name: info.name,
            type: NBTTagType.SHORT,
            value
        }
    }

    public readInt(read_info = false): IntTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.INT
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.INT) {
                return utils.send_error("The next component is not a int", { type: NBTTagType.INT, value: 0, name: '' })
            }
        }

        let value = this.buf.readInt32BE(this.pos)
        this.pos += 4
        
        return {
            name: info.name,
            type: NBTTagType.INT,
            value
        }
    }

    public readFloat(read_info = false): FloatTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.FLOAT
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.FLOAT) {
                return utils.send_error("The next component is not a float", { type: NBTTagType.FLOAT, value: 0, name: '' })
            }
        }

        let value = this.buf.readFloatBE(this.pos)
        this.pos += 4

        return {
            name: info.name,
            type: NBTTagType.FLOAT,
            value
        }
    }
    
    public readLong(read_info = false): LongTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.LONG
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.LONG) {
                return utils.send_error("The next component is not a long", { type: NBTTagType.LONG, value: 0n, name: '' })
            }
        }

        let value = this.buf.readBigInt64BE(this.pos)
        this.pos += 8

        return {
            name: info.name,
            type: NBTTagType.LONG,
            value
        }
    }

    public readDouble(read_info = false): DoubleTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.DOUBLE
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.DOUBLE) {
                return utils.send_error("The next component is not a double", { type: NBTTagType.DOUBLE, value: 0, name: '' })
            }
        }

        let value = this.buf.readDoubleBE(this.pos)
        this.pos += 8

        return {
            name: info.name,
            type: NBTTagType.DOUBLE,
            value
        }
    }

    /**
     * Reads the string from the current position
     * @param read_info sets if the function will read info from pos and populate name
     * @returns A String NBT Tag
     */
    public readString(read_info = false): StringTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.STRING
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.STRING) {
                return utils.send_error("The next component is not a string", { type: NBTTagType.STRING, value: '', name: '' })
            }
        }

        let str_length = this.buf.readInt16BE(this.pos) // Get the length of the string
        this.pos += 2
        let value = String.fromCharCode(...this.buf.subarray(this.pos, this.pos + str_length))
        // for (let i = 0; i < str_length; ++i) {
        //     value += this.buf[this.pos + i] // Iterate through the bytes to decode the string
        // }
        this.pos += str_length

        return {
            name: info.name,
            type: NBTTagType.STRING,
            value
        }
    }

    public readList<T extends NBTTagType>(type: T, read_info = false): ListTag<T> {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.LIST
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.LIST) {
                return utils.send_error("The next component is not a list", { type: NBTTagType.LIST, list_type: <T> NBTTagType.END, value: [], name: '' })
            }
        }

        let length = this.buf.readInt32BE(this.pos)
        this.pos += 4
        let value: ListTag<T>['value'] = []
        if (type == NBTTagType.LIST) {
            for (let i = 0; i < length; i++) {
                //@ts-ignore
                value.push(this.readList(this.readByte().value))
            }
        } else {
            for (let i = 0; i < length; i++) {
                if (type == NBTTagType.COMPOUND) {
                    //@ts-ignore
                    value.push(this.readCompound(false, 1))
                } else {
                    value.push(this.parse_map[type]() as typeof value[0])
                }
            }
        }

        return {
            type: NBTTagType.LIST,
            list_type: type,
            name: info.name,
            value: value
        }
    }

    public readByteArray(read_info = false): ByteArrayTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.BYTE_ARRAY
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.BYTE_ARRAY) {
                return utils.send_error("The next component is not a byte array", { type: NBTTagType.BYTE_ARRAY, value: [], name: '' })
            }
        }

        let length = this.buf.readInt32BE(this.pos)
        this.pos += 4

        let value: number[] = []
        for (let i = 0; i < length; ++i) {
            value.push(this.readByte().value)
        }

        return {
            name: info.name,
            type: NBTTagType.BYTE_ARRAY,
            value
        }
    }

    public readIntArray(read_info = false): IntArrayTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.INT_ARRAY
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.INT_ARRAY) {
                return utils.send_error("The next component is not a int array", { type: NBTTagType.INT_ARRAY, value: [], name: '' })
            }
        }

        let length = this.buf.readInt32BE(this.pos)
        this.pos += 4

        let value: number[] = []
        for (let i = 0; i < length; ++i) {
            value.push(this.readInt().value)
        }

        return {
            name: info.name,
            type: NBTTagType.INT_ARRAY,
            value
        }
    }

    public readLongArray(read_info = false): LongArrayTag {
        let info: TagInfo = {
            name: '',
            type: NBTTagType.LONG_ARRAY
        }

        if (read_info) {
            info = this.readTagInfo()
            if (info.type != NBTTagType.LONG_ARRAY) {
                return utils.send_error("The next component is not a long array", { type: NBTTagType.LONG_ARRAY, value: [], name: '' })
            }
        }

        let length = this.buf.readInt32BE(this.pos)
        this.pos += 4
        let array_mem = this.buf.subarray(this.pos, this.pos + length)

        let value: bigint[] = []
        for (let i = 0; i < length; ++i) {
            value.push(this.readLong().value)
        }

        return {
            name: info.name,
            //@ts-ignore
            array_mem,
            type: NBTTagType.LONG_ARRAY,
            value
        }
    }

    public readCompound(read_info = false, count = 0): CompoundTag {
        let compound_info: TagInfo = {
            name: '',
            type: NBTTagType.COMPOUND
        }

        if (read_info) {
            compound_info = this.readTagInfo()
            if (compound_info.type != NBTTagType.COMPOUND) {
                return utils.send_error("The next component is not a compound", { type: NBTTagType.COMPOUND, value: {}, name: '' })
            }
        }

        let info = this.readTagInfo()
        let tag: NBTTag = {
            type: NBTTagType.COMPOUND,
            name: compound_info.name,
            value: {}
        }
        while (true) {
            let _break = false
            switch (info.type) {
                case NBTTagType.END: {
                    _break = true
                    break;
                }
                case NBTTagType.LIST: {
                    tag.value[info.name] = this.readList(info.list_type!)
                    tag.value[info.name].name = info.name
                    break;
                }
                default: {
                    if (info.type == NBTTagType.COMPOUND) {
                        tag.value[info.name] = this.readCompound(false, count + 1)
                    } else {
                        tag.value[info.name] = this.parse_map[info.type]()
                    }
                    tag.value[info.name].name = info.name
                    break;
                }
            }
            if (_break) {
                break;
            }
            info = this.readTagInfo()
        }
        return tag
    }

    read(): NBTTag {
        if (this.pos == this.buf.length) {
            return {type: NBTTagType.END}
        }
        let info = this.readTagInfo();
        switch (info.type) {
            case NBTTagType.COMPOUND: {
                return { ...this.readCompound(), name: info.name }
            }
            case NBTTagType.BYTE: {
                return { ...this.readByte(), name: info.name }
            }
            case NBTTagType.SHORT: {
                return { ...this.readShort(), name: info.name }
            }
            case NBTTagType.INT: {
                return { ...this.readInt(), name: info.name }
            }
            case NBTTagType.LONG: {
                return { ...this.readLong(), name: info.name }
            }
            case NBTTagType.FLOAT: {
                return { ...this.readFloat(), name: info.name }
            }
            case NBTTagType.DOUBLE: {
                return { ...this.readDouble(), name: info.name }
            }
            case NBTTagType.BYTE_ARRAY: {
                return { ...this.readByteArray(), name: info.name }
            }
            case NBTTagType.STRING: {
                return { ...this.readString(), name: info.name }
            }
            case NBTTagType.LIST: {
                return { ...this.readList(info.list_type!), name: info.name }
            }
            case NBTTagType.INT_ARRAY: {
                return { ...this.readIntArray(), name: info.name }
            }
            case NBTTagType.LONG_ARRAY: {
                return { ...this.readLongArray(), name: info.name }
            }
            default: {
                return utils.send_error(`Unknown Tag Type ${info.type}`, {type: NBTTagType.END})
            }
        }
    }

    static read(buf: Buffer) {
        return (new NBTReader(buf)).read()
    }

}
