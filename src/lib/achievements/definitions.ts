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
    },
    {
        id: "small-business",
        category: "trading",
        icon: "🏪",
        hidden: false,
    },
    {
        id: "going-concern",
        category: "trading",
        icon: "🏢",
        hidden: false,
    },
    {
        id: "dot-com-darling",
        category: "trading",
        icon: "🌐",
        hidden: false,
    },
    {
        id: "irrational-exuberance",
        category: "trading",
        icon: "🚀",
        hidden: false,
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
        icon: "🎯",
        hidden: false,
    },
    // ── Production ───────────────────────────────────────────────────────────
    {
        id: "factory-floor",
        category: "production",
        icon: "🏭",
        hidden: false,
    },
    {
        id: "industrialist",
        category: "production",
        icon: "⚙️",
        hidden: false,
    },
    {
        id: "assembly-line",
        category: "production",
        icon: "🔧",
        hidden: false,
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
    },
    {
        id: "phase-3",
        category: "milestones",
        icon: "3️⃣",
        hidden: false,
    },
    {
        id: "phase-4",
        category: "milestones",
        icon: "4️⃣",
        hidden: false,
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
        icon: "🌍",
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
        id: "programmer",
        category: "terminal",
        icon: "🧑‍💻",
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
    {
        id: "welt-beginner",
        category: "terminal",
        icon: "📝",
        hidden: false,
    },
    {
        id: "welt-intermediate",
        category: "terminal",
        icon: "🧩",
        hidden: false,
    },
    {
        id: "welt-master",
        category: "terminal",
        icon: "🌍",
        hidden: true,
    },
    {
        id: "thermal-protection",
        category: "terminal",
        icon: "🔥",
        hidden: true,
    },
    {
        id: "suffering",
        category: "terminal",
        icon: "😔",
        hidden: true,
    },
    {
        id: "divide-by-zero",
        category: "terminal",
        icon: "💥",
        hidden: true,
    },

    // ── Social ───────────────────────────────────────────────────────────────
    {
        id: "guest",
        category: "social",
        icon: "📖",
        hidden: false,
    },
    {
        id: "signed",
        category: "social",
        icon: "✍️",
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
    },
    {
        id: "high-roller",
        category: "pinball",
        icon: "🎰",
        hidden: false,
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
]

export const ACHIEVEMENT_MAP: ReadonlyMap<string, AchievementDef> = new Map(
    ACHIEVEMENTS.map((a) => [a.id, a])
)
