export interface Service {
    addr: string
    name: string
    port: number
}

export type Protocol = "HTTP" | "WS" | "UDP" | "SMTP" | "FTP" | "ICMP" | "???"

export interface Packet {
    id: number
    timestamp: number
    src: Service
    dst: Service
    protocol: Protocol
    method?: string
    size: number
    summary: string
    payload: string
    flags?: string[]
}

export interface ConnectionSummary {
    protocol: string
    localAddr: string
    foreignAddr: string
    state: string
    packets: number
}
