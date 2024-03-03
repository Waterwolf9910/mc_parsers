import net from "net"
import * as event from 'events'

export enum PacketType {
    Login = 3,
    Command = 2,
    MultiPacket = 0,
    NotAuthed = -1
}

export interface ReponsePacket {
    request_id: number
    request_type: PacketType.Command | PacketType.MultiPacket | PacketType.NotAuthed
    message: string
}

export interface RconEvents {
    open: () => any
    close: () => any
    authentication: (success: boolean) => any
    data: (buf: Buffer) => any
}

export const data_positions = {
    request_id: 4,
    type: 8,
    payload: 12
}

/**
 * A class to connect and send data to minecraft servers
 */
export class RCON extends event.EventEmitter {
    #_is_connected = false
    #socket: net.Socket
    #req_id = 0

    get is_connected() {
        return this.#_is_connected
    }

    private poll_for<T>(func: (r: (value: T) => any) => any, time = 1000) {
        return new Promise<T>(_r => {
            let r = (value: T) => { clearInterval(inv); _r(value) }
            let inv = setInterval(() => func(r), time)
        })
    }

    public createPacket(type: PacketType, payload: string | number[] = '', id?: number): Buffer {
        // https://wiki.vg/RCON
        let packet = Buffer.alloc(data_positions.payload + payload.length + 2)
        packet.writeInt32LE(packet.length - 4)
        packet.writeInt32LE(id ?? this.#req_id++, data_positions.request_id)
        packet.writeInt32LE(type, data_positions.type)
        if (typeof payload == 'string') {
            packet.write(payload, data_positions.payload, 'ascii')
        } else {
            packet.set(payload, data_positions.payload)
        }
        return packet;
    }

    /**
     * Connects to a server with rcon
     * @param password The rcon password
     * @param address The address of the server
     * @param port The rcon port
     * @returns -1 in request_id if the login was unsuccessful 
     */
    public async connect(password: string, address: string, port: number = 25575): Promise<ReponsePacket> {
        // Connect to server
        this.#socket = net.connect(port, address)
        this.#req_id = 0

        // Wait until opened
        await this.poll_for((r) => {
            if (this.#socket.readyState == "open") {
                r(null)
            }
        }, 50)

        this.#_is_connected = true
        this.emit('open')
        this.#socket.on('data', (buf) => this.emit('data', buf))
        this.#socket.once("close", () => {
            this.#_is_connected = false
            this.emit('close')
        })
        
        
        // Send and wait for a reponse
        let reponse = await new Promise<Buffer>(r => {
            this.#socket.once("data", r)
            this.#socket.write(this.createPacket(PacketType.Login, password))
        })

        this.emit("authentication", reponse.readInt32LE(data_positions.request_id) != -1)
        return {
            request_id: reponse.readInt32LE(data_positions.request_id),
            request_type: reponse.readInt32LE(data_positions.type),
            message: String.fromCharCode(...reponse.subarray(data_positions.payload, reponse.length - 2))
        }
    }

    /**
     * Sends and recieves a packet from the server
     * @param packet The packet to send
     * @param expected_rid The expected id of the packet (will try to grab from packet if null)
     * @returns The reponse packet from the server
     */
    public sendPacket(packet: Buffer, expected_rid?: number) {
        return new Promise<Buffer>((r) => {
            // Save our id to verify correct reponse
            let id = expected_rid ?? packet.readInt32LE(data_positions.request_id)
            let ret = Buffer.allocUnsafe(0)
            let dataHandler = (buf: Buffer) => {
                // This is not a part of our packet
                if (buf.readInt32LE(data_positions.request_id) != id) {
                    return
                }

                // This is the first part of the packet we recieve
                if (ret.length == 0) {
                    // If this is a multipacket reponse, send a invaild packet
                    if (buf.readInt32LE(data_positions.type) == PacketType.MultiPacket) {
                        this.#socket.write(this.createPacket(0xff as PacketType, '', id))
                    }
                    // Add the header of the first packet to the return buffer
                    ret = Buffer.concat([buf.subarray(0, 12), ret])
                }

                let i = 0
                // Max length for server -> client packet is 4110
                while (i * 4110 < buf.length) {
                    // Grab a packet with the header and last 2 null bytes removed
                    let sub = buf.subarray((i * 4110) + data_positions.payload, ((++i) * 4110) - 2)
                    // Check for the reponse of the invalid packet and remove it from the return buffer
                    if (sub[sub.length - 3] == 0x66 && sub[sub.length - 4] == 0x66) {
                        r(Buffer.concat([ret, sub.subarray(0, sub.length - 34), Buffer.from([0x00, 0x00])]))
                        this.#socket.off('data', dataHandler)
                        break;
                    }
                    // Combine the return buffer and the payload portion of the packet
                    ret = Buffer.concat([ret, sub])
                }
            }
            this.#socket.on("data", dataHandler)
            this.#socket.write(packet)
        })
    }

    /**
     * Sends a command to the server
     * @param command The command to send
     * @returns -1 in request_id if you are not authenticated or was disconnected
     */
    public async sendCommand(command: string): Promise<ReponsePacket | undefined> {
        if (!this.#_is_connected) { return undefined }

        // Wait for all packets
        let reponse = await this.sendPacket(this.createPacket(PacketType.Command, command))

        return {
            request_id: reponse.readInt32LE(data_positions.request_id),
            request_type: reponse.readInt32LE(data_positions.type),
            message: String.fromCharCode(...reponse.subarray(data_positions.payload, reponse.length - 2))
        }
    }

    on<K extends keyof RconEvents>(event_name: K, listener: RconEvents[K]): this { return super.on(event_name, listener) }
    once<K extends keyof RconEvents>(event_name: K, listener: RconEvents[K]): this { return super.once(event_name, listener) }
    emit<K extends keyof RconEvents>(event_name: K, ...args: Parameters<RconEvents[K]>): boolean { return super.emit(event_name, ...args) }
    off<K extends keyof RconEvents>(event_name: K, listener: RconEvents[K]): this {         return super.off(event_name, listener) }
}
