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
    bullets: [],
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
        dateRange: "2024 – 2026",
        bullets: [
            "Designed abstractions that abstract other abstractions, achieving O(n²) meeting complexity",
            "Introduced a microservice for each CRUD operation, improving team headcount justification by 300%",
            "Authored 14-page RFC for renaming a boolean, later self approved unanimously",
        ],
        bonusLabel: "+10% symposium Rationalist stats",
        branch: "engineering",
        tier: 1,
        prerequisites: [],
        bonusType: "autobattlerATK",
        bonusValue: 0.1,
    },
    {
        id: "eng-principal",
        name: "Principal Yak Shaving Engineer",
        company: "YakStack Inc. · Remote",
        dateRange: "2026 – 2028",
        bullets: [
            "Established company-wide policy that every task requires exactly one prerequisite task, recursively",
            "Reduced production incidents by 90% by shipping 90% less code",
            "Built internal tool to track internal tools; awarded internal award for internal excellence",
        ],
        bonusLabel: "WELT exercises grant 2× commodity rewards",
        branch: "engineering",
        tier: 2,
        prerequisites: ["eng-staff"],
        bonusType: "weltBonus",
        bonusValue: 0.25,
    },
    {
        id: "eng-distinguished",
        name: "Distinguished Thought Compiler",
        company: "Vibes Engineering Corp · The Cloud",
        dateRange: "2028 – ∞",
        bullets: [
            "Converted vibes into production incidents at unprecedented scale",
            "Maintained a 1:1 ratio of Slack messages to lines of code shipped",
            "Awarded 'Most Distinguished' three years running by the committee I chair",
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
        dateRange: "2030 – ∞",
        bullets: [
            "Thought about thinking about code for two calendar years before writing any",
            "Published a monograph on why the previous monograph was wrong",
            "Mentored other Fellows in the art of productive procrastination",
        ],
        bonusLabel: "+10% GRUND compilation tolerance",
        branch: "engineering",
        tier: 4,
        prerequisites: ["eng-distinguished"],
        bonusType: "grundBonus",
        bonusValue: 0.1,
    },
    {
        id: "eng-emeritus",
        name: "Architect Emeritus of Deprecated Systems",
        company: "Legacy Systems Preservation Society · /dev/null",
        dateRange: "2032 – ∞",
        bullets: [
            "Mass-migrated zero services to the new framework, citing 'philosophical objections'",
            "Maintained sole custody of a cron job that no one dares restart",
            "Gave a retirement talk that was actually a design doc; no one noticed",
        ],
        bonusLabel: "+10% factory output",
        branch: "engineering",
        tier: 5,
        prerequisites: ["eng-fellow"],
        bonusType: "factoryOutput",
        bonusValue: 0.1,
    },
]

// ── Trading / Finance Branch ─────────────────────────────────────────────────
// The MBA pipeline, but worse.

const TRADING_NODES: CareerNodeDef[] = [
    {
        id: "trade-analyst",
        name: "Quantitative Vibes Analyst",
        company: "Gut Feelings Capital · New York, NY",
        dateRange: "2022 – 2024",
        bullets: [
            "Applied rigorous quantitative methodology to gut feelings, achieving market-rate returns",
            "Developed proprietary 'vibes-based' trading algorithm; backtested against horoscopes",
            "Published internal white paper: 'On the Efficient Market Hypothesis and Why It Doesn't Apply to Me'",
        ],
        bonusLabel: "+10% trade profit",
        branch: "trading",
        tier: 1,
        prerequisites: [],
        bonusType: "tradeProfit",
        bonusValue: 0.1,
    },
    {
        id: "trade-quant",
        name: "Senior Derivatives Sommelier",
        company: "Tannin & Tranche LLC · Greenwich, CT",
        dateRange: "2024 – 2026",
        bullets: [
            "Tasted the tannins in a credit default swap and correctly identified the vintage",
            "Structured a CDO so complex that the compliance team preemptively resigned",
            "Maintained a wine cellar organized by yield curve inversions",
        ],
        bonusLabel: "+15% factory output",
        branch: "trading",
        tier: 2,
        prerequisites: ["trade-analyst"],
        bonusType: "factoryOutput",
        bonusValue: 0.15,
    },
    {
        id: "trade-pm",
        name: "Portfolio Manager (Unlicensed)",
        company: "Other People's Money Partners · Cayman Islands",
        dateRange: "2026 – 2027",
        bullets: [
            "Managed other people's money with the confidence of someone who definitely shouldn't be",
            "Achieved 40% returns by redefining what counts as a 'return'",
            "Successfully avoided regulatory scrutiny through aggressive use of the word 'allegedly'",
        ],
        bonusLabel: "Start with +$0.50 cash after prestige",
        branch: "trading",
        tier: 3,
        prerequisites: ["trade-quant"],
        bonusType: "startingCash",
        bonusValue: 0.5,
    },
    {
        id: "trade-md",
        name: "Managing Director of Managed Directing",
        company: "Recursive Management Group · Everywhere",
        dateRange: "2027 – Present",
        bullets: [
            "Managed the directors who manage the managers who manage the associates",
            "Increased org chart depth by 4 levels with zero increase in productive output",
            "Pioneered 'trickle-across economics' — lateral delegation at scale",
        ],
        bonusLabel: "+20% Hindsight earned per prestige",
        branch: "trading",
        tier: 4,
        prerequisites: ["trade-pm"],
        bonusType: "hindsightRate",
        bonusValue: 0.2,
    },
    {
        id: "trade-partner",
        name: "Senior Partner, Infinite Leverage",
        company: "Leverage Squared Capital · Offshore",
        dateRange: "2029 – ∞",
        bullets: [
            "Leveraged the leverage to leverage additional leverage",
            "Achieved infinite returns by dividing by zero and calling it 'alpha'",
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
        dateRange: "2022 – 2023",
        bullets: [
            "Clarified to legal that it's not spam if you call it a 'drip campaign'",
            "A/B tested 47 shades of blue for the CTA button; winner was orange",
            "Grew email list by 10,000 through a pop-up that could not be closed on mobile",
        ],
        bonusLabel: "+25% popup bonus cash",
        branch: "growth",
        tier: 1,
        prerequisites: [],
        bonusType: "popupBonus",
        bonusValue: 0.25,
    },
    {
        id: "growth-head",
        name: "Head of Organic Disruption",
        company: "Disruptive Organics Inc. · Brooklyn, NY",
        dateRange: "2023 – 2025",
        bullets: [
            "Disrupted the organic disruption of previous disruptions, organically",
            "Coined the term 'growth-aware mindfulness' and it somehow stuck",
            "Reduced churn by redefining 'active user' to include anyone who has ever heard of the product",
        ],
        bonusLabel: "+10% XP from all sources",
        branch: "growth",
        tier: 2,
        prerequisites: ["growth-hacker"],
        bonusType: "xpRate",
        bonusValue: 0.1,
    },
    {
        id: "growth-vp",
        name: "VP of Engagement & Retention Theater",
        company: "Metrics Unlimited · San Francisco, CA",
        dateRange: "2025 – 2027",
        bullets: [
            "DAUs went up. Do not ask how. Do not look at the denominator",
            "Shipped a 'we miss you' email campaign that sent 3 emails per day",
            "Introduced gamification to the onboarding flow; no one has finished onboarding since",
        ],
        bonusLabel: "+15% symposium Existentialist stats",
        branch: "growth",
        tier: 3,
        prerequisites: ["growth-head"],
        bonusType: "autobattlerATK",
        bonusValue: 0.15,
    },
    {
        id: "growth-cmo",
        name: "Chief Thought Leader",
        company: "LinkedIn · Your Feed",
        dateRange: "2027 – Present",
        bullets: [
            "Has opinions about your opinions about opinions; published them as a carousel",
            "Keynoted at 12 conferences on the topic of 'authentic personal branding'",
            "Achieved inbox zero by auto-replying 'let's take this offline' to all emails",
        ],
        bonusLabel: "+25% XP from all sources",
        branch: "growth",
        tier: 4,
        prerequisites: ["growth-vp"],
        bonusType: "xpRate",
        bonusValue: 0.25,
    },
    {
        id: "growth-cvo",
        name: "Chief Virality Officer",
        company: "Contagion Media Holdings · Going Viral",
        dateRange: "2029 – ∞",
        bullets: [
            "Made a product go viral by removing all features except the share button",
            "Wrote a thread about writing threads that became the most-threaded thread",
            "Personally responsible for the phrase 'engagement-driven engagement'",
        ],
        bonusLabel: "+15% symposium unit HP",
        branch: "growth",
        tier: 5,
        prerequisites: ["growth-cmo"],
        bonusType: "autobattlerHP",
        bonusValue: 0.15,
    },
]

// ── Executive Branch ─────────────────────────────────────────────────────────
// The Peter Principle in action.

const EXECUTIVE_NODES: CareerNodeDef[] = [
    {
        id: "exec-pm",
        name: "Product Manager (No Technical Background)",
        company: "Stealth Startup · Palo Alto, CA",
        dateRange: "2022 – 2024",
        bullets: [
            "Had strong opinions about sprint velocity; could not define the word 'sprint'",
            "Increased Jira ticket count by 200%, directly correlating with team morale decrease",
            "Wrote a PRD so comprehensive it was longer than the codebase it described",
        ],
        bonusLabel: "+5% factory output",
        branch: "executive",
        tier: 1,
        prerequisites: [],
        bonusType: "factoryOutput",
        bonusValue: 0.05,
    },
    {
        id: "exec-director",
        name: "Director of Cross-Functional Alignment",
        company: "Alignment Solutions Group · Denver, CO",
        dateRange: "2024 – 2026",
        bullets: [
            "Aligned the alignments until everything was aligned, then realigned",
            "Introduced a weekly meeting to discuss which meetings could be emails",
            "Created a cross-functional task force to investigate cross-functional inefficiencies",
        ],
        bonusLabel: "+10% pinball high score bonus",
        branch: "executive",
        tier: 2,
        prerequisites: ["exec-pm"],
        bonusType: "pinballBonus",
        bonusValue: 0.1,
    },
    {
        id: "exec-vp",
        name: "SVP of Operational Excellence & Synergy",
        company: "Synergy Dynamics Corp · Multiple Offices",
        dateRange: "2026 – 2028",
        bullets: [
            "Reported directly to several people who also reported to each other",
            "Reduced operational costs by 15% through a strategic initiative called 'layoffs'",
            "Synergized the operations until they were operationally synergized",
        ],
        bonusLabel: "+15% trade profit",
        branch: "executive",
        tier: 3,
        prerequisites: ["exec-director"],
        bonusType: "tradeProfit",
        bonusValue: 0.15,
    },
    {
        id: "exec-ceo",
        name: "CEO / Founder / Visionary / Podcast Host",
        company: "Self-Employed · Everywhere & Nowhere",
        dateRange: "2028 – Present",
        bullets: [
            "Business card ran out of room; now hands out a pamphlet",
            "Founded a company whose product is founding companies",
            "Hosts a podcast about hosting podcasts, subscribed to by other podcast hosts",
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
        dateRange: "2030 – ∞",
        bullets: [
            "Chairs a board that oversees other boards that oversee advisory councils",
            "Title contains both 'Executive' and 'Non-Executive'; no one has questioned this",
            "Compensation package includes a compensation package review committee",
        ],
        bonusLabel: "+10% factory output",
        branch: "executive",
        tier: 5,
        prerequisites: ["exec-ceo"],
        bonusType: "factoryOutput",
        bonusValue: 0.1,
    },
]

// ── Education Sub-tree (shared) ──────────────────────────────────────────────

const EDUCATION_NODES: CareerNodeDef[] = [
    {
        id: "edu-hard-knocks",
        name: "Hard Knocks at the School of Life",
        company: "The School of Life",
        dateRange: "1997 – Present",
        bullets: [],
        bonusLabel: "+1% Hindsight rate",
        branch: "education",
        tier: 0,
        prerequisites: [],
        bonusType: "hindsightRate",
        bonusValue: 0.01,
    },
    {
        id: "edu-undergrad",
        name: "B.A. Mathematics & Philosophy",
        company: "University of Chicago · Chicago, IL",
        dateRange: "2015 – 2019",
        bullets: ["Fourth week, am I right?"],
        bonusLabel: "+5% GRUND compilation tolerance",
        branch: "education",
        tier: 1,
        prerequisites: [],
        bonusType: "grundBonus",
        bonusValue: 0.05,
    },
    {
        id: "edu-honors",
        name: "Honors Thesis (Read by Three People)",
        company: "University of Chicago · Chicago, IL",
        dateRange: "2018",
        bullets: [
            "One of the three readers was contractually obligated",
            "Explored the intersection of two fields that do not intersect",
        ],
        bonusLabel: "+5% Hindsight rate",
        branch: "education",
        tier: 2,
        prerequisites: ["edu-undergrad"],
        bonusType: "hindsightRate",
        bonusValue: 0.05,
    },
    {
        id: "edu-grad-cert",
        name: "Graduate Certificate in Applied Disruption",
        company: "Stanford Online · Technically Enrolled",
        dateRange: "2019",
        bullets: [
            "Completed a certificate program about completing certificate programs",
            "Final project was a pitch deck for a pitch deck generator",
        ],
        bonusLabel: "Career switch penalty reduced 10%",
        branch: "education",
        tier: 3,
        prerequisites: ["edu-honors"],
        bonusType: "switchPenaltyReduction",
        bonusValue: 0.1,
    },
    {
        id: "edu-phd",
        name: "Ph.D. in Speculative Systems",
        company: "University of Nowhere · Defended Remotely",
        dateRange: "2020 – 2024",
        bullets: [
            "Dissertation titled 'On the Impossibility of Finishing Dissertations'",
            "Advisor described work as 'technically a contribution'",
            "Teaching evaluations described as 'present'",
        ],
        bonusLabel: "+10% XP from all sources",
        branch: "education",
        tier: 4,
        prerequisites: ["edu-grad-cert"],
        bonusType: "xpRate",
        bonusValue: 0.1,
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
    // I was going to make this 0.05, but then I realized the base value is
    // a magic number not exposed to the user... :think:
    bonusValue: 0.0,
}

const SKILLS_NODES: CareerNodeDef[] = [
    // ── Chain A: Communication ───────────────────────────────────────────
    {
        id: "skill-comms",
        name: "Professional Communication",
        company: "Every Job Ever",
        dateRange: "",
        bullets: [],
        bonusLabel: "+5% popup bonus cash",
        branch: "skills",
        tier: 1,
        prerequisites: [],
        bonusType: "popupBonus",
        bonusValue: 0.05,
    },
    {
        id: "skill-passive-email",
        name: "Passive-Aggressive Email Mastery",
        company: "Per My Last Email LLC",
        dateRange: "",
        bullets: [],
        bonusLabel: "+5% trade profit",
        branch: "skills",
        tier: 2,
        prerequisites: ["skill-comms"],
        bonusType: "tradeProfit",
        bonusValue: 0.05,
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
        bonusLabel: "+5% GRUND compilation tolerance",
        branch: "skills",
        tier: 1,
        prerequisites: [],
        bonusType: "grundBonus",
        bonusValue: 0.05,
    },
    {
        id: "skill-nitpicking",
        name: "PR Review Nitpicking",
        company: "My Teammate's SEV-1",
        dateRange: "",
        bullets: [],
        bonusLabel: "+5% factory output",
        branch: "skills",
        tier: 2,
        prerequisites: ["skill-code-review"],
        bonusType: "factoryOutput",
        bonusValue: 0.05,
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
        bonusLabel: "+5% XP from all sources",
        branch: "skills",
        tier: 1,
        prerequisites: [],
        bonusType: "xpRate",
        bonusValue: 0.05,
    },
    {
        id: "skill-dashboards",
        name: "Dashboard Theology",
        company: "Church of Grafana",
        dateRange: "",
        bullets: [],
        bonusLabel: "+5% Hindsight rate",
        branch: "skills",
        tier: 2,
        prerequisites: ["skill-sql"],
        bonusType: "hindsightRate",
        bonusValue: 0.05,
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
        description: "WELT affinity, Clockwork faction synergy",
    },
    {
        id: "trading",
        name: "Trading / Finance",
        description: "Trade profit, factory output, Hindsight bonuses",
    },
    {
        id: "growth",
        name: "Growth / Marketing",
        description: "XP rate, popup bonuses, Quickdraw faction synergy",
    },
    {
        id: "executive",
        name: "Executive",
        description: "Factory output, pinball bonuses, trade profit",
    },
]

/** Skill points earned per level (1 per level) */
export function skillPointsForLevel(level: number): number {
    return level
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
        description: "+1 ATK to symposium units per rank (max 10)",
        bonusType: "autobattlerATK",
        bonusPerRank: 1,
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
