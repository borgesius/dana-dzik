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
            description: "On combat start: deal 3 damage to enemy frontliner",
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
            description: "On first attack: deal double damage",
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
            description: "On death: deal 2 damage to all enemies",
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
            description: "When enemy enters front: deal 2 damage",
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
            effect: { type: "buff", target: "allAllies", stat: "atk", amount: 2 },
            description: "On combat start: all allies gain +2 ATK",
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
            effect: { type: "buff", target: "allAllies", stat: "shield", amount: 1 },
            description: "Start of each round: all allies gain +1 Shield",
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
            description: "On taking damage: gain +2 Shield",
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
            description: "When enemy enters front: deal 3 damage",
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
            description: "Start of round: heal self for 3",
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
            description: "On ally death: gain +3 ATK",
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
            description: "On taking damage: gain +1 ATK permanently",
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
            description: "On ally ability trigger: gain +1 ATK",
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
            description: "Start of round: deal 2 damage to random enemy",
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
            effect: { type: "buff", target: "randomAlly", stat: "atk", amount: 1 },
            description: "On deal damage: random ally gains +1 ATK",
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
            effect: { type: "buff", target: "allAllies", stat: "atk", amount: 1 },
            description: "Start of round: all allies gain +1 ATK",
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
            description: "On death: summon a 1/1 Shade in the back",
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
            description: "On ally death: gain +2 ATK and +2 HP",
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
            description: "On death: deal 3 damage to enemy front",
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
            description: "On ally death: summon a 1/1 Shade",
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
            description: "Start of round: summon a 1/1 Shade",
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
    return ALL_UNITS.filter(
        (u) => u.faction === faction && u.shopCost > 0
    )
}
