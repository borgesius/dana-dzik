import { playSound } from "../audio"
import { createCombatUnit } from "./combat"
import type { CombatLogEntry, CombatResult, CombatUnit, UnitId } from "./types"
import { renderUnitCard, unitDisplayName } from "./UnitCard"
import { UNIT_MAP } from "./units"

const BASE_ACTION_DELAY_MS = 350
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
    private isBossRound: boolean

    // Live state (cloned from start)
    private playerUnits: CombatUnit[] = []
    private opponentUnits: CombatUnit[] = []

    private logIndex = 0
    private timerId: ReturnType<typeof setTimeout> | null = null
    private skipped = false
    private logContainer: HTMLElement | null = null

    // Speed control: 1 = normal, 2 = fast
    private speedMultiplier = 1
    private lastRound = 0

    constructor(
        container: HTMLElement,
        result: CombatResult,
        playerLineup: CombatUnit[],
        opponentLineup: CombatUnit[],
        onComplete: AnimatorCallback,
        isBossRound = false
    ) {
        this.container = container
        this.result = result
        this.playerStart = playerLineup.map((u) => ({ ...u }))
        this.opponentStart = opponentLineup.map((u) => ({ ...u }))
        this.onComplete = onComplete
        this.isBossRound = isBossRound
    }

    private get actionDelay(): number {
        return Math.round(BASE_ACTION_DELAY_MS / this.speedMultiplier)
    }

    public start(): void {
        this.playerUnits = this.playerStart.map((u) => ({ ...u }))
        this.opponentUnits = this.opponentStart.map((u) => ({ ...u }))
        this.logIndex = 0
        this.skipped = false
        this.lastRound = 0

        this.render()
        this.highlightFrontUnits()
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
        const arenaClass = this.isBossRound
            ? "ab-combat-arena ab-boss-arena"
            : "ab-combat-arena"
        const html = `
            <div class="${arenaClass}" id="ab-combat-arena">
                <div class="ab-arena-side opponent" id="ab-opponent-side">
                    <span class="ab-arena-label">ENEMY</span>
                    ${this.renderSideUnits(this.opponentUnits, "opponent")}
                </div>
                <div class="ab-combat-round" id="ab-combat-round">Round 1</div>
                <div class="ab-arena-vs">⚔ VS ⚔</div>
                <div class="ab-arena-side player" id="ab-player-side">
                    <span class="ab-arena-label">YOU</span>
                    ${this.renderSideUnits(this.playerUnits, "player")}
                </div>
            </div>
            <div class="ab-combat-controls">
                <button class="ab-speed-btn ${this.speedMultiplier === 1 ? "active" : ""}" data-speed="1">1x</button>
                <button class="ab-speed-btn ${this.speedMultiplier === 2 ? "active" : ""}" data-speed="2">2x</button>
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

        // Speed controls
        this.container
            .querySelectorAll<HTMLElement>(".ab-speed-btn")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const speed = parseInt(btn.getAttribute("data-speed") ?? "1")
                    this.speedMultiplier = speed
                    // Update active state
                    this.container
                        .querySelectorAll(".ab-speed-btn")
                        .forEach((b) => b.classList.remove("active"))
                    btn.classList.add("active")
                })
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

    // ── Front unit highlighting ──────────────────────────────────────────

    private highlightFrontUnits(): void {
        this.container
            .querySelectorAll(".uc-front-unit")
            .forEach((el) => el.classList.remove("uc-front-unit"))

        const playerSide = document.getElementById("ab-player-side")
        const opponentSide = document.getElementById("ab-opponent-side")

        if (playerSide) {
            const firstAlive = playerSide.querySelector(
                ".uc-card.uc-combat:not(.dead)"
            )
            firstAlive?.classList.add("uc-front-unit")
        }
        if (opponentSide) {
            const cards = opponentSide.querySelectorAll(
                ".uc-card.uc-combat:not(.dead)"
            )
            // Opponent side is row-reversed, so last in DOM = first visually
            if (cards.length > 0) {
                cards[cards.length - 1].classList.add("uc-front-unit")
            }
        }
    }

    // ── Animation loop ────────────────────────────────────────────────────

    private scheduleNext(): void {
        if (this.skipped) return
        if (this.logIndex >= this.result.log.length) {
            setTimeout(() => {
                if (!this.skipped) {
                    playSound(
                        this.result.winner === "player"
                            ? "ab_victory"
                            : "ab_defeat"
                    )
                    this.onComplete(this.result)
                }
            }, DEATH_DELAY_MS)
            return
        }

        this.timerId = setTimeout(() => {
            const entry = this.result.log[this.logIndex]

            if (entry.round !== this.lastRound) {
                this.lastRound = entry.round
                this.updateRoundIndicator(entry.round)
            }

            this.processLogEntry(entry)
            this.logIndex++

            this.highlightFrontUnits()

            this.scheduleNext()
        }, this.actionDelay)
    }

    private updateRoundIndicator(round: number): void {
        const el = document.getElementById("ab-combat-round")
        if (!el) return
        el.textContent = `Round ${round}`
        el.classList.remove("ab-round-pulse")
        // Force reflow to restart animation
        void el.offsetWidth
        el.classList.add("ab-round-pulse")
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
        } else if (desc.includes(" gains +") && desc.includes(" ATK")) {
            this.animateBuffEffect(desc)
        } else if (desc.includes(" gains +") && desc.includes(" shield")) {
            this.animateBuffEffect(desc)
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

    // ── Screen shake ──────────────────────────────────────────────────────

    private triggerScreenShake(): void {
        const arena = document.getElementById("ab-combat-arena")
        if (!arena) return
        arena.classList.remove("ab-screen-shake")
        void arena.offsetWidth
        arena.classList.add("ab-screen-shake")
        setTimeout(
            () => arena.classList.remove("ab-screen-shake"),
            300
        )
    }

    // ── Ability callout ───────────────────────────────────────────────────

    private showAbilityCallout(card: HTMLElement, unitDefId: string): void {
        const def = UNIT_MAP.get(unitDefId as UnitId)
        if (!def) return

        const displayName = unitDisplayName(def)
        const callout = document.createElement("div")
        callout.className = "uc-ability-callout"
        callout.textContent = displayName
        card.style.position = "relative"
        card.appendChild(callout)
        setTimeout(() => callout.remove(), 800)
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
            setTimeout(() => attackerCard.classList.remove("attacking"), 350)
        }

        const targetCard = this.findCardByUnitDefId(targetId)
        if (targetCard) {
            targetCard.classList.add("hit")
            setTimeout(() => targetCard.classList.remove("hit"), 300)
            this.showDamageNumber(targetCard, dmg)

            const maxHp = parseInt(
                targetCard.getAttribute("data-max-hp") ?? "0"
            )
            if (maxHp > 0 && dmg > maxHp * 0.4) {
                this.triggerScreenShake()
                playSound("ab_bighit")
            } else {
                playSound("ab_hit")
            }
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
            this.triggerScreenShake()
            playSound("ab_death")
        }
    }

    private animateAbilityDamage(desc: string): void {
        // Pattern: "unitId ability deals N to targetId"
        const match = desc.match(/^(\S+) ability deals (\d+) to (\S+)/)
        if (!match) return

        const [, casterId, dmgStr, targetId] = match
        const dmg = parseInt(dmgStr)

        const casterCard = this.findCardByUnitDefId(casterId)
        if (casterCard) {
            this.showAbilityCallout(casterCard, casterId)
        }

        playSound("ab_ding")

        const targetCard = this.findCardByUnitDefId(targetId)
        if (targetCard) {
            targetCard.classList.add("hit")
            setTimeout(() => targetCard.classList.remove("hit"), 300)
            this.showDamageNumber(targetCard, dmg)

            const maxHp = parseInt(
                targetCard.getAttribute("data-max-hp") ?? "0"
            )
            if (maxHp > 0 && dmg > maxHp * 0.4) {
                this.triggerScreenShake()
            }
        }

        this.applyDamageToUnit(targetId, dmg)
    }

    private animateHeal(desc: string): void {
        const match = desc.match(/^(\S+) ability heals (\S+) for (\d+)/)
        if (!match) return

        const [, casterId, targetId, healStr] = match
        const heal = parseInt(healStr)

        const casterCard = this.findCardByUnitDefId(casterId)
        if (casterCard) {
            this.showAbilityCallout(casterCard, casterId)
        }

        const card = this.findCardByUnitDefId(targetId)
        if (card) {
            card.classList.add("buffed")
            setTimeout(() => card.classList.remove("buffed"), 400)
            this.showHealNumber(card, heal)
            playSound("ab_boop")
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
            card.classList.add("buffed")
            setTimeout(() => card.classList.remove("buffed"), 400)
            this.showHealNumber(card, amount)
        }

        this.applyHealToUnit(targetId, amount, true)
    }

    private animateBuffEffect(desc: string): void {
        // Generic buff animation for ATK/shield gains
        const match = desc.match(/^(\S+) gains/)
        if (!match) return

        const card = this.findCardByUnitDefId(match[1])
        if (card) {
            card.classList.add("buffed")
            setTimeout(() => card.classList.remove("buffed"), 400)

            // Check for shield break (shield going to 0)
            if (desc.includes("shield")) {
                const shieldEl = card.querySelector(".uc-shield")
                if (shieldEl && shieldEl.textContent?.includes("0")) {
                    card.classList.add("uc-shield-break")
                    setTimeout(
                        () => card.classList.remove("uc-shield-break"),
                        400
                    )
                }
            }
        }
    }

    private showHealNumber(card: HTMLElement, amount: number): void {
        const numEl = document.createElement("span")
        numEl.className = "uc-heal-number"
        numEl.textContent = `+${amount}`
        card.style.position = "relative"
        card.appendChild(numEl)
        setTimeout(() => numEl.remove(), 700)
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

        const [, casterId, summonedId, sideTag] = match

        const casterCard = this.findCardByUnitDefId(casterId)
        if (casterCard) {
            this.showAbilityCallout(casterCard, casterId)
        }
        playSound("ab_ding")

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

        const summoned = createCombatUnit(summonedId as UnitId, 1)

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
            setTimeout(() => cardEl.classList.remove("uc-summon-enter"), 500)
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
            const def = UNIT_MAP.get(unitDefId as UnitId)
            if (def && nameEl.textContent?.includes(def.name)) {
                return card
            }
        }
        return null
    }

    private showDamageNumber(card: HTMLElement, dmg: number): void {
        const numEl = document.createElement("span")
        const maxHp = parseInt(card.getAttribute("data-max-hp") ?? "0")
        const isBigHit = maxHp > 0 && dmg > maxHp * 0.4
        numEl.className = `uc-damage-number${isBigHit ? " uc-big-hit" : ""}`
        numEl.textContent = `-${dmg}`
        card.style.position = "relative"
        card.appendChild(numEl)
        setTimeout(() => numEl.remove(), isBigHit ? 800 : 700)
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
