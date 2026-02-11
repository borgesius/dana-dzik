import { getCollectionManager } from "../autobattler/CollectionManager"
import { getDataAttribute } from "../domUtils"
import { createCombatUnit } from "../autobattler/combat"
import { CombatAnimator } from "../autobattler/CombatAnimator"
import {
    BOSS_MAP,
    BOSS_MODIFIER_MAP,
    getOpponentStatMultiplier,
} from "../autobattler/opponents"
import { RELIC_DEFS, RELIC_MAP } from "../autobattler/relics"
import { playSound } from "../audio"
import { getBuffCost, RUN_BUFFS, type RunBuff } from "../autobattler/runBuffs"
import { RunManager } from "../autobattler/RunManager"
import { getMaxLineSlots, MAX_BENCH_SIZE } from "../autobattler/shop"
import type { BossId, FactionId, RelicId, RelicInstance, RunSummary, UnitId } from "../autobattler/types"
import {
    factionColor,
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

const DEFAULT_MAX_LIVES = 3

function renderLives(losses: number, maxLives?: number): string {
    const ml = maxLives ?? activeRun?.getMaxLives() ?? DEFAULT_MAX_LIVES
    const remaining = ml - losses
    const filled = "&#9829;".repeat(Math.max(0, remaining))
    const empty = "&#9825;".repeat(Math.min(ml, losses))
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

// ── Phase transition helper ─────────────────────────────────────────────────

function transitionContent(
    container: HTMLElement,
    html: string,
    callback?: () => void
): void {
    container.classList.add("phase-exit")
    setTimeout(() => {
        container.innerHTML = html
        container.classList.remove("phase-exit")
        container.classList.add("phase-enter")
        setTimeout(() => {
            container.classList.remove("phase-enter")
            callback?.()
        }, 200)
    }, 150)
}

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
                <div class="ab-stat"><span class="ab-stat-icon">🏆</span><span class="ab-stat-label">${t("symposium.ui.runs")}</span><span class="ab-stat-value">${collection.getCompletedRuns()}</span></div>
                <div class="ab-stat"><span class="ab-stat-icon">⛰️</span><span class="ab-stat-label">${t("symposium.ui.highestRound")}</span><span class="ab-stat-value">${collection.getHighestRound()}</span></div>
                <div class="ab-stat"><span class="ab-stat-icon">📚</span><span class="ab-stat-label">${t("symposium.ui.collectionLabel")}</span><span class="ab-stat-value">${collection.getCollectionSize()}</span></div>
            </div>
    `

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

    // ── Tabbed Bestiary ──────────────────────────────────────────────────
    html += `
        <div class="ab-bestiary-tabs">
            <div class="ab-bestiary-tab-bar">
                <button class="ab-bestiary-tab active" data-tab="thinkers">${t("symposium.bestiary.thinkers")}</button>
                <button class="ab-bestiary-tab" data-tab="adversaries">${t("symposium.bestiary.adversaries")}</button>
                <button class="ab-bestiary-tab" data-tab="relics">${t("symposium.bestiary.relicsTab")}</button>
            </div>
            <div id="ab-bestiary-thinkers" class="ab-bestiary-pane active">
                ${renderBestiaryThinkers(collection, t)}
            </div>
            <div id="ab-bestiary-adversaries" class="ab-bestiary-pane">
                ${renderBestiaryAdversaries(collection, t)}
            </div>
            <div id="ab-bestiary-relics" class="ab-bestiary-pane">
                ${renderBestiaryRelics(collection, t)}
            </div>
        </div>
    `

    html += `</div>`
    transitionContent(container, html, () => {
        container
            .querySelector(".ab-start-btn")
            ?.addEventListener("click", () => {
                renderPrepareRun(container)
            })

        wireBestiaryTabs(container)
    })
}

// ── Bestiary tab helpers ─────────────────────────────────────────────────────

function wireBestiaryTabs(container: HTMLElement): void {
    const tabs = container.querySelectorAll<HTMLElement>(".ab-bestiary-tab")
    const panes = container.querySelectorAll<HTMLElement>(".ab-bestiary-pane")

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab
            tabs.forEach((t) => t.classList.remove("active"))
            tab.classList.add("active")
            panes.forEach((p) => p.classList.remove("active"))
            const targetPane = container.querySelector(`#ab-bestiary-${target}`)
            targetPane?.classList.add("active")
        })
    })
}

function renderBestiaryThinkers(
    collection: ReturnType<typeof getCollectionManager>,
    t: (key: string, opts?: Record<string, unknown>) => string
): string {
    const factions: FactionId[] = ["quickdraw", "deputies", "clockwork", "prospectors", "drifters"]
    const unlockedIds = collection.getUnlockedUnitIds()
    let html = ""

    for (const faction of factions) {
        const factionUnits = getUnitsForFaction(faction)
        const unlocked = factionUnits.filter((u) => unlockedIds.has(u.id))
        if (factionUnits.length === 0) continue

        const fc = factionColor(faction)
        const progressPct = Math.round((unlocked.length / factionUnits.length) * 100)

        html += `
            <div class="ab-faction-group">
                <div class="ab-faction-label" style="--uc-faction-color: ${fc}">
                    ${factionLabel(faction)}
                    <span class="faction-progress">${unlocked.length}/${factionUnits.length}</span>
                </div>
                <div class="ab-faction-progress-bar">
                    <div class="ab-faction-progress-fill" style="width: ${progressPct}%; --uc-faction-color: ${fc}"></div>
                </div>
                <div class="ab-collection-grid">
        `

        for (const unit of factionUnits) {
            if (unlockedIds.has(unit.id)) {
                html += renderDefCard(unit, { variant: "collection" })
            } else {
                html += `<div class="uc-card uc-collection" style="opacity: 0.3; --uc-faction-color: ${fc}">
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

    return html
}

function renderBestiaryAdversaries(
    collection: ReturnType<typeof getCollectionManager>,
    t: (key: string, opts?: Record<string, unknown>) => string
): string {
    let html = `<div class="ab-section-heading">${t("symposium.bestiary.bosses")}</div>`
    html += `<div class="ab-adversary-grid">`

    for (const [bossId, boss] of BOSS_MAP) {
        const defeated = collection.hasBossDefeated(bossId)
        const bossName = t(`symposium.units.${bossId}`, { defaultValue: boss.name })
        const fc = factionColor(boss.faction)
        const badge = defeated
            ? `<span class="ab-boss-badge defeated">${t("symposium.bestiary.defeated")}</span>`
            : `<span class="ab-boss-badge undefeated">${t("symposium.bestiary.undefeated")}</span>`

        html += `
            <div class="ab-adversary-card ${defeated ? "defeated" : ""}" style="--uc-faction-color: ${fc}">
                <div class="ab-adversary-header">
                    <span class="ab-adversary-name">${bossName}</span>
                    ${badge}
                </div>
                <div class="ab-adversary-faction">${factionIcon(boss.faction)} ${factionLabel(boss.faction)}</div>
            </div>
        `
    }

    html += `</div>`

    html += `<div class="ab-section-heading">${t("symposium.bestiary.opponents")}</div>`
    const oppFactions: FactionId[] = ["quickdraw", "deputies", "clockwork", "prospectors", "drifters"]
    html += `<div class="ab-opponent-schools">`
    for (const faction of oppFactions) {
        const fc = factionColor(faction)
        html += `<div class="ab-opponent-school" style="--uc-faction-color: ${fc}">
            <span class="ab-opponent-icon">${factionIcon(faction)}</span>
            <span class="ab-opponent-label">${factionLabel(faction)}</span>
        </div>`
    }
    html += `</div>`

    return html
}

function renderBestiaryRelics(
    collection: ReturnType<typeof getCollectionManager>,
    t: (key: string, opts?: Record<string, unknown>) => string
): string {
    const tiers = ["common", "rare", "legendary", "secret"] as const
    let html = ""

    for (const tier of tiers) {
        const tierRelics = RELIC_DEFS.filter((r) => r.tier === tier)
        // Secret relics only show if unlocked (fully hidden otherwise)
        const visibleRelics = tier === "secret"
            ? tierRelics.filter((r) => collection.hasRelicUnlocked(r.id))
            : tierRelics

        if (visibleRelics.length === 0 && tier === "secret") continue

        const tierLabel = t(`symposium.bestiary.relicTiers.${tier}`, { defaultValue: tier })
        const unlockedCount = visibleRelics.filter((r) => collection.hasRelicUnlocked(r.id)).length

        html += `
            <div class="ab-relic-tier-section">
                <div class="ab-section-heading">${tierLabel} <span class="ab-relic-count">(${unlockedCount}/${visibleRelics.length})</span></div>
                <div class="ab-relic-grid">
        `

        for (const relic of visibleRelics) {
            const unlocked = collection.hasRelicUnlocked(relic.id)
            if (unlocked) {
                const name = t(`symposium.relics.${relic.id}.name`, { defaultValue: relic.id })
                const desc = t(`symposium.relics.${relic.id}.description`, { defaultValue: "" })
                html += `
                    <div class="ab-relic-entry relic-${tier} unlocked">
                        <div class="ab-relic-name">${name}</div>
                        <div class="ab-relic-desc">${desc}</div>
                    </div>
                `
            } else {
                const unlockHint = t(`symposium.relics.${relic.id}.unlock`, { defaultValue: "???" })
                html += `
                    <div class="ab-relic-entry relic-${tier} locked">
                        <div class="ab-relic-name">${t("symposium.bestiary.locked")}</div>
                        <div class="ab-relic-desc">${t("symposium.bestiary.unlockHint", { hint: unlockHint })}</div>
                    </div>
                `
            }
        }

        html += `</div></div>`
    }

    return html
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

            const costCls = canAfford ? "affordable" : "too-expensive"
            html += `
                <button class="ab-buff-card ${isSelected ? "selected" : ""} ${!canAfford && !isSelected ? "disabled" : ""}"
                    data-buff="${buff.id}" ${!canAfford && !isSelected ? "disabled" : ""}>
                    <div class="ab-buff-icon">${buff.icon}</div>
                    <div class="ab-buff-name">${buffName}</div>
                    <div class="ab-buff-desc">${buffDesc}</div>
                    <div class="ab-buff-cost ${costCls}">${cost} ${buff.commodityId} ($${dollarCost}) · have: ${owned}</div>
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
    const collection = getCollectionManager()
    const unlockedIds = collection.getUnlockedUnitIds()
    const unlockedRelicIds = collection.getUnlockedRelicIds()
    activeRun = new RunManager(unlockedIds, buffs, unlockedRelicIds)
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
        if (!activeRun) return
        const summary = activeRun.getRunSummary()
        const state = activeRun.getState()
        const factions = [...new Set(state.lineup.map((u) => u.faction))]
        const coll = getCollectionManager()
        coll.recordRunComplete(
            summary.majorityFaction,
            summary.losses,
            factions,
            summary.highestRound,
            summary.relicsCollected.length
        )
        coll.addUnitsBought(summary.unitsBought)
        checkRelicUnlocks(coll, summary, state, activeRun)
        saveManager.requestSave()
    })
    activeRun.on("bossDefeated", (data) => {
        getCollectionManager().recordBossDefeated(data.bossId)
        emitAppEvent("autobattler:boss-defeated", data)
        saveManager.requestSave()
    })
    activeRun.on("combatEnded", () => {
        if (activeRun) {
            const coll = getCollectionManager()
            const summary = activeRun.getRunSummary()
            const state = activeRun.getState()
            checkRelicUnlocks(coll, summary, state, activeRun)
            saveManager.requestSave()
        }
    })
}

/** Check all relic unlock conditions and unlock any that are met */
function checkRelicUnlocks(
    coll: ReturnType<typeof getCollectionManager>,
    summary: RunSummary,
    state: ReturnType<RunManager["getState"]>,
    run: RunManager
): void {
    const THEMED_FACTIONS = ["quickdraw", "deputies", "clockwork", "prospectors"] as const

    for (const relic of RELIC_DEFS) {
        if (coll.hasRelicUnlocked(relic.id)) continue
        const cond = relic.unlockCondition

        switch (cond.type) {
            case "default":
                coll.unlockRelic(relic.id)
                break
            case "reachRound":
                if (coll.getHighestRound() >= (cond.round ?? 0)) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "defeatAnyBoss":
                if (coll.getTotalBossesDefeated() > 0) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "defeatBoss":
                if (cond.bossId && summary.bossesDefeated.includes(cond.bossId)) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "completeFaction":
                if (cond.faction && coll.isFactionComplete(cond.faction as FactionId)) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "multiFactionWin": {
                const factionCount = new Set(
                    state.lineup
                        .map((u) => u.faction)
                        .filter((f) => f !== "drifters")
                ).size
                if (factionCount >= (cond.count ?? 3)) {
                    coll.unlockRelic(relic.id)
                }
                break
            }
            case "completedRuns":
                if (coll.getCompletedRuns() >= (cond.count ?? 0)) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "totalUnitsBought":
                if (coll.getTotalUnitsBought() >= (cond.count ?? 0)) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "frontDiedAndWin":
                if (
                    run.didFrontDieInLastCombat() &&
                    run.getLastCombatResult()?.winner === "player"
                ) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "allFactionsInLineup": {
                const lineupFactions = new Set(
                    state.lineup.map((u) => u.faction).filter((f) => f !== "drifters")
                )
                if (THEMED_FACTIONS.every((f) => lineupFactions.has(f))) {
                    coll.unlockRelic(relic.id)
                }
                break
            }
            case "lowSpendRun":
                if (summary.totalScrapSpent <= (cond.count ?? 20) && state.phase === "finished") {
                    coll.unlockRelic(relic.id)
                }
                break
            case "holdNRelics":
                if (run.getHeldRelics().length >= (cond.count ?? 0)) {
                    coll.unlockRelic(relic.id)
                }
                break
            case "majorityDriftersRound":
                if (
                    coll.getHighestRound() >= (cond.round ?? 15) &&
                    summary.majorityFaction === undefined
                ) {
                    // No majority faction means drifters or mixed
                    coll.unlockRelic(relic.id)
                }
                break
            case "allBossesSingleRun":
                if (
                    summary.bossesDefeated.length >= 4 &&
                    new Set(summary.bossesDefeated).size >= 4
                ) {
                    coll.unlockRelic(relic.id)
                }
                break
        }
    }
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
            void renderCombatPhase(container)
            break
        case "event":
            renderEventPhase(container)
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
            <span class="ab-header-cell" id="ab-scrap-display">${t("symposium.ui.thoughts", { amount: state.scrap })}</span>
            <span class="ab-header-cell">${renderLives(state.losses)}</span>
        </div>
    `

    html += renderRelicBar(activeRun.getHeldRelics(), t)

    html += `
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

    if (opponent) {
        const modifier = opponent.modifierId
            ? BOSS_MODIFIER_MAP.get(opponent.modifierId)
            : undefined
        html += `
            <div class="ab-opponent-preview">
                <div class="ab-section-heading">${t("symposium.ui.opponentPreview")}</div>
                <div class="ab-preview-header">
                    <span class="ab-preview-name">${opponent.name}</span>
                    <span class="ab-preview-faction">${factionIcon(opponent.faction)} ${factionLabel(opponent.faction)}</span>
                </div>
                ${modifier ? `<div class="ab-boss-modifier"><span class="ab-modifier-name">${modifier.name}</span> <span class="ab-modifier-desc">${modifier.description}</span></div>` : ""}
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
        const fc = factionColor(faction)
        html += `<span class="ab-synergy-badge" style="--uc-faction-color: ${fc}" data-faction="${faction}">${factionIcon(faction)} ${factionLabel(faction)} x${count}</span>`
    }
    html += `</div>`
    return html
}

function wireShopEvents(container: HTMLElement): void {
    container.querySelectorAll(".uc-card.uc-shop:not(.sold)").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (!activeRun) return
            const idx = parseInt(btn.getAttribute("data-offer") ?? "0")

            // Snapshot lineup/bench levels before buy to detect merge
            const prevLevels = new Map<string, number>()
            const state = activeRun.getState()
            for (const u of [...state.lineup, ...state.bench]) {
                prevLevels.set(u.instanceId, u.level)
            }
            const prevScrap = state.scrap

            const card = btn as HTMLElement
            card.classList.add("uc-purchase-anim")

            setTimeout(() => {
                if (!activeRun) return
                const bought = activeRun.buyUnit(idx)
                if (bought) playSound("ab_buy")

                const newState = activeRun.getState()
                let mergedUnit: string | null = null
                for (const u of [...newState.lineup, ...newState.bench]) {
                    const prev = prevLevels.get(u.instanceId)
                    if (prev !== undefined && u.level > prev) {
                        mergedUnit = u.instanceId
                    }
                }

                renderShopPhase(container)

                if (newState.scrap < prevScrap) {
                    showScrapFloat(container, prevScrap - newState.scrap, false)
                }

                if (mergedUnit) {
                    requestAnimationFrame(() => {
                        const mergedCard =
                            container.querySelector(`.uc-card.uc-owned`)
                        if (mergedCard) {
                            const allOwned =
                                container.querySelectorAll<HTMLElement>(
                                    ".uc-card.uc-owned"
                                )
                            for (const c of allOwned) {
                                const lvl = c.getAttribute("data-unit-level")
                                if (lvl && parseInt(lvl) > 1) {
                                    c.classList.add("uc-level-up-burst")
                                    const floater =
                                        document.createElement("div")
                                    floater.className = "ab-level-up-float"
                                    floater.textContent = "LEVEL UP!"
                                    c.style.position = "relative"
                                    c.appendChild(floater)
                                    setTimeout(() => {
                                        floater.remove()
                                        c.classList.remove("uc-level-up-burst")
                                    }, 800)
                                    break
                                }
                            }
                        }
                    })
                }
            }, 200)
        })
    })

    container.querySelector(".ab-reroll-btn")?.addEventListener("click", () => {
        if (!activeRun) return

        const offersEl = container.querySelector(".ab-shop-offers")
        if (offersEl) {
            offersEl.classList.add("ab-reroll-anim")
        }

        const prevScrap = activeRun.getState().scrap
        setTimeout(() => {
            if (!activeRun) return
            activeRun.reroll()
            playSound("ab_reroll")
            renderShopPhase(container)
            const newScrap = activeRun.getState().scrap
            if (newScrap < prevScrap) {
                showScrapFloat(container, prevScrap - newScrap, false)
            }
        }, 250)
    })

    container.querySelectorAll(".uc-sell-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation()
            if (!activeRun) return
            const source = btn.getAttribute("data-source") as "lineup" | "bench"
            const idx = parseInt(btn.getAttribute("data-idx") ?? "0")

            const prevScrap = activeRun.getState().scrap

            const card = (btn as HTMLElement).closest(".uc-card") as HTMLElement
            if (card) {
                card.classList.add("uc-sell-anim")
                setTimeout(() => {
                    if (!activeRun) return
                    activeRun.sellUnit(source, idx)
                    playSound("ab_sell")
                    const newScrap = activeRun.getState().scrap
                    renderShopPhase(container)
                    if (newScrap > prevScrap) {
                        showScrapFloat(container, newScrap - prevScrap, true)
                    }
                }, 250)
            } else {
                activeRun.sellUnit(source, idx)
                playSound("ab_sell")
                renderShopPhase(container)
            }
        })
    })

    container.querySelector(".ab-fight-btn")?.addEventListener("click", () => {
        if (!activeRun) return
        activeRun.readyForCombat()
        void renderCombatPhase(container)
    })
}

/** Show floating scrap change number */
function showScrapFloat(
    container: HTMLElement,
    amount: number,
    positive: boolean
): void {
    const header = container.querySelector(".ab-header-cell:nth-child(2)")
    if (!header) return

    const floater = document.createElement("span")
    floater.className = `ab-scrap-float ${positive ? "positive" : "negative"}`
    floater.textContent = positive ? `+${amount} 💭` : `-${amount} 💭`
    ;(header as HTMLElement).style.position = "relative"
    header.appendChild(floater)
    setTimeout(() => floater.remove(), 800)
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

async function renderCombatPhase(container: HTMLElement): Promise<void> {
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
        createCombatUnit(u.unitDefId, u.level, activeRun?.combatBonuses)
    )

    const result = await activeRun.executeCombat()
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
            const baseQty =
                typeof reward.quantity === "number" ? reward.quantity : 1
            const hasFrontier = getPrestigeManager().hasFrontierDispatch()
            const qty =
                baseQty + (hasFrontier && Math.random() < 0.25 ? 1 : 0)
            getMarketGame().grantCommodity(reward.value as CommodityId, qty)
        }
        if (reward.type === "unit" && typeof reward.value === "string") {
            getCollectionManager().addUnit(reward.value as UnitId)
        }
    }

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)

    const roundLabel = state.isBossRound
        ? t("symposium.ui.bossRound", { current: state.round })
        : t("symposium.ui.round", { current: state.round })

    const combatModifier = opponent.modifierId
        ? BOSS_MODIFIER_MAP.get(opponent.modifierId)
        : undefined
    const modifierHtml = combatModifier
        ? `<div class="ab-boss-modifier compact"><span class="ab-modifier-name">${combatModifier.name}</span></div>`
        : ""

    const headerHtml = `
        <div class="ab-run-header ${state.isBossRound ? "boss" : ""}">
            <span class="ab-header-cell">${roundLabel}</span>
            <span class="ab-header-cell">vs ${opponent.name}${modifierHtml}</span>
            <span class="ab-header-cell">${renderLives(updatedState.losses)}</span>
        </div>
    `
    container.innerHTML = headerHtml + `<div id="ab-combat-container"></div>`

    const combatContainer = document.getElementById("ab-combat-container")
    if (!combatContainer) return

    activeAnimator = new CombatAnimator(
        combatContainer,
        result,
        playerUnits,
        opponentUnits,
        () => {
            activeAnimator = null
            renderResultPhase(container)
        },
        state.isBossRound
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
        const def = UNIT_MAP.get(value as UnitId)
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
        const def = UNIT_MAP.get(description as UnitId)
        if (def) return `Recruited ${unitDisplayName(def)}`
        return description
    }
    return description
}

// ── Result phase ────────────────────────────────────────────────────────────

function generateConfettiHtml(): string {
    const colors = [
        "#cc3333",
        "#336699",
        "#996633",
        "#669933",
        "#d4a017",
        "#6495ed",
        "#44aa44",
    ]
    let html = `<div class="ab-confetti-container">`
    for (let i = 0; i < 20; i++) {
        const color = colors[i % colors.length]
        const left = Math.random() * 100
        const delay = Math.random() * 0.8
        const size = 3 + Math.random() * 4
        html += `<span class="ab-confetti" style="left:${left}%;animation-delay:${delay}s;width:${size}px;height:${size}px;background:${color}"></span>`
    }
    html += `</div>`
    return html
}

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

    const winStreak = result.winner === "player" ? state.wins : 0

    let html = `
        <div class="ab-run-header ${state.isBossRound ? "boss" : ""}">
            <span class="ab-header-cell">${roundLabel}</span>
            <span class="ab-header-cell">${renderLives(state.losses)}</span>
        </div>
        <div class="ab-combat-result ${resultClass}">
            ${result.winner === "player" ? generateConfettiHtml() : ""}
            <h2>${resultText}</h2>
    `

    if (winStreak >= 2) {
        html += `<div class="ab-win-streak">🔥 Win Streak: ${winStreak}</div>`
    }

    if (
        state.isBossRound &&
        result.winner === "player" &&
        state.currentBossId
    ) {
        const boss = BOSS_MAP.get(state.currentBossId)
        if (boss) {
            html += `<div class="ab-boss-defeated-text">💀 ${boss.name} defeated!</div>`
        }
    }

    html += `<div class="ab-combat-subtitle">${t("symposium.ui.combatLasted", { rounds: result.rounds })}</div>`

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
        let desc = entry.description
        for (const [id, def] of UNIT_MAP) {
            if (desc.includes(id)) {
                desc = desc.split(id).join(unitDisplayName(def))
            }
        }
        html += `<div class="ab-log-entry ${cls}">R${entry.round}: ${desc}</div>`
    }
    html += `</div></details>`

    const recentRewards = state.runRewards.slice(-5)
    if (recentRewards.length > 0) {
        html += `<div class="ab-rewards"><div class="ab-section-heading">${t("symposium.ui.rewards")}</div>`
        recentRewards.forEach((reward, idx) => {
            if (reward.type === "relic") return // Relics shown separately
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
            const isUnitUnlock = reward.type === "unit"
            const rewardCls = isUnitUnlock
                ? "ab-reward ab-reward-enter ab-reward-unit-unlock"
                : "ab-reward ab-reward-enter"
            const delay = idx * 0.15
            html += `<div class="${rewardCls}" style="animation-delay:${delay}s">${icon} ${desc}${showVal ? `: ${val}` : ""}</div>`
        })
        html += `</div>`
    }

    const pendingRelics = state.pendingRelicChoices
    if (pendingRelics && pendingRelics.length > 0) {
        html += `<div class="ab-relic-choice">
            <div class="ab-section-heading">${t("symposium.ui.chooseRelic", { defaultValue: "Choose a Relic" })}</div>
            <div class="ab-relic-choice-grid">`
        for (const relicId of pendingRelics) {
            const rDef = RELIC_MAP.get(relicId)
            if (!rDef) continue
            const name = t(`symposium.relics.${relicId}.name`, { defaultValue: relicId })
            const desc = t(`symposium.relics.${relicId}.description`, { defaultValue: "" })
            const tierClass = `relic-${rDef.tier}`
            html += `<button class="ab-relic-card ${tierClass}" data-relic-id="${relicId}">
                <div class="ab-relic-name">${name}</div>
                <div class="ab-relic-tier">${rDef.tier}</div>
                <div class="ab-relic-desc">${desc}</div>
            </button>`
        }
        html += `</div></div>`
    }

    html += renderRelicBar(activeRun.getHeldRelics(), t)

    if (isFinished) {
        const summary = activeRun.getRunSummary()
        html += renderRunSummary(summary, t)
        html += `<button class="ab-return-btn">${t("symposium.ui.returnToLobby")}</button>`
    } else if (!pendingRelics || pendingRelics.length === 0) {
        html += `<button class="ab-next-btn">${t("symposium.ui.nextRound")}</button>`
    }

    html += `</div>`
    container.innerHTML = html

    container.querySelectorAll(".ab-relic-card").forEach((btn) => {
        btn.addEventListener("click", () => {
            const relicId = getDataAttribute<RelicId>(btn, "relic-id")
            if (relicId && activeRun) {
                activeRun.pickPendingRelic(relicId)
                playSound("ab_relic")
                renderResultPhase(container)
            }
        })
    })

    container.querySelector(".ab-next-btn")?.addEventListener("click", () => {
        activeRun?.nextRound()
        renderRunView(container)
    })

    container.querySelector(".ab-return-btn")?.addEventListener("click", () => {
        activeRun = null
        lastProcessedRewardIndex = 0
        container.classList.add("phase-exit")
        setTimeout(() => {
            container.classList.remove("phase-exit")
            renderLobbyView(container)
        }, 150)
    })
}

// ── Relic bar ────────────────────────────────────────────────────────────────

function renderRelicBar(
    relics: ReadonlyArray<RelicInstance>,
    t: (key: string, opts?: Record<string, unknown>) => string
): string {
    if (relics.length === 0) return ""
    let html = `<div class="ab-relic-bar"><span class="ab-relic-bar-label">${t("symposium.ui.relics", { defaultValue: "Relics" })}:</span>`
    for (const r of relics) {
        const def = RELIC_MAP.get(r.relicId)
        if (!def) continue
        const name = t(`symposium.relics.${r.relicId}.name`, { defaultValue: r.relicId })
        const desc = t(`symposium.relics.${r.relicId}.description`, { defaultValue: "" })
        const tierClass = `relic-${def.tier}`
        html += `<span class="ab-relic-pip ${tierClass}" title="${name}: ${desc}">${name.charAt(0)}</span>`
    }
    html += `</div>`
    return html
}

// ── Event phase ──────────────────────────────────────────────────────────────

function renderEventPhase(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()
    const event = state.activeEvent

    if (!event) {
        // No event data — skip to shop
        activeRun.continueToShop()
        renderRunView(container)
        return
    }

    playSound("ab_event")

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)

    const title = t(`symposium.events.${event.eventId}.title`, { defaultValue: event.eventId })
    const description = t(`symposium.events.${event.eventId}.description`, { defaultValue: "" })

    let html = `
        <div class="ab-run-header">
            <span class="ab-header-cell">${t("symposium.ui.round", { current: state.round })}</span>
            <span class="ab-header-cell">${renderLives(state.losses)}</span>
        </div>
    `

    html += renderRelicBar(activeRun.getHeldRelics(), t)

    html += `
        <div class="ab-event">
            <div class="ab-event-title">${title}</div>
            <div class="ab-event-description">${description}</div>
            <div class="ab-event-choices">
    `

    for (let i = 0; i < event.choices.length; i++) {
        const choice = event.choices[i]
        const label = t(`symposium.events.${event.eventId}.choices.${i}`, { defaultValue: choice.label })
        html += `<button class="ab-event-choice-btn" data-choice-index="${i}">${label}</button>`
    }

    html += `</div></div>`
    container.innerHTML = html

    container.querySelectorAll(".ab-event-choice-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = parseInt((btn as HTMLElement).dataset.choiceIndex ?? "0", 10)
            if (activeRun) {
                playSound("ab_boop")
                activeRun.resolveEvent(idx)
                renderRunView(container)
            }
        })
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

    const wlRecord = `<span style="color:var(--theme-color-success)">${summary.highestRound - summary.losses}W</span> / <span style="color:var(--theme-color-danger)">${summary.losses}L</span>`

    return `
        <div class="ab-run-summary">
            <div class="ab-section-heading">${t("symposium.ui.runSummary")}</div>
            <div class="ab-summary-grid">
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.highestRound")}</span>
                    <span class="ab-summary-value">${summary.highestRound} <span class="ab-summary-detail">(${wlRecord})</span></span>
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
                    <span class="ab-summary-value">${bestUnitName} <span class="ab-summary-detail">(${t("symposium.ui.combatsSurvived", { count: summary.bestUnit?.combatsSurvived ?? 0 })})</span></span>
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
                    <span class="ab-summary-value" data-count-target="${summary.totalScrapEarned}">💭 ${summary.totalScrapEarned}</span>
                </div>
                <div class="ab-summary-row">
                    <span class="ab-summary-label">${t("symposium.ui.scrapSpent")}</span>
                    <span class="ab-summary-value" data-count-target="${summary.totalScrapSpent}">💭 ${summary.totalScrapSpent}</span>
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
