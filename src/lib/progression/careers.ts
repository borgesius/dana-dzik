import type { CareerBranch } from "./types"

// ── Career node definitions ──────────────────────────────────────────────────

export type BonusType =
    | "factoryOutput"
    | "tradeProfit"
    | "xpRate"
    | "autobattlerATK"
    | "autobattlerATK_clockwork"
    | "autobattlerATK_quickdraw"
    | "autobattlerATK_deputies"
    | "autobattlerATK_prospectors"
    | "autobattlerHP"
    | "startingCash"
    | "popupBonus"
    | "weltBonus"
    | "grundBonus"
    | "pinballBonus"
    | "hindsightRate"
    | "switchPenaltyReduction"

export interface CareerNodeDef {
    id: string
    name: string // job title
    company: string // company / org line
    dateRange: string // fake date range for the resume
    bullets: string[] // satirical resume bullet points
    bonusLabel: string // human-readable bonus description
    branch: CareerBranch | "education" | "skills"
    tier: number // 1-4, higher = deeper in tree
    prerequisites: string[] // node IDs
    bonusType: BonusType
    bonusValue: number // multiplier or flat amount
}

// ── Engineering Branch ───────────────────────────────────────────────────────
// The player already holds the Senior SWE role (shown on resume from the
// start), so the tree begins at Staff.  The Senior SWE entry is exported
// separately for the resume display and its bonus is applied passively.

/** Starting role — not part of the unlockable tree; displayed on the resume
 *  and its bonus (+5 % WELT thermal protection) is applied passively. */
export const ENGINEERING_STARTER_NODE: CareerNodeDef = {
    id: "eng-senior",
    name: "Senior Software Engineer",
    company: "Volley · San Francisco, CA",
    dateRange: "2021 – Present",
    bullets: [
        "Leading development on voice-first web apps used by 100Ks",
        "Bringing the users joy with features, reliability, and endless E2E workflow wank",
    ],
    bonusLabel: "+5% WELT thermal protection",
    branch: "engineering",
    tier: 0,
    prerequisites: [],
    bonusType: "weltBonus",
    bonusValue: 0.05,
}

const ENGINEERING_NODES: CareerNodeDef[] = [
    {
        id: "eng-staff",
        name: "Staff Abstraction Architect",
        company: "Abstraction Labs · Palo Alto, CA",
        dateRange: "Q3 '99 – IPO",
        bullets: [
            "Designed an abstraction layer for the existing abstraction layer. Performance reduction stayed within 20% boundaries.",
            "Achieved 'one microservice per CRUD operation' principles.",
            "Authored a 14-page RFC to rename a variable, unanimously self-approved",
        ],
        bonusLabel: "+6% symposium Rationalist stats",
        branch: "engineering",
        tier: 1,
        prerequisites: [],
        bonusType: "autobattlerATK_clockwork",
        bonusValue: 0.06,
    },
    {
        id: "eng-principal",
        name: "Principal Navel and Rectal Optics Engineer",
        company: "Lens Grindr · Remote",
        dateRange: "Post-IPO – Pre-Crash",
        bullets: [
            "Established company-wide policy that every task requires exactly one prerequisite task, recursively",
            "Reduced production incidents by 90% by shipping 90% less code",
            "Built an internal tool to track internal tools. Won an internal award",
        ],
        bonusLabel: "+10% WELT commodity rewards",
        branch: "engineering",
        tier: 2,
        prerequisites: ["eng-staff"],
        bonusType: "weltBonus",
        bonusValue: 0.1,
    },
    {
        id: "eng-distinguished",
        name: "Distinguished Thought Compiler",
        company: "Dronie.ai · The Cloud",
        dateRange: "Series D – Acqui-hire",
        bullets: [
            "Converted jargon into production incidents at scale",
            "Voted 'Most Distinguished' three years running by a committee I chair",
            "Architected a foundation for frameworks of paradigms",
        ],
        bonusLabel: "+15% symposium unit HP",
        branch: "engineering",
        tier: 3,
        prerequisites: ["eng-principal"],
        bonusType: "autobattlerHP",
        bonusValue: 0.15,
    },
    {
        id: "eng-fellow",
        name: "Fellow of Applied Overthinking",
        company: "Institute for Recursive Contemplation · Distributed",
        dateRange: "Pre-Revenue – Post-Relevance",
        bullets: [
            "Spent two calendar years considering the code before writing any",
            "Published a monograph on why the previous monograph was wrong",
            "Advised on a rank'n'yank process colloquially known as 'Thunderdome'",
        ],
        bonusLabel: "+18% GRUND compilation tolerance",
        branch: "engineering",
        tier: 4,
        prerequisites: ["eng-distinguished"],
        bonusType: "grundBonus",
        bonusValue: 0.18,
    },
    {
        id: "eng-emeritus",
        name: "Architect Emeritus of Deprecated Systems",
        company: "Legacy Systems Preservation Society · /dev/null",
        dateRange: "Y2K – /dev/null",
        bullets: [
            "Migrated zero services to the new framework. Cited philosophical objections",
            "Maintained sole custody of a cron job that no one dares restart",
            "Gave a retirement talk that was actually a design doc; no one noticed",
        ],
        bonusLabel: "+25% factory output",
        branch: "engineering",
        tier: 5,
        prerequisites: ["eng-fellow"],
        bonusType: "factoryOutput",
        bonusValue: 0.25,
    },
]

// ── Trading / Finance Branch ─────────────────────────────────────────────────
// The MBA pipeline, but worse.

const TRADING_NODES: CareerNodeDef[] = [
    {
        id: "trade-analyst",
        name: "Quantitative Vibes Analyst",
        company: "Gut Feelings Capital · New York, NY",
        dateRange: "FY '99 – Margin Call",
        bullets: [
            "Applied quantitative methodology to gut feelings. Achieved market-rate returns",
            "Developed a proprietary vibes-based model. Backtested against horoscopes with comparable accuracy",
            "Wrote a white paper on why the efficient market hypothesis does not apply to me",
        ],
        bonusLabel: "+6% trade profit",
        branch: "trading",
        tier: 1,
        prerequisites: [],
        bonusType: "tradeProfit",
        bonusValue: 0.06,
    },
    {
        id: "trade-quant",
        name: "Senior Derivatives Sommelier",
        company: "Tannin & Tranche LLC · Greenwich, CT",
        dateRange: "Pre-Bubble – Mid-Bubble",
        bullets: [
            "Identified the vintage of a credit default swap by nose alone",
            "Structured a CDO complex enough that compliance resigned preemptively",
            "Wine cellar organized by yield curve inversions",
        ],
        bonusLabel: "+10% factory output",
        branch: "trading",
        tier: 2,
        prerequisites: ["trade-analyst"],
        bonusType: "factoryOutput",
        bonusValue: 0.1,
    },
    {
        id: "trade-pm",
        name: "Portfolio Manager (Unlicensed)",
        company: "Other People's Money Partners · Cayman Islands",
        dateRange: "OPM Era – Indictment",
        bullets: [
            "Managed other people's money with the confidence of someone who probably shouldn't",
            "Achieved 40% returns by redefining what counts as a return",
            "Avoided regulatory scrutiny through careful use of the word 'allegedly'",
        ],
        bonusLabel: "Start with +$0.35 cash after prestige",
        branch: "trading",
        tier: 3,
        prerequisites: ["trade-quant"],
        bonusType: "startingCash",
        bonusValue: 0.35,
    },
    {
        id: "trade-md",
        name: "Managing Director of Managed Directing",
        company: "Recursive Management Group · Everywhere",
        dateRange: "Q4 '00 – Restructuring",
        bullets: [
            "Four layers of management between me and anyone doing the work",
            "Increased org chart depth by four levels. Output unchanged",
            "Pioneered lateral delegation at scale",
        ],
        bonusLabel: "+18% symposium Idealist stats",
        branch: "trading",
        tier: 4,
        prerequisites: ["trade-pm"],
        bonusType: "autobattlerATK_deputies",
        bonusValue: 0.18,
    },
    {
        id: "trade-partner",
        name: "Senior Partner, Infinite Leverage",
        company: "Leverage Squared Capital · Offshore",
        dateRange: "Leveraged – Overleveraged",
        bullets: [
            "Leveraged the leverage, then leveraged that",
            "Returns technically infinite after dividing by zero and calling it alpha",
            "Personally guaranteed nothing, contractually or otherwise",
        ],
        bonusLabel: "+25% Hindsight rate",
        branch: "trading",
        tier: 5,
        prerequisites: ["trade-md"],
        bonusType: "hindsightRate",
        bonusValue: 0.25,
    },
]

// ── Growth / Marketing Branch ────────────────────────────────────────────────
// The LinkedIn-to-TED-Talk pipeline.

const GROWTH_NODES: CareerNodeDef[] = [
    {
        id: "growth-hacker",
        name: "Growth Hacker (Legally Distinct)",
        company: "DripForce · Austin, TX",
        dateRange: "Beta – Pivot",
        bullets: [
            "Clarified to legal that it's not spam if you call it a 'drip campaign'",
            "A/B tested 47 shades of blue for the CTA button; winner was orange",
            "Grew email list by 10,000 through a pop-up that could not be closed on mobile",
        ],
        bonusLabel: "+8% popup bonus cash",
        branch: "growth",
        tier: 1,
        prerequisites: [],
        bonusType: "popupBonus",
        bonusValue: 0.08,
    },
    {
        id: "growth-head",
        name: "Head of Organic Disruption",
        company: "Disruptive Organics Inc. · Brooklyn, NY",
        dateRange: "Series B – Rebrand",
        bullets: [
            "Coined the term 'growth-aware mindfulness.' It stuck",
            "Redefined 'active user' to include anyone who has heard of the product. Churn improved overnight",
            "Three disruptions deep. All organic",
        ],
        bonusLabel: "+5% XP from all sources",
        branch: "growth",
        tier: 2,
        prerequisites: ["growth-hacker"],
        bonusType: "xpRate",
        bonusValue: 0.05,
    },
    {
        id: "growth-vp",
        name: "VP of Engagement & Retention Theater",
        company: "Metrics Unlimited · San Francisco, CA",
        dateRange: "Pre-Churn – Post-Churn",
        bullets: [
            "DAUs went up. Do not ask how. Do not look at the denominator",
            "Shipped a 'we miss you' email campaign that sent 3 emails per day",
            "Crafted payment copy to increase accidental subscriptions by 380%",
        ],
        bonusLabel: "+12% symposium Existentialist stats",
        branch: "growth",
        tier: 3,
        prerequisites: ["growth-head"],
        bonusType: "autobattlerATK_quickdraw",
        bonusValue: 0.12,
    },
    {
        id: "growth-cmo",
        name: "Chief Thought Leader",
        company: "LinkedIn · Your Feed",
        dateRange: "Viral '01 – Thought Exit",
        bullets: [
            "Published opinions as a LinkedIn carousel. Engagement was nonzero",
            "Keynoted at 12 conferences on the topic of 'authentic personal branding'",
            "Achieved inbox zero by auto-replying 'let's take this offline' to all emails",
        ],
        bonusLabel: "+18% symposium unit HP",
        branch: "growth",
        tier: 4,
        prerequisites: ["growth-vp"],
        bonusType: "autobattlerHP",
        bonusValue: 0.18,
    },
    {
        id: "growth-cvo",
        name: "Chief Virality Officer",
        company: "Contagion Media Holdings · Going Viral",
        dateRange: "Post-Pivot – Heat Death",
        bullets: [
            "Removed every feature except the share button. Product went viral",
            "Content strategy was a single tweet linking to itself",
            "Coined 'engagement-driven engagement.' Still in the OKRs",
        ],
        bonusLabel: "+12% XP from all sources",
        branch: "growth",
        tier: 5,
        prerequisites: ["growth-cmo"],
        bonusType: "xpRate",
        bonusValue: 0.12,
    },
]

// ── Executive Branch ─────────────────────────────────────────────────────────
// The Peter Principle in action.

const EXECUTIVE_NODES: CareerNodeDef[] = [
    {
        id: "exec-pm",
        name: "Decidedly Nontechnical Product Manager",
        company: "Stealth Startup · Palo Alto, CA",
        dateRange: "Stealth – Launch (Soft)",
        bullets: [
            "Increased Jira ticket count by 600%",
            "Wrote a PRD so comprehensive it was longer than the codebase it described",
            "Increased engineer throughput with a combination of explicit gamification and implicit manipulation",
        ],
        bonusLabel: "+6% pinball high score bonus",
        branch: "executive",
        tier: 1,
        prerequisites: [],
        bonusType: "pinballBonus",
        bonusValue: 0.06,
    },
    {
        id: "exec-director",
        name: "Director of Cross-Functional Alignment",
        company: "Alignment Solutions Group · Denver, CO",
        dateRange: "Reorg I – Reorg III",
        bullets: [
            "Survived eleven reorgs. Teammates became numbers on a spreadsheet.",
            "Introduced a weekly meeting to discuss which meetings could be emails",
            "Formed a cross-functional task force to investigate cross-functional inefficiency",
        ],
        bonusLabel: "+10% symposium Post-Structuralist stats",
        branch: "executive",
        tier: 2,
        prerequisites: ["exec-pm"],
        bonusType: "autobattlerATK_prospectors",
        bonusValue: 0.1,
    },
    {
        id: "exec-vp",
        name: "SVP of Operational Excellence & Synergy",
        company: "Synergy Dynamics Corp · Multiple Offices",
        dateRange: "Synergy Era – Dissolution",
        bullets: [
            "Reported directly to several people who also reported to each other",
            "Reduced operational costs by 15% through a strategic initiative called 'layoffs'",
            "Synergy achieved. Unable to describe what changed",
        ],
        bonusLabel: "+14% trade profit",
        branch: "executive",
        tier: 3,
        prerequisites: ["exec-director"],
        bonusType: "tradeProfit",
        bonusValue: 0.14,
    },
    {
        id: "exec-ceo",
        name: "CEO / Founder / Visionary / Podcast Host",
        company: "Self-Employed · Everywhere & Nowhere",
        dateRange: "Founded – Unfounded",
        bullets: [
            "Business card ran out of room; now hands out a pamphlet",
            "Founded a company whose product is founding companies",
            "Hosts a podcast for other podcast hosts. Mutually subscribed",
        ],
        bonusLabel: "+20% factory output",
        branch: "executive",
        tier: 4,
        prerequisites: ["exec-vp"],
        bonusType: "factoryOutput",
        bonusValue: 0.2,
    },
    {
        id: "exec-chairman",
        name: "Executive Chairman (Non-Executive)",
        company: "Board of Boards LLC · Abstracted",
        dateRange: "Advisory – ∞ (Vesting)",
        bullets: [
            "Four trusts to a holding company, two holding companies to a Cayman, and each Cayman back to a trust held by your mother.",
            "Compensation package includes a compensation package review committee",
            "Is really more 'Post-Executive' than anything",
        ],
        bonusLabel: "+25% factory output",
        branch: "executive",
        tier: 5,
        prerequisites: ["exec-ceo"],
        bonusType: "factoryOutput",
        bonusValue: 0.25,
    },
]

// ── Education Sub-tree (shared) ──────────────────────────────────────────────

/** Base education entry — always shown on resume; bonus applied passively. */
export const EDUCATION_STARTER_NODE: CareerNodeDef = {
    id: "edu-hard-knocks",
    name: "Hard Knocks",
    company: "The School of Life",
    dateRange: "1997 – Present",
    bullets: [],
    bonusLabel: "+1% Hindsight rate",
    branch: "education",
    tier: 0,
    prerequisites: [],
    bonusType: "hindsightRate",
    bonusValue: 0.01,
}

const EDUCATION_NODES: CareerNodeDef[] = [
    {
        id: "edu-undergrad",
        name: "B.A. Mathematics & Philosophy",
        company: "University of Chicago · Chicago, IL",
        dateRange: "2015 – 2019",
        bullets: [
            "Graduated with honors",
            "Wrote an edgy thesis on Kant and Nietzsche read by none",
            "Fourth week, am I right?",
        ],
        bonusLabel: "+4% GRUND compilation tolerance",
        branch: "education",
        tier: 1,
        prerequisites: [],
        bonusType: "grundBonus",
        bonusValue: 0.04,
    },
    {
        id: "edu-honors",
        name: "Honors Thesis (Read by Three People)",
        company: "University of Chicago · Chicago, IL",
        dateRange: "Fall '18 – Defended to Roommates",
        bullets: [
            "One of the three readers was contractually obligated",
            "Explored the intersection of two fields that do not intersect",
        ],
        bonusLabel: "+6% Hindsight rate",
        branch: "education",
        tier: 2,
        prerequisites: ["edu-undergrad"],
        bonusType: "hindsightRate",
        bonusValue: 0.06,
    },
    {
        id: "edu-grad-cert",
        name: "Graduate Certificate in Applied Disruption",
        company: "Stanford Online · Technically Enrolled",
        dateRange: "Enrolled Q1 – Completed Q∞",
        bullets: [
            "Completed 6 of 8 modules. Received the certificate anyway",
            "Final project was a pitch deck for a pitch deck generator",
        ],
        bonusLabel: "Career switch penalty reduced 8%",
        branch: "education",
        tier: 3,
        prerequisites: ["edu-honors"],
        bonusType: "switchPenaltyReduction",
        bonusValue: 0.08,
    },
    {
        id: "edu-phd",
        name: "Ph.D. in Speculative Systems",
        company: "University of Nowhere · Defended Remotely",
        dateRange: "ABD – TBD",
        bullets: [
            "Dissertation titled 'On the Impossibility of Finishing Dissertations'",
            "Advisor described work as 'technically a contribution'",
            "Teaching evaluations described as 'present'",
        ],
        bonusLabel: "+12% XP from all sources",
        branch: "education",
        tier: 4,
        prerequisites: ["edu-grad-cert"],
        bonusType: "xpRate",
        bonusValue: 0.12,
    },
]

// ── Skills Sub-tree (shared) ─────────────────────────────────────────────────

/** Starting skills — not part of the unlockable tree; displayed on the resume
 *  and its bonus is applied passively. */
export const SKILLS_STARTER_NODE: CareerNodeDef = {
    id: "skill-base",
    name: "TypeScript, Node.js, React, PostgreSQL, GitHub Actions, AWS, Kubernetes",
    company: "",
    dateRange: "",
    bullets: [],
    bonusLabel: "+5% factory output",
    branch: "skills",
    tier: 0,
    prerequisites: [],
    bonusType: "factoryOutput",
    bonusValue: 0.05,
}

const SKILLS_NODES: CareerNodeDef[] = [
    // ── Chain A: Communication ───────────────────────────────────────────
    {
        id: "skill-comms",
        name: "Professional Communication",
        company: "Every Job Ever",
        dateRange: "",
        bullets: [],
        bonusLabel: "+4% popup bonus cash",
        branch: "skills",
        tier: 1,
        prerequisites: [],
        bonusType: "popupBonus",
        bonusValue: 0.04,
    },
    {
        id: "skill-passive-email",
        name: "Passive-Aggressive Email Mastery",
        company: "Per My Last Email LLC",
        dateRange: "",
        bullets: [],
        bonusLabel: "+6% trade profit",
        branch: "skills",
        tier: 2,
        prerequisites: ["skill-comms"],
        bonusType: "tradeProfit",
        bonusValue: 0.06,
    },
    {
        id: "skill-read-receipts",
        name: "Weaponized Read Receipts",
        company: "Seen ✓✓ Deloitte",
        dateRange: "",
        bullets: [],
        bonusLabel: "+10% popup bonus cash",
        branch: "skills",
        tier: 3,
        prerequisites: ["skill-passive-email"],
        bonusType: "popupBonus",
        bonusValue: 0.1,
    },
    // ── Chain B: Engineering Rigor ────────────────────────────────────────
    {
        id: "skill-code-review",
        name: "Code Review",
        company: "Your Local Codeowners",
        dateRange: "",
        bullets: [],
        bonusLabel: "+4% GRUND compilation tolerance",
        branch: "skills",
        tier: 1,
        prerequisites: [],
        bonusType: "grundBonus",
        bonusValue: 0.04,
    },
    {
        id: "skill-nitpicking",
        name: "PR Review Nitpicking",
        company: "My Teammate's SEV-1",
        dateRange: "",
        bullets: [],
        bonusLabel: "+6% factory output",
        branch: "skills",
        tier: 2,
        prerequisites: ["skill-code-review"],
        bonusType: "factoryOutput",
        bonusValue: 0.06,
    },
    {
        id: "skill-assassination",
        name: "Assassination",
        company: "Redacted",
        dateRange: "",
        bullets: [],
        bonusLabel: "+10% symposium ATK",
        branch: "skills",
        tier: 3,
        prerequisites: ["skill-nitpicking"],
        bonusType: "autobattlerATK",
        bonusValue: 0.1,
    },
    // ── Chain C: Analytics ────────────────────────────────────────────────
    {
        id: "skill-sql",
        name: "SQL Queries",
        company: "SELECT * FROM experience",
        dateRange: "",
        bullets: [],
        bonusLabel: "+3% XP from all sources",
        branch: "skills",
        tier: 1,
        prerequisites: [],
        bonusType: "xpRate",
        bonusValue: 0.03,
    },
    {
        id: "skill-dashboards",
        name: "Dashboard Theology",
        company: "Church of Grafana",
        dateRange: "",
        bullets: [],
        bonusLabel: "+6% Hindsight rate",
        branch: "skills",
        tier: 2,
        prerequisites: ["skill-sql"],
        bonusType: "hindsightRate",
        bonusValue: 0.06,
    },
    {
        id: "skill-divination",
        name: "Divination",
        company: "The Oracle at Delphi (Remote)",
        dateRange: "",
        bullets: [],
        bonusLabel: "+10% pinball high score bonus",
        branch: "skills",
        tier: 3,
        prerequisites: ["skill-dashboards"],
        bonusType: "pinballBonus",
        bonusValue: 0.1,
    },
]

// ── Exports ──────────────────────────────────────────────────────────────────

export const ALL_CAREER_NODES: CareerNodeDef[] = [
    ...ENGINEERING_NODES,
    ...TRADING_NODES,
    ...GROWTH_NODES,
    ...EXECUTIVE_NODES,
    ...EDUCATION_NODES,
    ...SKILLS_NODES,
]

export const CAREER_NODE_MAP: ReadonlyMap<string, CareerNodeDef> = new Map(
    ALL_CAREER_NODES.map((n) => [n.id, n])
)

export function getNodesForBranch(
    branch: CareerBranch | "education" | "skills"
): CareerNodeDef[] {
    return ALL_CAREER_NODES.filter((n) => n.branch === branch)
}

export const CAREER_BRANCHES: {
    id: CareerBranch
    name: string
    description: string
}[] = [
    {
        id: "engineering",
        name: "Engineering",
        description: "WELT affinity, Rationalist faction synergy, unit HP",
    },
    {
        id: "trading",
        name: "Trading / Finance",
        description: "Trade profit, factory output, Idealist faction synergy",
    },
    {
        id: "growth",
        name: "Growth / Marketing",
        description: "XP rate, Existentialist faction synergy, unit HP",
    },
    {
        id: "executive",
        name: "Executive",
        description:
            "Pinball, trade profit, Post-Structuralist faction synergy",
    },
]

/** Cumulative skill points earned up to a given level.
 *  Each level grants floor(level / 5) + 1 SP, so higher levels are more rewarding. */
export function skillPointsForLevel(level: number): number {
    let total = 0
    for (let l = 1; l <= level; l++) {
        total += Math.floor(l / 5) + 1
    }
    return total
}

/** SP cost to unlock a career/education/skill node (derived from tier). */
export function nodeCost(tier: number): number {
    return Math.max(1, tier)
}

/** SP cost to purchase the next rank of a mastery (escalating: rank N+1 costs N+2). */
export function masteryCost(currentRanks: number): number {
    return currentRanks + 2
}

/** Total SP spent on all ranks of a mastery: sum of (k+2) for k = 0..ranks-1. */
export function totalMasteryCost(ranks: number): number {
    if (ranks <= 0) return 0
    return ranks * 2 + (ranks * (ranks - 1)) / 2
}

/** Dormant skill point effectiveness (50% when career is dormant) */
export const DORMANT_MULTIPLIER = 0.5

/** Level penalty when switching careers */
export const CAREER_SWITCH_LEVEL_PENALTY = 0.1 // lose 10% of levels

// ── Mastery system (repeatable skill point sink) ────────────────────────────

export interface MasteryDef {
    id: string
    name: string
    description: string
    bonusType: BonusType
    bonusPerRank: number
    /** Max ranks (0 = unlimited) */
    maxRanks: number
}

export const MASTERY_DEFS: MasteryDef[] = [
    {
        id: "mastery-factory",
        name: "Operational Excellence",
        description: "+2% factory output per rank",
        bonusType: "factoryOutput",
        bonusPerRank: 0.02,
        maxRanks: 0,
    },
    {
        id: "mastery-trade",
        name: "Market Acumen",
        description: "+2% trade profit per rank",
        bonusType: "tradeProfit",
        bonusPerRank: 0.02,
        maxRanks: 0,
    },
    {
        id: "mastery-atk",
        name: "Combat Training",
        description: "+3% symposium ATK per rank (max 10)",
        bonusType: "autobattlerATK",
        bonusPerRank: 0.03,
        maxRanks: 10,
    },
    {
        id: "mastery-hindsight",
        name: "Executive Presence",
        description: "+5% Hindsight earned per rank",
        bonusType: "hindsightRate",
        bonusPerRank: 0.05,
        maxRanks: 0,
    },
    {
        id: "mastery-xp",
        name: "Lifelong Learner",
        description: "+2% XP from all sources per rank",
        bonusType: "xpRate",
        bonusPerRank: 0.02,
        maxRanks: 0,
    },
]

export const MASTERY_MAP: ReadonlyMap<string, MasteryDef> = new Map(
    MASTERY_DEFS.map((m) => [m.id, m])
)
