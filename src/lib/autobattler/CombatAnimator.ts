import { createCombatUnit } from "./combat"
import type { CombatLogEntry, CombatResult, CombatUnit } from "./types"
import { renderUnitCard, unitDisplayName } from "./UnitCard"
import { UNIT_MAP } from "./units"

const ACTION_DELAY_MS = 350
const DEATH_DELAY_MS = 500

type AnimatorCallback = (result: CombatResult) => void

/**
 * Replays a CombatResult visually in a container, stepping through the
 * combat log with timed animations.
 */
export class CombatAnimator {
    private container: HTMLElement
    private result: CombatResult
    private playerStart: CombatUnit[]
    private opponentStart: CombatUnit[]
    private onComplete: AnimatorCallback

    // Live state (cloned from start)
    private playerUnits: CombatUnit[] = []
    private opponentUnits: CombatUnit[] = []

    private logIndex = 0
    private timerId: ReturnType<typeof setTimeout> | null = null
    private skipped = false
    private logContainer: HTMLElement | null = null

    constructor(
        container: HTMLElement,
        result: CombatResult,
        playerLineup: CombatUnit[],
        opponentLineup: CombatUnit[],
        onComplete: AnimatorCallback
    ) {
        this.container = container
        this.result = result
        this.playerStart = playerLineup.map((u) => ({ ...u }))
        this.opponentStart = opponentLineup.map((u) => ({ ...u }))
        this.onComplete = onComplete
    }

    public start(): void {
        this.playerUnits = this.playerStart.map((u) => ({ ...u }))
        this.opponentUnits = this.opponentStart.map((u) => ({ ...u }))
        this.logIndex = 0
        this.skipped = false

        this.render()
        this.scheduleNext()
    }

    public skip(): void {
        this.skipped = true
        if (this.timerId) {
            clearTimeout(this.timerId)
            this.timerId = null
        }
        this.renderFinalState()
        this.onComplete(this.result)
    }

    public destroy(): void {
        if (this.timerId) {
            clearTimeout(this.timerId)
            this.timerId = null
        }
    }

    // ── Rendering ─────────────────────────────────────────────────────────

    private render(): void {
        const html = `
            <div class="ab-combat-arena">
                <div class="ab-arena-side opponent" id="ab-opponent-side">
                    <span class="ab-arena-label">ENEMY</span>
                    ${this.renderSideUnits(this.opponentUnits, "opponent")}
                </div>
                <div class="ab-arena-vs">⚔ VS ⚔</div>
                <div class="ab-arena-side player" id="ab-player-side">
                    <span class="ab-arena-label">YOU</span>
                    ${this.renderSideUnits(this.playerUnits, "player")}
                </div>
            </div>
            <div class="ab-combat-controls">
                <button class="ab-skip-btn" id="ab-skip-combat">Skip ⏩</button>
            </div>
            <div class="ab-combat-log" id="ab-combat-log"></div>
        `

        this.container.innerHTML = html
        this.logContainer = document.getElementById("ab-combat-log")

        document
            .getElementById("ab-skip-combat")
            ?.addEventListener("click", () => {
                this.skip()
            })
    }

    private renderSideUnits(
        units: CombatUnit[],
        side: "player" | "opponent"
    ): string {
        return units
            .map((u) => renderUnitCard(u, { variant: "combat", side }))
            .join("")
    }

    private renderFinalState(): void {
        const logEl =
            this.logContainer ?? document.getElementById("ab-combat-log")
        if (logEl) {
            logEl.innerHTML = this.result.log
                .map(
                    (e) =>
                        `<div class="ab-log-entry ${this.logEntryClass(e)}">${this.formatLogEntry(e)}</div>`
                )
                .join("")
            logEl.scrollTop = logEl.scrollHeight
        }

        this.updateArenaCards(this.result.playerSurvivors, "player")
        this.updateArenaCards(this.result.opponentSurvivors, "opponent")
    }

    // ── Animation loop ────────────────────────────────────────────────────

    private scheduleNext(): void {
        if (this.skipped) return
        if (this.logIndex >= this.result.log.length) {
            setTimeout(() => {
                if (!this.skipped) this.onComplete(this.result)
            }, DEATH_DELAY_MS)
            return
        }

        this.timerId = setTimeout(() => {
            this.processLogEntry(this.result.log[this.logIndex])
            this.logIndex++
            this.scheduleNext()
        }, ACTION_DELAY_MS)
    }

    private processLogEntry(entry: CombatLogEntry): void {
        this.appendLogEntry(entry)

        const desc = entry.description

        if (desc.includes(" attacks ")) {
            this.animateAttack(desc)
        } else if (desc.includes(" dies")) {
            this.animateDeath(desc)
        } else if (desc.includes(" ability deals ")) {
            this.animateAbilityDamage(desc)
        } else if (desc.includes(" ability heals ")) {
            this.animateHeal(desc)
        } else if (desc.includes(" summons ")) {
            this.animateSummon(desc)
        } else if (desc.includes(" gains +") && desc.includes(" HP")) {
            this.animateHpGain(desc)
        }
    }

    private appendLogEntry(entry: CombatLogEntry): void {
        if (!this.logContainer) return
        const div = document.createElement("div")
        div.className = `ab-log-entry ${this.logEntryClass(entry)}`
        div.textContent = this.formatLogEntry(entry)
        this.logContainer.appendChild(div)
        this.logContainer.scrollTop = this.logContainer.scrollHeight
    }

    private formatLogEntry(entry: CombatLogEntry): string {
        // Translate unit def IDs to display names for user-facing text
        let desc = entry.description
        // Replace known unit IDs with display names
        for (const [id, def] of UNIT_MAP) {
            if (desc.includes(id)) {
                desc = desc.split(id).join(unitDisplayName(def))
            }
        }
        return `R${entry.round}: ${desc}`
    }

    private logEntryClass(entry: CombatLogEntry): string {
        if (entry.description.includes("dies")) return "death"
        if (entry.description.includes("summons")) return "summon"
        if (
            entry.description.includes("gain") ||
            entry.description.includes("heal")
        )
            return "buff"
        return ""
    }

    // ── Individual animations ─────────────────────────────────────────────

    private animateAttack(desc: string): void {
        // Pattern: "unitId attacks targetId for N"
        const match = desc.match(/^(\S+) attacks (\S+) for (\d+)/)
        if (!match) return

        const [, attackerId, targetId, dmgStr] = match
        const dmg = parseInt(dmgStr)

        const attackerCard = this.findCardByUnitDefId(attackerId)
        if (attackerCard) {
            attackerCard.classList.add("attacking")
            setTimeout(() => attackerCard.classList.remove("attacking"), 300)
        }

        const targetCard = this.findCardByUnitDefId(targetId)
        if (targetCard) {
            targetCard.classList.add("hit")
            setTimeout(() => targetCard.classList.remove("hit"), 200)
            this.showDamageNumber(targetCard, dmg)
        }

        this.applyDamageToUnit(targetId, dmg)
    }

    private animateDeath(desc: string): void {
        // Pattern: "unitId dies"
        const match = desc.match(/^(\S+) dies/)
        if (!match) return

        const card = this.findCardByUnitDefId(match[1])
        if (card) {
            card.classList.add("dead")
        }
    }

    private animateAbilityDamage(desc: string): void {
        // Pattern: "unitId ability deals N to targetId"
        const match = desc.match(/^(\S+) ability deals (\d+) to (\S+)/)
        if (!match) return

        const [, , dmgStr, targetId] = match
        const dmg = parseInt(dmgStr)

        const targetCard = this.findCardByUnitDefId(targetId)
        if (targetCard) {
            targetCard.classList.add("hit")
            setTimeout(() => targetCard.classList.remove("hit"), 200)
            this.showDamageNumber(targetCard, dmg)
        }

        this.applyDamageToUnit(targetId, dmg)
    }

    private animateHeal(desc: string): void {
        const match = desc.match(/^(\S+) ability heals (\S+) for (\d+)/)
        if (!match) return

        const [, , targetId, healStr] = match
        const heal = parseInt(healStr)

        const card = this.findCardByUnitDefId(targetId)
        if (card) {
            this.showHealNumber(card, heal)
        }

        this.applyHealToUnit(targetId, heal, false)
    }

    private animateHpGain(desc: string): void {
        const match = desc.match(/^(\S+) gains \+(\d+) HP/)
        if (!match) return

        const [, targetId, amountStr] = match
        const amount = parseInt(amountStr)

        const card = this.findCardByUnitDefId(targetId)
        if (card) {
            this.showHealNumber(card, amount)
        }

        this.applyHealToUnit(targetId, amount, true)
    }

    private showHealNumber(card: HTMLElement, amount: number): void {
        const numEl = document.createElement("span")
        numEl.className = "uc-heal-number"
        numEl.textContent = `+${amount}`
        card.style.position = "relative"
        card.appendChild(numEl)
        setTimeout(() => numEl.remove(), 600)
    }

    private applyHealToUnit(
        unitDefId: string,
        amount: number,
        increasesMax: boolean
    ): void {
        const card = this.findCardByUnitDefId(unitDefId)
        if (!card) return

        const hpBar = card.querySelector<HTMLElement>(".uc-hp-fill")
        const hpText = card.querySelector(".uc-hp-text")
        if (!hpBar || !hpText) return

        const hpMatch = hpText.textContent?.match(/(\d+)\/(\d+)/)
        if (!hpMatch) return

        const maxHP = parseInt(hpMatch[2]) + (increasesMax ? amount : 0)
        const currentHP = Math.min(maxHP, parseInt(hpMatch[1]) + amount)
        const pct = Math.max(0, Math.round((currentHP / maxHP) * 100))
        const color = pct > 60 ? "#228b22" : pct > 30 ? "#d4a017" : "#cc0000"

        hpBar.style.width = `${pct}%`
        hpBar.style.background = color
        hpText.textContent = `${currentHP}/${maxHP}`
    }

    private animateSummon(desc: string): void {
        // Pattern: "unitId summons newUnitId [player|opponent]"
        const match = desc.match(
            /^(\S+) summons (\S+)(?: \[(player|opponent)\])?/
        )
        if (!match) return

        const [, , summonedId, sideTag] = match

        let side: "player" | "opponent" = "player"
        if (sideTag === "player" || sideTag === "opponent") {
            side = sideTag
        } else {
            // Fallback: check if the summoner is on the player or opponent side
            const isPlayerUnit = this.playerUnits.some(
                (u) => u.unitDefId === match[1]
            )
            side = isPlayerUnit ? "player" : "opponent"
        }

        const sideEl = document.getElementById(
            side === "player" ? "ab-player-side" : "ab-opponent-side"
        )
        if (!sideEl) return

        const summoned = createCombatUnit(summonedId, 1)

        if (side === "player") {
            this.playerUnits.push(summoned)
        } else {
            this.opponentUnits.push(summoned)
        }

        const cardHtml = renderUnitCard(summoned, { variant: "combat", side })
        const wrapper = document.createElement("div")
        wrapper.innerHTML = cardHtml
        const cardEl = wrapper.firstElementChild as HTMLElement | null
        if (cardEl) {
            cardEl.classList.add("uc-summon-enter")
            sideEl.appendChild(cardEl)
            setTimeout(() => cardEl.classList.remove("uc-summon-enter"), 400)
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private findCardByUnitDefId(unitDefId: string): HTMLElement | null {
        const cards = this.container.querySelectorAll<HTMLElement>(
            `.uc-card.uc-combat[data-unit-def="${unitDefId}"]:not(.dead)`
        )
        if (cards.length > 0) return cards[0]

        // Fallback: match by name for older cards without data-unit-def
        const allCards =
            this.container.querySelectorAll<HTMLElement>(".uc-card.uc-combat")
        for (const card of allCards) {
            if (card.classList.contains("dead")) continue
            const nameEl = card.querySelector(".uc-name")
            if (!nameEl) continue
            const def = UNIT_MAP.get(unitDefId)
            if (def && nameEl.textContent?.includes(def.name)) {
                return card
            }
        }
        return null
    }

    private showDamageNumber(card: HTMLElement, dmg: number): void {
        const numEl = document.createElement("span")
        numEl.className = "uc-damage-number"
        numEl.textContent = `-${dmg}`
        card.style.position = "relative"
        card.appendChild(numEl)
        setTimeout(() => numEl.remove(), 600)
    }

    private applyDamageToUnit(unitDefId: string, dmg: number): void {
        const card = this.findCardByUnitDefId(unitDefId)
        if (!card) return

        const hpBar = card.querySelector<HTMLElement>(".uc-hp-fill")
        const hpText = card.querySelector(".uc-hp-text")
        if (!hpBar || !hpText) return

        const hpMatch = hpText.textContent?.match(/(\d+)\/(\d+)/)
        if (!hpMatch) return

        const currentHP = Math.max(0, parseInt(hpMatch[1]) - dmg)
        const maxHP = parseInt(hpMatch[2])
        const pct = Math.max(0, Math.round((currentHP / maxHP) * 100))
        const color = pct > 60 ? "#228b22" : pct > 30 ? "#d4a017" : "#cc0000"

        hpBar.style.width = `${pct}%`
        hpBar.style.background = color
        hpText.textContent = `${currentHP}/${maxHP}`
    }

    private updateArenaCards(
        survivors: CombatUnit[],
        side: "player" | "opponent"
    ): void {
        const sideEl = document.getElementById(
            side === "player" ? "ab-player-side" : "ab-opponent-side"
        )
        if (!sideEl) return

        const cards = sideEl.querySelectorAll<HTMLElement>(".uc-card.uc-combat")
        const survivorIds = new Set(survivors.map((u) => u.instanceId))

        for (const card of cards) {
            const instanceId = card.getAttribute("data-instance")
            if (instanceId && !survivorIds.has(instanceId)) {
                card.classList.add("dead")
            }
        }
    }
}
