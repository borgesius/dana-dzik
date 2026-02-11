import { log } from "@/core/Logger"
import type {
    BiorhythmCycle,
    DivinationProfile,
    IChingLine,
    TarotCard,
} from "@/lib/divination/types"

// ─── HTML Shell ─────────────────────────────────────────────────────────────

export function getDivinationContent(): string {
    return `
        <div class="divination-content" id="divination-content">
            <div class="divination-loading" id="divination-loading">
                <div class="divination-sigil">🔮</div>
                <p>Consulting the aether...</p>
            </div>
            <div class="divination-profile" id="divination-profile" style="display: none;"></div>
            <div class="divination-error" id="divination-error" style="display: none;"></div>
        </div>
    `
}

// ─── Rendering ──────────────────────────────────────────────────────────────

export function renderDivinationWindow(): void {
    void fetchAndRender()
}

async function fetchAndRender(): Promise<void> {
    const loading = document.getElementById("divination-loading")
    const profileEl = document.getElementById("divination-profile")
    const errorEl = document.getElementById("divination-error")

    if (!profileEl || !loading || !errorEl) return

    try {
        const response = await fetch("/api/divination")
        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const result = (await response.json()) as {
            ok: boolean
            data?: DivinationProfile
            error?: string
        }

        if (!result.ok || !result.data) {
            loading.style.display = "none"
            errorEl.style.display = "block"
            errorEl.innerHTML = `
                <div class="divination-empty">
                    <div class="divination-sigil">🌑</div>
                    <p>No divination reading available yet.</p>
                    <p class="divination-hint">A reading is cast with each deployment.</p>
                </div>
            `
            return
        }

        loading.style.display = "none"
        profileEl.style.display = "block"
        profileEl.innerHTML = renderProfile(result.data)
    } catch (err) {
        log.widgets("Divination error: %O", err)
        loading.style.display = "none"
        errorEl.style.display = "block"
        errorEl.innerHTML = `
            <div class="divination-empty">
                <div class="divination-sigil">⚠️</div>
                <p>The spirits could not be reached.</p>
            </div>
        `
    }
}

function renderProfile(p: DivinationProfile): string {
    return `
        ${renderHeader(p)}
        ${renderNumerology(p)}
        ${renderTarot(p)}
        ${renderIChing(p)}
        ${renderBiorhythm(p)}
        ${renderHoroscope(p)}
        ${renderNatalChart(p)}
    `
}

// ─── Header ─────────────────────────────────────────────────────────────────

function renderHeader(p: DivinationProfile): string {
    const shortSha = p.sha.slice(0, 8)
    const date = new Date(p.timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })

    return `
        <div class="divination-header">
            <div class="divination-familiar-badge">
                <span class="familiar-emoji">${p.familiar.emoji}</span>
                <div class="familiar-info">
                    <span class="familiar-name">${p.familiar.name}</span>
                    <span class="familiar-traits">${p.familiar.traits.join(" · ")}</span>
                </div>
            </div>
            <div class="divination-meta">
                <span class="deploy-sha" title="${p.sha}">${shortSha}</span>
                <span class="deploy-date">${date}</span>
            </div>
        </div>
    `
}

// ─── Numerology ─────────────────────────────────────────────────────────────

function renderNumerology(p: DivinationProfile): string {
    const n = p.numerology
    const masterBadge =
        n.masterNumbers.length > 0
            ? `<span class="master-badge">✦ Master ${n.masterNumbers.join(", ")}</span>`
            : ""

    return `
        <div class="divination-section divination-numerology">
            <h3 class="section-title">🔢 Numerology</h3>
            <div class="numerology-grid">
                <div class="num-card">
                    <span class="num-value">${n.lifePath}</span>
                    <span class="num-label">Life Path</span>
                </div>
                <div class="num-card">
                    <span class="num-value">${n.destiny}</span>
                    <span class="num-label">Destiny</span>
                </div>
                <div class="num-card">
                    <span class="num-value">${n.soulUrge}</span>
                    <span class="num-label">Soul Urge</span>
                </div>
                <div class="num-card">
                    <span class="num-value">${n.personality}</span>
                    <span class="num-label">Personality</span>
                </div>
            </div>
            ${masterBadge}
            <p class="numerology-interp">${n.interpretation}</p>
        </div>
    `
}

// ─── Tarot ──────────────────────────────────────────────────────────────────

function renderTarotCard(card: TarotCard): string {
    const orientation = card.isReversed ? "reversed" : "upright"
    const meaning = card.isReversed ? card.reversed : card.upright
    const positionLabels = {
        past: "Past",
        present: "Present",
        future: "Future",
    }

    return `
        <div class="tarot-card ${orientation}">
            <div class="tarot-position">${positionLabels[card.position]}</div>
            <div class="tarot-face">
                <div class="tarot-numeral">${card.arcana === "major" ? toRoman(card.number) : card.number}</div>
                <div class="tarot-name">${card.name}</div>
                ${card.isReversed ? '<div class="tarot-reversed-mark">↓ Reversed</div>' : ""}
            </div>
            <div class="tarot-meaning">${meaning}</div>
        </div>
    `
}

function toRoman(n: number): string {
    const numerals: [number, string][] = [
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
    ]
    let result = ""
    let remaining = n
    for (const [value, numeral] of numerals) {
        while (remaining >= value) {
            result += numeral
            remaining -= value
        }
    }
    return result || "0"
}

function renderTarot(p: DivinationProfile): string {
    return `
        <div class="divination-section divination-tarot">
            <h3 class="section-title">🃏 Tarot Spread</h3>
            <div class="tarot-spread">
                ${p.tarot.cards.map(renderTarotCard).join("")}
            </div>
            <p class="tarot-synthesis">${p.tarot.synthesis}</p>
        </div>
    `
}

// ─── I Ching ────────────────────────────────────────────────────────────────

function renderIChingLine(value: number, lineType: IChingLine): string {
    const isYang = value === 1
    const isChanging = lineType === "old_yin" || lineType === "old_yang"
    const changeMark = isChanging ? " changing" : ""

    if (isYang) {
        return `<div class="iching-line yang${changeMark}"><span class="line-solid"></span>${isChanging ? '<span class="change-dot">○</span>' : ""}</div>`
    }
    return `<div class="iching-line yin${changeMark}"><span class="line-broken-l"></span><span class="line-gap"></span><span class="line-broken-r"></span>${isChanging ? '<span class="change-dot">×</span>' : ""}</div>`
}

function renderIChing(p: DivinationProfile): string {
    const ich = p.iching
    // Lines are bottom-to-top, so reverse for display
    const linesHtml = [...ich.lines]
        .map((val, i) => renderIChingLine(val, ich.lineTypes[i]))
        .reverse()
        .join("")

    const changingText = ich.changingTo
        ? `<p class="iching-changing">Changing to Hexagram ${ich.changingTo}</p>`
        : ""

    return `
        <div class="divination-section divination-iching">
            <h3 class="section-title">☯️ I Ching — Hexagram ${ich.hexagramNumber}</h3>
            <div class="iching-layout">
                <div class="iching-hexagram">
                    ${linesHtml}
                </div>
                <div class="iching-text">
                    <div class="iching-name">${ich.name}</div>
                    <div class="iching-trigrams">${ich.trigrams[0]} over ${ich.trigrams[1]}</div>
                    <p class="iching-judgment">${ich.judgment}</p>
                    <p class="iching-image"><em>${ich.image}</em></p>
                    ${changingText}
                </div>
            </div>
        </div>
    `
}

// ─── Biorhythm ──────────────────────────────────────────────────────────────

function renderBiorhythmBar(cycle: BiorhythmCycle, color: string): string {
    const offset = 50 + cycle.value * 50
    return `
        <div class="bio-row">
            <span class="bio-label">${cycle.label}</span>
            <div class="bio-track">
                <div class="bio-fill" style="width: ${offset}%; background: ${color};"></div>
                <div class="bio-marker" style="left: ${offset}%"></div>
            </div>
            <span class="bio-value">${cycle.percentage}%</span>
            <span class="bio-phase">${cycle.phase}</span>
        </div>
    `
}

function renderBiorhythmSvg(p: DivinationProfile): string {
    const w = 280
    const h = 80
    const mid = h / 2
    const dayNum = p.biorhythm.dayNumber

    function makePath(period: number, color: string): string {
        const points: string[] = []
        for (let x = 0; x <= w; x += 2) {
            const day = dayNum - w / 4 + (x / w) * (w / 2)
            const y = mid - Math.sin((2 * Math.PI * day) / period) * (mid - 4)
            points.push(`${x},${y.toFixed(1)}`)
        }
        return `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.8" />`
    }

    // Current position marker at center
    const cx = w / 2

    return `
        <svg class="bio-chart" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="${mid}" x2="${w}" y2="${mid}" stroke="currentColor" stroke-width="0.5" opacity="0.3" />
            <line x1="${cx}" y1="0" x2="${cx}" y2="${h}" stroke="currentColor" stroke-width="0.5" opacity="0.2" stroke-dasharray="2,2" />
            ${makePath(23, "#e74c3c")}
            ${makePath(28, "#3498db")}
            ${makePath(33, "#2ecc71")}
            <circle cx="${cx}" cy="${mid - p.biorhythm.physical.value * (mid - 4)}" r="3" fill="#e74c3c" />
            <circle cx="${cx}" cy="${mid - p.biorhythm.emotional.value * (mid - 4)}" r="3" fill="#3498db" />
            <circle cx="${cx}" cy="${mid - p.biorhythm.intellectual.value * (mid - 4)}" r="3" fill="#2ecc71" />
        </svg>
    `
}

function renderBiorhythm(p: DivinationProfile): string {
    const bio = p.biorhythm
    return `
        <div class="divination-section divination-biorhythm">
            <h3 class="section-title">📊 Biorhythm — Day ${bio.dayNumber}</h3>
            ${renderBiorhythmSvg(p)}
            <div class="bio-bars">
                ${renderBiorhythmBar(bio.physical, "#e74c3c")}
                ${renderBiorhythmBar(bio.emotional, "#3498db")}
                ${renderBiorhythmBar(bio.intellectual, "#2ecc71")}
            </div>
            <div class="bio-overall">Overall: ${bio.overallPercentage}%</div>
        </div>
    `
}

// ─── Horoscope ──────────────────────────────────────────────────────────────

function renderHoroscope(p: DivinationProfile): string {
    const h = p.horoscope
    return `
        <div class="divination-section divination-horoscope">
            <h3 class="section-title">${h.signEmoji} ${h.sign} — ${h.dateRange}</h3>
            <p class="horoscope-text">${h.horoscope}</p>
            <div class="horoscope-details">
                <span class="horoscope-detail">Mood: <strong>${h.mood}</strong></span>
                <span class="horoscope-detail">Lucky #: <strong>${h.luckyNumber}</strong></span>
                <span class="horoscope-detail">Lucky Time: <strong>${h.luckyTime}</strong></span>
                <span class="horoscope-detail">Color: <strong>${h.color}</strong></span>
                <span class="horoscope-detail">Compat: <strong>${h.compatibility}</strong></span>
            </div>
        </div>
    `
}

// ─── Natal Chart ────────────────────────────────────────────────────────────

function renderNatalChart(p: DivinationProfile): string {
    if (!p.natalChart) {
        return `
            <div class="divination-section divination-natal">
                <h3 class="section-title">🌌 Natal Chart</h3>
                <p class="natal-unavailable">The stars were not aligned for this reading.</p>
            </div>
        `
    }

    const nc = p.natalChart
    const planetRows = nc.planets
        .map(
            (pl) => `
            <tr>
                <td>${pl.planet}</td>
                <td>${pl.sign}</td>
                <td>${pl.degree}°</td>
                <td>House ${pl.house}</td>
            </tr>
        `
        )
        .join("")

    return `
        <div class="divination-section divination-natal">
            <h3 class="section-title">🌌 Natal Chart — ${nc.location}</h3>
            <div class="natal-big-three">
                <div class="natal-sign">
                    <span class="natal-label">☀️ Sun</span>
                    <span class="natal-value">${nc.sunSign}</span>
                </div>
                <div class="natal-sign">
                    <span class="natal-label">🌙 Moon</span>
                    <span class="natal-value">${nc.moonSign}</span>
                </div>
                <div class="natal-sign">
                    <span class="natal-label">⬆️ Rising</span>
                    <span class="natal-value">${nc.risingSign}</span>
                </div>
            </div>
            <table class="natal-planets">
                <thead>
                    <tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th></tr>
                </thead>
                <tbody>${planetRows}</tbody>
            </table>
        </div>
    `
}
