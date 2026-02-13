// ── Employee types and definitions ──────────────────────────────────────────

export type EmployeeType =
    | "trader"
    | "engineer"
    | "analyst"
    | "quant"
    | "recruiter"
    | "intern"

export interface Employee {
    id: string
    name: string
    type: EmployeeType
    level: 1 | 2 | 3
    morale: number // 0-100, starts at 80
    tenure: number // ticks employed
    raisePending: boolean
    salaryMultiplier: number // starts 1.0, +0.25 per accepted raise
}

export interface EmployeeDef {
    type: EmployeeType
    label: string
    icon: string
    bonusType: string // maps to bonusProvider key or internal HR bonus
    baseBonusPerLevel: number // per-level multiplier
    baseSalaryPerTick: number
    description: string
}

export const EMPLOYEE_DEFS: Record<EmployeeType, EmployeeDef> = {
    trader: {
        type: "trader",
        label: "Trader",
        icon: "📈",
        bonusType: "tradeProfit",
        baseBonusPerLevel: 0.04, // +4% per level
        baseSalaryPerTick: 0.5,
        description: "Reduces effective spread on trades",
    },
    engineer: {
        type: "engineer",
        label: "Engineer",
        icon: "⚙️",
        bonusType: "factoryOutput",
        baseBonusPerLevel: 0.05, // +5% per level
        baseSalaryPerTick: 0.6,
        description: "Boosts factory production output",
    },
    analyst: {
        type: "analyst",
        label: "Analyst",
        icon: "📊",
        bonusType: "trendVisibility",
        baseBonusPerLevel: 0.03, // +3% per level (reduces price noise)
        baseSalaryPerTick: 0.45,
        description: "Improves market read accuracy",
    },
    quant: {
        type: "quant",
        label: "Quant",
        icon: "🧮",
        bonusType: "dasYield",
        baseBonusPerLevel: 0.04, // +4% DAS yield per level
        baseSalaryPerTick: 0.65,
        description: "Structured products specialist. Boosts DAS yields.",
    },
    recruiter: {
        type: "recruiter",
        label: "Recruiter",
        icon: "🤝",
        bonusType: "tradeProfit", // direct bonus (modest), real value is morale chemistry
        baseBonusPerLevel: 0.02, // +2% per level
        baseSalaryPerTick: 0.7,
        description: "Maintains department morale across all team compositions",
    },
    intern: {
        type: "intern",
        label: "Intern",
        icon: "☕",
        bonusType: "_internFlat", // special: tiny flat bonus to everything
        baseBonusPerLevel: 0.01, // +1% to all bonuses per level
        baseSalaryPerTick: 0.1,
        description: "Provides marginal value at minimal cost. Eager to learn.",
    },
}

/** How many salary-ticks a hire costs upfront */
export const HIRE_COST_MULTIPLIER = 10

/** How much to refresh the candidate pool */
export const REFRESH_POOL_BASE_COST = 5

/** How many ticks between auto-refreshes of the hiring pool */
export const POOL_REFRESH_TICKS = 20

/** Max VP slots (3rd and 4th unlock conditionally) */
export const MAX_VP_SLOTS = 4
export const INITIAL_VP_SLOTS = 2

/** ICs per VP (increased from 2 to 3) */
export const ICS_PER_VP = 3

/** Tenure bonus: +5% effectiveness per 100 ticks served */
export const TENURE_BONUS_PER_100_TICKS = 0.05

// ── Salary calculation ──────────────────────────────────────────────────────

export function getEmployeeSalary(emp: Employee): number {
    const def = EMPLOYEE_DEFS[emp.type]
    return def.baseSalaryPerTick * emp.level * (emp.salaryMultiplier ?? 1.0)
}

export function getHireCost(emp: Employee): number {
    return getEmployeeSalary(emp) * HIRE_COST_MULTIPLIER
}

// ── Employee bonus ──────────────────────────────────────────────────────────

export function getEmployeeBonus(emp: Employee): number {
    const def = EMPLOYEE_DEFS[emp.type]
    return def.baseBonusPerLevel * emp.level
}

// ── Employee effectiveness (morale-based) ──────────────────────────────────

export function getEffectiveness(emp: Employee): number {
    const morale = emp.morale ?? 80
    let base: number
    if (morale >= 70) base = 1.0
    else if (morale >= 40) base = 0.75
    else if (morale >= 25) base = 0.5
    else base = 0.25

    // Tenure bonus: +5% per 100 ticks served (caps at +25%)
    const tenureStacks = Math.min(5, Math.floor((emp.tenure ?? 0) / 100))
    const tenureBonus = tenureStacks * TENURE_BONUS_PER_100_TICKS
    return base * (1 + tenureBonus)
}

// ── Department chemistry ────────────────────────────────────────────────────
// VP type -> IC type -> morale modifier per tick.
// Positive = good fit, negative = culture clash.

export const CHEMISTRY: Record<EmployeeType, Record<EmployeeType, number>> = {
    trader: {
        trader: 0.4,
        engineer: -0.3,
        analyst: 0.1,
        quant: 0.2,
        recruiter: 0,
        intern: 0,
    },
    engineer: {
        trader: -0.3,
        engineer: 0.4,
        analyst: 0.1,
        quant: 0,
        recruiter: 0,
        intern: 0,
    },
    analyst: {
        trader: 0.1,
        engineer: 0.1,
        analyst: 0.4,
        quant: 0.3,
        recruiter: 0,
        intern: -0.2,
    },
    quant: {
        trader: 0.2,
        engineer: 0,
        analyst: 0.3,
        quant: 0.4,
        recruiter: -0.1,
        intern: -0.2,
    },
    recruiter: {
        trader: 0.2,
        engineer: 0.2,
        analyst: 0.2,
        quant: 0.1,
        recruiter: 0.2,
        intern: 0.2,
    },
    intern: {
        trader: 0,
        engineer: 0,
        analyst: 0,
        quant: 0,
        recruiter: 0,
        intern: 0,
    },
}

// ── Name generation ─────────────────────────────────────────────────────────

const FIRST_NAMES = [
    "John",
    "Sam",
    "Peter",
    "Will",
    "Sarah",
    "Seth",
    "Jared",
    "Eric",
    "Mary",
    "Ramesh",
    "Kevin",
    "Jeremy",
    "Demi",
    "Stanley",
    "Simon",
    "Paul",
    "Zachary",
    "Penn",
    "Aasif",
    "Ashley",
    "Chad",
    "Bryce",
    "Madison",
    "Synergy",
    "Pipeline",
    "Leverage",
    "Devin",
    "Tanner",
    "Equity",
    "Brayden",
    "Whitney",
    "Sterling",
    "Ashton",
    "Blaine",
    "Devon",
    "Parker",
    "Lane",
    "Camden",
    "Chandler",
    "Shelby",
    "Quinn",
    "Reese",
    "Skyler",
    "Taylor",
]

const LAST_NAMES = [
    "Tuld",
    "Rogers",
    "Sullivan",
    "Emerson",
    "Robertson",
    "Bregman",
    "Cohen",
    "Dale",
    "Shah",
    "Spacey",
    "Irons",
    "Moore",
    "Quinto",
    "Tucci",
    "Baker",
    "Bettany",
    "Badgley",
    "Mandvi",
    "Williams",
    "Buzzword",
    "Disruption",
    "Paradigm",
    "Blockchain",
    "Deliverable",
    "Synergize",
    "Bandwidth",
    "Greenfield",
    "Stakeholder",
    "Verticals",
    "Optics",
    "Mindshare",
    "Throughput",
    "Scalability",
    "Alignment",
    "Pivot",
    "Uplift",
    "Backlog",
]

let nextEmployeeId = 1

function generateName(): string {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
    return `${first} ${last}`
}

export function generateCandidate(maxLevel: number = 2): Employee {
    const types: EmployeeType[] = [
        "trader",
        "engineer",
        "quant",
        "analyst",
        "recruiter",
        "intern",
    ]
    const type = types[Math.floor(Math.random() * types.length)]

    // Level distribution: mostly 1, some 2, rarely 3
    const r = Math.random()
    let level: 1 | 2 | 3 = 1
    if (maxLevel >= 3 && r > 0.92) level = 3
    else if (maxLevel >= 2 && r > 0.55) level = 2

    return {
        id: `emp-${nextEmployeeId++}`,
        name: generateName(),
        type,
        level,
        morale: 80,
        tenure: 0,
        raisePending: false,
        salaryMultiplier: 1.0,
    }
}

export function generateCandidatePool(
    count: number = 3,
    maxLevel: number = 2
): Employee[] {
    const pool: Employee[] = []
    for (let i = 0; i < count; i++) {
        pool.push(generateCandidate(maxLevel))
    }
    return pool
}

// ── Serialization ───────────────────────────────────────────────────────────

export interface EmployeeSaveData {
    id: string
    name: string
    type: EmployeeType
    level: number
    morale?: number
    tenure?: number
    raisePending?: boolean
    salaryMultiplier?: number
}

export function serializeEmployee(emp: Employee): EmployeeSaveData {
    return {
        id: emp.id,
        name: emp.name,
        type: emp.type,
        level: emp.level,
        morale: emp.morale,
        tenure: emp.tenure,
        raisePending: emp.raisePending,
        salaryMultiplier: emp.salaryMultiplier,
    }
}

export function deserializeEmployee(data: EmployeeSaveData): Employee {
    return {
        id: data.id,
        name: data.name,
        type: data.type,
        level: data.level as 1 | 2 | 3,
        morale: data.morale ?? 80,
        tenure: data.tenure ?? 0,
        raisePending: data.raisePending ?? false,
        salaryMultiplier: data.salaryMultiplier ?? 1.0,
    }
}
