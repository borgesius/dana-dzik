import type { AchievementDef } from "./types"

export const ACHIEVEMENTS: AchievementDef[] = [
    // ── Trading ──────────────────────────────────────────────────────────────
    {
        id: "first-trade",
        category: "trading",
        icon: "💰",
        hidden: false,
    },
    {
        id: "penny-trader",
        category: "trading",
        icon: "🪙",
        hidden: false,
        tieredGroup: "mogul",
        tier: 1,
    },
    {
        id: "small-business",
        category: "trading",
        icon: "🏪",
        hidden: false,
        tieredGroup: "mogul",
        tier: 2,
    },
    {
        id: "going-concern",
        category: "trading",
        icon: "🏢",
        hidden: false,
        tieredGroup: "mogul",
        tier: 3,
    },
    {
        id: "dot-com-darling",
        category: "trading",
        icon: "🌐",
        hidden: false,
        tieredGroup: "mogul",
        tier: 4,
    },
    {
        id: "irrational-exuberance",
        category: "trading",
        icon: "🚀",
        hidden: false,
        tieredGroup: "mogul",
        tier: 5,
    },
    {
        id: "buy-the-dip",
        category: "trading",
        icon: "📉",
        hidden: false,
    },
    {
        id: "sell-the-top",
        category: "trading",
        icon: "📈",
        hidden: false,
    },
    {
        id: "diversified",
        category: "trading",
        icon: "📊",
        hidden: false,
    },
    // ── Production ───────────────────────────────────────────────────────────
    {
        id: "factory-floor",
        category: "production",
        icon: "🏭",
        hidden: false,
        tieredGroup: "industrialist",
        tier: 1,
    },
    {
        id: "industrialist",
        category: "production",
        icon: "⚙️",
        hidden: false,
        tieredGroup: "industrialist",
        tier: 3,
    },
    {
        id: "assembly-line",
        category: "production",
        icon: "🔧",
        hidden: false,
        tieredGroup: "industrialist",
        tier: 2,
    },
    {
        id: "fully-automated",
        category: "production",
        icon: "🤖",
        hidden: false,
    },
    {
        id: "market-maker",
        category: "production",
        icon: "🎭",
        hidden: false,
    },
    {
        id: "cornered",
        category: "production",
        icon: "👑",
        hidden: false,
    },

    // ── Milestones ───────────────────────────────────────────────────────────
    {
        id: "phase-2",
        category: "milestones",
        icon: "2️⃣",
        hidden: false,
        tieredGroup: "phases",
        tier: 1,
    },
    {
        id: "phase-3",
        category: "milestones",
        icon: "3️⃣",
        hidden: false,
        tieredGroup: "phases",
        tier: 2,
    },
    {
        id: "phase-4",
        category: "milestones",
        icon: "4️⃣",
        hidden: false,
        tieredGroup: "phases",
        tier: 3,
    },
    {
        id: "all-commodities",
        category: "milestones",
        icon: "📦",
        hidden: false,
    },
    {
        id: "limit-filled",
        category: "milestones",
        icon: "⚡",
        hidden: false,
    },

    // ── Exploration ──────────────────────────────────────────────────────────
    {
        id: "calm-mode",
        category: "exploration",
        icon: "🧘",
        hidden: false,
    },
    {
        id: "explorer",
        category: "exploration",
        icon: "🗺️",
        hidden: false,
    },
    {
        id: "interior-decorator",
        category: "exploration",
        icon: "🎨",
        hidden: false,
    },
    {
        id: "dark-mode",
        category: "exploration",
        icon: "🌙",
        hidden: false,
    },
    {
        id: "polyglot",
        category: "exploration",
        icon: "🗣️",
        hidden: false,
    },
    {
        id: "tourist",
        category: "exploration",
        icon: "📸",
        hidden: false,
    },
    {
        id: "archivist",
        category: "exploration",
        icon: "🗄️",
        hidden: false,
    },
    {
        id: "syslog",
        category: "exploration",
        icon: "📋",
        hidden: false,
    },
    {
        id: "readme",
        category: "exploration",
        icon: "📖",
        hidden: false,
    },

    // ── Terminal ──────────────────────────────────────────────────────────────
    {
        id: "hacker",
        category: "terminal",
        icon: "💻",
        hidden: false,
    },
    {
        id: "author",
        category: "terminal",
        icon: "✍️",
        hidden: false,
    },
    {
        id: "navigator",
        category: "terminal",
        icon: "🧭",
        hidden: false,
    },
    {
        id: "choo-choo",
        category: "terminal",
        icon: "🚂",
        hidden: false,
    },

    // ── Coding ───────────────────────────────────────────────────────────────
    {
        id: "programmer",
        category: "coding",
        icon: "🧑‍💻",
        hidden: false,
    },
    {
        id: "grund-compiled",
        category: "coding",
        icon: "🔨",
        hidden: false,
    },
    {
        id: "grund-executed",
        category: "coding",
        icon: "▶️",
        hidden: false,
    },
    {
        id: "ring-overflow",
        category: "coding",
        icon: "🔄",
        hidden: true,
    },
    {
        id: "ring-cycle",
        category: "coding",
        icon: "⭕",
        hidden: true,
    },
    {
        id: "ring-spin",
        category: "coding",
        icon: "🎰",
        hidden: true,
    },
    {
        id: "thermal-protection",
        category: "coding",
        icon: "🔥",
        hidden: true,
    },
    {
        id: "suffering",
        category: "coding",
        icon: "😔",
        hidden: true,
    },
    {
        id: "freakgpt",
        category: "coding",
        icon: "💋",
        hidden: false,
    },
    {
        id: "keyboard-cat",
        category: "coding",
        icon: "⌨️",
        hidden: false,
    },

    // ── Exercises ────────────────────────────────────────────────────────────
    {
        id: "welt-beginner",
        category: "exercises",
        icon: "📝",
        hidden: false,
        tieredGroup: "scholar",
        tier: 1,
    },
    {
        id: "welt-intermediate",
        category: "exercises",
        icon: "🧩",
        hidden: false,
        tieredGroup: "scholar",
        tier: 2,
    },
    {
        id: "welt-advanced",
        category: "exercises",
        icon: "💎",
        hidden: false,
        tieredGroup: "scholar",
        tier: 3,
    },
    {
        id: "welt-master",
        category: "exercises",
        icon: "🌍",
        hidden: true,
    },
    {
        id: "nibelung",
        category: "exercises",
        icon: "💍",
        hidden: true,
    },
    {
        id: "erlosung",
        category: "exercises",
        icon: "🕊️",
        hidden: true,
    },

    // ── Social ───────────────────────────────────────────────────────────────
    {
        id: "guest",
        category: "social",
        icon: "📕",
        hidden: false,
    },
    {
        id: "signed",
        category: "social",
        icon: "🖊️",
        hidden: false,
    },
    {
        id: "cat-person",
        category: "social",
        icon: "🐱",
        hidden: false,
    },
    {
        id: "meow",
        category: "social",
        icon: "😺",
        hidden: false,
    },
    {
        id: "popup-enjoyer",
        category: "social",
        icon: "🎁",
        hidden: true,
    },

    // ── Pinball ──────────────────────────────────────────────────────────────
    {
        id: "pinball-wizard",
        category: "pinball",
        icon: "🪩",
        hidden: false,
        tieredGroup: "arcade",
        tier: 1,
    },
    {
        id: "high-roller",
        category: "pinball",
        icon: "🎰",
        hidden: false,
        tieredGroup: "arcade",
        tier: 2,
    },
    {
        id: "target-practice",
        category: "pinball",
        icon: "🎯",
        hidden: false,
    },
    {
        id: "bounty-hunter",
        category: "pinball",
        icon: "🏆",
        hidden: false,
    },

    // ── Exploration (hidden) ─────────────────────────────────────────────────
    {
        id: "y2k-survivor",
        category: "exploration",
        icon: "⏰",
        hidden: true,
    },
    {
        id: "big-spender",
        category: "exploration",
        icon: "💸",
        hidden: true,
    },
    {
        id: "whale",
        category: "exploration",
        icon: "🐋",
        hidden: true,
    },
    {
        id: "qa-inspector",
        category: "exploration",
        icon: "🔍",
        hidden: false,
    },

    // ── Autobattler ──────────────────────────────────────────────────────────
    {
        id: "first-draft",
        category: "autobattler",
        icon: "📜",
        hidden: false,
    },
    {
        id: "posse-up",
        category: "autobattler",
        icon: "🤠",
        hidden: false,
    },
    {
        id: "faction-recruit",
        category: "autobattler",
        icon: "🏴",
        hidden: false,
    },
    {
        id: "full-spiral",
        category: "autobattler",
        icon: "🌀",
        hidden: false,
    },
    {
        id: "no-drifters",
        category: "autobattler",
        icon: "🎯",
        hidden: true,
    },
    {
        id: "triple-threat",
        category: "autobattler",
        icon: "⭐",
        hidden: true,
    },

    // ── Prestige ─────────────────────────────────────────────────────────────
    {
        id: "bubble-popper",
        category: "prestige",
        icon: "💥",
        hidden: false,
    },
    {
        id: "serial-popper",
        category: "prestige",
        icon: "🫧",
        hidden: false,
    },
    {
        id: "hindsight-shopper",
        category: "prestige",
        icon: "🛒",
        hidden: false,
    },
    {
        id: "hindsight-hoarder",
        category: "prestige",
        icon: "💎",
        hidden: false,
    },

    // ── Career ───────────────────────────────────────────────────────────────
    {
        id: "career-starter",
        category: "career",
        icon: "💼",
        hidden: false,
    },
    {
        id: "career-switcher",
        category: "career",
        icon: "🔄",
        hidden: false,
    },
    {
        id: "skill-tree-novice",
        category: "career",
        icon: "🌱",
        hidden: false,
    },
    {
        id: "skill-tree-master",
        category: "career",
        icon: "🌳",
        hidden: false,
    },

    // ── Cross-system ─────────────────────────────────────────────────────────
    {
        id: "renaissance",
        category: "cross-system",
        icon: "🎨",
        hidden: false,
    },
    {
        id: "full-stack",
        category: "cross-system",
        icon: "🏗️",
        hidden: true,
    },
]

export const ACHIEVEMENT_MAP: ReadonlyMap<string, AchievementDef> = new Map(
    ACHIEVEMENTS.map((a) => [a.id, a])
)
