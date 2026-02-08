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
        id: "fire-sale",
        category: "trading",
        icon: "📉",
        hidden: false,
    },
    {
        id: "first-out-the-door",
        category: "trading",
        icon: "📈",
        hidden: false,
    },
    {
        id: "who-are-we-selling-to",
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
        id: "wasnt-brains",
        category: "production",
        icon: "🤖",
        hidden: false,
    },
    {
        id: "speak-to-a-retriever",
        category: "production",
        icon: "🎭",
        hidden: false,
    },
    {
        id: "could-be-wrong",
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
        desktopOnly: true,
    },
    {
        id: "syslog",
        category: "exploration",
        icon: "📋",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "readme",
        category: "exploration",
        icon: "📖",
        hidden: false,
        desktopOnly: true,
    },

    // ── Terminal ──────────────────────────────────────────────────────────────
    {
        id: "hacker",
        category: "terminal",
        icon: "💻",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "author",
        category: "terminal",
        icon: "✍️",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "navigator",
        category: "terminal",
        icon: "🧭",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "choo-choo",
        category: "terminal",
        icon: "🚂",
        hidden: false,
        desktopOnly: true,
    },

    // ── Coding ───────────────────────────────────────────────────────────────
    {
        id: "programmer",
        category: "coding",
        icon: "🧑‍💻",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "grund-compiled",
        category: "coding",
        icon: "🔨",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "grund-executed",
        category: "coding",
        icon: "▶️",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "ring-overflow",
        category: "coding",
        icon: "🔄",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "ring-cycle",
        category: "coding",
        icon: "⭕",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "ring-spin",
        category: "coding",
        icon: "🎰",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "thermal-protection",
        category: "coding",
        icon: "🔥",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "suffering",
        category: "coding",
        icon: "😔",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "freakgpt",
        category: "coding",
        icon: "💋",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "keyboard-cat",
        category: "coding",
        icon: "⌨️",
        hidden: false,
        desktopOnly: true,
    },

    // ── Exercises ────────────────────────────────────────────────────────────
    {
        id: "welt-beginner",
        category: "exercises",
        icon: "📝",
        hidden: false,
        desktopOnly: true,
        tieredGroup: "scholar",
        tier: 1,
    },
    {
        id: "welt-intermediate",
        category: "exercises",
        icon: "🧩",
        hidden: false,
        desktopOnly: true,
        tieredGroup: "scholar",
        tier: 2,
    },
    {
        id: "welt-advanced",
        category: "exercises",
        icon: "💎",
        hidden: false,
        desktopOnly: true,
        tieredGroup: "scholar",
        tier: 3,
    },
    {
        id: "welt-master",
        category: "exercises",
        icon: "🌍",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "nibelung",
        category: "exercises",
        icon: "💍",
        hidden: true,
        desktopOnly: true,
    },
    {
        id: "erlosung",
        category: "exercises",
        icon: "🕊️",
        hidden: true,
        desktopOnly: true,
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
        desktopOnly: true,
        tieredGroup: "arcade",
        tier: 1,
    },
    {
        id: "high-roller",
        category: "pinball",
        icon: "🎰",
        hidden: false,
        desktopOnly: true,
        tieredGroup: "arcade",
        tier: 2,
    },
    {
        id: "target-practice",
        category: "pinball",
        icon: "🎯",
        hidden: false,
        desktopOnly: true,
    },
    {
        id: "bounty-hunter",
        category: "pinball",
        icon: "🏆",
        hidden: false,
        desktopOnly: true,
        tieredGroup: "arcade",
        tier: 3,
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
        id: "leviathan",
        category: "exploration",
        icon: "🦑",
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
        icon: "📜",
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

    // ── Autobattler (faction complete) ──────────────────────────────────────
    {
        id: "syndicate-complete",
        category: "autobattler",
        icon: "🔫",
        hidden: false,
    },
    {
        id: "deputies-complete",
        category: "autobattler",
        icon: "🏛️",
        hidden: false,
    },
    {
        id: "collective-complete",
        category: "autobattler",
        icon: "⚙️",
        hidden: false,
    },
    {
        id: "prospectors-complete",
        category: "autobattler",
        icon: "💀",
        hidden: false,
    },

    // ── Cross-system (hidden) ────────────────────────────────────────────
    {
        id: "vertical-integration",
        category: "cross-system",
        icon: "📐",
        hidden: true,
    },
    {
        id: "exit-interview",
        category: "cross-system",
        icon: "🚪",
        hidden: true,
    },

    // ── Prestige ─────────────────────────────────────────────────────────────
    {
        id: "ive-been-wrong",
        category: "prestige",
        icon: "💥",
        hidden: false,
    },
    {
        id: "doesnt-matter-what-floor",
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
        id: "tell-them-theyll-be-ok",
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

    // ── HR / Phase 5 ────────────────────────────────────────────────────────
    {
        id: "that-ones-a-person",
        category: "production",
        icon: "🤝",
        hidden: false,
    },
    {
        id: "we-make-nothing",
        category: "production",
        icon: "🏢",
        hidden: false,
    },
    {
        id: "you-dont-get-to-choose",
        category: "production",
        icon: "📉",
        hidden: true,
    },
    {
        id: "reorg",
        category: "production",
        icon: "🔀",
        hidden: true,
    },

    // ── Autobattler (tiered - Wrangler) ─────────────────────────────────────
    {
        id: "greenhorn",
        category: "autobattler",
        icon: "🎓",
        hidden: false,
        tieredGroup: "wrangler",
        tier: 1,
    },
    {
        id: "deputy",
        category: "autobattler",
        icon: "🎓",
        hidden: false,
        tieredGroup: "wrangler",
        tier: 2,
    },
    {
        id: "sheriff",
        category: "autobattler",
        icon: "🎓",
        hidden: false,
        tieredGroup: "wrangler",
        tier: 3,
    },
    {
        id: "marshal",
        category: "autobattler",
        icon: "🎓",
        hidden: false,
        tieredGroup: "wrangler",
        tier: 4,
    },

    // ── Milestones (tiered - Rank) ───────────────────────────────────────
    {
        id: "level-5",
        category: "milestones",
        icon: "5️⃣",
        hidden: false,
        tieredGroup: "rank",
        tier: 1,
    },
    {
        id: "level-10",
        category: "milestones",
        icon: "🔟",
        hidden: false,
        tieredGroup: "rank",
        tier: 2,
    },
    {
        id: "level-20",
        category: "milestones",
        icon: "📊",
        hidden: false,
        tieredGroup: "rank",
        tier: 3,
    },
    {
        id: "level-35",
        category: "milestones",
        icon: "💫",
        hidden: false,
        tieredGroup: "rank",
        tier: 4,
    },
    {
        id: "level-50",
        category: "milestones",
        icon: "🌟",
        hidden: false,
        tieredGroup: "rank",
        tier: 5,
    },

    // ── Milestones (phase-5 / phase-6 extensions) ─────────────────────────
    {
        id: "phase-5",
        category: "milestones",
        icon: "5️⃣",
        hidden: false,
        tieredGroup: "phases",
        tier: 4,
    },
    {
        id: "phase-6",
        category: "milestones",
        icon: "6️⃣",
        hidden: false,
        tieredGroup: "phases",
        tier: 5,
    },

    // ── Phase 6: Structured Products Desk (Margin Call) ──────────────────
    {
        id: "its-just-money",
        category: "production",
        icon: "📄",
        hidden: false,
    },
    {
        id: "be-first",
        category: "milestones",
        icon: "🏆",
        hidden: true,
    },
    {
        id: "just-silence",
        category: "milestones",
        icon: "🔇",
        hidden: true,
    },
    {
        id: "music-stops",
        category: "production",
        icon: "🎵",
        hidden: false,
    },
    {
        id: "it-goes-quickly",
        category: "trading",
        icon: "💸",
        hidden: true,
    },
    {
        id: "rainy-day",
        category: "milestones",
        icon: "🌧️",
        hidden: false,
    },

    // ── Standalone new achievements ──────────────────────────────────────
    {
        id: "win-streak",
        category: "autobattler",
        icon: "🔥",
        hidden: true,
    },
    {
        id: "serial-pivoter",
        category: "career",
        icon: "🔄",
        hidden: true,
    },
    {
        id: "overqualified",
        category: "career",
        icon: "🎓",
        hidden: true,
    },
    {
        id: "executive-material",
        category: "career",
        icon: "🏛️",
        hidden: false,
    },
    {
        id: "pieces-of-paper",
        category: "prestige",
        icon: "🛍️",
        hidden: true,
    },

    // ── Cross-system ─────────────────────────────────────────────────────
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

    // ── Autobattler (concept / hidden) ──────────────────────────────────
    {
        id: "la-pensee-francaise",
        category: "autobattler",
        icon: "🇫🇷",
        hidden: true,
    },
    {
        id: "der-deutsche-idealismus",
        category: "autobattler",
        icon: "🇩🇪",
        hidden: true,
    },
    {
        id: "amor-fati",
        category: "autobattler",
        icon: "♾️",
        hidden: true,
    },
    {
        id: "continental-breakfast",
        category: "autobattler",
        icon: "🥐",
        hidden: true,
    },
    {
        id: "independent-study",
        category: "autobattler",
        icon: "🎓",
        hidden: true,
    },
    {
        id: "survey-course",
        category: "autobattler",
        icon: "📚",
        hidden: false,
    },
    {
        id: "revaluation-of-all-values",
        category: "autobattler",
        icon: "📖",
        hidden: true,
    },
    {
        id: "expressionism-in-philosophy",
        category: "autobattler",
        icon: "📖",
        hidden: true,
    },

    // ── Harvest (clicker) ────────────────────────────────────────────────
    {
        id: "harvest-100",
        category: "trading",
        icon: "🖱️",
        hidden: false,
        tieredGroup: "harvester",
        tier: 1,
    },
    {
        id: "harvest-1000",
        category: "trading",
        icon: "🖱️",
        hidden: false,
        tieredGroup: "harvester",
        tier: 2,
    },
    {
        id: "harvest-10000",
        category: "trading",
        icon: "🖱️",
        hidden: true,
        tieredGroup: "harvester",
        tier: 3,
    },
]

export const ACHIEVEMENT_MAP: ReadonlyMap<string, AchievementDef> = new Map(
    ACHIEVEMENTS.map((a) => [a.id, a])
)
