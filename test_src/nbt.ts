import assert = require("assert/strict")
import fs = require('fs')
import path = require("path")
import zlib = require('zlib')
import {
    nbt,
    anvil,
    rcon,
    utils
} from ".."

describe("NBT", () => {
    describe("reader", () => {
        describe("servers.dat", () => {
            let servers_file = <nbt.CompoundTag> new nbt.NBTReader(fs.readFileSync(path.resolve(__dirname, "../test_data/servers.dat"))).read()
            let servers = <nbt.ListTag<nbt.NBTTagType.COMPOUND>> servers_file.value.servers
            it("should be contain list, containing compounds, named servers", () => {
                assert.equal(servers.type, nbt.NBTTagType.LIST)
                assert.equal(servers.name, "servers")
                assert.equal(servers.list_type, nbt.NBTTagType.COMPOUND)
            })
            it("should only have one entry in list", () => {
                assert.equal(servers.value.length, 1)
            })
            describe("server entry", () => {
                it("should contain a string entry named icon", () => {
                    let icon = servers.value[0].value.icon;
                    assert.equal(icon.type, nbt.NBTTagType.STRING)
                    assert.equal(icon.name, "icon")
                })
                it("should contain a string entry named name", () => {
                    let name = servers.value[0].value.name;
                    assert.equal(name.type, nbt.NBTTagType.STRING)
                    assert.equal(name.name, "name")
                    assert.equal(name.value, "Minecraft Server")
                })
                it("should contain a string entry named ip", () => {
                    let ip = servers.value[0].value.ip;
                    assert.equal(ip.type, nbt.NBTTagType.STRING)
                    assert.equal(ip.name, "ip")
                    assert.equal(ip.value, "127.0.0.1")
                })
                it("should contain a byte entry named hidden", () => {
                    let hidden = servers.value[0].value.hidden;
                    assert.equal(hidden.type, nbt.NBTTagType.BYTE)
                    assert.equal(hidden.name, "hidden")
                    assert.equal(hidden.value, 0)
                })
            })
        })
    })
    describe("writter", () => {
        let file_paths = fs.readdirSync(path.resolve(__dirname, "../test_data"), {withFileTypes: true}).map(v => v.path).filter(v => v.endsWith(".nbt") || v.endsWith(".dat"))
        it("Should contain the same bytes as each file", () => {
            for (let fpath in file_paths) {
                let data = fs.readFileSync(fpath)
                let compressed = false
                let compress_type = -1
                if ((data[0].toString(16) + data[1].toString(16)) != "0a00") {
                    compressed = true
                    compress_type = data[0] == 0x78 ? 1 : 0
                }
                let nbt_value = nbt.NBTReader.read(data)
                if (nbt_value.type == nbt.NBTTagType.END) {
                    throw new Error(`Invalid NBT File at: ${fpath}`)
                }
                let {buf} = nbt.NBTWritter.writeTag(nbt_value)
                if (!compressed) {
                    assert.ok(data.equals(buf))
                }
                if (compress_type == 1) {
                    assert.ok(data.equals(Buffer.concat([data.subarray(0, 2), zlib.deflateRawSync(buf)])))
                } else {
                    assert.ok(data.equals(zlib.gzipSync(buf)))
                }
            }
        })
        it("Should contain the same bytes when manually creating", () => {
            // let writter = new nbt.NBTWritter
            // writter.writeByte("byte", 0x7f)
            // writter.writeByteArray("byte_array", [0x7f, -0x7])
            // writter.writeDouble("double", 0.5)
            // writter.writeFloat("float", 0.25)
            // writter.writeIntArray("int_array", [0x7fffffff, -0x7fffffff])
            // writter.writeList("byte_list", nbt.NBTTagType.BYTE, [{}])
        })
    })
})
