import type { Service } from "./types"

export interface ServiceDef {
    service: Service
    ports: { port: number; protocol: string; name: string }[]
}

const SYSTEM: Service = { addr: "10.0.0.1", name: "SYSTEM", port: 443 }
const MARKET: Service = { addr: "10.0.1.2", name: "MARKET", port: 8080 }
const FACTORY: Service = { addr: "10.0.2.1", name: "FACTORY", port: 5000 }
const SYMPOSIUM: Service = { addr: "10.0.3.1", name: "SYMPOSIUM", port: 9090 }
const WELT_VM: Service = { addr: "10.0.4.1", name: "WELT-VM", port: 2121 }
const PRESTIGE: Service = { addr: "10.0.5.1", name: "PRESTIGE", port: 8443 }
const CAREER: Service = { addr: "10.0.6.1", name: "CAREER", port: 443 }

// Unregistered facility hosts — no name, just addresses
const FACILITY_A: Service = { addr: "10.0.7.3", name: "", port: 0 }
const FACILITY_B: Service = { addr: "10.0.7.1", name: "", port: 0 }
const FACILITY_C: Service = { addr: "10.0.7.2", name: "", port: 0 }

export const SERVICES = {
    SYSTEM,
    MARKET,
    FACTORY,
    SYMPOSIUM,
    WELT_VM,
    PRESTIGE,
    CAREER,
    FACILITY_A,
    FACILITY_B,
    FACILITY_C,
} as const

export const REGISTERED_SERVICES: ServiceDef[] = [
    {
        service: SYSTEM,
        ports: [
            { port: 443, protocol: "TCP", name: "system-controller" },
            { port: 514, protocol: "UDP", name: "syslog" },
        ],
    },
    {
        service: MARKET,
        ports: [
            { port: 8080, protocol: "TCP", name: "market-engine" },
            { port: 8081, protocol: "TCP", name: "factory-control" },
            { port: 8082, protocol: "WS", name: "tick-stream" },
        ],
    },
    {
        service: FACTORY,
        ports: [
            { port: 5000, protocol: "UDP", name: "production-cycle" },
            { port: 5001, protocol: "TCP", name: "output-report" },
        ],
    },
    {
        service: SYMPOSIUM,
        ports: [
            { port: 9090, protocol: "WS", name: "combat-stream" },
            { port: 9091, protocol: "TCP", name: "matchmaker" },
        ],
    },
    {
        service: WELT_VM,
        ports: [
            { port: 2121, protocol: "FTP", name: "file-transfer" },
            { port: 4444, protocol: "TCP", name: "das8-debug" },
        ],
    },
    {
        service: PRESTIGE,
        ports: [{ port: 8443, protocol: "TCP", name: "lifecycle-mgr" }],
    },
    {
        service: CAREER,
        ports: [{ port: 443, protocol: "TCP", name: "progression-api" }],
    },
]

/** Try to look up a service name by address. Returns empty string for unknown hosts. */
export function resolveHost(addr: string): string {
    for (const def of REGISTERED_SERVICES) {
        if (def.service.addr === addr) return def.service.name
    }
    return ""
}
