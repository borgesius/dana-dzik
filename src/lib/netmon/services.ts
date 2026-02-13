import type { Service } from "./types"

export interface ServiceDef {
    service: Service
    ports: { port: number; protocol: string; name: string }[]
}

const SYSTEM: Service = { addr: "10.0.0.1", name: "SYSTEM", port: 443 }
const MARKET: Service = {
    addr: "10.0.80.80",
    name: "TRADING-FLOOR",
    port: 8080,
}
const FACTORY: Service = { addr: "10.0.24.7", name: "PRODUCTION", port: 5000 }
const SYMPOSIUM: Service = {
    addr: "10.0.90.90",
    name: "COMBAT-SIM",
    port: 9090,
}
const WELT_VM: Service = { addr: "10.0.19.89", name: "DAS-RUNTIME", port: 2121 }
const PRESTIGE: Service = {
    addr: "10.0.255.255",
    name: "LIFECYCLE-MGR",
    port: 8443,
}
const CAREER: Service = {
    addr: "10.0.100.1",
    name: "HUMAN-RESOURCES",
    port: 443,
}
const COSMETICS: Service = {
    addr: "10.0.123.45",
    name: "APPEARANCE-SVC",
    port: 3000,
}
const VEIL: Service = { addr: "10.0.66.6", name: "????", port: 6666 }
const PERSISTENCE: Service = {
    addr: "10.0.54.32",
    name: "LOCAL-DB",
    port: 5432,
}

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
    COSMETICS,
    VEIL,
    PERSISTENCE,
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
            { port: 9092, protocol: "TCP", name: "shop-api" },
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
    {
        service: COSMETICS,
        ports: [
            { port: 3000, protocol: "TCP", name: "theme-service" },
            { port: 3001, protocol: "UDP", name: "cosmetic-stream" },
        ],
    },
    {
        service: VEIL,
        ports: [
            { port: 6666, protocol: "TCP", name: "????" },
            { port: 6667, protocol: "WS", name: "????" },
        ],
    },
    {
        service: PERSISTENCE,
        ports: [
            { port: 5432, protocol: "TCP", name: "save-db" },
            { port: 5433, protocol: "TCP", name: "sync-handler" },
        ],
    },
]

/** Try to look up a service name by address. Returns empty string for unknown hosts. */
export function resolveHost(addr: string): string {
    for (const def of REGISTERED_SERVICES) {
        if (def.service.addr === addr) return def.service.name
    }
    return ""
}
