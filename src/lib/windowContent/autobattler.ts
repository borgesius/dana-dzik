import { getCollectionManager } from "../autobattler/CollectionManager"
import { createCombatUnit } from "../autobattler/combat"
import { CombatAnimator } from "../autobattler/CombatAnimator"
import { pickOpponent } from "../autobattler/opponents"
import { getBuffCost, RUN_BUFFS, type RunBuff } from "../autobattler/runBuffs"
import { RunManager } from "../autobattler/RunManager"
import { getMaxLineSlots } from "../autobattler/shop"
import type { FactionId } from "../autobattler/types"
import {
    factionIcon,
    factionLabel,
    renderDefCard,
    renderEmptySlot,
    renderUnitCard,
} from "../autobattler/UnitCard"
import { getUnitsForFaction, UNIT_MAP } from "../autobattler/units"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import type { CommodityId } from "../marketGame/types"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import { getCareerManager } from "../progression/CareerManager"
import { getProgressionManager } from "../progression/ProgressionManager"
import { saveManager } from "../saveManager"

let activeRun: RunManager | null = null
let activeAnimator: CombatAnimator | null = null

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
            <h2>📜 ${t("symposium.ui.title")}</h2>
            <p class="ab-subtitle">${t("symposium.ui.subtitle")}</p>

            <div class="ab-stats">
                <div class="ab-stat"><span>${t("symposium.ui.runs")}</span><span>${collection.getCompletedRuns()}</span></div>
                <div class="ab-stat"><span>${t("symposium.ui.wins")}</span><span>${collection.getWonRuns()}</span></div>
                <div class="ab-stat"><span>${t("symposium.ui.bestStreak")}</span><span>${collection.getBestStreak()}</span></div>
                <div class="ab-stat"><span>${t("symposium.ui.collectionLabel")}</span><span>${collection.getCollectionSize()}</span></div>
            </div>
    `

    const hasBonuses =
        atkBonus > 0 ||
        hpBonus > 0 ||
        clockworkATK > 0 ||
        quickdrawATK > 0 ||
        deputiesATK > 0 ||
        prospectorsATK > 0
    if (hasBonuses) {
        html += `<div class="ab-bonuses">${t("symposium.ui.careerBonuses")} `
        if (atkBonus > 0) html += `+${Math.round(atkBonus * 100)}% ATK `
        if (hpBonus > 0) html += `+${Math.round(hpBonus * 100)}% HP `
        if (clockworkATK > 0)
            html += `+${Math.round(clockworkATK * 100)}% Rationalist ATK `
        if (quickdrawATK > 0)
            html += `+${Math.round(quickdrawATK * 100)}% Existentialist ATK `
        if (deputiesATK > 0)
            html += `+${Math.round(deputiesATK * 100)}% Idealist ATK `
        if (prospectorsATK > 0)
            html += `+${Math.round(prospectorsATK * 100)}% Post-Structuralist ATK `
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

    html += `<div class="ab-collection-header"><h3>${t("symposium.ui.collection")}</h3></div>`

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
    activeRun = new RunManager(unlockedIds, undefined, buffs)

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

    activeRun.on("runCompleted", () => {
        const state = activeRun!.getState()
        const majority = getMajorityFaction(activeRun!)
        const factions = [...new Set(state.lineup.map((u) => u.faction))]
        getCollectionManager().recordRunComplete(
            true,
            majority,
            state.losses,
            factions
        )
        saveManager.requestSave()
    })
    activeRun.on("runLost", () => {
        const state = activeRun!.getState()
        const factions = [...new Set(state.lineup.map((u) => u.faction))]
        getCollectionManager().recordRunComplete(
            false,
            undefined,
            state.losses,
            factions
        )
        saveManager.requestSave()
    })
}

/** Determine the majority faction among the current lineup */
function getMajorityFaction(run: RunManager): string | undefined {
    const state = run.getState()
    const counts = new Map<string, number>()
    for (const unit of state.lineup) {
        const def = UNIT_MAP.get(unit.unitDefId)
        if (def && def.faction !== "drifters") {
            counts.set(def.faction, (counts.get(def.faction) ?? 0) + 1)
        }
    }
    let bestFaction: string | undefined
    let bestCount = 0
    for (const [faction, count] of counts) {
        if (count > bestCount) {
            bestCount = count
            bestFaction = faction
        }
    }
    // Only count as majority if it's more than half the lineup
    if (bestFaction && bestCount > state.lineup.length / 2) {
        return bestFaction
    }
    return undefined
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

function renderShopPhase(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()
    const offers = activeRun.getShopOffers()

    const lm = getLocaleManager()
    const t = lm.t.bind(lm)
    let html = `
        <div class="ab-run-header">
            <span>${t("symposium.ui.roundOf", { current: state.round, total: state.totalRounds })}</span>
            <span>${t("symposium.ui.thoughts", { amount: state.scrap })}</span>
            <span>${t("symposium.ui.wl", { wins: state.wins, losses: state.losses })}</span>
        </div>

        <div class="ab-shop-label">${t("symposium.ui.shop")}</div>
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
    `

    html += `
        <div class="ab-lineup-label">
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

    html += `<div class="ab-bench-label">${t("symposium.ui.bench")}</div>`
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
        html += `<div style="font-size: 9px; color: #999; padding: 4px;">${t("symposium.ui.empty")}</div>`
    }

    html += `</div>`

    html += `
        <div class="ab-actions">
            <button class="ab-fight-btn" ${state.lineup.length === 0 ? "disabled" : ""}>⚔ ${t("symposium.ui.fight")}</button>
        </div>
    `

    container.innerHTML = html
    wireShopEvents(container)
    wireDragDrop(container)
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

// ── Drag and drop ───────────────────────────────────────────────────────────

function wireDragDrop(container: HTMLElement): void {
    const ownedCards =
        container.querySelectorAll<HTMLElement>(".uc-card.uc-owned")

    ownedCards.forEach((card) => {
        card.addEventListener("mousedown", (e) => {
            // Don't start drag on sell button
            if ((e.target as HTMLElement).closest(".uc-sell-btn")) return

            e.preventDefault()
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

    const state = activeRun.getState()

    const opponent = pickOpponent(state.round)
    const opponentUnits = opponent.units.map((u) =>
        createCombatUnit(u.unitId, u.level)
    )
    const playerUnits = state.lineup.map((u) =>
        createCombatUnit(u.unitDefId, u.level, activeRun!.combatBonuses)
    )

    const result = activeRun.executeCombat()
    if (!result) return
    const updatedState = activeRun.getState()
    for (const reward of updatedState.runRewards) {
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
    const headerHtml = `
        <div class="ab-run-header">
            <span>${t("symposium.ui.roundOf", { current: state.round, total: state.totalRounds })}</span>
            <span>vs ${opponent.name}</span>
            <span>${t("symposium.ui.wl", { wins: updatedState.wins, losses: updatedState.losses })}</span>
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

    let html = `
        <div class="ab-run-header">
            <span>${t("symposium.ui.roundOf", { current: state.round, total: state.totalRounds })}</span>
            <span>${t("symposium.ui.wl", { wins: state.wins, losses: state.losses })}</span>
        </div>
        <div class="ab-combat-result ${resultClass}">
            <h2>${resultText}</h2>
            <div class="ab-combat-subtitle">${t("symposium.ui.combatLasted", { rounds: result.rounds })}</div>
    `

    if (result.playerSurvivors.length > 0) {
        html += `<div style="margin: 8px 0;">
            <div style="font-size: 10px; font-weight: 700; margin-bottom: 4px;">${t("symposium.ui.survivors")}</div>
            <div style="display: flex; gap: 4px; justify-content: center;">`
        for (const u of result.playerSurvivors) {
            html += renderUnitCard(u, { variant: "combat", side: "player" })
        }
        html += `</div></div>`
    }

    html += `
        <details style="margin: 8px 0; text-align: left;">
            <summary style="cursor: pointer; font-size: 10px;">${t("symposium.ui.combatLog", { count: result.log.length })}</summary>
            <div class="ab-combat-log">
    `
    for (const entry of result.log) {
        const cls = entry.description.includes("dies")
            ? "death"
            : entry.description.includes("summons")
              ? "summon"
              : ""
        html += `<div class="ab-log-entry ${cls}">R${entry.round}: ${entry.description}</div>`
    }
    html += `</div></details>`

    const recentRewards = state.runRewards.slice(-3)
    if (recentRewards.length > 0) {
        html += `<div class="ab-rewards"><h3>${t("symposium.ui.rewards")}</h3>`
        for (const reward of recentRewards) {
            const icon =
                reward.type === "xp"
                    ? "✨"
                    : reward.type === "scrap"
                      ? "💭"
                      : reward.type === "commodity"
                        ? "📦"
                        : "🎁"
            html += `<div class="ab-reward">${icon} ${reward.description}: ${reward.value}</div>`
        }
        html += `</div>`
    }

    if (isFinished) {
        const summary =
            state.wins >= state.totalRounds
                ? t("symposium.ui.runComplete", {
                      wins: state.wins,
                      losses: state.losses,
                  })
                : t("symposium.ui.runOver", {
                      wins: state.wins,
                      losses: state.losses,
                  })
        html += `<p style="font-size: 11px; margin: 8px 0;">${summary}</p>`
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
        renderLobbyView(container)
    })
}
