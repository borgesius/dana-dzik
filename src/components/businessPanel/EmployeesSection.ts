import { emitAppEvent } from "../../lib/events"
import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import {
    CHEMISTRY,
    type Employee,
    EMPLOYEE_DEFS,
    getEffectiveness,
    getEmployeeBonus,
    getEmployeeSalary,
    getHireCost,
    ICS_PER_VP,
    REFRESH_POOL_BASE_COST,
} from "../../lib/marketGame/employees"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"

interface DragState {
    vpIndex: number
    icIndex: number // -1 for VP
    ghost: HTMLElement | null
}

export class EmployeesSection {
    private element: HTMLElement
    private contentEl: HTMLElement
    private game: MarketEngine
    private playSound: (type: string) => void

    /** Currently selected candidate index for placement */
    private selectedCandidate: number = -1
    private dragState: DragState | null = null
    /** Queue of morale notifications to display briefly */
    private moraleNotifications: string[] = []
    private notificationTimeout: ReturnType<typeof setTimeout> | null = null

    /** Get effective hire cost after prestige discounts */
    private getEffectiveHireCost(emp: Employee): number {
        const base = getHireCost(emp)
        const discount = this.game.prestigeProvider?.("hiringDiscount") ?? 0
        return base * (1 - discount)
    }

    constructor(game: MarketEngine, playSound: (type: string) => void) {
        this.game = game
        this.playSound = playSound
        this.contentEl = document.createElement("div")
        this.element = this.createElement()
        this.updateVisibility()

        this.game.on("moraleEvent", (data) => {
            const evt = data
            this.showMoraleNotification(evt.message)
        })
    }

    private showMoraleNotification(msg: string): void {
        this.moraleNotifications.push(msg)
        if (this.moraleNotifications.length > 3) {
            this.moraleNotifications.shift()
        }
        this.render()

        if (this.notificationTimeout) clearTimeout(this.notificationTimeout)
        this.notificationTimeout = setTimeout(() => {
            this.moraleNotifications = []
            this.render()
        }, 4000)
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private lockedEl: HTMLElement = document.createElement("div")

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "employees-section"

        const heading = document.createElement("h3")
        heading.textContent = "Human Resources"
        section.appendChild(heading)

        this.lockedEl.className = "phase-locked-teaser"
        section.appendChild(this.lockedEl)
        section.appendChild(this.contentEl)

        return section
    }

    public updateVisibility(): void {
        const unlocked = this.game.isPhaseUnlocked(5)
        const prevUnlocked = this.game.isPhaseUnlocked(4)
        if (unlocked) {
            this.element.style.display = "block"
            this.contentEl.style.display = ""
            this.lockedEl.style.display = "none"
        } else if (prevUnlocked) {
            this.element.style.display = "block"
            this.contentEl.style.display = "none"
            this.lockedEl.style.display = ""
            const lm = getLocaleManager()
            this.lockedEl.textContent = lm.t("commodityExchange.ui.phase5Hint")
        } else {
            this.element.style.display = "none"
        }
    }

    public render(): void {
        if (!this.game.isPhaseUnlocked(5)) return

        const orgChart = this.game.getOrgChart()
        const cash = this.game.getCash()
        const pool = orgChart.getCandidatePool()
        const vpSlots = orgChart.getVPSlots()
        const totalSalary = orgChart.getTotalSalary()
        const bonuses = orgChart.calculateBonuses()

        let html = ""

        // ── Morale Notifications ───────────────────────────────────────
        if (this.moraleNotifications.length > 0) {
            html += `<div class="hr-notifications">`
            for (const msg of this.moraleNotifications) {
                html += `<div class="hr-notification">${msg}</div>`
            }
            html += `</div>`
        }

        // ── Hiring Pool ────────────────────────────────────────────────
        html += `<div class="hr-hiring-pool">`
        html += `<div class="hr-pool-label">Candidates</div>`
        html += `<div class="hr-pool-cards">`

        pool.forEach((candidate, i) => {
            const def = EMPLOYEE_DEFS[candidate.type]
            const hireCost = this.getEffectiveHireCost(candidate)
            const canAfford = cash >= hireCost
            const selected = this.selectedCandidate === i

            html += `
                <div class="hr-emp-card ${selected ? "selected" : ""} ${canAfford ? "" : "unaffordable"}"
                     data-pool-idx="${i}" title="${def.description}">
                    <div class="hr-emp-name">${candidate.name}</div>
                    <div class="hr-emp-type">
                        <span class="type-icon">${def.icon}</span>
                        ${def.label} <span class="hr-emp-level">${"★".repeat(candidate.level)}</span>
                    </div>
                    <div class="hr-emp-bonus">+${(getEmployeeBonus(candidate) * 100).toFixed(0)}% ${def.bonusType.startsWith("_") ? def.label : def.bonusType}</div>
                    <div class="hr-hire-cost">${canAfford ? "" : "⚠ "}${formatMoney(hireCost)}</div>
                </div>
            `
        })

        if (pool.length === 0) {
            html += `<div style="font-size: 9px; color: #999; padding: 4px;">Pool refreshing...</div>`
        }

        html += `</div>`
        html += `<div class="hr-pool-actions">`
        html += `<button class="hr-refresh-btn" ${cash >= REFRESH_POOL_BASE_COST ? "" : "disabled"}>
            🔄 Refresh (${formatMoney(REFRESH_POOL_BASE_COST)})
        </button>`
        html += `</div></div>`

        // ── Org Chart ──────────────────────────────────────────────────
        html += `<div class="hr-org-chart">`
        html += `<div class="hr-org-label">Org Chart</div>`

        // CEO row
        html += `<div class="hr-ceo-row"><div class="hr-ceo-card">👔 CEO (You)</div></div>`

        // VP + IC rows
        html += `<div class="hr-vp-row">`
        const activeSlots = orgChart.getActiveVPSlotCount()

        for (let v = 0; v < activeSlots; v++) {
            const slot = vpSlots[v]
            html += `<div class="hr-vp-column">`
            html += `<div class="hr-vp-connector"></div>`

            if (slot.vp) {
                html += this.renderEmployeeCard(slot.vp, v, -1, true)
            } else {
                html += `<div class="hr-slot-empty vp" data-slot-vp="${v}" data-slot-ic="-1">VP ${v + 1}</div>`
            }

            // IC row (only if VP exists)
            html += `<div class="hr-ic-row">`
            for (let i = 0; i < ICS_PER_VP; i++) {
                if (!slot.vp) {
                    // No VP = locked IC slots
                    html += `<div class="hr-slot-empty locked">—</div>`
                } else if (slot.ics[i]) {
                    const emp = slot.ics[i]
                    if (emp) html += this.renderEmployeeCard(emp, v, i, false)
                } else {
                    const chemHint = this.getChemistryHint(
                        slot.vp,
                        pool[this.selectedCandidate]
                    )
                    html += `<div class="hr-slot-empty ${chemHint.className}" data-slot-vp="${v}" data-slot-ic="${i}">IC${chemHint.label}</div>`
                }
            }
            html += `</div></div>`
        }

        if (!orgChart.isThirdVPUnlocked()) {
            html += `<div class="hr-vp-column">`
            html += `<div class="hr-vp-connector"></div>`
            html += `<div class="hr-slot-empty vp locked" title="Unlocks at Level 15 or 2nd Prestige">🔒</div>`
            html += `<div class="hr-ic-row">`
            for (let i = 0; i < ICS_PER_VP; i++) {
                html += `<div class="hr-slot-empty locked">—</div>`
            }
            html += `</div></div>`
        }

        html += `</div></div>`

        // ── Payroll Summary ────────────────────────────────────────────
        html += `<div class="hr-payroll">`
        html += `<div class="hr-payroll-row">
            <span class="label">Payroll/tick:</span>
            <span class="value ${totalSalary > 0 ? "negative" : ""}">${totalSalary > 0 ? "-" : ""}${formatMoney(totalSalary)}</span>
        </div>`

        const bonusEntries = [...bonuses.entries()].filter(([, v]) => v > 0)
        if (bonusEntries.length > 0) {
            for (const [type, value] of bonusEntries) {
                html += `<div class="hr-payroll-row">
                    <span class="label">${type}:</span>
                    <span class="value positive">+${(value * 100).toFixed(1)}%</span>
                </div>`
            }
        }
        html += `</div>`

        this.contentEl.innerHTML = html

        // ── Wire events ────────────────────────────────────────────────
        this.wirePoolClicks()
        this.wireSlotClicks()
        this.wireFireButtons()
        this.wireRaiseButtons()
        this.wireRefreshButton()
        this.wireDragDrop()
    }

    private renderEmployeeCard(
        emp: Employee,
        vpIndex: number,
        icIndex: number,
        isVP: boolean
    ): string {
        const def = EMPLOYEE_DEFS[emp.type]
        const salary = getEmployeeSalary(emp) * (isVP ? 1.5 : 1)
        const eff = getEffectiveness(emp)
        const morale = Math.round(emp.morale ?? 80)
        const moraleColor =
            morale > 70
                ? "green"
                : morale > 40
                  ? "gold"
                  : morale > 25
                    ? "orange"
                    : "red"
        const effLabel = eff < 1 ? ` (${Math.round(eff * 100)}%)` : ""

        let raiseHtml = ""
        if (emp.raisePending) {
            raiseHtml = `
                <div class="hr-raise-pending">
                    <span class="hr-raise-badge">$</span>
                    <button class="hr-raise-grant" data-raise-vp="${vpIndex}" data-raise-ic="${icIndex}" title="Grant raise (+25% salary, +10 morale)">✓</button>
                    <button class="hr-raise-deny" data-raise-vp="${vpIndex}" data-raise-ic="${icIndex}" title="Deny raise (-15 morale)">✕</button>
                </div>
            `
        }

        return `
            <div class="hr-emp-card ${isVP ? "vp" : ""} ${morale <= 25 ? "morale-critical" : ""}"
                 data-org-vp="${vpIndex}" data-org-ic="${icIndex}"
                 title="${def.description}\nSalary: ${formatMoney(salary)}/tick\nMorale: ${morale}\nEffectiveness: ${Math.round(eff * 100)}%\nTenure: ${emp.tenure ?? 0} ticks${emp.salaryMultiplier > 1 ? `\nSalary mult: ${emp.salaryMultiplier.toFixed(2)}x` : ""}">
                <div class="hr-morale-bar">
                    <div class="hr-morale-fill" style="width: ${morale}%; background: ${moraleColor}"></div>
                </div>
                <div class="hr-emp-name">${emp.name}${effLabel}</div>
                <div class="hr-emp-type">
                    <span class="type-icon">${def.icon}</span>
                    ${def.label} <span class="hr-emp-level">${"★".repeat(emp.level)}</span>
                </div>
                <div class="hr-emp-salary">-${formatMoney(salary)}/tick</div>
                ${raiseHtml}
                <button class="hr-fire-btn" data-fire-vp="${vpIndex}" data-fire-ic="${icIndex}" title="Off to gluier pastures">✕</button>
            </div>
        `
    }

    /** Get chemistry hint between a VP and a candidate for empty slot display */
    private getChemistryHint(
        vp: Employee | null,
        candidate: Employee | undefined
    ): { label: string; className: string } {
        if (!vp || !candidate) return { label: "", className: "" }
        const chem = CHEMISTRY[vp.type]?.[candidate.type] ?? 0
        if (chem > 0.2) return { label: " ↑↑", className: "chem-great" }
        if (chem > 0) return { label: " ↑", className: "chem-good" }
        if (chem < -0.2) return { label: " ↓↓", className: "chem-bad" }
        if (chem < 0) return { label: " ↓", className: "chem-poor" }
        return { label: "", className: "" }
    }

    // ── Event wiring ────────────────────────────────────────────────────

    private wirePoolClicks(): void {
        this.contentEl
            .querySelectorAll<HTMLElement>("[data-pool-idx]")
            .forEach((card) => {
                card.addEventListener("click", () => {
                    const idx = parseInt(
                        card.getAttribute("data-pool-idx") ?? "-1"
                    )
                    if (this.selectedCandidate === idx) {
                        this.selectedCandidate = -1
                    } else {
                        this.selectedCandidate = idx
                    }
                    this.render()
                })
            })
    }

    private wireSlotClicks(): void {
        this.contentEl
            .querySelectorAll<HTMLElement>(".hr-slot-empty:not(.locked)")
            .forEach((slot) => {
                slot.addEventListener("click", () => {
                    if (this.selectedCandidate === -1) return

                    const vpIdx = parseInt(
                        slot.getAttribute("data-slot-vp") ?? "-1"
                    )
                    const icIdx = parseInt(
                        slot.getAttribute("data-slot-ic") ?? "-1"
                    )

                    if (vpIdx === -1) return

                    const orgChart = this.game.getOrgChart()
                    const pool = orgChart.getCandidatePool()
                    const candidate = pool[this.selectedCandidate]
                    if (!candidate) return

                    const hireCost = this.getEffectiveHireCost(candidate)
                    if (this.game.getCash() < hireCost) return

                    const hired = orgChart.hire(
                        this.selectedCandidate,
                        vpIdx,
                        icIdx
                    )
                    if (hired) {
                        this.game.addBonus(-hireCost)
                        this.playSound("notify")
                        this.game.emitEvent("employeeHired", hired)
                        this.game.emitEvent("orgChartChanged")
                        this.selectedCandidate = -1
                        this.render()
                    }
                })
            })
    }

    private wireFireButtons(): void {
        this.contentEl
            .querySelectorAll<HTMLElement>(".hr-fire-btn")
            .forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation()
                    const vpIdx = parseInt(
                        btn.getAttribute("data-fire-vp") ?? "-1"
                    )
                    const icIdx = parseInt(
                        btn.getAttribute("data-fire-ic") ?? "-1"
                    )

                    const orgChart = this.game.getOrgChart()
                    const fired = orgChart.fire(vpIdx, icIdx)
                    if (fired) {
                        this.playSound("error")
                        this.game.emitEvent("employeeFired", fired)
                        this.game.emitEvent("orgChartChanged")
                        this.render()
                    }
                })
            })
    }

    private wireRaiseButtons(): void {
        this.contentEl
            .querySelectorAll<HTMLElement>(".hr-raise-grant")
            .forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation()
                    const vpIdx = parseInt(
                        btn.getAttribute("data-raise-vp") ?? "-1"
                    )
                    const icIdx = parseInt(
                        btn.getAttribute("data-raise-ic") ?? "-1"
                    )
                    const orgChart = this.game.getOrgChart()
                    if (orgChart.grantRaise(vpIdx, icIdx)) {
                        this.playSound("notify")
                        this.game.emitEvent("orgChartChanged")
                        this.render()
                    }
                })
            })

        this.contentEl
            .querySelectorAll<HTMLElement>(".hr-raise-deny")
            .forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation()
                    const vpIdx = parseInt(
                        btn.getAttribute("data-raise-vp") ?? "-1"
                    )
                    const icIdx = parseInt(
                        btn.getAttribute("data-raise-ic") ?? "-1"
                    )
                    const orgChart = this.game.getOrgChart()
                    if (orgChart.denyRaise(vpIdx, icIdx)) {
                        this.playSound("error")
                        this.game.emitEvent("orgChartChanged")
                        this.render()
                    }
                })
            })
    }

    private wireRefreshButton(): void {
        this.contentEl
            .querySelector(".hr-refresh-btn")
            ?.addEventListener("click", () => {
                if (this.game.getCash() < REFRESH_POOL_BASE_COST) return
                this.game.addBonus(-REFRESH_POOL_BASE_COST)
                this.game
                    .getOrgChart()
                    .refreshPool(
                        this.game.getLifetimeEarnings() > 10000
                            ? 3
                            : this.game.getLifetimeEarnings() > 500
                              ? 2
                              : 1
                    )
                this.selectedCandidate = -1
                this.render()
            })
    }

    private wireDragDrop(): void {
        const orgCards = this.contentEl.querySelectorAll<HTMLElement>(
            ".hr-emp-card[data-org-vp]"
        )

        orgCards.forEach((card) => {
            card.addEventListener("mousedown", (e) => {
                // Don't start drag on interactive elements (fire, raise, etc.)
                if ((e.target as HTMLElement).closest("button")) return
                e.preventDefault()

                const vpIdx = parseInt(card.getAttribute("data-org-vp") ?? "-1")
                const icIdx = parseInt(card.getAttribute("data-org-ic") ?? "-1")

                const ghost = card.cloneNode(true) as HTMLElement
                ghost.className = "hr-drag-ghost"
                ghost.style.width = `${card.offsetWidth}px`
                document.body.appendChild(ghost)
                ghost.style.left = `${e.clientX - card.offsetWidth / 2}px`
                ghost.style.top = `${e.clientY - 15}px`

                card.classList.add("dragging")
                this.dragState = { vpIndex: vpIdx, icIndex: icIdx, ghost }

                const onMove = (me: MouseEvent): void => {
                    if (!this.dragState?.ghost) return
                    this.dragState.ghost.style.left = `${me.clientX - card.offsetWidth / 2}px`
                    this.dragState.ghost.style.top = `${me.clientY - 15}px`

                    this.contentEl
                        .querySelectorAll(".drag-over")
                        .forEach((el) => el.classList.remove("drag-over"))
                    const target = this.findOrgDropTarget(
                        me.clientX,
                        me.clientY
                    )
                    if (target) target.classList.add("drag-over")
                }

                const onUp = (me: MouseEvent): void => {
                    document.removeEventListener("mousemove", onMove)
                    document.removeEventListener("mouseup", onUp)

                    if (!this.dragState) return
                    this.dragState.ghost?.remove()
                    card.classList.remove("dragging")

                    const targetEl = this.findOrgDropTarget(
                        me.clientX,
                        me.clientY
                    )
                    if (targetEl) {
                        const toVP = parseInt(
                            targetEl.getAttribute("data-slot-vp") ??
                                targetEl.getAttribute("data-org-vp") ??
                                "-1"
                        )
                        const toIC = parseInt(
                            targetEl.getAttribute("data-slot-ic") ??
                                targetEl.getAttribute("data-org-ic") ??
                                "-1"
                        )

                        if (toVP >= 0) {
                            const orgChart = this.game.getOrgChart()
                            const swapped = orgChart.swap(
                                this.dragState.vpIndex,
                                this.dragState.icIndex,
                                toVP,
                                toIC
                            )
                            if (swapped) {
                                this.game.emitEvent("orgChartChanged")
                                emitAppEvent("market:org-reorg")
                            }
                        }
                    }

                    this.contentEl
                        .querySelectorAll(".drag-over")
                        .forEach((el) => el.classList.remove("drag-over"))
                    this.dragState = null
                    this.render()
                }

                document.addEventListener("mousemove", onMove)
                document.addEventListener("mouseup", onUp)
            })
        })
    }

    private findOrgDropTarget(x: number, y: number): HTMLElement | null {
        const empties = this.contentEl.querySelectorAll<HTMLElement>(
            ".hr-slot-empty:not(.locked)"
        )
        for (const el of empties) {
            const rect = el.getBoundingClientRect()
            if (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            ) {
                return el
            }
        }

        const cards = this.contentEl.querySelectorAll<HTMLElement>(
            ".hr-emp-card[data-org-vp]"
        )
        for (const el of cards) {
            if (el.classList.contains("dragging")) continue
            const rect = el.getBoundingClientRect()
            if (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            ) {
                return el
            }
        }

        return null
    }
}
