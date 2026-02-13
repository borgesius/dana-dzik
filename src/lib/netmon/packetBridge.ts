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
            SERVICES.VEIL,
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
            SERVICES.COSMETICS,
            SERVICES.SYSTEM,
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

    // ── Additional app events ────────────────────────────────────────────────

    onAppEvent("calm-mode:toggled", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "calm-mode toggled",
            "calm-mode:toggled"
        )
    })

    onAppEvent("calm-mode:changed", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            `calm-mode=${detail.enabled}`,
            JSON.stringify(detail)
        )
    })

    onAppEvent("qa:report-clicked", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "HTTP",
            "POST /qa/report",
            "qa-report",
            "POST"
        )
    })

    onAppEvent("popup:bonus-claimed", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.MARKET,
            "HTTP",
            "POST /popup/bonus-claim",
            "bonus-claimed",
            "POST"
        )
    })

    onAppEvent("popup:x-dismissed", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            `popup dismissed: ${detail.headline}`,
            JSON.stringify(detail)
        )
    })

    onAppEvent("felix:message", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "SMTP",
            "FELIX message sent",
            "felix:message"
        )
    })

    onAppEvent("felix:editor", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.WELT_VM,
            "HTTP",
            "POST /felix/editor",
            "felix:editor",
            "POST"
        )
    })

    onAppEvent("freak:used", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            "FREAK activated",
            "freak:used",
            undefined,
            ["SYN"]
        )
    })

    onAppEvent("session-cost:cost-1", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-1",
            "cost-1"
        )
    })

    onAppEvent("session-cost:cost-2", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-2",
            "cost-2"
        )
    })

    onAppEvent("session-cost:cost-3", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-3",
            "cost-3"
        )
    })

    onAppEvent("session-cost:cost-4", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-4",
            "cost-4"
        )
    })

    onAppEvent("session-cost:cost-5", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-5",
            "cost-5"
        )
    })

    onAppEvent("session-cost:cost-6", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-6",
            "cost-6"
        )
    })

    onAppEvent("session-cost:cost-7", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "cost-threshold-7",
            "cost-7"
        )
    })

    onAppEvent("analytics:intent", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            `analytics type=${detail.type}`,
            JSON.stringify(detail)
        )
    })

    onAppEvent("autobattler:unit-unlocked", (detail) => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.CAREER,
            "HTTP",
            `POST /unit/unlock {id: "${detail.unitId}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("autobattler:relic-unlocked", (detail) => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.CAREER,
            "HTTP",
            `POST /relic/unlock {id: "${detail.relicId}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("autobattler:spiral-complete", () => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.SYSTEM,
            "HTTP",
            "POST /spiral/complete",
            "spiral-complete",
            "POST",
            ["SYN", "ACK"]
        )
    })

    onAppEvent("autobattler:faction-complete", (detail) => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /faction/complete {faction: "${detail.faction}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("career:switched", (detail) => {
        pushPacket(
            SERVICES.CAREER,
            SERVICES.SYSTEM,
            "HTTP",
            `PUT /career/switch {from: "${detail.from}", to: "${detail.to}"}`,
            JSON.stringify(detail),
            "PUT"
        )
    })

    onAppEvent("market:scrap-dividend", () => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            "POST /dividend/scrap",
            "scrap-dividend",
            "POST"
        )
    })

    onAppEvent("market:org-reorg", () => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            "POST /org/reorg",
            "org-reorg",
            "POST"
        )
    })

    onAppEvent("cosmetic:unlocked", (detail) => {
        pushPacket(
            SERVICES.COSMETICS,
            SERVICES.CAREER,
            "HTTP",
            `POST /cosmetic/unlock {type: "${detail.type}", id: "${detail.id}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("glitch:triggered", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            `GLITCH type=${detail.type}`,
            JSON.stringify(detail),
            undefined,
            ["RST"]
        )
    })

    onAppEvent("veil:unlocked", (detail) => {
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /veil/unlock {id: "${detail.veilId}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("veil:completed", (detail) => {
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /veil/complete {id: "${detail.veilId}", attempts: ${detail.attempts}}`,
            JSON.stringify(detail),
            "POST",
            ["ACK"]
        )
    })

    onAppEvent("veil:failed", (detail) => {
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "ICMP",
            `VEIL FAILED id=${detail.veilId}`,
            JSON.stringify(detail),
            undefined,
            ["RST"]
        )
    })

    onAppEvent("veil:boss-defeated", () => {
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "HTTP",
            "POST /veil/boss-defeated",
            "boss-defeated",
            "POST",
            ["SYN", "ACK"]
        )
    })

    onAppEvent("netmon:opened", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "netmon opened",
            "netmon:opened"
        )
    })

    onAppEvent("netmon:packet-expanded", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "packet-expanded",
            "netmon:packet-expanded"
        )
    })

    onAppEvent("netmon:unknown-host-filtered", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "filter unknown-host",
            "netmon:unknown-host-filtered"
        )
    })

    onAppEvent("netmon:nmap-run", () => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "UDP",
            "nmap scan initiated",
            "netmon:nmap-run"
        )
    })

    onAppEvent("prestige:foresight-purchase", (detail) => {
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /foresight/upgrade {id: "${detail.upgradeId}"}`,
            JSON.stringify(detail),
            "POST"
        )
    })

    onAppEvent("system-file-modified", (detail) => {
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            `SYSTEM FILE MODIFIED file=${detail.filename} severity=${detail.severity}`,
            JSON.stringify(detail),
            undefined,
            ["RST"]
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

    // ── Additional MarketEngine events ──────────────────────────────────────

    game.on("portfolioChanged", () => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "UDP",
            "portfolio-update",
            "portfolioChanged"
        )
    })

    game.on("moneyChanged", (data) => {
        const cash = data as number
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "UDP",
            `cash=${cash.toFixed(2)}`,
            `cash=${cash}`
        )
    })

    game.on("commodityUnlocked", (data) => {
        const commodityId = data as string
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /commodity/unlock {id: "${commodityId}"}`,
            `commodity=${commodityId}`,
            "POST"
        )
    })

    game.on("harvestExecuted", (data) => {
        const d = data as { commodityId?: string; quantity?: number }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "UDP",
            `harvest ${d.commodityId} qty=${d.quantity}`,
            JSON.stringify(d)
        )
    })

    game.on("dasDefaulted", (data) => {
        const d = data as { dasId?: string; commodityId?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "ICMP",
            `DAS DEFAULT id=${d.dasId} commodity=${d.commodityId}`,
            JSON.stringify(d),
            undefined,
            ["RST"]
        )
    })

    game.on("dasUnwound", (data) => {
        const d = data as { dasId?: string; commodityId?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.PRESTIGE,
            "HTTP",
            `DELETE /das/unwind {id: "${d.dasId}", commodity: "${d.commodityId}"}`,
            JSON.stringify(d),
            "DELETE"
        )
    })

    game.on("debtChanged", (data) => {
        const d = data as { debt?: number; borrowed?: number; repaid?: number }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "UDP",
            `debt=${d.debt?.toFixed(2)} borrowed=${d.borrowed ?? 0} repaid=${d.repaid ?? 0}`,
            JSON.stringify(d)
        )
    })

    game.on("automatedIncome", (data) => {
        const d = data as { amount?: number }
        pushPacket(
            SERVICES.FACTORY,
            SERVICES.MARKET,
            "UDP",
            `automated-income amount=${d.amount?.toFixed(2)}`,
            JSON.stringify(d)
        )
    })

    game.on("moraleEvent", (data) => {
        const d = data as { type?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "SMTP",
            `MORALE EVENT: ${d.type ?? "unknown"}`,
            JSON.stringify(d)
        )
    })

    game.on("orgChartChanged", () => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "UDP",
            "org-chart-update",
            "orgChartChanged"
        )
    })

    game.on("employeeHired", (data) => {
        const d = data as { type?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /hr/hire {type: "${d.type}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    game.on("employeeFired", (data) => {
        const d = data as { type?: string }
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "HTTP",
            `DELETE /hr/terminate {type: "${d.type}"}`,
            JSON.stringify(d),
            "DELETE"
        )
    })

    game.on("popupsActivate", (data) => {
        const level = data as number
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.SYSTEM,
            "ICMP",
            `POPUPS ACTIVATED level=${level}`,
            `level=${level}`,
            undefined,
            ["SYN"]
        )
    })

    game.on("stateChanged", () => {
        pushPacket(
            SERVICES.MARKET,
            SERVICES.SYSTEM,
            "UDP",
            "state-update",
            "stateChanged"
        )
    })
}

// ── Wire additional managers to packet bridge ───────────────────────────────

export function wireAdditionalManagersToPacketBridge(managers: {
    prestige: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    career: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    collection: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    progression: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    theme: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    locale: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    veil: {
        on(event: string, callback: (...args: never[]) => void): void
    }
    runManager?: {
        on(event: string, callback: (...args: never[]) => void): void
    }
}): void {
    // ── PrestigeManager events ───────────────────────────────────────────────
    managers.prestige.on("prestigeTriggered", (data) => {
        const d = data as {
            count?: number
            hindsightGained?: number
            totalHindsight?: number
        }
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.MARKET,
            "HTTP",
            `DELETE /state {count: ${d.count}, hindsight: +${d.hindsightGained}}`,
            JSON.stringify(d),
            "DELETE",
            ["RST"]
        )
    })

    managers.prestige.on("hindsightPurchase", (data) => {
        const d = data as { upgradeId?: string; remaining?: number }
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /hindsight/upgrade {id: "${d.upgradeId}", remaining: ${d.remaining}}`,
            JSON.stringify(d),
            "POST"
        )
    })

    managers.prestige.on("ascensionTriggered", (data) => {
        const d = data as { count?: number; foresightGained?: number }
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.SYSTEM,
            "HTTP",
            `DELETE /ascend {count: ${d.count}, foresight: +${d.foresightGained}}`,
            JSON.stringify(d),
            "DELETE",
            ["RST", "FIN"]
        )
    })

    managers.prestige.on("foresightPurchase", (data) => {
        const d = data as { upgradeId?: string; remaining?: number }
        pushPacket(
            SERVICES.PRESTIGE,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /foresight/upgrade {id: "${d.upgradeId}", remaining: ${d.remaining}}`,
            JSON.stringify(d),
            "POST"
        )
    })

    // ── CareerManager events ─────────────────────────────────────────────────
    managers.career.on("careerSelected", (data) => {
        const d = data as { branch?: string }
        pushPacket(
            SERVICES.CAREER,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /career/select {branch: "${d.branch}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    managers.career.on("nodeUnlocked", (data) => {
        const d = data as { nodeId?: string; branch?: string }
        pushPacket(
            SERVICES.CAREER,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /career/node {id: "${d.nodeId}", branch: "${d.branch}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    managers.career.on("careerSwitched", (data) => {
        const d = data as { from?: string; to?: string }
        pushPacket(
            SERVICES.CAREER,
            SERVICES.SYSTEM,
            "HTTP",
            `PUT /career/switch {from: "${d.from}", to: "${d.to}"}`,
            JSON.stringify(d),
            "PUT"
        )
    })

    // ── CollectionManager events ─────────────────────────────────────────────
    managers.collection.on("unitUnlocked", (data) => {
        const d = data as { unitId?: string }
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.CAREER,
            "HTTP",
            `POST /unit/unlock {id: "${d.unitId}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    managers.collection.on("factionComplete", (data) => {
        const d = data as { faction?: string }
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /faction/complete {faction: "${d.faction}"}`,
            JSON.stringify(d),
            "POST",
            ["SYN", "ACK"]
        )
    })

    managers.collection.on("spiralComplete", () => {
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.SYSTEM,
            "HTTP",
            "POST /spiral/complete",
            "spiral-complete",
            "POST",
            ["SYN", "ACK"]
        )
    })

    managers.collection.on("relicUnlocked", (data) => {
        const d = data as { relicId?: string }
        pushPacket(
            SERVICES.SYMPOSIUM,
            SERVICES.CAREER,
            "HTTP",
            `POST /relic/unlock {id: "${d.relicId}"}`,
            JSON.stringify(d),
            "POST"
        )
    })

    // ── ProgressionManager events ────────────────────────────────────────────
    managers.progression.on("xpGained", (data) => {
        const d = data as { amount?: number; totalXP?: number }
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.CAREER,
            "UDP",
            `xp +${d.amount} total=${d.totalXP}`,
            JSON.stringify(d)
        )
    })

    managers.progression.on("levelUp", (data) => {
        const d = data as { oldLevel?: number; newLevel?: number }
        pushPacket(
            SERVICES.SYSTEM,
            SERVICES.CAREER,
            "HTTP",
            `POST /level-up {old: ${d.oldLevel}, new: ${d.newLevel}}`,
            JSON.stringify(d),
            "POST",
            ["SYN", "ACK"]
        )
    })

    // ── ThemeManager events ──────────────────────────────────────────────────
    managers.theme.on("themeChanged", (data) => {
        const d = data as { theme?: string }
        pushPacket(
            SERVICES.COSMETICS,
            SERVICES.SYSTEM,
            "UDP",
            `theme=${d.theme}`,
            JSON.stringify(d)
        )
    })

    managers.theme.on("colorSchemeChanged", (data) => {
        const d = data as { colorScheme?: string }
        pushPacket(
            SERVICES.COSMETICS,
            SERVICES.SYSTEM,
            "UDP",
            `color-scheme=${d.colorScheme}`,
            JSON.stringify(d)
        )
    })

    // ── LocaleManager events ─────────────────────────────────────────────────
    managers.locale.on("localeChanged", (data) => {
        const d = data as { locale?: string }
        pushPacket(
            SERVICES.COSMETICS,
            SERVICES.SYSTEM,
            "UDP",
            `locale=${d.locale}`,
            JSON.stringify(d)
        )
    })

    // ── VeilManager events ───────────────────────────────────────────────────
    managers.veil.on("veilTriggered", (data) => {
        const d = data as { veilId?: string }
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "ICMP",
            `VEIL ${d.veilId} TRIGGERED`,
            JSON.stringify(d),
            undefined,
            ["SYN"]
        )
    })

    managers.veil.on("veilCompleted", (data) => {
        const d = data as { veilId?: string; attempts?: number }
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "HTTP",
            `POST /veil/complete {id: "${d.veilId}", attempts: ${d.attempts}}`,
            JSON.stringify(d),
            "POST",
            ["ACK"]
        )
    })

    managers.veil.on("veilFailed", (data) => {
        const d = data as { veilId?: string }
        pushPacket(
            SERVICES.VEIL,
            SERVICES.SYSTEM,
            "ICMP",
            `VEIL FAILED id=${d.veilId}`,
            JSON.stringify(d),
            undefined,
            ["RST"]
        )
    })

    // ── RunManager events (Autobattler run state) ───────────────────────────
    if (managers.runManager) {
        managers.runManager.on("shopOpened", () => {
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.SYMPOSIUM,
                "UDP",
                "shop-phase-start",
                "shopOpened"
            )
        })

        managers.runManager.on("combatStarted", () => {
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.SYMPOSIUM,
                "WS",
                "combat-phase-start",
                "combatStarted"
            )
        })

        managers.runManager.on("combatEnded", (data) => {
            const d = data as {
                playerWon?: boolean
                round?: number
                playerUnitsRemaining?: number
            }
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.SYMPOSIUM,
                "WS",
                `combat-end won=${d.playerWon} round=${d.round} units=${d.playerUnitsRemaining}`,
                JSON.stringify(d)
            )
        })

        managers.runManager.on("runEnded", () => {
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.SYSTEM,
                "HTTP",
                "POST /run/complete",
                "runEnded",
                "POST",
                ["FIN"]
            )
        })

        managers.runManager.on("bossDefeated", (data) => {
            const d = data as { bossId?: string; noUnitsLost?: boolean }
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.SYSTEM,
                "HTTP",
                `POST /boss/defeat {id: "${d.bossId}", flawless: ${d.noUnitsLost}}`,
                JSON.stringify(d),
                "POST",
                ["SYN", "ACK"]
            )
        })

        managers.runManager.on("eventTriggered", (data) => {
            const d = data as { eventId?: string }
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.SYMPOSIUM,
                "UDP",
                `event triggered: ${d.eventId}`,
                JSON.stringify(d)
            )
        })

        managers.runManager.on("relicGained", (data) => {
            const d = data as { relicId?: string }
            pushPacket(
                SERVICES.SYMPOSIUM,
                SERVICES.CAREER,
                "HTTP",
                `POST /relic/acquire {id: "${d.relicId}"}`,
                JSON.stringify(d),
                "POST"
            )
        })
    }
}
