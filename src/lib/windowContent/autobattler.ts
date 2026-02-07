import { getCollectionManager } from "../autobattler/CollectionManager"
import { RunManager } from "../autobattler/RunManager"
import type { CombatUnit } from "../autobattler/types"
import { UNIT_MAP } from "../autobattler/units"
import { getCareerManager } from "../progression/CareerManager"
import { getProgressionManager } from "../progression/ProgressionManager"
import { saveManager } from "../saveManager"

let activeRun: RunManager | null = null

export function getAutobattlerContent(): string {
    return `<div id="autobattler-content" class="autobattler-container"></div>`
}

export function renderAutobattlerWindow(): void {
    const container = document.getElementById("autobattler-content")
    if (!container) return

    if (activeRun && !activeRun.isFinished()) {
        renderRunView(container)
    } else {
        renderLobbyView(container)
    }
}

function renderLobbyView(container: HTMLElement): void {
    const collection = getCollectionManager()
    const collSize = collection.getCollectionSize()
    const runs = collection.getCompletedRuns()
    const wins = collection.getWonRuns()

    let html = `
        <div class="ab-lobby">
            <h2>⚔️ FRONTIER</h2>
            <p class="ab-subtitle">Weird West Auto-Chess</p>

            <div class="ab-stats">
                <div class="ab-stat"><span>Runs:</span><span>${runs}</span></div>
                <div class="ab-stat"><span>Wins:</span><span>${wins}</span></div>
                <div class="ab-stat"><span>Best Streak:</span><span>${collection.getBestStreak()}</span></div>
                <div class="ab-stat"><span>Collection:</span><span>${collSize} units</span></div>
            </div>

            <button class="ab-start-btn">Start Run</button>

            <div class="ab-collection-header">
                <h3>Collection</h3>
            </div>
            <div class="ab-collection-grid">
    `

    const allUnlocked = collection.getUnlockedUnitIds()
    for (const unitId of allUnlocked) {
        const def = UNIT_MAP.get(unitId)
        if (!def || def.shopCost === 0) continue
        html += `
            <div class="ab-collection-card" title="${def.name}: ${def.ability.description}">
                <div class="ab-card-name">${def.name}</div>
                <div class="ab-card-stats">${def.baseATK}/${def.baseHP}</div>
                <div class="ab-card-faction">${factionLabel(def.faction)}</div>
            </div>
        `
    }

    if (allUnlocked.size === 0) {
        html += `<div class="ab-empty">Start a run to begin collecting units!</div>`
    }

    html += `</div></div>`

    container.innerHTML = html

    const startBtn = container.querySelector(".ab-start-btn")
    startBtn?.addEventListener("click", () => {
        const unlockedIds = getCollectionManager().getUnlockedUnitIds()
        activeRun = new RunManager(unlockedIds)

        // Apply career tree combat bonuses
        const career = getCareerManager()
        activeRun.combatBonuses = {
            atkBonus: career.getBonus("autobattlerATK"),
            hpBonus: career.getBonus("autobattlerHP"),
        }

        activeRun.on("runCompleted", () => {
            getCollectionManager().recordRunComplete(true)
            saveManager.requestSave()
        })
        activeRun.on("runLost", () => {
            getCollectionManager().recordRunComplete(false)
            saveManager.requestSave()
        })

        renderRunView(container)
    })
}

function renderRunView(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()

    switch (state.phase) {
        case "shop":
            renderShopPhase(container)
            break
        case "arrange":
            renderShopPhase(container) // Same UI, just arrange mode
            break
        case "combat":
        case "reward":
            renderCombatResult(container)
            break
        case "finished":
            renderFinished(container)
            break
    }
}

function renderShopPhase(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()
    const offers = activeRun.getShopOffers()

    let html = `
        <div class="ab-run-header">
            <span>Round ${state.round}/${state.totalRounds}</span>
            <span>Scrap: ${state.scrap}</span>
            <span>W${state.wins} / L${state.losses}</span>
        </div>
        <div class="ab-shop">
            <h3>Shop</h3>
            <div class="ab-shop-offers">
    `

    offers.forEach((offer, i) => {
        const def = UNIT_MAP.get(offer.unitDefId)
        if (!def) return
        const cls = offer.sold
            ? "ab-shop-card sold"
            : state.scrap >= offer.cost
              ? "ab-shop-card"
              : "ab-shop-card disabled"

        html += `
            <button class="${cls}" data-offer="${i}" ${offer.sold ? "disabled" : ""}>
                <div class="ab-card-name">${def.name}</div>
                <div class="ab-card-stats">${def.baseATK}/${def.baseHP}</div>
                <div class="ab-card-faction">${factionLabel(def.faction)}</div>
                <div class="ab-card-ability">${def.ability.description}</div>
                <div class="ab-card-cost">${offer.sold ? "SOLD" : `${offer.cost} Scrap`}</div>
            </button>
        `
    })

    html += `
            </div>
            <button class="ab-reroll-btn" ${state.scrap < 1 ? "disabled" : ""}>Reroll (1 Scrap)</button>
        </div>

        <div class="ab-lineup">
            <h3>Your Lineup (${state.lineup.length}/5)</h3>
            <div class="ab-lineup-grid">
    `

    state.lineup.forEach((unit, i) => {
        html += renderCombatUnitCard(unit, "lineup", i)
    })

    html += `</div></div>`

    if (state.bench.length > 0) {
        html += `<div class="ab-bench"><h4>Bench</h4><div class="ab-lineup-grid">`
        state.bench.forEach((unit, i) => {
            html += renderCombatUnitCard(unit, "bench", i)
        })
        html += `</div></div>`
    }

    html += `
        <div class="ab-actions">
            <button class="ab-fight-btn" ${state.lineup.length === 0 ? "disabled" : ""}>Fight!</button>
        </div>
    `

    container.innerHTML = html

    // Wire events
    container.querySelectorAll(".ab-shop-card:not(.sold)").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-offer") ?? "0")
            activeRun?.buyUnit(idx)
            renderRunView(container)
        })
    })

    container.querySelector(".ab-reroll-btn")?.addEventListener("click", () => {
        activeRun?.reroll()
        renderRunView(container)
    })

    container.querySelectorAll(".ab-sell-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation()
            const source = btn.getAttribute("data-source") as "lineup" | "bench"
            const idx = parseInt(btn.getAttribute("data-idx") ?? "0")
            activeRun?.sellUnit(source, idx)
            renderRunView(container)
        })
    })

    container.querySelector(".ab-fight-btn")?.addEventListener("click", () => {
        if (!activeRun) return
        activeRun.readyForCombat()
        const result = activeRun.executeCombat()
        if (result) {
            // Grant XP from run rewards
            const state = activeRun.getState()
            for (const reward of state.runRewards) {
                if (reward.type === "xp" && typeof reward.value === "number") {
                    getProgressionManager().addXP(reward.value)
                }
            }
        }
        renderRunView(container)
    })
}

function renderCombatResult(container: HTMLElement): void {
    if (!activeRun) return

    const state = activeRun.getState()
    const result = activeRun.getLastCombatResult()
    if (!result) return

    let html = `
        <div class="ab-run-header">
            <span>Round ${state.round}/${state.totalRounds}</span>
            <span>W${state.wins} / L${state.losses}</span>
        </div>
        <div class="ab-combat-result ${result.winner === "player" ? "victory" : "defeat"}">
            <h2>${result.winner === "player" ? "Victory!" : result.winner === "draw" ? "Draw" : "Defeat"}</h2>
            <p>Combat lasted ${result.rounds} rounds</p>

            <div class="ab-combat-log">
    `

    // Show last 10 log entries
    const recentLog = result.log.slice(-10)
    for (const entry of recentLog) {
        html += `<div class="ab-log-entry">R${entry.round}: ${entry.description}</div>`
    }

    html += `</div><div class="ab-rewards"><h3>Rewards</h3>`
    for (const reward of state.runRewards.slice(-3)) {
        html += `<div class="ab-reward">${reward.description}: ${reward.value}</div>`
    }
    html += `</div>`

    if (state.phase === "finished") {
        html += `<button class="ab-return-btn">Return to Lobby</button>`
    } else {
        html += `<button class="ab-next-btn">Next Round</button>`
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

function renderFinished(container: HTMLElement): void {
    renderCombatResult(container) // Same view, button changes
}

function renderCombatUnitCard(unit: CombatUnit, source: string, index: number): string {
    const def = UNIT_MAP.get(unit.unitDefId)
    const levelStars = "★".repeat(unit.level)
    return `
        <div class="ab-unit-card">
            <div class="ab-card-name">${def?.name ?? unit.unitDefId} ${levelStars}</div>
            <div class="ab-card-stats">${unit.currentATK}/${unit.currentHP}</div>
            <div class="ab-card-faction">${factionLabel(unit.faction)}</div>
            <button class="ab-sell-btn" data-source="${source}" data-idx="${index}">Sell</button>
        </div>
    `
}

function factionLabel(faction: string): string {
    const labels: Record<string, string> = {
        quickdraw: "🔫 Quickdraw",
        deputies: "⭐ Deputies",
        clockwork: "⚙️ Clockwork",
        prospectors: "💀 Prospectors",
        drifters: "🤠 Drifters",
    }
    return labels[faction] ?? faction
}
