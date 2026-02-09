import { getCollectionManager } from "../autobattler/CollectionManager"
import { createCombatUnit } from "../autobattler/combat"
import { CombatAnimator } from "../autobattler/CombatAnimator"
import { BOSS_MAP, getOpponentStatMultiplier } from "../autobattler/opponents"
import { getBuffCost, RUN_BUFFS, type RunBuff } from "../autobattler/runBuffs"
import { RunManager } from "../autobattler/RunManager"
import { getMaxLineSlots, MAX_BENCH_SIZE } from "../autobattler/shop"
import type { FactionId, RunSummary } from "../autobattler/types"
import {
    factionIcon,
    factionLabel,
    renderDefCard,
    renderEmptySlot,
    renderUnitCard,
    unitDisplayName,
} from "../autobattler/UnitCard"
import { getUnitsForFaction, UNIT_MAP } from "../autobattler/units"
import { emitAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import type { CommodityId } from "../marketGame/types"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import { getCareerManager } from "../progression/CareerManager"
import { getProgressionManager } from "../progression/ProgressionManager"
import { saveManager } from "../saveManager"

const MAX_LIVES = 3

function renderLives(losses: number): string {
    const remaining = MAX_LIVES - losses
    const filled = "&#9829;".repeat(Math.max(0, remaining))
    const empty = "&#9825;".repeat(Math.min(MAX_LIVES, losses))
    return `<span class="ab-lives">${filled}${empty}</span>`
}

let activeRun: RunManager | null = null
let activeAnimator: CombatAnimator | null = null
let lastProcessedRewardIndex = 0

// ── Drag state ──────────────────────────────────────────────────────────────

interface DragState {
    source: "lineup" | "bench"
    index: number
    ghost: HTMLElement | null
    startX: number
    startY: number
}

let dragState: DragState | null = null

// ── Entry points ────────────────────────────────────────────────────────────

export function getAutobattlerContent(): string {
    return `<div id="autobattler-content" class="autobattler-container"></div>`
}

export function renderAutobattlerWindow(): void {
    const container = document.getElementById("autobattler-content")
    if (!container) return

    activeAnimator?.destroy()
    activeAnimator = null
    if (activeRun && !activeRun.isFinished()) {
        renderRunView(container)
    } else {
        renderLobbyView(container)
    }
}

// ── Lobby ────────────────────────────────────────────────────────────────────

function renderLobbyView(container: HTMLElement): void {
    const collection = getCollectionManager()
    const career = getCareerManager()
    const atkBonus = career.getBonus("autobattlerATK")
    const hpBonus = career.getBonus("autobattlerHP")
    const clockworkATK = career.getBonus("autobattlerATK_clockwork")
    const quickdrawATK = career.getBonus("autobattlerATK_quickdraw")
    const deputiesATK = career.getBonus("autobattlerATK_deputies")
    const prospectorsATK = career.getBonus("autobattlerATK_prospectors")

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)
    let html = `
        <div class="ab-lobby">
            <h2 class="ab-title">${t("symposium.ui.title")}</h2>
            <p class="ab-subtitle">${t("symposium.ui.subtitle")}</p>

            <div class="ab-stats">
                <div class="ab-stat"><span class="ab-stat-label">${t("symposium.ui.runs")}</span><span class="ab-stat-value">${collection.getCompletedRuns()}</span></div>
                <div class="ab-stat"><span class="ab-stat-label">${t("symposium.ui.highestRound")}</span><span class="ab-stat-value">${collection.getHighestRound()}</span></div>
                <div class="ab-stat"><span class="ab-stat-label">${t("symposium.ui.collectionLabel")}</span><span class="ab-stat-value">${collection.getCollectionSize()}</span></div>
            </div>
    `

    // Personal bests section
    const totalBosses = collection.getTotalBossesDefeated()
    if (collection.getHighestRound() > 0 || totalBosses > 0) {
        html += `
            <div class="ab-personal-bests">
                <div class="ab-section-heading">${t("symposium.ui.personalBests")}</div>
                <div class="ab-bests-grid">
                    <div class="ab-best-item"><span class="ab-best-label">${t("symposium.ui.bossesDefeated")}</span><span class="ab-best-value">${totalBosses}</span></div>
                </div>
            </div>
        `
    }

    const hasBonuses =
        atkBonus > 0 ||
        hpBonus > 0 ||
        clockworkATK > 0 ||
        quickdrawATK > 0 ||
        deputiesATK > 0 ||
        prospectorsATK > 0
    if (hasBonuses) {
        html += `<div class="ab-bonuses"><span class="ab-bonuses-label">${t("symposium.ui.careerBonuses")}</span>`
        if (atkBonus > 0) {
            html += `<span class="ab-bonus-badge">+${Math.round(atkBonus * 100)}% ATK</span>`
        }
        if (hpBonus > 0) {
            html += `<span class="ab-bonus-badge">+${Math.round(hpBonus * 100)}% HP</span>`
        }
        if (clockworkATK > 0) {
            html += `<span class="ab-bonus-badge">+${Math.round(clockworkATK * 100)}% ♾️ ATK</span>`
        }
        if (quickdrawATK > 0) {
            html += `<span class="ab-bonus-badge">+${Math.round(quickdrawATK * 100)}% ⚡ ATK</span>`
        }
        if (deputiesATK > 0) {
            html += `<span class="ab-bonus-badge">+${Math.round(deputiesATK * 100)}% 🏛️ ATK</span>`
        }
        if (prospectorsATK > 0) {
            html += `<span class="ab-bonus-badge">+${Math.round(prospectorsATK * 100)}% 🌀 ATK</span>`
        }
        html += `</div>`
    }

    html += `<button class="ab-start-btn">${t("symposium.ui.startRun")}</button>`

    const factions: FactionId[] = [
        "quickdraw",
        "deputies",
        "clockwork",
        "prospectors",
        "drifters",
    ]
    const unlockedIds = collection.getUnlockedUnitIds()

    html += `<div class="ab-section-heading">${t("symposium.ui.collection")}</div>`

    for (const faction of factions) {
        const factionUnits = getUnitsForFaction(faction)
        const unlocked = factionUnits.filter((u) => unlockedIds.has(u.id))
        if (factionUnits.length === 0) continue

        html += `
            <div class="ab-faction-group">
                <div class="ab-faction-label">
                    ${factionLabel(faction)}
                    <span class="faction-progress">${unlocked.length}/${factionUnits.length}</span>
                </div>
                <div class="ab-collection-grid">
        `

        for (const unit of factionUnits) {
            if (unlockedIds.has(unit.id)) {
                html += renderDefCard(unit, { variant: "collection" })
            } else {
                html += `<div class="uc-card uc-collection" style="opacity: 0.3">
                    <div class="uc-header"><span class="uc-name">???</span></div>
                    <div class="uc-body"><span class="uc-stats">?/?</span><span class="uc-faction">${factionIcon(faction)}</span></div>
                </div>`
            }
        }

        html += `</div></div>`
    }

    if (unlockedIds.size === 0) {
        html += `<div class="ab-empty">${t("symposium.ui.startCollecting")}</div>`
    }

    html += `</div>`
    container.innerHTML = html

    container.querySelector(".ab-start-btn")?.addEventListener("click", () => {
        renderPrepareRun(container)
    })
}

// ── Pre-run buff selection ──────────────────────────────────────────────────

function renderPrepareRun(container: HTMLElement): void {
    const game = getMarketGame()
    const selectedBuffs = new Set<string>()

    function render(): void {
        const lm = getLocaleManager()
        const t = lm.t.bind(lm)
        const netWorth = game.getNetWorth()
        let html = `<div class="ab-prepare">
            <h3>${t("symposium.ui.prepareRun")}</h3>
            <p class="ab-prepare-hint">${t("symposium.ui.prepareHint")}</p>
            <div class="ab-buff-grid">`

        for (const buff of RUN_BUFFS) {
            const holding = game.getHolding(buff.commodityId)
            const owned = holding?.quantity ?? 0
            const mkt = game.getMarketState(buff.commodityId)
            const price = mkt?.price ?? 1
            const cost = getBuffCost(netWorth, price)
            const canAfford = owned >= cost
            const isSelected = selectedBuffs.has(buff.id)
            const buffName = t(`symposium.buffs.${buff.id}.name`, {
                defaultValue: buff.name,
            })
            const buffDesc = t(`symposium.buffs.${buff.id}.description`, {
                defaultValue: buff.description,
            })
            const dollarCost = (cost * price).toFixed(2)

            html += `
                <button class="ab-buff-card ${isSelected ? "selected" : ""} ${!canAfford && !isSelected ? "disabled" : ""}"
                    data-buff="${buff.id}" ${!canAfford && !isSelected ? "disabled" : ""}>
                    <div class="ab-buff-icon">${buff.icon}</div>
                    <div class="ab-buff-name">${buffName}</div>
                    <div class="ab-buff-desc">${buffDesc}</div>
                    <div class="ab-buff-cost">${cost} ${buff.commodityId} ($${dollarCost}) · have: ${owned}</div>
                    ${isSelected ? '<div class="ab-buff-check">✓</div>' : ""}
                </button>`
        }

        html += `</div>
            <div class="ab-prepare-actions">
                <button class="ab-launch-btn">${t("symposium.ui.startRun")}${selectedBuffs.size > 0 ? ` (${selectedBuffs.size} buff${selectedBuffs.size > 1 ? "s" : ""})` : ""}</button>
                <button class="ab-back-btn">${t("symposium.ui.back")}</button>
            </div>
        </div>`

        container.innerHTML = html

        container.querySelectorAll(".ab-buff-card").forEach((btn) => {
            btn.addEventListener("click", () => {
                const buffId = btn.getAttribute("data-buff")
                if (!buffId) return
                if (selectedBuffs.has(buffId)) {
                    selectedBuffs.delete(buffId)
                } else {
                    selectedBuffs.add(buffId)
                }
                render()
            })
        })

        container
            .querySelector(".ab-launch-btn")
            ?.addEventListener("click", () => {
                const nw = game.getNetWorth()
                const buffs: RunBuff[] = []
                for (const buffId of selectedBuffs) {
                    const buff = RUN_BUFFS.find((b) => b.id === buffId)
                    if (!buff) continue
                    const holding = game.getHolding(buff.commodityId)
                    const mkt = game.getMarketState(buff.commodityId)
                    const price = mkt?.price ?? 1
                    const cost = getBuffCost(nw, price)
                    if (!holding || holding.quantity < cost) continue
                    game.grantCommodity(buff.commodityId, -cost)
                    buffs.push(buff)
                }
                startNewRun(buffs)
                renderRunView(container)
            })

        container
            .querySelector(".ab-back-btn")
            ?.addEventListener("click", () => {
                renderLobbyView(container)
            })
    }

    render()
}

function startNewRun(buffs: RunBuff[] = []): void {
    const unlockedIds = getCollectionManager().getUnlockedUnitIds()
    activeRun = new RunManager(unlockedIds, buffs)
    lastProcessedRewardIndex = 0

    const career = getCareerManager()
    const clockworkATK = career.getBonus("autobattlerATK_clockwork")
    const quickdrawATK = career.getBonus("autobattlerATK_quickdraw")
    const deputiesATK = career.getBonus("autobattlerATK_deputies")
    const prospectorsATK = career.getBonus("autobattlerATK_prospectors")
    const hasFactionBonuses =
        clockworkATK > 0 ||
        quickdrawATK > 0 ||
        deputiesATK > 0 ||
        prospectorsATK > 0
    activeRun.combatBonuses = {
        atkBonus: career.getBonus("autobattlerATK"),
        hpBonus: career.getBonus("autobattlerHP"),
        factionATK: hasFactionBonuses
            ? {
                  clockwork: clockworkATK,
                  quickdraw: quickdrawATK,
                  deputies: deputiesATK,
                  prospectors: prospectorsATK,
              }
            : undefined,
    }

    // Foresight: Thought Reserves bonus
    const scrapBonus = getPrestigeManager().getScrapReservesBonus()
    if (scrapBonus > 0) activeRun.addBonusScrap(scrapBonus)

    activeRun.on("runEnded", () => {
        const summary = activeRun!.getRunSummary()
        const state = activeRun!.getState()
        const factions = [...new Set(state.lineup.map((u) => u.faction))]
        const collection = getCollectionManager()
        collection.recordRunComplete(
            summary.majorityFaction,
            summary.losses,
            factions,
            summary.highestRound
        )
        saveManager.requestSave()
    })
    activeRun.on("bossDefeated", (data: unknown) => {
        const detail = data as { bossId: string; noUnitsLost: boolean }
        getCollectionManager().recordBossDefeated(detail.bossId)
        emitAppEvent("autobattler:boss-defeated", detail)
        saveManager.requestSave()
    })
}

// ── Run view router ─────────────────────────────────────────────────────────

function renderRunView(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()

    switch (state.phase) {
        case "shop":
        case "arrange":
            renderShopPhase(container)
            break
        case "combat":
            renderCombatPhase(container)
            break
        case "reward":
        case "finished":
            renderResultPhase(container)
            break
    }
}

// ── Shop phase ──────────────────────────────────────────────────────────────

function removeStaleTooltips(): void {
    document.querySelectorAll(".ab-tooltip").forEach((el) => el.remove())
}

function renderShopPhase(container: HTMLElement): void {
    if (!activeRun) return
    removeStaleTooltips()

    const state = activeRun.getState()
    const offers = activeRun.getShopOffers()
    const opponent = activeRun.getPreviewedOpponent()

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)

    const roundLabel = state.isBossRound
        ? t("symposium.ui.bossRound", { current: state.round })
        : t("symposium.ui.round", { current: state.round })

    let html = `
        <div class="ab-run-header ${state.isBossRound ? "boss" : ""}">
            <span class="ab-header-cell">${roundLabel}</span>
            <span class="ab-header-cell">${t("symposium.ui.thoughts", { amount: state.scrap })}</span>
            <span class="ab-header-cell">${renderLives(state.losses)}</span>
        </div>

        <div class="ab-shop-section">
            <div class="ab-section-heading">${t("symposium.ui.shop")}</div>
            <div class="ab-shop-offers">
    `

    offers.forEach((offer, i) => {
        const def = UNIT_MAP.get(offer.unitDefId)
        if (!def) return
        html += renderDefCard(def, {
            variant: "shop",
            offerIndex: i,
            cost: offer.cost,
            sold: offer.sold,
            affordable: state.scrap >= offer.cost,
        })
    })

    html += `
            </div>
            <div class="ab-shop-actions">
                <button class="ab-reroll-btn" ${state.scrap < 1 ? "disabled" : ""}>🔄 ${t("symposium.ui.reroll")}</button>
            </div>
        </div>
    `

    // Synergy bar
    html += renderSynergyBar(state.lineup)

    html += `
        <div class="ab-section-heading">
            ${t("symposium.ui.lineup")} (${state.lineup.length}/${getMaxLineSlots()})
            <span class="ab-lineup-hint">${t("symposium.ui.lineupHint")}</span>
        </div>
        <div class="ab-lineup-grid" id="ab-lineup-drop" data-zone="lineup">
    `

    const maxSlots = getMaxLineSlots()
    for (let i = 0; i < maxSlots; i++) {
        if (i < state.lineup.length) {
            html += renderUnitCard(state.lineup[i], {
                variant: "owned",
                source: "lineup",
                index: i,
                draggable: true,
                slotLabel: `${i + 1}`,
            })
        } else {
            html += renderEmptySlot(i, `${i + 1}`)
        }
    }

    html += `</div>`

    html += `<div class="ab-section-heading ab-bench-heading">${t("symposium.ui.benchOf", { count: state.bench.length, max: MAX_BENCH_SIZE })}</div>`
    html += `<div class="ab-bench-grid" id="ab-bench-drop" data-zone="bench">`

    state.bench.forEach((unit, i) => {
        html += renderUnitCard(unit, {
            variant: "owned",
            source: "bench",
            index: i,
            draggable: true,
        })
    })

    if (state.bench.length === 0) {
        html += `<div class="ab-bench-empty">${t("symposium.ui.empty")}</div>`
    }

    html += `</div>`

    // Opponent preview
    if (opponent) {
        html += `
            <div class="ab-opponent-preview">
                <div class="ab-section-heading">${t("symposium.ui.opponentPreview")}</div>
                <div class="ab-preview-header">
                    <span class="ab-preview-name">${opponent.name}</span>
                    <span class="ab-preview-faction">${factionIcon(opponent.faction)} ${factionLabel(opponent.faction)}</span>
                </div>
                <div class="ab-preview-units">
        `
        for (const u of opponent.units) {
            const def = UNIT_MAP.get(u.unitId)
            if (def) {
                const statMult = getOpponentStatMultiplier(state.round)
                const bonuses =
                    statMult > 1
                        ? { atkBonus: statMult - 1, hpBonus: statMult - 1 }
                        : undefined
                const unit = createCombatUnit(u.unitId, u.level, bonuses)
                html += renderUnitCard(unit, {
                    variant: "combat",
                    side: "opponent",
                })
            }
        }
        html += `
                </div>
            </div>
        `
    }

    html += `
        <div class="ab-actions">
            <button class="ab-fight-btn ${state.isBossRound ? "boss" : ""}" ${state.lineup.length === 0 ? "disabled" : ""}>
                ${state.isBossRound ? `⚔ ${t("symposium.ui.bossFight")}` : `⚔ ${t("symposium.ui.fight")}`}
            </button>
        </div>
    `

    container.innerHTML = html
    wireShopEvents(container)
    wireDragDrop(container)
    wireTooltips(container)
}

/** Render the faction synergy count bar */
function renderSynergyBar(lineup: { faction: FactionId }[]): string {
    const counts = new Map<FactionId, number>()
    for (const u of lineup) {
        counts.set(u.faction, (counts.get(u.faction) ?? 0) + 1)
    }

    const entries = [...counts.entries()].filter(([, c]) => c >= 2)
    if (entries.length === 0) return ""

    let html = `<div class="ab-synergy-bar">`
    for (const [faction, count] of entries) {
        html += `<span class="ab-synergy-badge" style="--uc-faction-color: var(--faction-${faction})">${factionIcon(faction)} x${count}</span>`
    }
    html += `</div>`
    return html
}

function wireShopEvents(container: HTMLElement): void {
    container.querySelectorAll(".uc-card.uc-shop:not(.sold)").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-offer") ?? "0")
            activeRun?.buyUnit(idx)
            renderShopPhase(container)
        })
    })

    container.querySelector(".ab-reroll-btn")?.addEventListener("click", () => {
        activeRun?.reroll()
        renderShopPhase(container)
    })

    container.querySelectorAll(".uc-sell-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation()
            const source = btn.getAttribute("data-source") as "lineup" | "bench"
            const idx = parseInt(btn.getAttribute("data-idx") ?? "0")
            activeRun?.sellUnit(source, idx)
            renderShopPhase(container)
        })
    })

    container.querySelector(".ab-fight-btn")?.addEventListener("click", () => {
        if (!activeRun) return
        activeRun.readyForCombat()
        renderCombatPhase(container)
    })
}

/** Wire ability tooltips on owned cards */
function wireTooltips(container: HTMLElement): void {
    let tooltipEl: HTMLElement | null = null

    container
        .querySelectorAll<HTMLElement>(".uc-card.uc-owned")
        .forEach((card) => {
            card.addEventListener("mouseenter", () => {
                const ability = card.getAttribute("data-ability")
                const factionBonus = card.getAttribute("data-faction-bonus")
                const crossBonus = card.getAttribute("data-cross-bonus")
                const unitName = card.getAttribute("data-unit-name") || ""
                const unitLevel = card.getAttribute("data-unit-level") || "1"

                if (!ability) return

                tooltipEl = document.createElement("div")
                tooltipEl.className = "ab-tooltip"
                let content = `<div class="ab-tooltip-name">${unitName} ${"★".repeat(parseInt(unitLevel))}</div>`
                content += `<div class="ab-tooltip-ability">${ability}</div>`
                if (factionBonus) {
                    content += `<div class="ab-tooltip-bonus">Faction: ${factionBonus}</div>`
                }
                if (crossBonus) {
                    content += `<div class="ab-tooltip-bonus">Bridge: ${crossBonus}</div>`
                }
                tooltipEl.innerHTML = content

                document.body.appendChild(tooltipEl)

                const rect = card.getBoundingClientRect()
                tooltipEl.style.left = `${rect.left}px`
                tooltipEl.style.top = `${rect.bottom + 4}px`
            })

            card.addEventListener("mouseleave", () => {
                tooltipEl?.remove()
                tooltipEl = null
            })
        })
}

// ── Drag and drop ───────────────────────────────────────────────────────────

function wireDragDrop(container: HTMLElement): void {
    const ownedCards =
        container.querySelectorAll<HTMLElement>(".uc-card.uc-owned")

    ownedCards.forEach((card) => {
        card.addEventListener("mousedown", (e) => {
            // Don't start drag on sell button
            if ((e.target as HTMLElement).closest(".uc-sell-btn")) return

            e.preventDefault()

            removeStaleTooltips()
            const source = card.getAttribute("data-source") as
                | "lineup"
                | "bench"
            const index = parseInt(card.getAttribute("data-idx") ?? "0")

            const ghost = card.cloneNode(true) as HTMLElement
            ghost.className = "uc-drag-ghost"
            ghost.style.width = `${card.offsetWidth}px`
            document.body.appendChild(ghost)
            ghost.style.left = `${e.clientX - card.offsetWidth / 2}px`
            ghost.style.top = `${e.clientY - 20}px`

            card.classList.add("dragging")

            dragState = {
                source,
                index,
                ghost,
                startX: e.clientX,
                startY: e.clientY,
            }

            const onMove = (me: MouseEvent): void => {
                if (!dragState?.ghost) return
                dragState.ghost.style.left = `${me.clientX - card.offsetWidth / 2}px`
                dragState.ghost.style.top = `${me.clientY - 20}px`

                highlightDropTarget(container, me.clientX, me.clientY)
            }

            const onUp = (me: MouseEvent): void => {
                document.removeEventListener("mousemove", onMove)
                document.removeEventListener("mouseup", onUp)

                if (!dragState) return

                dragState.ghost?.remove()
                card.classList.remove("dragging")

                const dropTarget = findDropTarget(
                    container,
                    me.clientX,
                    me.clientY
                )
                if (dropTarget && activeRun) {
                    executeDrop(dragState, dropTarget, container)
                }

                container
                    .querySelectorAll(".drag-over")
                    .forEach((el) => el.classList.remove("drag-over"))
                dragState = null
            }

            document.addEventListener("mousemove", onMove)
            document.addEventListener("mouseup", onUp)
        })
    })
}

interface DropTarget {
    zone: "lineup" | "bench"
    index: number
}

function findDropTarget(
    container: HTMLElement,
    x: number,
    y: number
): DropTarget | null {
    const lineupZone = container.querySelector("#ab-lineup-drop")
    if (lineupZone) {
        const children = lineupZone.children
        for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect()
            if (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            ) {
                return { zone: "lineup", index: i }
            }
        }
    }

    const benchZone = container.querySelector("#ab-bench-drop")
    if (benchZone) {
        const rect = benchZone.getBoundingClientRect()
        if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        ) {
            const state = activeRun?.getState()
            return { zone: "bench", index: state?.bench.length ?? 0 }
        }
    }

    return null
}

function highlightDropTarget(
    container: HTMLElement,
    x: number,
    y: number
): void {
    container
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"))

    const lineupZone = container.querySelector("#ab-lineup-drop")
    if (lineupZone) {
        for (const child of lineupZone.children) {
            const rect = child.getBoundingClientRect()
            if (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            ) {
                child.classList.add("drag-over")
            }
        }
    }

    const benchZone = container.querySelector("#ab-bench-drop")
    if (benchZone) {
        const rect = benchZone.getBoundingClientRect()
        if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        ) {
            benchZone.classList.add("drag-over")
        }
    }
}

function executeDrop(
    drag: DragState,
    drop: DropTarget,
    container: HTMLElement
): void {
    if (!activeRun) return

    if (drag.source === "lineup" && drop.zone === "lineup") {
        activeRun.swapLineup(drag.index, drop.index)
    } else if (drag.source === "lineup" && drop.zone === "bench") {
        activeRun.lineupToBench(drag.index)
    } else if (drag.source === "bench" && drop.zone === "lineup") {
        activeRun.benchToLineup(drag.index, drop.index)
    }

    renderShopPhase(container)
}

// ── Combat phase ────────────────────────────────────────────────────────────

function renderCombatPhase(container: HTMLElement): void {
    if (!activeRun) return
    removeStaleTooltips()

    const state = activeRun.getState()
    const opponent = activeRun.getPreviewedOpponent()
    if (!opponent) return

    const statMult = getOpponentStatMultiplier(state.round)
    const opponentBonuses =
        statMult > 1.0
            ? { atkBonus: statMult - 1, hpBonus: statMult - 1 }
            : undefined

    const opponentUnits = opponent.units.map((u) =>
        createCombatUnit(u.unitId, u.level, opponentBonuses)
    )
    const playerUnits = state.lineup.map((u) =>
        createCombatUnit(u.unitDefId, u.level, activeRun!.combatBonuses)
    )

    const result = activeRun.executeCombat()
    if (!result) return
    const updatedState = activeRun.getState()

    // Process only NEW rewards (avoid re-applying rewards from previous rounds)
    const newRewards = updatedState.runRewards.slice(lastProcessedRewardIndex)
    lastProcessedRewardIndex = updatedState.runRewards.length
    for (const reward of newRewards) {
        if (reward.type === "xp" && typeof reward.value === "number") {
            getProgressionManager().addXP(reward.value)
        }
        if (reward.type === "commodity" && typeof reward.value === "string") {
            const hasFrontier = getPrestigeManager().hasFrontierDispatch()
            const qty = 1 + (hasFrontier && Math.random() < 0.25 ? 1 : 0)
            getMarketGame().grantCommodity(reward.value as CommodityId, qty)
        }
        if (reward.type === "unit" && typeof reward.value === "string") {
            getCollectionManager().addUnit(reward.value)
        }
    }

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)

    const roundLabel = state.isBossRound
        ? t("symposium.ui.bossRound", { current: state.round })
        : t("symposium.ui.round", { current: state.round })

    const headerHtml = `
        <div class="ab-run-header ${state.isBossRound ? "boss" : ""}">
            <span class="ab-header-cell">${roundLabel}</span>
            <span class="ab-header-cell">vs ${opponent.name}</span>
            <span class="ab-header-cell">${renderLives(updatedState.losses)}</span>
        </div>
    `
    container.innerHTML = headerHtml + `<div id="ab-combat-container"></div>`

    const combatContainer = document.getElementById("ab-combat-container")!

    activeAnimator = new CombatAnimator(
        combatContainer,
        result,
        playerUnits,
        opponentUnits,
        () => {
            activeAnimator = null
            renderResultPhase(container)
        }
    )
    activeAnimator.start()
}

// ── Helpers for reward display ──────────────────────────────────────────────

function translateRewardValue(type: string, value: string | number): string {
    const lm = getLocaleManager()
    const t = lm.t.bind(lm)

    if (typeof value === "number") return String(value)

    if (type === "commodity") {
        return t(`market.commodities.${value}.name`, { defaultValue: value })
    }
    if (type === "unit") {
        const def = UNIT_MAP.get(value)
        if (def) return unitDisplayName(def)
        return t(`symposium.units.${value}`, { defaultValue: value })
    }
    return String(value)
}

function translateRewardDescription(type: string, description: string): string {
    const lm = getLocaleManager()
    const t = lm.t.bind(lm)

    // For commodity rewards, the description IS the commodity ID
    if (type === "commodity") {
        const name = t(`market.commodities.${description}.name`, {
            defaultValue: description,
        })
        return `${name} commodity`
    }
    // For unit rewards, the description IS the unit ID
    if (type === "unit") {
        const def = UNIT_MAP.get(description)
        if (def) return `Recruited ${unitDisplayName(def)}`
        return description
    }
    return description
}

// ── Result phase ────────────────────────────────────────────────────────────

function renderResultPhase(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()
    const result = activeRun.getLastCombatResult()
    if (!result) return

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)
    const isFinished = state.phase === "finished"
    const resultClass =
        result.winner === "player"
            ? "victory"
            : result.winner === "draw"
              ? "draw"
              : "defeat"
    const resultText =
        result.winner === "player"
            ? t("symposium.ui.victory")
            : result.winner === "draw"
              ? t("symposium.ui.draw")
              : t("symposium.ui.defeat")

    const roundLabel = state.isBossRound
        ? t("symposium.ui.bossRound", { current: state.round })
        : t("symposium.ui.round", { current: state.round })

    let html = `
        <div class="ab-run-header ${state.isBossRound ? "boss" : ""}">
            <span class="ab-header-cell">${roundLabel}</span>
            <span class="ab-header-cell">${renderLives(state.losses)}</span>
        </div>
        <div class="ab-combat-result ${resultClass}">
            <h2>${resultText}</h2>
            <div class="ab-combat-subtitle">${t("symposium.ui.combatLasted", { rounds: result.rounds })}</div>
    `

    if (result.playerSurvivors.length > 0) {
        html += `<div class="ab-survivors">
            <div class="ab-survivors-label">${t("symposium.ui.survivors")}</div>
            <div class="ab-survivors-grid">`
        for (const u of result.playerSurvivors) {
            html += renderUnitCard(u, { variant: "combat", side: "player" })
        }
        html += `</div></div>`
    }

    html += `
        <details class="ab-log-details">
            <summary>${t("symposium.ui.combatLog", { count: result.log.length })}</summary>
            <div class="ab-combat-log">
    `
    for (const entry of result.log) {
        const cls = entry.description.includes("dies")
            ? "death"
            : entry.description.includes("summons")
              ? "summon"
              : ""
        // Translate unit IDs to display names in log
        let desc = entry.description
        for (const [id, def] of UNIT_MAP) {
            if (desc.includes(id)) {
                desc = desc.split(id).join(unitDisplayName(def))
            }
        }
        html += `<div class="ab-log-entry ${cls}">R${entry.round}: ${desc}</div>`
    }
    html += `</div></details>`

    // Rewards with translated names
    const recentRewards = state.runRewards.slice(-5)
    if (recentRewards.length > 0) {
        html += `<div class="ab-rewards"><div class="ab-section-heading">${t("symposium.ui.rewards")}</div>`
        for (const reward of recentRewards) {
            const icon =
                reward.type === "xp"
                    ? "✨"
                    : reward.type === "scrap"
                      ? "💭"
                      : reward.type === "commodity"
                        ? "📦"
                        : "🎁"
            const desc = translateRewardDescription(
                reward.type,
                String(reward.description)
            )
            const val = translateRewardValue(reward.type, reward.value)
            // Don't show raw value for commodity/unit since desc already has the name
            const showVal = reward.type === "xp" || reward.type === "scrap"
            html += `<div class="ab-reward">${icon} ${desc}${showVal ? `: ${val}` : ""}</div>`
        }
        html += `</div>`
    }

    if (isFinished) {
        // Full run summary
        const summary = activeRun.getRunSummary()
        html += renderRunSummary(summary, t)
        html += `<button class="ab-return-btn">${t("symposium.ui.returnToLobby")}</button>`
    } else {
        html += `<button class="ab-next-btn">${t("symposium.ui.nextRound")}</button>`
    }

    html += `</div>`
    container.innerHTML = html

    container.querySelector(".ab-next-btn")?.addEventListener("click", () => {
        activeRun?.nextRound()
        renderRunView(container)
    })

    container.querySelector(".ab-return-btn")?.addEventListener("click", () => {
        activeRun = null
        lastProcessedRewardIndex = 0
        renderLobbyView(container)
    })
}

function renderRunSummary(
    summary: RunSummary,
    t: (key: string, opts?: Record<string, unknown>) => string
): string {
    const bestUnitName = summary.bestUnit
        ? ((): string | null => {
              const def = UNIT_MAP.get(summary.bestUnit.unitDefId)
              return def ? unitDisplayName(def) : summary.bestUnit.unitDefId
          })()
        : null

    const majorityLabel = summary.majorityFaction
        ? factionLabel(summary.majorityFaction as FactionId)
        : "—"

    const bossNames =
        summary.bossesDefeated.length > 0
            ? summary.bossesDefeated
                  .map((id) => {
                      const boss = BOSS_MAP.get(id)
                      return boss?.name ?? id
                  })
                  .join(", ")
            : t("symposium.ui.noBosses")

    return `
        <div class="ab-run-summary">
            <div class="ab-section-heading">${t("symposium.ui.runSummary")}</div>
            <div class="ab-summary-grid">
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.highestRound")}</span>
                    <span class="ab-summary-value">${summary.highestRound}</span>
                </div>
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.majorityFaction")}</span>
                    <span class="ab-summary-value">${majorityLabel}</span>
                </div>
                ${
                    bestUnitName
                        ? `
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.bestUnit")}</span>
                    <span class="ab-summary-value">${bestUnitName} <span class="ab-summary-detail">(${t("symposium.ui.combatsSurvived", { count: summary.bestUnit!.combatsSurvived })})</span></span>
                </div>
                `
                        : ""
                }
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.bossesDefeated")}</span>
                    <span class="ab-summary-value">${bossNames}</span>
                </div>
                <div class="ab-summary-divider"></div>
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.scrapEarned")}</span>
                    <span class="ab-summary-value">${summary.totalScrapEarned} 💭</span>
                </div>
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.scrapSpent")}</span>
                    <span class="ab-summary-value">${summary.totalScrapSpent} 💭</span>
                </div>
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.unitsBought")}</span>
                    <span class="ab-summary-value">${summary.unitsBought}</span>
                </div>
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.unitsSold")}</span>
                    <span class="ab-summary-value">${summary.unitsSold}</span>
                </div>
            </div>
        </div>
    `
}
