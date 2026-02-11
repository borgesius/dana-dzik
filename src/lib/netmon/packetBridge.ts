import { onAppEvent } from "../events"
import { getPacketBuffer } from "./packetBuffer"
import { SERVICES } from "./services"
import type { Protocol, Service } from "./types"

// ── Facility fragments ──────────────────────────────────────────────────
// Clinical-industrial communications from unregistered 10.0.7.x hosts.
// Same tone as existing popup lore (GlueFactory.exe, EQUINE.SYS, vat temps).

const FACILITY_FRAGMENTS: {
    src: Service
    dst: Service
    protocol: Protocol
    summary: string
}[] = [
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "SMTP",
        summary:
            "Re: Batch 0412 viscosity within spec. Proceed to curing phase.",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "UDP",
        summary: "vat_09 temp=94.2C pressure=1.3atm status=NOMINAL",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_C,
        protocol: "HTTP",
        summary:
            'POST /intake {manifest: "BL-0887", expected: 220, received: 218}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_A,
        protocol: "SMTP",
        summary:
            "Adhesive bond strength exceeds client spec. Hold for QC review.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_A,
        protocol: "UDP",
        summary: "livestock_transport eta=14:30 units=140 origin=REDACTED",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "HTTP",
        summary: 'GET /output/quarterly {facility: "EAST", yield_pct: 340}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_C,
        protocol: "UDP",
        summary: "vat_03 gelatin_viscosity=4.7cp status=OUT_OF_RANGE",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "SMTP",
        summary:
            "Quarterly output targets exceeded. All inputs processed on schedule.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_A,
        protocol: "HTTP",
        summary:
            'POST /dispatch {bill_of_lading: "WH-4401", pallets: 48, destination: "DISTRIBUTOR-7"}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_A,
        protocol: "UDP",
        summary: "cooling_sys_02 flow_rate=12.4L/min temp_delta=-2.1C",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_C,
        protocol: "SMTP",
        summary:
            "Batch 0293 failed viscosity testing. Raw materials flagged for reprocessing.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_B,
        protocol: "HTTP",
        summary:
            'GET /inventory/raw {type: "collagen", warehouse: "B", qty_kg: 1840}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_A,
        protocol: "UDP",
        summary:
            "rendering_line_01 throughput=38units/hr efficiency=0.94 waste=0.06",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "SMTP",
        summary:
            "Intake discrepancy. Expected: 140. Received: 138. Two units unaccounted for.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_A,
        protocol: "HTTP",
        summary:
            'POST /qa/sample {batch: "0415", pH: 6.2, color: "amber", pass: true}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_C,
        protocol: "UDP",
        summary: "vat_12 temp=CRITICAL pressure=1.8atm cooling=ENGAGED",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "SMTP",
        summary:
            "Client PO #8812 fulfilled. 200 drums industrial adhesive. Ship COD.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_A,
        protocol: "HTTP",
        summary:
            'GET /schedule/inbound {date: "next_tuesday", trucks: 6, origin: "EASTERN_REGION"}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_A,
        protocol: "UDP",
        summary: "drying_chamber_04 humidity=18pct temp=62C cycle_hrs=11.2",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_C,
        protocol: "SMTP",
        summary:
            "Annual inspection passed. No violations. Renewed for 12 months.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_B,
        protocol: "HTTP",
        summary:
            'POST /maintenance {asset: "grinder_02", status: "scheduled", reason: "blade_wear"}',
    },
    {
        src: SERVICES.FACILITY_B,
        dst: SERVICES.FACILITY_A,
        protocol: "UDP",
        summary: "hopper_feed_rate=220kg/hr bone_calcium_content=38pct",
    },
    {
        src: SERVICES.FACILITY_A,
        dst: SERVICES.FACILITY_B,
        protocol: "SMTP",
        summary:
            "New EPA guidelines effective Q3. Adjust emission filters on lines 1-4.",
    },
    {
        src: SERVICES.FACILITY_C,
        dst: SERVICES.FACILITY_A,
        protocol: "HTTP",
        summary:
            'GET /personnel/headcount {shift: "night", on_site: 12, expected: 14}',
    },
]

// ── State ────────────────────────────────────────────────────────────────

let packetsSinceLastFacility = 0
let initialized = false

// Random integer in [min, max]
function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

let nextFacilityAt = randInt(30, 60)

function maybePushFacilityPacket(): void {
    packetsSinceLastFacility++
    if (packetsSinceLastFacility >= nextFacilityAt) {
        packetsSinceLastFacility = 0
        nextFacilityAt = randInt(30, 60)

        const frag =
            FACILITY_FRAGMENTS[
                Math.floor(Math.random() * FACILITY_FRAGMENTS.length)
            ]
        pushPacket(
            frag.src,
            frag.dst,
            frag.protocol,
            frag.summary,
            frag.summary
        )
    }
}

function pushPacket(
    src: Service,
    dst: Service,
    protocol: Protocol,
    summary: string,
    payload: string,
    method?: string,
    flags?: string[]
): void {
    const buf = getPacketBuffer()
    buf.push({
        timestamp: Date.now(),
        src,
        dst,
        protocol,
        method,
        size: payload.length,
        summary,
        payload,
        flags,
    })
    maybePushFacilityPacket()
}

// ── Event subscriptions ─────────────────────────────────────────────────

export function initPacketBridge(): void {
    if (initialized) return
    initialized = true

    // Market tick — high frequency UDP broadcast
    // We listen on the MarketEngine internal events via a lightweight bridge.
    // Since we only have access to app-level events, we use the ones available.

    onAppEvent("terminal:command", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            `echo ${detail.command}`,
            `command=${detail.raw}`,
            undefined,
            ["ACK"]
        )
    })

    onAppEvent("prestige:triggered", (detail) => {
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.MARKET,
            "HTTP",
            `DELETE /state {prestige: ${detail.count}, hindsight: ${detail.hindsight}}`,
            JSON.stringify(detail),
            "DELETE",
            ["RST"]
        )
    })

    onAppEvent("prestige:purchase", (detail) => {
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /upgrade {id: "${detail.upgradeId}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("prestige:ascension", (detail) => {
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.SYSTEM,
            "HTTP",
            `DELETE /ascend {count: ${detail.count}, foresight: ${detail.foresight}}`,
            JSON.stringify(detail),
            "DELETE",
            ["RST", "FIN"]
        )
    })

    onAppEvent("progression:level-up", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.CAREER,
            "HTTP",
            `POST /level-up {level: ${detail.level}}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("career:selected", (detail) => {
        pushPacket(
            SERVICES.CAREER,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /career/select {branch: "${detail.branch}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("career:node-unlocked", (detail) => {
        pushPacket(
            SERVICES.CAREER,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /career/node {id: "${detail.nodeId}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("autobattler:run-complete", (detail) => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.SYSTEM,
            "WS",
            `run-complete round=${detail.highestRound} losses=${detail.losses}`,
            JSON.stringify(detail)
        )
    })

    onAppEvent("autobattler:boss-defeated", (detail) => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.SYSTEM,
            "WS",
            `boss-defeated id=${detail.bossId} flawless=${detail.noUnitsLost}`,
            JSON.stringify(detail)
        )
    })

    onAppEvent("welt:exercise-passed", (detail) => {
        pushPacket(
            SERVICES.WELT_VM,
            SERVICES.CAREER,
            "FTP",
            `PUT /exercise/${detail.exercise} PASS`,
            JSON.stringify(detail),
            "PUT"
        )
    })

    onAppEvent("grund:compiled", () => {
        pushPacket(
            SERVICES.WELT_VM,
            SERVICES.SYSTEM,
            "FTP",
            "PUT /compile OK",
            "grund:compiled",
            "PUT"
        )
    })

    onAppEvent("grund:executed", () => {
        pushPacket(
            SERVICES.WELT_VM,
            SERVICES.SYSTEM,
            "FTP",
            "POST /execute OK",
            "grund:executed",
            "POST"
        )
    })

    onAppEvent("grund:ring-overflow", (detail) => {
        pushPacket(
            SERVICES.WELT_VM,
            SERVICES.SYSTEM,
            "ICMP",
            `RING OVERFLOW ptr=${detail.pointer}`,
            JSON.stringify(detail),
            undefined,
            ["RST"]
        )
    })

    onAppEvent("welt:error", (detail) => {
        pushPacket(
            SERVICES.WELT_VM,
            SERVICES.SYSTEM,
            "ICMP",
            `FAULT type=${detail.type}`,
            JSON.stringify(detail),
            undefined,
            ["RST"]
        )
    })

    onAppEvent("terminal:file-saved", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.WELT_VM,
            "FTP",
            `PUT ${detail.path} ${detail.isNew ? "NEW" : "UPDATE"}`,
            JSON.stringify(detail),
            "PUT"
        )
    })

    onAppEvent("market:employee-hired", (detail) => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /hr/hire {type: "${detail.type}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("market:employee-fired", (detail) => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `DELETE /hr/terminate {type: "${detail.type}"}`,
            JSON.stringify(detail),
            "DELETE"
        )
    })

    onAppEvent("veil:triggered", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            `VEIL ${detail.veilId} TRIGGERED`,
            JSON.stringify(detail),
            undefined,
            ["SYN"]
        )
    })

    onAppEvent("system-crash:triggered", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            `CRASH type=${detail.effectType}`,
            JSON.stringify(detail),
            undefined,
            ["RST", "FIN"]
        )
    })

    onAppEvent("cosmetic:changed", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.CAREER,
            "HTTP",
            `PUT /cosmetic/${detail.type} {id: "${detail.id}"}`,
            JSON.stringify(detail),
            "PUT"
        )
    })

    onAppEvent("pinball:gameover", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.CAREER,
            "UDP",
            `pinball score=${detail.score} high=${detail.highScore}`,
            JSON.stringify(detail)
        )
    })
}

// ── Market engine bridge ────────────────────────────────────────────────
// The market engine uses internal events (game.on), not app events.
// We provide a function for the init layer to wire after getMarketGame().

export function wireMarketEngineToPacketBridge(game: {
    on(event: string, callback: (...args: never[]) => void): void
}): void {
    let tickSeq = 0

    game.on("marketTick", () => {
        tickSeq++
        // Only emit every 5th tick to avoid flooding
        if (tickSeq % 5 === 0) {
            pushPacket(
                SERVICES.MARKET,
                SERVICES.FACTORY,
                "UDP",
                `tick seq=${tickSeq}`,
                `seq=${tickSeq}`
            )
        }
    })

    game.on("tradeExecuted", (data) => {
        const d = data as {
            commodityId: string
            quantity: number
            pricePerUnit: number
            action: string
        }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /trade [${d.commodityId} x${d.quantity} @ $${d.pricePerUnit?.toFixed(2)}]`,
            JSON.stringify(d),
            "POST"
        )
    })

    game.on("factoryDeployed", (data) => {
        const d = data as { factoryId?: string }
        pushPacket(
            SERVICES.FACTORY,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /deploy {factory: "${d.factoryId ?? "unknown"}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    game.on("newsEvent", (data) => {
        const d = data as { headline?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "SMTP",
            `MARKET NEWS: ${d.headline ?? "event"}`,
            JSON.stringify(d)
        )
    })

    game.on("upgradeAcquired", (data) => {
        const d = data as string
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /upgrade {id: "${d}"}`,
            `upgrade=${d}`,
            "POST"
        )
    })

    game.on("dasCreated", (data) => {
        const d = data as { commodityId?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.PRESTIGE,
            "HTTP",
            `POST /das/mint {commodity: "${d.commodityId ?? "?"}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    game.on("marginEvent", () => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "ICMP",
            "MARGIN CALL",
            "margin-event",
            undefined,
            ["RST"]
        )
    })

    game.on("ratingChanged", (data) => {
        const d = data as { rating?: string; direction?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `PUT /credit-rating {rating: "${d.rating}", direction: "${d.direction}"}`,
            JSON.stringify(d),
            "PUT"
        )
    })

    game.on("phaseUnlocked", (data) => {
        const phase = data as number
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /phase/unlock {phase: ${phase}}`,
            `phase=${phase}`,
            "POST",
            ["SYN", "ACK"]
        )
    })

    game.on("influenceExecuted", (data) => {
        const d = data as { influenceId?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.MARKET,
            "HTTP",
            `POST /influence {id: "${d.influenceId ?? "?"}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    game.on("limitOrderFilled", (data) => {
        const d = data as { commodityId?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /limit-order/fill {commodity: "${d.commodityId ?? "?"}"}`,
            JSON.stringify(d),
            "POST"
        )
    })
}
