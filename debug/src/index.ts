import fs = require('fs')
import main = require("../../")

const {
    anvil,
    nbt,
    utils
} = main

console.log(nbt.NBTTagType)

// let servers_file = fs.readFileSync("../../test_data/servers.dat")
// let servers = new nbt.NBTReader(servers_file)
// console.log(servers.read())

// let test_file = fs.readFileSync("../../test_data/test.nbt")
// let tests = new nbt.NBTReader(test_file)
// console.log(tests.read())

// let _file = fs.readFileSync("../../test_data/bigtest.nbt")
// let _s = new nbt.NBTReader(_file)
// console.log(_s.read())

// let list_list_file = fs.readFileSync("../../test_data/list_list.nbt")
// let list_list = new nbt.NBTReader(list_list_file)
// console.log(list_list.read())

// let one_chunk_files = fs.readFileSync("../../test_data/one_chunk.mca")
// let one_chunk = new anvil.chunk.Chunk(one_chunk_files.subarray(2*1024*4))
// console.log(one_chunk)

let region_file = fs.readFileSync("../../test_data/r.0.0.mca")
let region = new anvil.region.Region(region_file)
let arr = Object.entries(region.chunks).sort((a, b) => a[1].position.z - b[1].position.z).sort((a, b) => a[1].position.x - b[1].position.x).map(v => { return { ...v[1], chunk: undefined } })
// fs.writeFileSync("./out2.json", JSON.stringify(arr, null, 4))
console.log(region)
let chunk = region.getChunkData({ x: 0, z: 0 })
let test = chunk.test(-3)
// let states = chunk.getBlockStates(true)[4]
let states = chunk.getBlockStates(true)[-4]
let block_indexes = chunk.getBlocks(states)//, (x) => states.palette.value[x]!.value.Name.value);
// console.log(view.getInt8(0x82 - 4), data.readInt8(0x82))
// console.log(block_indexes)
let block_names = block_indexes.map(v => states.palette.value[v]!.value.Name.value)
console.log(block_names, block_names.every(v => v != null), block_names.indexOf(undefined))
// fs.writeFileSync("./region_out.json", utils.jsonify(region))
// fs.writeFileSync("./blocks_out.json", JSON.stringify(block_names, null, 4))

// let region_file_120 = fs.readFileSync("../../test_data/1.20.4-r.0.0.mca")
// let region120 = new anvil.region.Region(region_file_120)

// A region file with with many blocks at -1, 0
let many_region_file = fs.readFileSync("../../test_data/1.20.4_many-r.-1.0.mca")
let many_region = new anvil.region.Region(many_region_file)
let many_chunk = many_region.getChunkData({x: -1, z: 0})
let many_block_names: {[key: number]: string[]} = []
for (let y = many_chunk.minY; y < many_chunk.maxY + 1; ++y) {
    let many_states = many_chunk.getBlockStates()[y]
    let many_block_indexes = chunk.getBlocks(many_states)
    many_block_names[y] = many_block_indexes.reverse().map(v => <string> many_states.palette.value[v]!.value.Name.value)
}
// console.log(many_block_names.every(v => v != null), many_block_names.indexOf(undefined))
for (let a = 32; a >= 0; --a) {
    // console.log(a, many_states.palette.value[a].value.Name.value, many_block_indexes.findIndex(v => v == a), many_block_indexes.findLastIndex(v => v == a))
}
let coords: string[] = []
let map = {}
for (let y = 0; y < 16; ++y) {
    for (let x = -16; x < 0; ++x) {
        for (let z = 0; z < 16; ++z) {
            let coord = {x, y, z}
            coords.push(JSON.stringify(coord))
            map[JSON.stringify(coord)] = many_block_names[4][utils.getIndexFromBlockCoord(coord)]
        }
    }
}
fs.writeFileSync("./block_coord.json", JSON.stringify(map, null, 4))
debugger;
eval("") // Stop garbage collector
