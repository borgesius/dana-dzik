import {
    CHEMISTRY,
    deserializeEmployee,
    type Employee,
    EMPLOYEE_DEFS,
    type EmployeeSaveData,
    type EmployeeType,
    generateCandidatePool,
    getEffectiveness,
    getEmployeeBonus,
    getEmployeeSalary,
    ICS_PER_VP,
    INITIAL_VP_SLOTS,
    MAX_VP_SLOTS,
    POOL_REFRESH_TICKS,
    serializeEmployee,
} from "./employees"

// ── Morale event types ─────────────────────────────────────────────────────

export type MoraleEventType = "quit" | "burnout-warning" | "raise-demand"

export interface MoraleEvent {
    type: MoraleEventType
    employeeName: string
    message: string
}

/** Raise demand interval in ticks */
const RAISE_INTERVAL = 40

/** Base morale decay per tick (slow -- takes ~160 ticks to fully drain) */
const BURNOUT_RATE = 0.5

/** Morale penalty per empty IC slot under a VP */
const UNDERSTAFFED_PENALTY = 0.2

/** Deadpan quit messages, played completely straight */
const QUIT_MESSAGES = [
    "has accepted a counteroffer from a Web3 startup",
    "has departed to pursue a consulting opportunity",
    "has filed a voluntary separation agreement",
    "has transitioned to a personal sabbatical",
    "is no longer with the organization effective immediately",
    "has been recruited by a stealth-mode venture",
    "has elected to explore the broader talent marketplace",
    "has resigned citing irreconcilable cultural misalignment",
]

/** Deadpan raise demand messages */
const RAISE_MESSAGES = [
    "has submitted a compensation realignment request",
    "has initiated a market-rate adjustment discussion",
    "requires an equity refresh conversation",
    "has flagged their comp band as below-market",
    "has scheduled a total rewards review",
]

// ── Org chart tree ──────────────────────────────────────────────────────────

/** A VP slot in the org chart. Contains the VP employee and their IC reports. */
export interface VPSlot {
    vp: Employee | null
    ics: (Employee | null)[] // length = ICS_PER_VP
}

export interface OrgChartSaveData {
    vpSlots: {
        vp: EmployeeSaveData | null
        ics: (EmployeeSaveData | null)[]
    }[]
    candidatePool: EmployeeSaveData[]
    poolTickCounter: number
    thirdVPUnlocked: boolean
}

export class OrgChart {
    private vpSlots: VPSlot[] = []
    private candidatePool: Employee[] = []
    private poolTickCounter: number = 0
    private thirdVPUnlocked: boolean = false

    constructor() {
        this.initSlots()
        this.candidatePool = generateCandidatePool(3)
    }

    private initSlots(): void {
        this.vpSlots = []
        for (let i = 0; i < MAX_VP_SLOTS; i++) {
            this.vpSlots.push({
                vp: null,
                ics: Array(ICS_PER_VP).fill(null) as (Employee | null)[],
            })
        }
    }

    // ── Slot access ─────────────────────────────────────────────────────

    public getActiveVPSlotCount(): number {
        return this.thirdVPUnlocked ? MAX_VP_SLOTS : INITIAL_VP_SLOTS
    }

    public isThirdVPUnlocked(): boolean {
        return this.thirdVPUnlocked
    }

    public unlockThirdVP(): void {
        this.thirdVPUnlocked = true
    }

    public getVPSlots(): readonly VPSlot[] {
        return this.vpSlots.slice(0, this.getActiveVPSlotCount())
    }

    public getAllEmployees(): Employee[] {
        const emps: Employee[] = []
        for (const slot of this.vpSlots) {
            if (slot.vp) emps.push(slot.vp)
            for (const ic of slot.ics) {
                if (ic) emps.push(ic)
            }
        }
        return emps
    }

    public getEmployeeCount(): number {
        return this.getAllEmployees().length
    }

    // ── Candidate pool ──────────────────────────────────────────────────

    public getCandidatePool(): readonly Employee[] {
        return this.candidatePool
    }

    public refreshPool(maxLevel: number = 2): void {
        this.candidatePool = generateCandidatePool(3, maxLevel)
        this.poolTickCounter = 0
    }

    /** Called every market tick. Returns true if pool auto-refreshed. */
    public tickPool(maxLevel: number = 2): boolean {
        this.poolTickCounter++
        if (this.poolTickCounter >= POOL_REFRESH_TICKS) {
            this.refreshPool(maxLevel)
            return true
        }
        return false
    }

    // ── Employee access helper ─────────────────────────────────────────

    /** Get employee at a specific org chart position */
    public getEmployee(vpIdx: number, icIdx: number): Employee | null {
        const slot = this.vpSlots[vpIdx]
        if (!slot) return null
        return icIdx === -1 ? slot.vp : (slot.ics[icIdx] ?? null)
    }

    // ── Morale tick ─────────────────────────────────────────────────────

    /**
     * Process morale for all employees. Called every market tick.
     * Returns events for UI notifications (quits, burnout warnings).
     */
    public tickMorale(): MoraleEvent[] {
        const events: MoraleEvent[] = []
        const activeSlots = this.getActiveVPSlotCount()

        for (let v = 0; v < activeSlots; v++) {
            const slot = this.vpSlots[v]
            if (!slot.vp) continue

            // Count empty IC slots for understaffed penalty
            const emptyICs = slot.ics.filter((ic) => ic === null).length

            this.applyMoraleTick(slot.vp, null, emptyICs)
            if (slot.vp.morale <= 0) {
                events.push({
                    type: "quit",
                    employeeName: slot.vp.name,
                    message: `${slot.vp.name} ${pickRandom(QUIT_MESSAGES)}`,
                })
                // VP quits -- ICs also leave (no manager)
                for (let i = 0; i < ICS_PER_VP; i++) {
                    if (slot.ics[i]) {
                        events.push({
                            type: "quit",
                            employeeName: slot.ics[i]!.name,
                            message: `${slot.ics[i]!.name} has departed following a management vacancy`,
                        })
                    }
                    slot.ics[i] = null
                }
                slot.vp = null
                continue
            }

            for (let i = 0; i < ICS_PER_VP; i++) {
                const ic = slot.ics[i]
                if (!ic) continue

                this.applyMoraleTick(ic, slot.vp, emptyICs)
                if (ic.morale <= 0) {
                    events.push({
                        type: "quit",
                        employeeName: ic.name,
                        message: `${ic.name} ${pickRandom(QUIT_MESSAGES)}`,
                    })
                    slot.ics[i] = null
                }
            }
        }

        return events
    }

    private applyMoraleTick(
        emp: Employee,
        vp: Employee | null,
        emptyICs: number
    ): void {
        // Base burnout
        emp.morale -= BURNOUT_RATE

        // Chemistry bonus (ICs only, based on VP type)
        if (vp) {
            emp.morale += CHEMISTRY[vp.type][emp.type]
        }

        // Understaffed penalty for VPs with empty IC slots
        if (!vp) {
            // This employee IS the VP
            emp.morale -= emptyICs * UNDERSTAFFED_PENALTY
        }

        // Clamp
        emp.morale = Math.max(0, Math.min(100, emp.morale))
    }

    // ── Tenure / salary escalation ──────────────────────────────────────

    /**
     * Increment tenure for all employees. Flags raise demands.
     * Returns events for any new raise demands.
     */
    public tickTenure(): MoraleEvent[] {
        const events: MoraleEvent[] = []
        const activeSlots = this.getActiveVPSlotCount()

        for (let v = 0; v < activeSlots; v++) {
            const slot = this.vpSlots[v]
            const emps: Employee[] = []
            if (slot.vp) emps.push(slot.vp)
            for (const ic of slot.ics) {
                if (ic) emps.push(ic)
            }

            for (const emp of emps) {
                emp.tenure++
                if (
                    emp.tenure > 0 &&
                    emp.tenure % RAISE_INTERVAL === 0 &&
                    !emp.raisePending
                ) {
                    emp.raisePending = true
                    events.push({
                        type: "raise-demand",
                        employeeName: emp.name,
                        message: `${emp.name} ${pickRandom(RAISE_MESSAGES)}`,
                    })
                }
            }
        }

        return events
    }

    /**
     * Grant a raise to the employee at the given position.
     * +0.25 salary multiplier, +10 morale.
     */
    public grantRaise(vpIdx: number, icIdx: number): boolean {
        const emp = this.getEmployee(vpIdx, icIdx)
        if (!emp || !emp.raisePending) return false
        emp.salaryMultiplier += 0.25
        emp.morale = Math.min(100, emp.morale + 10)
        emp.raisePending = false
        return true
    }

    /**
     * Deny a raise to the employee at the given position.
     * -15 morale.
     */
    public denyRaise(vpIdx: number, icIdx: number): boolean {
        const emp = this.getEmployee(vpIdx, icIdx)
        if (!emp || !emp.raisePending) return false
        emp.morale = Math.max(0, emp.morale - 15)
        emp.raisePending = false
        return true
    }

    // ── Hiring ──────────────────────────────────────────────────────────

    /**
     * Hire from the candidate pool into a specific slot.
     * @param candidateIndex Index into candidatePool
     * @param vpIndex Which VP column (0-2)
     * @param icIndex -1 for VP slot, 0+ for IC slot under that VP
     * @returns The hired employee, or null if slot is occupied or invalid
     */
    public hire(
        candidateIndex: number,
        vpIndex: number,
        icIndex: number
    ): Employee | null {
        if (candidateIndex < 0 || candidateIndex >= this.candidatePool.length)
            return null
        if (vpIndex < 0 || vpIndex >= this.getActiveVPSlotCount()) return null

        const slot = this.vpSlots[vpIndex]
        const candidate = this.candidatePool[candidateIndex]

        if (icIndex === -1) {
            // Hire as VP
            if (slot.vp !== null) return null
            slot.vp = candidate
        } else {
            // Hire as IC
            if (icIndex < 0 || icIndex >= ICS_PER_VP) return null
            if (slot.ics[icIndex] !== null) return null
            // Can only hire ICs if there's a VP above them
            if (slot.vp === null) return null
            slot.ics[icIndex] = candidate
        }

        this.candidatePool.splice(candidateIndex, 1)
        return candidate
    }

    /**
     * Hire directly into the first available slot.
     * Tries VP slots first, then IC slots.
     */
    public hireToFirstAvailable(candidateIndex: number): Employee | null {
        if (candidateIndex < 0 || candidateIndex >= this.candidatePool.length)
            return null

        const activeSlots = this.getActiveVPSlotCount()

        for (let v = 0; v < activeSlots; v++) {
            if (this.vpSlots[v].vp === null) {
                return this.hire(candidateIndex, v, -1)
            }
        }

        for (let v = 0; v < activeSlots; v++) {
            if (this.vpSlots[v].vp === null) continue
            for (let i = 0; i < ICS_PER_VP; i++) {
                if (this.vpSlots[v].ics[i] === null) {
                    return this.hire(candidateIndex, v, i)
                }
            }
        }

        return null
    }

    // ── Firing ──────────────────────────────────────────────────────────

    /**
     * Fire an employee from a specific slot.
     * If a VP is fired, their ICs are also removed (moved to available pool).
     */
    public fire(vpIndex: number, icIndex: number): Employee | null {
        if (vpIndex < 0 || vpIndex >= MAX_VP_SLOTS) return null
        const slot = this.vpSlots[vpIndex]

        if (icIndex === -1) {
            // Fire VP — also displace their ICs
            const vp = slot.vp
            if (!vp) return null
            slot.vp = null

            // ICs under this VP are also fired (they need a VP)
            for (let i = 0; i < ICS_PER_VP; i++) {
                slot.ics[i] = null
            }
            return vp
        } else {
            if (icIndex < 0 || icIndex >= ICS_PER_VP) return null
            const ic = slot.ics[icIndex]
            if (!ic) return null
            slot.ics[icIndex] = null

            // Remaining teammates take a mild morale hit
            if (slot.vp) {
                slot.vp.morale = Math.max(0, slot.vp.morale - 8)
            }
            for (const teammate of slot.ics) {
                if (teammate) {
                    teammate.morale = Math.max(0, teammate.morale - 8)
                }
            }

            return ic
        }
    }

    /**
     * Fire the most expensive employee. Used when cash goes negative.
     * Returns the fired employee or null if no employees exist.
     */
    public fireMostExpensive(): Employee | null {
        let maxSalary = -1
        let maxVP = -1
        let maxIC = -1

        const activeSlots = this.getActiveVPSlotCount()
        for (let v = 0; v < activeSlots; v++) {
            const slot = this.vpSlots[v]

            // Check ICs first (firing ICs doesn't cascade)
            for (let i = 0; i < ICS_PER_VP; i++) {
                if (slot.ics[i]) {
                    const salary = getEmployeeSalary(slot.ics[i]!)
                    if (salary > maxSalary) {
                        maxSalary = salary
                        maxVP = v
                        maxIC = i
                    }
                }
            }

            // Check VP (only if it has no ICs, to avoid cascade)
            if (slot.vp) {
                const hasICs = slot.ics.some((ic) => ic !== null)
                if (!hasICs) {
                    const salary = getEmployeeSalary(slot.vp) * 1.5 // VP salary premium
                    if (salary > maxSalary) {
                        maxSalary = salary
                        maxVP = v
                        maxIC = -1
                    }
                }
            }
        }

        if (maxVP === -1) {
            // All VPs have ICs — fire the most expensive IC instead
            for (let v = 0; v < activeSlots; v++) {
                for (let i = 0; i < ICS_PER_VP; i++) {
                    if (this.vpSlots[v].ics[i]) {
                        const salary = getEmployeeSalary(
                            this.vpSlots[v].ics[i]!
                        )
                        if (salary > maxSalary || maxVP === -1) {
                            maxSalary = salary
                            maxVP = v
                            maxIC = i
                        }
                    }
                }
            }
        }

        if (maxVP === -1) return null
        return this.fire(maxVP, maxIC)
    }

    // ── Reorganization ──────────────────────────────────────────────────

    /**
     * Swap two employees in the org chart.
     * fromVP/toVP: VP column index
     * fromIC/toIC: -1 for VP slot, 0+ for IC slot
     */
    public swap(
        fromVP: number,
        fromIC: number,
        toVP: number,
        toIC: number
    ): boolean {
        if (fromVP === toVP && fromIC === toIC) return false

        const fromSlot = this.vpSlots[fromVP]
        const toSlot = this.vpSlots[toVP]
        if (!fromSlot || !toSlot) return false

        const getEmp = (slot: VPSlot, ic: number): Employee | null =>
            ic === -1 ? slot.vp : (slot.ics[ic] ?? null)
        const setEmp = (
            slot: VPSlot,
            ic: number,
            emp: Employee | null
        ): void => {
            if (ic === -1) slot.vp = emp
            else slot.ics[ic] = emp
        }

        const empA = getEmp(fromSlot, fromIC)
        const empB = getEmp(toSlot, toIC)

        // At least one must exist
        if (!empA && !empB) return false

        // Can't place IC under empty VP
        if (toIC >= 0 && toSlot.vp === null && fromIC !== -1) return false
        if (fromIC >= 0 && fromSlot.vp === null && toIC !== -1) return false

        setEmp(fromSlot, fromIC, empB)
        setEmp(toSlot, toIC, empA)

        // Reorg disruption: mild morale hit to moved employees
        if (empA) empA.morale = Math.max(0, empA.morale - 8)
        if (empB) empB.morale = Math.max(0, empB.morale - 8)

        return true
    }

    // ── Bonus calculation ───────────────────────────────────────────────

    /**
     * Calculate all aggregated bonuses from the org chart.
     * Returns a map of bonusType -> total bonus value.
     */
    public calculateBonuses(): Map<string, number> {
        const bonuses = new Map<string, number>()
        const typeCounts = new Map<EmployeeType, number>()

        const activeSlots = this.getActiveVPSlotCount()

        for (let v = 0; v < activeSlots; v++) {
            const slot = this.vpSlots[v]
            if (!slot.vp) continue

            const vp = slot.vp
            const vpDef = EMPLOYEE_DEFS[vp.type]
            const vpEff = getEffectiveness(vp)

            // Track type counts for diminishing returns
            typeCounts.set(vp.type, (typeCounts.get(vp.type) ?? 0) + 1)

            // VP bonus at 1.5x, scaled by effectiveness
            const vpBonus = getEmployeeBonus(vp) * 1.5 * vpEff
            const vpDiminish = diminishingFactor(typeCounts.get(vp.type)!)

            if (vpDef.bonusType !== "_internFlat") {
                addBonus(bonuses, vpDef.bonusType, vpBonus * vpDiminish)
            }

            // Intern VP: flat bonus to all standard types
            if (vp.type === "intern") {
                const flatBonus =
                    getEmployeeBonus(vp) * 1.5 * vpEff * vpDiminish
                addBonus(bonuses, "tradeProfit", flatBonus)
                addBonus(bonuses, "factoryOutput", flatBonus)
                addBonus(bonuses, "trendVisibility", flatBonus)
            }

            for (let i = 0; i < ICS_PER_VP; i++) {
                const ic = slot.ics[i]
                if (!ic) continue

                const icDef = EMPLOYEE_DEFS[ic.type]
                const icEff = getEffectiveness(ic)
                typeCounts.set(ic.type, (typeCounts.get(ic.type) ?? 0) + 1)

                const icBonus = getEmployeeBonus(ic) * icEff
                const icDiminish = diminishingFactor(typeCounts.get(ic.type)!)

                if (icDef.bonusType !== "_internFlat") {
                    addBonus(bonuses, icDef.bonusType, icBonus * icDiminish)
                }

                // Intern IC: flat bonus to all standard types
                if (ic.type === "intern") {
                    const flatBonus = getEmployeeBonus(ic) * icEff * icDiminish
                    addBonus(bonuses, "tradeProfit", flatBonus)
                    addBonus(bonuses, "factoryOutput", flatBonus)
                    addBonus(bonuses, "trendVisibility", flatBonus)
                }
            }
        }

        return bonuses
    }

    // ── Salary calculation ──────────────────────────────────────────────

    /** Total salary per tick across all employees. */
    public getTotalSalary(): number {
        let total = 0
        const activeSlots = this.getActiveVPSlotCount()

        for (let v = 0; v < activeSlots; v++) {
            const slot = this.vpSlots[v]
            if (slot.vp) {
                total += getEmployeeSalary(slot.vp) * 1.5 // VP salary premium
            }
            for (const ic of slot.ics) {
                if (ic) {
                    total += getEmployeeSalary(ic)
                }
            }
        }
        return total
    }

    // ── Reset ───────────────────────────────────────────────────────────

    public reset(): void {
        for (const slot of this.vpSlots) {
            slot.vp = null
            slot.ics = Array(ICS_PER_VP).fill(null) as (Employee | null)[]
        }
        this.candidatePool = generateCandidatePool(3)
        this.poolTickCounter = 0
        // Note: thirdVPUnlocked is NOT reset — it's gated by external conditions
    }

    // ── Serialization ───────────────────────────────────────────────────

    public serialize(): OrgChartSaveData {
        return {
            vpSlots: this.vpSlots.map((slot) => ({
                vp: slot.vp ? serializeEmployee(slot.vp) : null,
                ics: slot.ics.map((ic) => (ic ? serializeEmployee(ic) : null)),
            })),
            candidatePool: this.candidatePool.map(serializeEmployee),
            poolTickCounter: this.poolTickCounter,
            thirdVPUnlocked: this.thirdVPUnlocked,
        }
    }

    public deserialize(data: OrgChartSaveData): void {
        this.thirdVPUnlocked = data.thirdVPUnlocked ?? false
        this.poolTickCounter = data.poolTickCounter ?? 0

        // Restore VP slots
        for (let v = 0; v < MAX_VP_SLOTS && v < data.vpSlots.length; v++) {
            const saved = data.vpSlots[v]
            this.vpSlots[v] = {
                vp: saved.vp ? deserializeEmployee(saved.vp) : null,
                ics: saved.ics.map((ic) =>
                    ic ? deserializeEmployee(ic) : null
                ),
            }
        }

        // Restore candidate pool
        this.candidatePool = (data.candidatePool ?? []).map(deserializeEmployee)
        if (this.candidatePool.length === 0) {
            this.candidatePool = generateCandidatePool(3)
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function diminishingFactor(count: number): number {
    // 1st = 100%, 2nd = 85%, 3rd = 70%, 4th+ = 55%
    if (count <= 1) return 1.0
    if (count === 2) return 0.85
    if (count === 3) return 0.7
    return 0.55
}

function addBonus(map: Map<string, number>, key: string, value: number): void {
    map.set(key, (map.get(key) ?? 0) + value)
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}
