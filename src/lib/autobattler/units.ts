import type { UnitDef } from "./types"

// ── Adjuncts (neutral, starting units) ────────────────────────────────────────

const DRIFTER_UNITS: UnitDef[] = [
    {
        id: "drifter-brawler",
        name: "Teaching Assistant",
        faction: "drifters",
        tier: 1,
        baseATK: 3,
        baseHP: 4,
        ability: {
            trigger: "combatStart",
            effect: { type: "buff", target: "self", stat: "atk", amount: 1 },
            description: "On combat start: gain +1 ATK",
        },
        shopCost: 1,
    },
    {
        id: "drifter-scout",
        name: "The Sessional",
        faction: "drifters",
        tier: 1,
        baseATK: 2,
        baseHP: 3,
        ability: {
            trigger: "onDealDamage",
            effect: { type: "buff", target: "self", stat: "atk", amount: 1 },
            description: "On deal damage: gain +1 ATK",
        },
        shopCost: 1,
    },
    {
        id: "drifter-medic",
        name: "Office Hours",
        faction: "drifters",
        tier: 1,
        baseATK: 1,
        baseHP: 5,
        ability: {
            trigger: "roundStart",
            effect: { type: "heal", target: "allAllies", amount: 1 },
            description: "Start of round: heal all allies for 1",
        },
        shopCost: 2,
    },
    {
        id: "drifter-heavy",
        name: "Red Tape",
        faction: "drifters",
        tier: 2,
        baseATK: 4,
        baseHP: 6,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "buff", target: "self", stat: "shield", amount: 1 },
            description: "On taking damage: gain +1 Shield",
        },
        shopCost: 3,
    },
]

// ── Existentialists (Aggro) ──────────────────────────────────────────────────

const QUICKDRAW_UNITS: UnitDef[] = [
    {
        id: "qd-sharpshooter",
        name: "Iconoclast",
        faction: "quickdraw",
        tier: 1,
        baseATK: 4,
        baseHP: 2,
        ability: {
            trigger: "combatStart",
            effect: { type: "damage", target: "frontEnemy", amount: 3 },
            description:
                "On combat start: deal 3 (+1/Existentialist) to enemy front",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "qd-deadeye",
        name: "The Übermensch",
        faction: "quickdraw",
        tier: 2,
        baseATK: 5,
        baseHP: 3,
        ability: {
            trigger: "onFirstAttack",
            effect: { type: "doubleDamage" },
            description:
                "First attack: double damage. BRIDGE 2+ Idealists: +2 Shield",
            crossBonus: {
                faction: "deputies",
                minAllies: 2,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "shield",
                    amount: 2,
                },
                description:
                    "With 2+ Idealists: gain +2 Shield on first attack",
            },
        },
        shopCost: 3,
    },
    {
        id: "qd-dynamiter",
        name: "The Dynamitard",
        faction: "quickdraw",
        tier: 1,
        baseATK: 3,
        baseHP: 2,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "allEnemies", amount: 2 },
            description: "On death: deal 2 (+1/Existentialist) to all enemies",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "qd-outlaw",
        name: "The Nihilist",
        faction: "quickdraw",
        tier: 2,
        baseATK: 6,
        baseHP: 4,
        ability: {
            trigger: "onEnemyEnterFront",
            effect: { type: "damage", target: "frontEnemy", amount: 2 },
            description:
                "Enemy enters front: deal 2 (+1/Existentialist). BRIDGE 1+ Idealist: +1 Shield",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "deputies",
                minAllies: 1,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "shield",
                    amount: 1,
                },
                description: "With 1+ Idealist: also gain +1 Shield",
            },
        },
        shopCost: 4,
    },
    {
        id: "qd-kingpin",
        name: "Zarathustra",
        faction: "quickdraw",
        tier: 3,
        baseATK: 8,
        baseHP: 5,
        ability: {
            trigger: "combatStart",
            effect: {
                type: "buff",
                target: "allAllies",
                stat: "atk",
                amount: 2,
            },
            description:
                "On combat start: all allies gain +2 (+1/Existentialist) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
    {
        id: "qd-rifler",
        name: "Perspectivist",
        faction: "quickdraw",
        tier: 2,
        baseATK: 7,
        baseHP: 2,
        ability: {
            trigger: "combatStart",
            effect: { type: "damage", target: "backEnemy", amount: 2 },
            description:
                "On combat start: deal 2 (+1/Existentialist) to enemy back line",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "qd-ambusher",
        name: "Will to Power",
        faction: "quickdraw",
        tier: 2,
        baseATK: 5,
        baseHP: 4,
        ability: {
            trigger: "onDealDamage",
            effect: { type: "damage", target: "randomEnemy", amount: 2 },
            description:
                "On deal damage: hit random enemy for 2 (+1/Existentialist). BRIDGE 1+ Idealist: +1 Shield",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "deputies",
                minAllies: 1,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "shield",
                    amount: 1,
                },
                description: "With 1+ Idealist: gain +1 Shield on hit",
            },
        },
        shopCost: 4,
    },
    {
        id: "qd-executioner",
        name: "The Transvaluator",
        faction: "quickdraw",
        tier: 3,
        baseATK: 6,
        baseHP: 5,
        ability: {
            trigger: "onFirstAttack",
            effect: { type: "damage", target: "allEnemies", amount: 3 },
            description:
                "First attack: also deal 3 (+1/Existentialist) to all enemies",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
]

// ── Idealists (Control) ──────────────────────────────────────────────────────

const DEPUTY_UNITS: UnitDef[] = [
    {
        id: "dep-barricader",
        name: "The Categorist",
        faction: "deputies",
        tier: 1,
        baseATK: 2,
        baseHP: 6,
        ability: {
            trigger: "roundStart",
            effect: {
                type: "buff",
                target: "allAllies",
                stat: "shield",
                amount: 1,
            },
            description: "Round start: all allies gain +1 (+1/Idealist) Shield",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "dep-marshal",
        name: "Transcendental Ego",
        faction: "deputies",
        tier: 2,
        baseATK: 3,
        baseHP: 8,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "buff", target: "self", stat: "shield", amount: 2 },
            description:
                "On taking damage: +2 (+1/Idealist) Shield. BRIDGE 2+ EX: deal 1 to front",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "quickdraw",
                minAllies: 2,
                effect: { type: "damage", target: "frontEnemy", amount: 1 },
                description:
                    "With 2+ Existentialists: also deal 1 to front enemy",
            },
        },
        shopCost: 3,
    },
    {
        id: "dep-trapper",
        name: "Dialectician",
        faction: "deputies",
        tier: 1,
        baseATK: 2,
        baseHP: 5,
        ability: {
            trigger: "onEnemyEnterFront",
            effect: { type: "damage", target: "frontEnemy", amount: 3 },
            description: "Enemy enters front: deal 3 (+1/Idealist) damage",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "dep-warden",
        name: "The Systematizer",
        faction: "deputies",
        tier: 2,
        baseATK: 3,
        baseHP: 10,
        ability: {
            trigger: "roundStart",
            effect: { type: "heal", target: "self", amount: 3 },
            description:
                "Round start: heal self 3 (+1/Idealist). BRIDGE 1+ EX: heal front for 1",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "quickdraw",
                minAllies: 1,
                effect: { type: "heal", target: "allAllies", amount: 1 },
                description:
                    "With 1+ Existentialist: also heal frontliner for 1",
            },
        },
        shopCost: 4,
    },
    {
        id: "dep-judge",
        name: "World Spirit",
        faction: "deputies",
        tier: 3,
        baseATK: 4,
        baseHP: 14,
        ability: {
            trigger: "onAllyDeath",
            effect: { type: "buff", target: "self", stat: "atk", amount: 3 },
            description: "On ally death: gain +3 (+1/Idealist) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
    {
        id: "dep-sentinel",
        name: "A Priori",
        faction: "deputies",
        tier: 2,
        baseATK: 2,
        baseHP: 9,
        ability: {
            trigger: "combatStart",
            effect: {
                type: "buff",
                target: "self",
                stat: "shield",
                amount: 3,
            },
            description: "Combat start: gain +3 (+1/Idealist) Shield",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "dep-field-medic",
        name: "The Synthesist",
        faction: "deputies",
        tier: 2,
        baseATK: 2,
        baseHP: 7,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "heal", target: "allAllies", amount: 1 },
            description:
                "On taking damage: heal all allies 1 (+1/Idealist). BRIDGE 1+ EX: also +1 ATK to self",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "quickdraw",
                minAllies: 1,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "atk",
                    amount: 1,
                },
                description:
                    "With 1+ Existentialist: also gain +1 ATK when hit",
            },
        },
        shopCost: 4,
    },
    {
        id: "dep-fortress",
        name: "The Absolute",
        faction: "deputies",
        tier: 3,
        baseATK: 3,
        baseHP: 12,
        ability: {
            trigger: "roundStart",
            effect: {
                type: "buff",
                target: "allAllies",
                stat: "hp",
                amount: 2,
            },
            description: "Round start: all allies gain +2 (+1/Idealist) max HP",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
]

// ── Rationalists (Engine) ────────────────────────────────────────────────────

const CLOCKWORK_UNITS: UnitDef[] = [
    {
        id: "cw-accumulator",
        name: "The Monad",
        faction: "clockwork",
        tier: 1,
        baseATK: 1,
        baseHP: 4,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "buff", target: "self", stat: "atk", amount: 1 },
            description: "On taking damage: gain +1 (+1/Rationalist) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "cw-gearsmith",
        name: "Conatus",
        faction: "clockwork",
        tier: 1,
        baseATK: 2,
        baseHP: 3,
        ability: {
            trigger: "onAllyAbility",
            effect: { type: "buff", target: "self", stat: "atk", amount: 1 },
            description:
                "Ally ability: +1 (+1/Rationalist) ATK. BRIDGE 2+ PS: summons trigger this",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "prospectors",
                minAllies: 2,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "atk",
                    amount: 0,
                },
                description:
                    "With 2+ Post-Structuralists: summons also trigger this",
            },
        },
        shopCost: 2,
    },
    {
        id: "cw-tesla-coil",
        name: "Causa Sui",
        faction: "clockwork",
        tier: 2,
        baseATK: 2,
        baseHP: 5,
        ability: {
            trigger: "roundStart",
            effect: { type: "damage", target: "randomEnemy", amount: 2 },
            description: "Round start: deal 2 (+1/Rationalist) to random enemy",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "cw-overcharger",
        name: "The Harmonist",
        faction: "clockwork",
        tier: 2,
        baseATK: 3,
        baseHP: 6,
        ability: {
            trigger: "onDealDamage",
            effect: {
                type: "buff",
                target: "randomAlly",
                stat: "atk",
                amount: 1,
            },
            description:
                "Deal damage: random ally +1 ATK. BRIDGE 1+ PS: buff 2 allies",
            crossBonus: {
                faction: "prospectors",
                minAllies: 1,
                effect: {
                    type: "buff",
                    target: "randomAlly",
                    stat: "atk",
                    amount: 1,
                },
                description:
                    "With 1+ Post-Structuralist: buff a second random ally +1 ATK",
            },
        },
        shopCost: 4,
    },
    {
        id: "cw-architect",
        name: "Substance",
        faction: "clockwork",
        tier: 3,
        baseATK: 3,
        baseHP: 8,
        ability: {
            trigger: "roundStart",
            effect: {
                type: "buff",
                target: "allAllies",
                stat: "atk",
                amount: 1,
            },
            description: "Round start: all allies gain +1 (+1/Rationalist) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
    {
        id: "cw-amplifier",
        name: "Adequate Idea",
        faction: "clockwork",
        tier: 2,
        baseATK: 2,
        baseHP: 6,
        ability: {
            trigger: "onAllyAbility",
            effect: {
                type: "buff",
                target: "self",
                stat: "shield",
                amount: 1,
            },
            description:
                "Ally ability: gain +1 (+1/Rationalist) Shield. BRIDGE 1+ PS: also +1 ATK",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "prospectors",
                minAllies: 1,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "atk",
                    amount: 1,
                },
                description:
                    "With 1+ Post-Structuralist: also gain +1 ATK on ally ability",
            },
        },
        shopCost: 3,
    },
    {
        id: "cw-disruptor",
        name: "Natura Naturans",
        faction: "clockwork",
        tier: 2,
        baseATK: 3,
        baseHP: 5,
        ability: {
            trigger: "roundStart",
            effect: { type: "damage", target: "allEnemies", amount: 1 },
            description: "Round start: deal 1 (+1/Rationalist) to all enemies",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 4,
    },
    {
        id: "cw-detonator",
        name: "Deus sive Natura",
        faction: "clockwork",
        tier: 3,
        baseATK: 2,
        baseHP: 7,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "allEnemies", amount: 5 },
            description: "On death: deal 5 (+2/Rationalist) to all enemies",
            factionBonus: { perAlly: 2 },
        },
        shopCost: 5,
    },
]

// ── Post-Structuralists (Swarm) ──────────────────────────────────────────────

const PROSPECTOR_UNITS: UnitDef[] = [
    {
        id: "bp-tunneler",
        name: "Différance",
        faction: "prospectors",
        tier: 1,
        baseATK: 2,
        baseHP: 2,
        ability: {
            trigger: "onDeath",
            effect: { type: "summon", unitId: "bp-shade", position: "back" },
            description:
                "On death: summon a 1/1 Trace. BRIDGE 2+ RA: Trace is 2/1",
            crossBonus: {
                faction: "clockwork",
                minAllies: 2,
                effect: {
                    type: "summon",
                    unitId: "bp-shade",
                    position: "back",
                    atkBonus: 1,
                },
                description: "With 2+ Rationalists: summoned Trace has +1 ATK",
            },
        },
        shopCost: 1,
    },
    {
        id: "bp-foreman",
        name: "Desiring Machine",
        faction: "prospectors",
        tier: 2,
        baseATK: 3,
        baseHP: 4,
        ability: {
            trigger: "onAllyDeath",
            effect: { type: "buff", target: "self", stat: "atk", amount: 2 },
            description: "On ally death: gain +2 (+1/Post-Struct) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "bp-rattler",
        name: "The Supplement",
        faction: "prospectors",
        tier: 1,
        baseATK: 3,
        baseHP: 1,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "frontEnemy", amount: 3 },
            description: "On death: deal 3 (+1/Post-Struct) to enemy front",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "bp-necrominer",
        name: "The Rhizome",
        faction: "prospectors",
        tier: 2,
        baseATK: 2,
        baseHP: 3,
        ability: {
            trigger: "onAllyDeath",
            effect: { type: "summon", unitId: "bp-shade", position: "back" },
            description:
                "Ally death: summon 1/1 Trace. BRIDGE 1+ RA: Trace gets +1 ATK",
            crossBonus: {
                faction: "clockwork",
                minAllies: 1,
                effect: {
                    type: "summon",
                    unitId: "bp-shade",
                    position: "back",
                    atkBonus: 1,
                },
                description: "With 1+ Rationalist: summoned Trace has +1 ATK",
            },
        },
        shopCost: 3,
    },
    {
        id: "bp-patriarch",
        name: "Body without Organs",
        faction: "prospectors",
        tier: 3,
        baseATK: 4,
        baseHP: 6,
        ability: {
            trigger: "roundStart",
            effect: { type: "summon", unitId: "bp-shade", position: "back" },
            description:
                "Round start: summon 1/1 Trace. BRIDGE 2+ RA: Trace gets +1/+1",
            crossBonus: {
                faction: "clockwork",
                minAllies: 2,
                effect: {
                    type: "summon",
                    unitId: "bp-shade",
                    position: "back",
                    atkBonus: 1,
                    hpBonus: 1,
                },
                description: "With 2+ Rationalists: summoned Trace has +1/+1",
            },
        },
        shopCost: 5,
    },
    {
        id: "bp-revenant",
        name: "Pharmakon",
        faction: "prospectors",
        tier: 2,
        baseATK: 3,
        baseHP: 3,
        ability: {
            trigger: "onDeath",
            effect: {
                type: "buff",
                target: "allAllies",
                stat: "atk",
                amount: 2,
            },
            description: "On death: all allies gain +2 (+1/Post-Struct) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "bp-leech",
        name: "Schizoanalyst",
        faction: "prospectors",
        tier: 2,
        baseATK: 4,
        baseHP: 3,
        ability: {
            trigger: "onDealDamage",
            effect: { type: "heal", target: "self", amount: 2 },
            description:
                "On deal damage: heal self 2 (+1/Post-Struct). BRIDGE 1+ RA: also +1 ATK",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "clockwork",
                minAllies: 1,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "atk",
                    amount: 1,
                },
                description: "With 1+ Rationalist: also gain +1 ATK on hit",
            },
        },
        shopCost: 4,
    },
    {
        id: "bp-sovereign",
        name: "Multiplicity",
        faction: "prospectors",
        tier: 3,
        baseATK: 3,
        baseHP: 5,
        ability: {
            trigger: "onAllyDeath",
            effect: {
                type: "summon",
                unitId: "bp-shade",
                position: "back",
                atkBonus: 1,
                hpBonus: 1,
            },
            description: "Ally death: summon 2/2 Trace (+1/+0 per Post-Struct)",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
]

// ── Summoned tokens ──────────────────────────────────────────────────────────

const TOKEN_UNITS: UnitDef[] = [
    {
        id: "bp-shade",
        name: "Trace",
        faction: "prospectors",
        tier: 1,
        baseATK: 1,
        baseHP: 1,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "randomEnemy", amount: 1 },
            description: "On death: deal 1 damage to random enemy",
        },
        shopCost: 0,
    },
]

// ── Exports ──────────────────────────────────────────────────────────────────

export const ALL_UNITS: UnitDef[] = [
    ...DRIFTER_UNITS,
    ...QUICKDRAW_UNITS,
    ...DEPUTY_UNITS,
    ...CLOCKWORK_UNITS,
    ...PROSPECTOR_UNITS,
    ...TOKEN_UNITS,
]

export const UNIT_MAP: ReadonlyMap<string, UnitDef> = new Map(
    ALL_UNITS.map((u) => [u.id, u])
)

export function getUnitsForFaction(faction: string): UnitDef[] {
    return ALL_UNITS.filter((u) => u.faction === faction && u.shopCost > 0)
}
