import type { UnitDef } from "./types"

// ── Drifters (neutral, starting units) ───────────────────────────────────────

const DRIFTER_UNITS: UnitDef[] = [
    {
        id: "drifter-brawler",
        name: "Drifter Brawler",
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
        name: "Drifter Scout",
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
        name: "Drifter Medic",
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
        name: "Drifter Heavy",
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

// ── Quickdraw Syndicate (Aggro) ──────────────────────────────────────────────

const QUICKDRAW_UNITS: UnitDef[] = [
    {
        id: "qd-sharpshooter",
        name: "Quickdraw Sharpshooter",
        faction: "quickdraw",
        tier: 1,
        baseATK: 4,
        baseHP: 2,
        ability: {
            trigger: "combatStart",
            effect: { type: "damage", target: "frontEnemy", amount: 3 },
            description:
                "On combat start: deal 3 (+1/Quickdraw) to enemy front",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "qd-deadeye",
        name: "Quickdraw Deadeye",
        faction: "quickdraw",
        tier: 2,
        baseATK: 5,
        baseHP: 3,
        ability: {
            trigger: "onFirstAttack",
            effect: { type: "doubleDamage" },
            description:
                "First attack: double damage. BRIDGE 2+ Deputies: +2 Shield",
            crossBonus: {
                faction: "deputies",
                minAllies: 2,
                effect: {
                    type: "buff",
                    target: "self",
                    stat: "shield",
                    amount: 2,
                },
                description: "With 2+ Deputies: gain +2 Shield on first attack",
            },
        },
        shopCost: 3,
    },
    {
        id: "qd-dynamiter",
        name: "Dynamite Runner",
        faction: "quickdraw",
        tier: 1,
        baseATK: 3,
        baseHP: 2,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "allEnemies", amount: 2 },
            description: "On death: deal 2 (+1/Quickdraw) to all enemies",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "qd-outlaw",
        name: "Quickdraw Outlaw",
        faction: "quickdraw",
        tier: 2,
        baseATK: 6,
        baseHP: 4,
        ability: {
            trigger: "onEnemyEnterFront",
            effect: { type: "damage", target: "frontEnemy", amount: 2 },
            description:
                "Enemy enters front: deal 2 (+1/Quickdraw). BRIDGE 1+ Deputy: +1 Shield",
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
                description: "With 1+ Deputy: also gain +1 Shield",
            },
        },
        shopCost: 4,
    },
    {
        id: "qd-kingpin",
        name: "Syndicate Kingpin",
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
                "On combat start: all allies gain +2 (+1/Quickdraw) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
    {
        id: "qd-rifler",
        name: "Quickdraw Rifler",
        faction: "quickdraw",
        tier: 2,
        baseATK: 7,
        baseHP: 2,
        ability: {
            trigger: "combatStart",
            effect: { type: "damage", target: "backEnemy", amount: 2 },
            description:
                "On combat start: deal 2 (+1/Quickdraw) to enemy back line",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "qd-ambusher",
        name: "Quickdraw Ambusher",
        faction: "quickdraw",
        tier: 2,
        baseATK: 5,
        baseHP: 4,
        ability: {
            trigger: "onDealDamage",
            effect: { type: "damage", target: "randomEnemy", amount: 2 },
            description:
                "On deal damage: hit random enemy for 2 (+1/Quickdraw). BRIDGE 1+ Deputy: +1 Shield",
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
                description: "With 1+ Deputy: gain +1 Shield on hit",
            },
        },
        shopCost: 4,
    },
    {
        id: "qd-executioner",
        name: "Syndicate Executioner",
        faction: "quickdraw",
        tier: 3,
        baseATK: 6,
        baseHP: 5,
        ability: {
            trigger: "onFirstAttack",
            effect: { type: "damage", target: "allEnemies", amount: 3 },
            description:
                "First attack: also deal 3 (+1/Quickdraw) to all enemies",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
]

// ── Iron Deputies (Control) ──────────────────────────────────────────────────

const DEPUTY_UNITS: UnitDef[] = [
    {
        id: "dep-barricader",
        name: "Deputy Barricader",
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
            description: "Round start: all allies gain +1 (+1/Deputy) Shield",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "dep-marshal",
        name: "Iron Marshal",
        faction: "deputies",
        tier: 2,
        baseATK: 3,
        baseHP: 8,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "buff", target: "self", stat: "shield", amount: 2 },
            description:
                "On taking damage: +2 (+1/Deputy) Shield. BRIDGE 2+ QD: deal 1 to front",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "quickdraw",
                minAllies: 2,
                effect: { type: "damage", target: "frontEnemy", amount: 1 },
                description: "With 2+ Quickdraw: also deal 1 to front enemy",
            },
        },
        shopCost: 3,
    },
    {
        id: "dep-trapper",
        name: "Deputy Trapper",
        faction: "deputies",
        tier: 1,
        baseATK: 2,
        baseHP: 5,
        ability: {
            trigger: "onEnemyEnterFront",
            effect: { type: "damage", target: "frontEnemy", amount: 3 },
            description: "Enemy enters front: deal 3 (+1/Deputy) damage",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "dep-warden",
        name: "Fort Warden",
        faction: "deputies",
        tier: 2,
        baseATK: 3,
        baseHP: 10,
        ability: {
            trigger: "roundStart",
            effect: { type: "heal", target: "self", amount: 3 },
            description:
                "Round start: heal self 3 (+1/Deputy). BRIDGE 1+ QD: heal front for 1",
            factionBonus: { perAlly: 1 },
            crossBonus: {
                faction: "quickdraw",
                minAllies: 1,
                effect: { type: "heal", target: "allAllies", amount: 1 },
                description: "With 1+ Quickdraw: also heal frontliner for 1",
            },
        },
        shopCost: 4,
    },
    {
        id: "dep-judge",
        name: "Hanging Judge",
        faction: "deputies",
        tier: 3,
        baseATK: 4,
        baseHP: 14,
        ability: {
            trigger: "onAllyDeath",
            effect: { type: "buff", target: "self", stat: "atk", amount: 3 },
            description: "On ally death: gain +3 (+1/Deputy) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
    {
        id: "dep-sentinel",
        name: "Deputy Sentinel",
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
            description: "Combat start: gain +3 (+1/Deputy) Shield",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "dep-field-medic",
        name: "Field Surgeon",
        faction: "deputies",
        tier: 2,
        baseATK: 2,
        baseHP: 7,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "heal", target: "allAllies", amount: 1 },
            description:
                "On taking damage: heal all allies 1 (+1/Deputy). BRIDGE 1+ QD: also +1 ATK to self",
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
                description: "With 1+ Quickdraw: also gain +1 ATK when hit",
            },
        },
        shopCost: 4,
    },
    {
        id: "dep-fortress",
        name: "Iron Fortress",
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
            description: "Round start: all allies gain +2 (+1/Deputy) max HP",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
]

// ── Clockwork Collective (Engine) ────────────────────────────────────────────

const CLOCKWORK_UNITS: UnitDef[] = [
    {
        id: "cw-accumulator",
        name: "Clockwork Accumulator",
        faction: "clockwork",
        tier: 1,
        baseATK: 1,
        baseHP: 4,
        ability: {
            trigger: "onTakeDamage",
            effect: { type: "buff", target: "self", stat: "atk", amount: 1 },
            description: "On taking damage: gain +1 (+1/Clockwork) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "cw-gearsmith",
        name: "Gearsmith",
        faction: "clockwork",
        tier: 1,
        baseATK: 2,
        baseHP: 3,
        ability: {
            trigger: "onAllyAbility",
            effect: { type: "buff", target: "self", stat: "atk", amount: 1 },
            description:
                "Ally ability: +1 (+1/Clockwork) ATK. BRIDGE 2+ BP: summons trigger this",
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
                description: "With 2+ Prospectors: summons also trigger this",
            },
        },
        shopCost: 2,
    },
    {
        id: "cw-tesla-coil",
        name: "Tesla Coil",
        faction: "clockwork",
        tier: 2,
        baseATK: 2,
        baseHP: 5,
        ability: {
            trigger: "roundStart",
            effect: { type: "damage", target: "randomEnemy", amount: 2 },
            description: "Round start: deal 2 (+1/Clockwork) to random enemy",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "cw-overcharger",
        name: "Overcharger",
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
                "Deal damage: random ally +1 ATK. BRIDGE 1+ BP: buff 2 allies",
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
                    "With 1+ Prospector: buff a second random ally +1 ATK",
            },
        },
        shopCost: 4,
    },
    {
        id: "cw-architect",
        name: "Grand Architect",
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
            description: "Round start: all allies gain +1 (+1/Clockwork) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
    {
        id: "cw-amplifier",
        name: "Clockwork Amplifier",
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
                "Ally ability: gain +1 (+1/Clockwork) Shield. BRIDGE 1+ BP: also +1 ATK",
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
                    "With 1+ Prospector: also gain +1 ATK on ally ability",
            },
        },
        shopCost: 3,
    },
    {
        id: "cw-disruptor",
        name: "Clockwork Disruptor",
        faction: "clockwork",
        tier: 2,
        baseATK: 3,
        baseHP: 5,
        ability: {
            trigger: "roundStart",
            effect: { type: "damage", target: "allEnemies", amount: 1 },
            description: "Round start: deal 1 (+1/Clockwork) to all enemies",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 4,
    },
    {
        id: "cw-detonator",
        name: "Clockwork Detonator",
        faction: "clockwork",
        tier: 3,
        baseATK: 2,
        baseHP: 7,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "allEnemies", amount: 5 },
            description: "On death: deal 5 (+2/Clockwork) to all enemies",
            factionBonus: { perAlly: 2 },
        },
        shopCost: 5,
    },
]

// ── Bone Prospectors (Swarm) ─────────────────────────────────────────────────

const PROSPECTOR_UNITS: UnitDef[] = [
    {
        id: "bp-tunneler",
        name: "Bone Tunneler",
        faction: "prospectors",
        tier: 1,
        baseATK: 2,
        baseHP: 2,
        ability: {
            trigger: "onDeath",
            effect: { type: "summon", unitId: "bp-shade", position: "back" },
            description:
                "On death: summon a 1/1 Shade. BRIDGE 2+ CW: Shade is 2/1",
            crossBonus: {
                faction: "clockwork",
                minAllies: 2,
                effect: {
                    type: "summon",
                    unitId: "bp-shade",
                    position: "back",
                    atkBonus: 1,
                },
                description: "With 2+ Clockwork: summoned Shade has +1 ATK",
            },
        },
        shopCost: 1,
    },
    {
        id: "bp-foreman",
        name: "Bone Foreman",
        faction: "prospectors",
        tier: 2,
        baseATK: 3,
        baseHP: 4,
        ability: {
            trigger: "onAllyDeath",
            effect: { type: "buff", target: "self", stat: "atk", amount: 2 },
            description: "On ally death: gain +2 (+1/Prospector) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "bp-rattler",
        name: "Rattlesnake Ghost",
        faction: "prospectors",
        tier: 1,
        baseATK: 3,
        baseHP: 1,
        ability: {
            trigger: "onDeath",
            effect: { type: "damage", target: "frontEnemy", amount: 3 },
            description: "On death: deal 3 (+1/Prospector) to enemy front",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 2,
    },
    {
        id: "bp-necrominer",
        name: "Necrominer",
        faction: "prospectors",
        tier: 2,
        baseATK: 2,
        baseHP: 3,
        ability: {
            trigger: "onAllyDeath",
            effect: { type: "summon", unitId: "bp-shade", position: "back" },
            description:
                "Ally death: summon 1/1 Shade. BRIDGE 1+ CW: Shade gets +1 ATK",
            crossBonus: {
                faction: "clockwork",
                minAllies: 1,
                effect: {
                    type: "summon",
                    unitId: "bp-shade",
                    position: "back",
                    atkBonus: 1,
                },
                description: "With 1+ Clockwork: summoned Shade has +1 ATK",
            },
        },
        shopCost: 3,
    },
    {
        id: "bp-patriarch",
        name: "Bone Patriarch",
        faction: "prospectors",
        tier: 3,
        baseATK: 4,
        baseHP: 6,
        ability: {
            trigger: "roundStart",
            effect: { type: "summon", unitId: "bp-shade", position: "back" },
            description:
                "Round start: summon 1/1 Shade. BRIDGE 2+ CW: Shade gets +1/+1",
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
                description: "With 2+ Clockwork: summoned Shade has +1/+1",
            },
        },
        shopCost: 5,
    },
    {
        id: "bp-revenant",
        name: "Bone Revenant",
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
            description: "On death: all allies gain +2 (+1/Prospector) ATK",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 3,
    },
    {
        id: "bp-leech",
        name: "Bone Leech",
        faction: "prospectors",
        tier: 2,
        baseATK: 4,
        baseHP: 3,
        ability: {
            trigger: "onDealDamage",
            effect: { type: "heal", target: "self", amount: 2 },
            description:
                "On deal damage: heal self 2 (+1/Prospector). BRIDGE 1+ CW: also +1 ATK",
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
                description: "With 1+ Clockwork: also gain +1 ATK on hit",
            },
        },
        shopCost: 4,
    },
    {
        id: "bp-sovereign",
        name: "Bone Sovereign",
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
            description: "Ally death: summon 2/2 Shade (+1/+0 per Prospector)",
            factionBonus: { perAlly: 1 },
        },
        shopCost: 5,
    },
]

// ── Summoned tokens ──────────────────────────────────────────────────────────

const TOKEN_UNITS: UnitDef[] = [
    {
        id: "bp-shade",
        name: "Shade",
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
