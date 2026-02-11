import { emitAppEvent } from "../events"
import { getPacketBuffer } from "../netmon/packetBuffer"
import { resolveHost } from "../netmon/services"
import { TopologyRenderer } from "../netmon/topology"
import type { Packet, Protocol } from "../netmon/types"

export function getMDContent(): string {
    return `<div id="md-content" class="md-container">
    <div class="md-header">
        <span class="md-title">M.D.</span>
        <span class="md-subtitle">Monitoring and Analysis of Traffic Daemon v1.0</span>
    </div>
    <div class="md-topology">
        <canvas id="md-topology-canvas"></canvas>
    </div>
    <div class="md-log-section">
        <div class="md-filter-bar">
            <input class="md-filter-input" type="text"
                   placeholder="filter: src:MARKET proto:WS size:>100" />
            <button class="md-pause-btn">LIVE</button>
        </div>
        <div class="md-log-table-wrap">
            <table class="md-log-table">
                <thead>
                    <tr>
                        <th class="md-col-time">TIME</th>
                        <th class="md-col-src">SRC</th>
                        <th class="md-col-dst">DST</th>
                        <th class="md-col-proto">PROTO</th>
                        <th class="md-col-summary">SUMMARY</th>
                    </tr>
                </thead>
                <tbody id="md-log-body"></tbody>
            </table>
        </div>
    </div>
</div>`
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    const d = new Date(ts)
    const h = String(d.getHours()).padStart(2, "0")
    const m = String(d.getMinutes()).padStart(2, "0")
    const s = String(d.getSeconds()).padStart(2, "0")
    const ms = String(d.getMilliseconds()).padStart(3, "0")
    return `${h}:${m}:${s}.${ms}`
}

function formatAddr(addr: string): string {
    const name = resolveHost(addr)
    if (name) {
        return `<span class="md-addr-name">${name}</span>`
    }
    return `<span class="md-addr-unknown">${addr}</span>`
}

function protoClass(proto: Protocol): string {
    return `md-proto-${proto.toLowerCase().replace(/[^a-z]/g, "")}`
}

function matchesFilter(packet: Packet, filter: string): boolean {
    if (!filter) return true
    const parts = filter.toLowerCase().split(/\s+/)
    for (const part of parts) {
        if (part.startsWith("src:")) {
            const val = part.slice(4)
            const srcName = resolveHost(packet.src.addr).toLowerCase()
            if (!srcName.includes(val) && !packet.src.addr.includes(val))
                return false
        } else if (part.startsWith("dst:")) {
            const val = part.slice(4)
            const dstName = resolveHost(packet.dst.addr).toLowerCase()
            if (!dstName.includes(val) && !packet.dst.addr.includes(val))
                return false
        } else if (part.startsWith("proto:")) {
            const val = part.slice(6)
            if (!packet.protocol.toLowerCase().includes(val)) return false
        } else if (part.startsWith("size:>")) {
            const val = parseInt(part.slice(6), 10)
            if (isNaN(val) || packet.size <= val) return false
        } else if (part.startsWith("size:<")) {
            const val = parseInt(part.slice(6), 10)
            if (isNaN(val) || packet.size >= val) return false
        } else {
            // General search in summary
            if (!packet.summary.toLowerCase().includes(part)) return false
        }
    }
    return true
}

// ── Render ───────────────────────────────────────────────────────────────

let expandedPacketId = -1
let _expandCount = 0

export function renderMDWindow(): void {
    const canvas = document.getElementById(
        "md-topology-canvas"
    ) as HTMLCanvasElement | null
    const logBody = document.getElementById("md-log-body")
    const filterInput = document.querySelector(".md-filter-input")
    const pauseBtn = document.querySelector(".md-pause-btn")

    if (!canvas || !logBody) return

    emitAppEvent("netmon:opened")

    const topology = new TopologyRenderer(canvas)
    topology.start()

    const buf = getPacketBuffer()
    let paused = false
    let filterText = ""
    let nodeFilter = ""

    const resizeObs = new ResizeObserver(() => topology.resize())
    const topoContainer = canvas.parentElement
    if (topoContainer) resizeObs.observe(topoContainer)

    topology.setOnNodeClick((addr) => {
        nodeFilter = addr
        rebuildLog()
        if (addr.startsWith("10.0.7.")) {
            emitAppEvent("netmon:unknown-host-filtered")
        }
    })

    filterInput?.addEventListener("input", () => {
        filterText = (filterInput as HTMLInputElement).value
        if (!paused) rebuildLog()
    })

    pauseBtn?.addEventListener("click", () => {
        paused = !paused
        if (pauseBtn) {
            pauseBtn.textContent = paused ? "PAUSED" : "LIVE"
            pauseBtn.classList.toggle("active", paused)
        }
        if (!paused) rebuildLog()
    })

    function shouldShow(p: Packet): boolean {
        if (nodeFilter) {
            if (p.src.addr !== nodeFilter && p.dst.addr !== nodeFilter)
                return false
        }
        return matchesFilter(p, filterText)
    }

    function createRow(p: Packet): HTMLTableRowElement {
        const tr = document.createElement("tr")
        tr.dataset.packetId = String(p.id)

        tr.innerHTML = `
            <td class="md-col-time">${formatTime(p.timestamp)}</td>
            <td class="md-col-src">${formatAddr(p.src.addr)}</td>
            <td class="md-col-dst">${formatAddr(p.dst.addr)}</td>
            <td class="md-col-proto"><span class="${protoClass(p.protocol)}">${p.protocol}</span></td>
            <td class="md-col-summary">${escapeHtml(p.summary)}</td>
        `

        tr.addEventListener("click", () => {
            if (expandedPacketId === p.id) {
                expandedPacketId = -1
                const detail = tr.nextElementSibling
                if (detail?.classList.contains("md-detail-row")) {
                    detail.remove()
                }
                tr.classList.remove("selected")
            } else {
                const prev = logBody?.querySelector(".md-detail-row")
                if (prev) {
                    prev.previousElementSibling?.classList.remove("selected")
                    prev.remove()
                }

                expandedPacketId = p.id
                tr.classList.add("selected")
                _expandCount++
                emitAppEvent("netmon:packet-expanded")

                const detailRow = document.createElement("tr")
                detailRow.className = "md-detail-row"
                const td = document.createElement("td")
                td.colSpan = 5
                td.innerHTML = `<div class="md-packet-detail">
                    <span class="md-packet-detail-label">ID:</span>
                    <span class="md-packet-detail-value">${p.id}</span>
                    &nbsp;&nbsp;
                    <span class="md-packet-detail-label">SIZE:</span>
                    <span class="md-packet-detail-value">${p.size}B</span>
                    &nbsp;&nbsp;
                    <span class="md-packet-detail-label">FLAGS:</span>
                    <span class="md-packet-detail-value">${p.flags?.join(",") || "---"}</span>
                    &nbsp;&nbsp;
                    <span class="md-packet-detail-label">METHOD:</span>
                    <span class="md-packet-detail-value">${p.method || "---"}</span>
                    <div class="md-packet-detail-payload">${escapeHtml(p.payload)}</div>
                </div>`
                detailRow.appendChild(td)
                tr.after(detailRow)
            }
        })

        return tr
    }

    function rebuildLog(): void {
        if (!logBody) return
        logBody.innerHTML = ""
        expandedPacketId = -1
        const packets = buf.snapshot().filter(shouldShow)
        // Show last 100 for performance
        const visible = packets.slice(-100)
        for (const p of visible) {
            logBody.appendChild(createRow(p))
        }
        scrollToBottom()
    }

    function scrollToBottom(): void {
        const wrap = logBody?.parentElement
        if (wrap) {
            wrap.scrollTop = wrap.scrollHeight
        }
    }

    const existing = buf.snapshot()
    for (const p of existing.slice(-100)) {
        topology.ingestPacket(p)
        if (shouldShow(p)) {
            logBody.appendChild(createRow(p))
        }
    }
    scrollToBottom()

    buf.subscribe((packet) => {
        topology.ingestPacket(packet)
        if (paused) return
        if (!shouldShow(packet)) return
        if (!logBody) return

        logBody.appendChild(createRow(packet))

        // Cap visible rows at 100
        while (logBody.children.length > 100) {
            logBody.removeChild(logBody.children[0])
        }

        scrollToBottom()
    })
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}
