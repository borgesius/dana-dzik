import type { CareerBranch } from "./types"

// ── Career node definitions ──────────────────────────────────────────────────

export type BonusType =
    | "factoryOutput"
    | "tradeProfit"
    | "xpRate"
    | "autobattlerATK"
    | "autobattlerHP"
    | "startingCash"
    | "popupBonus"
    | "weltBonus"
    | "pinballBonus"
    | "hindsightRate"

export interface CareerNodeDef {
    id: string
    name: string
    description: string
    branch: CareerBranch | "education"
    tier: number // 1-4, higher = deeper in tree
    prerequisites: string[] // node IDs
    bonusType: BonusType
    bonusValue: number // multiplier or flat amount
}

// ── Engineering Branch ───────────────────────────────────────────────────────

const ENGINEERING_NODES: CareerNodeDef[] = [
    {
        id: "eng-junior",
        name: "Junior Developer",
        description: "+5% WELT thermal protection limit",
        branch: "engineering",
        tier: 1,
        prerequisites: [],
        bonusType: "weltBonus",
        bonusValue: 0.05,
    },
    {
        id: "eng-senior",
        name: "Senior Synergy Engineer",
        description: "+10% autobattler Clockwork unit stats",
        branch: "engineering",
        tier: 2,
        prerequisites: ["eng-junior"],
        bonusType: "autobattlerATK",
        bonusValue: 0.1,
    },
    {
        id: "eng-staff",
        name: "Staff Platform Disruptor",
        description: "WELT exercises grant 2x commodity rewards",
        branch: "engineering",
        tier: 3,
        prerequisites: ["eng-senior"],
        bonusType: "weltBonus",
        bonusValue: 1.0,
    },
    {
        id: "eng-principal",
        name: "Principal Yak Shaver",
        description: "+1 autobattler line slot",
        branch: "engineering",
        tier: 4,
        prerequisites: ["eng-staff"],
        bonusType: "autobattlerHP",
        bonusValue: 1,
    },
]

// ── Trading / Finance Branch ─────────────────────────────────────────────────

const TRADING_NODES: CareerNodeDef[] = [
    {
        id: "trade-analyst",
        name: "Junior Analyst",
        description: "+10% trade profit",
        branch: "trading",
        tier: 1,
        prerequisites: [],
        bonusType: "tradeProfit",
        bonusValue: 0.1,
    },
    {
        id: "trade-quant",
        name: "Quant Strategist",
        description: "+15% factory output",
        branch: "trading",
        tier: 2,
        prerequisites: ["trade-analyst"],
        bonusType: "factoryOutput",
        bonusValue: 0.15,
    },
    {
        id: "trade-pm",
        name: "Portfolio Manager",
        description: "Start with +$0.50 cash",
        branch: "trading",
        tier: 3,
        prerequisites: ["trade-quant"],
        bonusType: "startingCash",
        bonusValue: 0.5,
    },
    {
        id: "trade-md",
        name: "Managing Director",
        description: "+20% Hindsight earned per prestige",
        branch: "trading",
        tier: 4,
        prerequisites: ["trade-pm"],
        bonusType: "hindsightRate",
        bonusValue: 0.2,
    },
]

// ── Growth / Marketing Branch ────────────────────────────────────────────────

const GROWTH_NODES: CareerNodeDef[] = [
    {
        id: "growth-hacker",
        name: "Growth Hacker",
        description: "+25% popup bonus cash",
        branch: "growth",
        tier: 1,
        prerequisites: [],
        bonusType: "popupBonus",
        bonusValue: 0.25,
    },
    {
        id: "growth-head",
        name: "Head of Organic Disruption",
        description: "+10% XP from all sources",
        branch: "growth",
        tier: 2,
        prerequisites: ["growth-hacker"],
        bonusType: "xpRate",
        bonusValue: 0.1,
    },
    {
        id: "growth-vp",
        name: "VP of Viral Expansion",
        description: "+15% autobattler Quickdraw stats",
        branch: "growth",
        tier: 3,
        prerequisites: ["growth-head"],
        bonusType: "autobattlerATK",
        bonusValue: 0.15,
    },
    {
        id: "growth-cmo",
        name: "Chief Marketing Overlord",
        description: "+25% XP from all sources",
        branch: "growth",
        tier: 4,
        prerequisites: ["growth-vp"],
        bonusType: "xpRate",
        bonusValue: 0.25,
    },
]

// ── Executive Branch ─────────────────────────────────────────────────────────

const EXECUTIVE_NODES: CareerNodeDef[] = [
    {
        id: "exec-pm",
        name: "Product Manager",
        description: "+5% all factory output",
        branch: "executive",
        tier: 1,
        prerequisites: [],
        bonusType: "factoryOutput",
        bonusValue: 0.05,
    },
    {
        id: "exec-director",
        name: "Director of Strategy",
        description: "+10% pinball high score bonus",
        branch: "executive",
        tier: 2,
        prerequisites: ["exec-pm"],
        bonusType: "pinballBonus",
        bonusValue: 0.1,
    },
    {
        id: "exec-vp",
        name: "VP of Operations",
        description: "+15% trade profit",
        branch: "executive",
        tier: 3,
        prerequisites: ["exec-director"],
        bonusType: "tradeProfit",
        bonusValue: 0.15,
    },
    {
        id: "exec-ceo",
        name: "CEO of Everything",
        description: "+20% all bonuses",
        branch: "executive",
        tier: 4,
        prerequisites: ["exec-vp"],
        bonusType: "factoryOutput",
        bonusValue: 0.2,
    },
]

// ── Education Sub-tree (shared) ──────────────────────────────────────────────

const EDUCATION_NODES: CareerNodeDef[] = [
    {
        id: "edu-undergrad",
        name: "B.S. Computer Science",
        description: "+5% XP from coding activities",
        branch: "education",
        tier: 1,
        prerequisites: [],
        bonusType: "xpRate",
        bonusValue: 0.05,
    },
    {
        id: "edu-honors",
        name: "Honors Thesis",
        description: "+5% Hindsight rate",
        branch: "education",
        tier: 2,
        prerequisites: ["edu-undergrad"],
        bonusType: "hindsightRate",
        bonusValue: 0.05,
    },
]

// ── Exports ──────────────────────────────────────────────────────────────────

export const ALL_CAREER_NODES: CareerNodeDef[] = [
    ...ENGINEERING_NODES,
    ...TRADING_NODES,
    ...GROWTH_NODES,
    ...EXECUTIVE_NODES,
    ...EDUCATION_NODES,
]

export const CAREER_NODE_MAP: ReadonlyMap<string, CareerNodeDef> = new Map(
    ALL_CAREER_NODES.map((n) => [n.id, n])
)

export function getNodesForBranch(branch: CareerBranch | "education"): CareerNodeDef[] {
    return ALL_CAREER_NODES.filter((n) => n.branch === branch)
}

export const CAREER_BRANCHES: {
    id: CareerBranch
    name: string
    description: string
}[] = [
    { id: "engineering", name: "Engineering", description: "Coding, WELT, Clockwork affinity" },
    { id: "trading", name: "Trading / Finance", description: "Market boosts, Hindsight" },
    { id: "growth", name: "Growth / Marketing", description: "XP, popups, Quickdraw affinity" },
    { id: "executive", name: "Executive", description: "Broad bonuses, operations" },
]

/** Skill points earned per level (1 per level) */
export function skillPointsForLevel(level: number): number {
    return level
}

/** Dormant skill point effectiveness (50% when career is dormant) */
export const DORMANT_MULTIPLIER = 0.5

/** Level penalty when switching careers */
export const CAREER_SWITCH_LEVEL_PENALTY = 0.1 // lose 10% of levels
