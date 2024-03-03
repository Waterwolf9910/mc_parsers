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

export interface TagInfo {
    type: NBTTagType,
    name: string,
    list_type?: NBTTagType
}

export interface RawNBTTag extends TagInfo {
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
    name: never,
    value?: never
}

export type NBTTag = ByteTag | ShortTag | IntTag | LongTag | FloatTag | DoubleTag | ByteArrayTag | StringTag | ListTag<NBTTagType> | CompoundTag | IntArrayTag | LongArrayTag

/**
 * A class to read a nbt buffer and decode it
 * 
 * Each byte returned is signed, do `byte & 0xFF` to get unsigned version
 */
export class NBTReader {

    /** The buffer containing the NBT file */
    #buf: Buffer
    /** The current position in the buffer */
    #pos = 0

    constructor (buf: Buffer) {
        let header = '0x' + buf[0].toString(16).padStart(2, '0') + buf[1].toString(16).padStart(2, '0')
        if (!utils.known_formats.includes(header)) {
            //@ts-ignore
            return utils.sendError("Unknown nbt file", {});
        }
        if (header != '0x0a00') {
            this.#buf = zlib.unzipSync(buf)
            return this
        }
        this.#buf = buf;
    }

    /**
     * Reads the buffer to get the tag name and type
     * @returns TagInfo
     */
    readTagInfo(): TagInfo {
        let tag_info = NBTReader.readTagInfo(this.#buf, this.#pos)
        this.#pos = tag_info.pos
        return tag_info
    }

    private parse_read: { [key: number]: (read_info?: boolean) => NBTTag} = {
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
    public readRaw(): {hex: string, char: string, int: number} {
        return {
            hex: '0x' + this.#buf[this.#pos].toString(16),
            //@ts-ignore
            char: String.fromCharCode('0x' + this.#buf[this.#pos]),
            int: this.#buf.readInt8(this.#pos)
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
                return utils.sendError("The next component is not a byte", {type: NBTTagType.BYTE, value: 0, name: ''})!
            }
        }

        return {
            name: info.name,
            type: NBTTagType.BYTE,
            value: this.#buf.readInt8(this.#pos++)
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
                return utils.sendError("The next component is not a short", { type: NBTTagType.SHORT, value: 0, name: '' })!
            }
        }

        let value = this.#buf.readInt16BE(this.#pos)
        this.#pos += 2 //this.read_amt[NBTTagType.SHORT].pushby
        
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
                return utils.sendError("The next component is not a int", { type: NBTTagType.INT, value: 0, name: '' })!
            }
        }

        let value = this.#buf.readInt32BE(this.#pos)
        this.#pos += 4
        
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
                return utils.sendError("The next component is not a float", { type: NBTTagType.FLOAT, value: 0, name: '' })!
            }
        }

        let value = this.#buf.readFloatBE(this.#pos)
        this.#pos += 4

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
                return utils.sendError("The next component is not a long", { type: NBTTagType.LONG, value: 0n, name: '' })!
            }
        }

        let value = this.#buf.readBigInt64BE(this.#pos)
        this.#pos += 8

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
                return utils.sendError("The next component is not a double", { type: NBTTagType.DOUBLE, value: 0, name: '' })!
            }
        }

        let value = this.#buf.readDoubleBE(this.#pos)
        this.#pos += 8

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
                return utils.sendError("The next component is not a string", { type: NBTTagType.STRING, value: '', name: '' })!
            }
        }

        let str_length = this.#buf.readInt16BE(this.#pos) // Get the length of the string
        this.#pos += 2
        let value = String.fromCharCode(...this.#buf.subarray(this.#pos, this.#pos + str_length))
        // for (let i = 0; i < str_length; ++i) {
        //     value += this.buf[this.pos + i] // Iterate through the bytes to decode the string
        // }
        this.#pos += str_length

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
                return utils.sendError("The next component is not a list", { type: NBTTagType.LIST, list_type: <T> NBTTagType.END, value: [], name: '' })!
            }
        }

        let length = this.#buf.readInt32BE(this.#pos)
        this.#pos += 4
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
                    value.push(this.parse_read[type]()! as typeof value[0])
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
                return utils.sendError("The next component is not a byte array", { type: NBTTagType.BYTE_ARRAY, value: [], name: '' })!
            }
        }

        let length = this.#buf.readInt32BE(this.#pos)
        this.#pos += 4

        let value: number[] = []
        for (let i = 0; i < length; ++i) {
            value.push(this.readByte()!.value)
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
                return utils.sendError("The next component is not a int array", { type: NBTTagType.INT_ARRAY, value: [], name: '' })!
            }
        }

        let length = this.#buf.readInt32BE(this.#pos)
        this.#pos += 4

        let value: number[] = []
        for (let i = 0; i < length; ++i) {
            value.push(this.readInt()!.value)
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
                return utils.sendError("The next component is not a long array", { type: NBTTagType.LONG_ARRAY, value: [], name: '' })!
            }
        }

        let length = this.#buf.readInt32BE(this.#pos)
        this.#pos += 4
        let array_mem = this.#buf.subarray(this.#pos, this.#pos + length)

        let value: bigint[] = []
        for (let i = 0; i < length; ++i) {
            value.push(this.readLong()!.value)
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
                return utils.sendError("The next component is not a compound", { type: NBTTagType.COMPOUND, value: {}, name: '' })!
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
                        tag.value[info.name] = this.parse_read[info.type]()
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

    public read(): NBTTag | EmptyTag {
        if (this.#pos == this.#buf.length) {
            //@ts-ignore
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
                //@ts-ignore
                return utils.sendError(`Unknown Tag Type ${info.type}`, {type: NBTTagType.END})!
            }
        }
    }

    public static read(buf: Buffer) {
        return (new NBTReader(buf)).read()
    }

    public static readTagInfo(buf: Buffer, pos = 0): TagInfo & {pos: number} {
        let list_type: NBTTagType | undefined = undefined
        // let name: string = ''
        let type = buf[pos]
        pos++
        if (type == NBTTagType.END) {
            return {
                type,
                name: '',
                list_type: undefined,
                pos
            }
        }
        let name_len = buf.readUInt16BE(pos) // Name is a 16 bit (2 byte) int
        pos += 2
        let name = String.fromCharCode(...buf.subarray(pos, pos + name_len)) // Convert a section of the buffer to string
        // for (let i = 0; i < name_len; ++i) {
        //     name += String.fromCharCode(this.buf[this.pos + i]) // Convert
        // }
        pos += name_len

        // Get the type of list
        if (type == NBTTagType.LIST) {
            list_type = buf.readInt8(pos)
            pos++
        }

        return {
            name,
            type,
            list_type,
            pos
        }
    }

}

class NBT {
    
}

export class NBTWritter {

    private data: {[key: string]: Exclude<NBTTag, EmptyTag>} = {}

    static parse_write: {[key: number]: {pushby: number, name: string}} = {
        [NBTTagType.BYTE]: { pushby: 1, name: 'writeInt8'},
        [NBTTagType.SHORT]: { pushby: 2, name: 'writeInt16BE' },
        [NBTTagType.INT]: { pushby: 4, name: 'writeInt32BE' },
        [NBTTagType.FLOAT]: { pushby: 4, name: 'writeFloatBE' },
        [NBTTagType.LONG]: { pushby: 8, name: 'writeBigInt64BE' },
        [NBTTagType.DOUBLE]: { pushby: 8, name: 'writeDoubleBE' },
        [NBTTagType.BYTE_ARRAY]: { pushby: 1, name: 'writeInt8' },
        [NBTTagType.INT_ARRAY]: { pushby: 4, name: 'writeInt32BE' },
        [NBTTagType.LONG_ARRAY]: { pushby: 8, name: 'writeBigInt64BE' },
    }

    public writeByte(name: string, value: number, write_into?: {type: NBTTagType, name: string}): boolean {
        if (value > 0x7f || value < -0x7f) {
            return utils.sendError(`Value (${value}) is out of range (${-0x7f} to ${0x7f})`, false)!
        }

        return this.write({type: NBTTagType.BYTE, value, name}, write_into)
    }

    public writeShort(name: string, value: number, write_into?: { type: NBTTagType, name: string }): boolean {
        if (value > 0x7fff || value < -0x7fff) {
            return utils.sendError(`Value (${value}) is out of range (${-0x7fff} to ${0x7fff})`, false)!
        }

        return this.write({ type: NBTTagType.SHORT, value, name }, write_into)
    }

    public writeInt(name: string, value: number, write_into?: { type: NBTTagType, name: string }): boolean {
        if (value > 0x7fffffff || value < -0x7fffffff) {
            return utils.sendError(`Value (${value}) is out of range (${-0x7fffffff} to ${0x7fffffff})`, false)!
        }

        return this.write({ type: NBTTagType.INT, value, name }, write_into)
    }

    public writeLong(name: string, value: bigint, write_into?: { type: NBTTagType, name: string }): boolean {
        if (value > BigInt("0x7fffffffffffffff") || value < -BigInt("0x7fffffffffffffff")) {
            return utils.sendError(`Value (${value}) is out of range (${-BigInt("0x7fffffffffffffff")} to ${BigInt("0x7fffffffffffffff")})`, false)!
        }

        return this.write({ type: NBTTagType.LONG, value, name }, write_into)
    }

    public writeFloat(name: string, value: number, write_into?: { type: NBTTagType, name: string }): boolean {
        return this.write({ type: NBTTagType.FLOAT, value, name }, write_into)
    }

    public writeDouble(name: string, value: number, write_into?: { type: NBTTagType, name: string }): boolean {
        return this.write({ type: NBTTagType.DOUBLE, value, name }, write_into)
    }

    public writeByteArray(name: string, value: number[], write_into?: { type: NBTTagType, name: string }): boolean {
        if (!value.every(v => !(v > 0x7f || v < -0x7f))) {
            return utils.sendError(`Value (${value}) contains an out of range number (${-0x7f} to ${0x7f})`, false)!
        }

        return this.write({ type: NBTTagType.BYTE_ARRAY, value, name }, write_into)
    }

    public writeString(name: string, value: string, write_into?: { type: NBTTagType, name: string }): boolean {
        return this.write({ type: NBTTagType.STRING, value, name }, write_into)
    }

    public writeList<T extends NBTTagType>(name: string, type: T, value: ListTag<T>["value"], write_into?: { type: NBTTagType, name: string }): boolean {
        if (!value.every(v => v.type == type)) {
            return utils.sendError(`Value (${value}) contains an value that is not the same type`, false)!
        }

        return this.write({ type: NBTTagType.LIST, value, name, list_type: type }, write_into)
    }

    public writeCompound(name: string, value: CompoundTag['value'], write_into?: { type: NBTTagType, name: string }): boolean {
        return this.write({type: NBTTagType.COMPOUND, name, value}, write_into)
    }

    public writeIntArray(name: string, value: number[], write_into?: { type: NBTTagType, name: string }): boolean {
        if (value.every(v => v <= 0x7fffffff || v >= -0x7fffffff)) {
            return utils.sendError(`Value (${value}) contains an out of range number (${-0x7fffffff} to ${0x7fffffff})`, false)!
        }

        return this.write({ type: NBTTagType.INT_ARRAY, value, name }, write_into)
    }
    
    public writeLongArray(name: string, value: bigint[], write_into?: { type: NBTTagType, name: string }): boolean {
        if (value.every(v => v <= BigInt("0x7fffffffffffffff") || v >= -BigInt("0x7fffffffffffffff"))) {
            return utils.sendError(`Value (${value}) is out of range (${-BigInt("0x7fffffffffffffff")} to ${BigInt("0x7fffffffffffffff")})`, false)!
        }

        return this.write({ type: NBTTagType.LONG_ARRAY, value, name }, write_into)
    }

    public writeTag() {
        return NBTWritter.writeTag({name: '', type: NBTTagType.COMPOUND, value: this.data}).buf
    }

    

    static writeTagInfo(info: TagInfo): {buf: Buffer, pos: number} {
        let name_len = Math.min(0xffff, info.name.length)
        // type + name length + name + list_type?
        let buf = Buffer.alloc(1 + 2 + name_len + (info.type == NBTTagType.LIST ? 1 : 0))
        let offset = 0
        buf[offset++] = info.type
        buf.writeInt16BE(name_len, offset)
        offset += 2
        buf.write(info.name.substring(0, 0x7fff), offset)
        offset += name_len
        if (info.type == NBTTagType.LIST) {
            buf.writeInt8(info.list_type!, offset)
            offset++
        }
        return {buf, pos: offset}
    }

    static writeTag(tag: Exclude<NBTTag, EmptyTag>, write_info = true): {buf: Buffer, pos: number} {
        let info_buf = Buffer.alloc(0), pos = 0
        let buf: Buffer = Buffer.alloc(0)
        if (write_info) {
            ({buf: info_buf, pos} = this.writeTagInfo(tag))
        }
        switch (tag.type) {
            case NBTTagType.BYTE:
            case NBTTagType.SHORT:
            case NBTTagType.INT:
            case NBTTagType.LONG:
            case NBTTagType.FLOAT:
            case NBTTagType.DOUBLE: {
                let write_info = this.parse_write[tag.type]
                buf = Buffer.alloc(info_buf.length + write_info.pushby)
                buf.set(info_buf)
                buf[write_info.name](tag.value, pos)
                pos += write_info.pushby
                break;
            }
            case NBTTagType.COMPOUND: {
                buf = Buffer.from(info_buf)
                for (let key of Object.keys(tag.value)) {
                    let tag_buf = this.writeTag(tag.value[key], true)
                    buf = Buffer.concat([buf, tag_buf.buf])
                    pos += tag_buf.pos
                }
                buf = Buffer.concat([buf, Buffer.from([0x0])])
                pos++
                break
            }
            case NBTTagType.STRING: {
                buf = Buffer.alloc(info_buf.length + tag.value.length);
                buf.set(info_buf)
                buf.write(tag.value, pos)
                pos += tag.value.length
                break
            }

            case NBTTagType.LIST: {
                buf = Buffer.alloc(info_buf.length + 4 + (tag.value.length > 0 ? 0 : 1))
                buf.set(info_buf)
                buf.writeInt32BE(0, pos)
                pos += 4
                if (tag.value.length == 0) {
                    buf[pos++] = 0
                    break;
                }
                for (let value of tag.value) {
                    let tag_buf = this.writeTag(value, false)
                    buf = Buffer.concat([buf, tag_buf.buf])
                    pos += tag_buf.pos
                }

                break;
            }

            case NBTTagType.BYTE_ARRAY:
            case NBTTagType.INT_ARRAY:
            case NBTTagType.LONG_ARRAY: {
                let write_info = this.parse_write[tag.type]
                buf = Buffer.alloc(info_buf.length + 4 + tag.value.length * write_info.pushby)
                buf.set(info_buf)
                let writer: typeof buf.writeInt16BE = buf[write_info.name]
                buf.writeInt32BE(0, pos)
                pos += 4
                if (tag.value.length == 0) {
                    break;
                }
                for (let value of tag.value) {
                    writer(<number> value, pos)
                    pos += write_info.pushby
                }
                break
            }
            default: {
                //@ts-ignore
                return utils.sendError(`Unknown Type: ${NBTTagType[tag.type]}`, {buf: Buffer.alloc(0), pos: 0})!
            }
        }

        return {
            buf,
            pos
        }
    }

    static writeToFileFormat(data: { [key: string]: Exclude<NBTTag, EmptyTag> }) {
        return NBTWritter.writeTag({ name: '', type: NBTTagType.COMPOUND, value: data }).buf
    }

    private write(tag: NBTTag, write_into?: { type: NBTTagType, name: string }): boolean {

        if (tag.name && tag.name.length > 0x7fff) {
            return utils.sendError(`Tag name is too long (max: ${0x7fff}, got: ${tag.name.length})`)!
        }

        if (!write_into) {
            // @ts-ignore
            this.data[tag.name] = tag
            return true
        }

        if (!this.data[write_into.name]) {
            switch (write_into.type) {

                case NBTTagType.LIST:
                case NBTTagType.INT_ARRAY:
                case NBTTagType.BYTE_ARRAY:
                case NBTTagType.LONG_ARRAY: {
                    //@ts-ignore
                    this.data[write_into.name] = {
                        value: [],
                        name: write_into.name,
                        type: write_into.type
                    }
                    break
                }

                case NBTTagType.COMPOUND: {
                    this.data[write_into.name] = {
                        value: {},
                        name: write_into.name,
                        type: write_into.type
                    }
                    break
                }

                default: {
                    return utils.sendError(`You are not able to write into this type`, false)!
                }
            }
            if (write_into.type == NBTTagType.LIST) {
                (<ListTag<NBTTagType>> this.data[write_into.name]).list_type = tag.type
            }
        }

        switch (this.data[write_into.name].type) {
            case NBTTagType.LIST: {
                let list_type = (this.data[write_into.name] as ListTag<NBTTagType>).list_type
                if (tag.type != list_type) {
                    return utils.sendError(`Unable to write into list: expected ${NBTTagType[this.data[write_into.name].type]}`, false)!
                }
                (<ListTag<NBTTagType>> this.data[write_into.name]).value.push(tag)
                break
            }

            case NBTTagType.BYTE_ARRAY: {
                if (tag.type != NBTTagType.BYTE || tag.value > 0x7f || tag.value < -0x7f) {
                    return utils.sendError(`Unable to write into type: ${NBTTagType[this.data[write_into.name].type]}`, false)!
                }
                (<ByteArrayTag> this.data[write_into.name]).value.push(tag.value)
                break
            }

            case NBTTagType.INT_ARRAY: {
                if (tag.type != NBTTagType.INT || tag.value > 0x7fffffff || tag.value < -0x7fffffff) {
                    return utils.sendError(`Unable to write into type: ${NBTTagType[this.data[write_into.name].type]}`, false)!
                }
                (<IntArrayTag> this.data[write_into.name]).value.push(tag.value)
                break
            }
            case NBTTagType.LONG_ARRAY: {
                if (tag.type != NBTTagType.LONG || tag.value > 0x7fffffffffffffffn || tag.value < -0x7fffffffffffffffn) {
                    return utils.sendError(`Unable to write into type: ${NBTTagType[this.data[write_into.name].type]}`, false)!
                }
                (<LongArrayTag> this.data[write_into.name]).value.push(tag.value)
                break
            }

            case NBTTagType.COMPOUND: {
                if (tag.name == '' || tag.name == undefined) {
                    return utils.sendError(`Name must not be empty (recieved: ${tag.name})`, false)!
                }
                //@ts-ignore
                (<CompoundTag> this.data[write_into.name]).value[tag.name] = tag
                break
            }

            default: {
                return utils.sendError(`Unable to write into type: ${NBTTagType[this.data[write_into.name].type]}`, false)!
            }
        }
        return true;
    }
}
