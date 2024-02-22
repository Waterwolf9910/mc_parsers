import assert = require("assert/strict")
import library = require("..")
import fs = require('fs')
import path = require("path")
let { readFileSync } = fs
let { resolve } = path

describe("NBT", () => {
    describe("servers.dat", () => {
        let servers_file = <library.nbt.CompoundTag> new library.nbt.NBTReader(readFileSync(resolve(__dirname, "../test_data/servers.dat"))).read()
        let servers = <library.nbt.ListTag<library.nbt.NBTTagType.COMPOUND>> servers_file.value.servers
        it("should be contain list, containing compounds, named servers", () => {
            assert.equal(servers.type, library.nbt.NBTTagType.LIST)
            assert.equal(servers.name, "servers")
            assert.equal(servers.list_type, library.nbt.NBTTagType.COMPOUND)
        })
        it("should only have one entry in list", () => {
            assert.equal(servers.value.length, 1)
        })
        describe("server entry", () => {
            it("should contain a string entry named icon", () => {
                let icon = servers.value[0].value.icon;
                assert.equal(icon.type, library.nbt.NBTTagType.STRING)
                assert.equal(icon.name, "icon")
            })
            it("should contain a string entry named name", () => {
                let name = servers.value[0].value.name;
                assert.equal(name.type, library.nbt.NBTTagType.STRING)
                assert.equal(name.name, "name")
                assert.equal(name.value, "Minecraft Server")
            })
            it("should contain a string entry named ip", () => {
                let ip = servers.value[0].value.ip;
                assert.equal(ip.type, library.nbt.NBTTagType.STRING)
                assert.equal(ip.name, "ip")
                assert.equal(ip.value, "127.0.0.1")
            })
            it("should contain a byte entry named hidden", () => {
                let hidden = servers.value[0].value.hidden;
                assert.equal(hidden.type, library.nbt.NBTTagType.BYTE)
                assert.equal(hidden.name, "hidden")
                assert.equal(hidden.value, 0)
            })
        })
    })
})
