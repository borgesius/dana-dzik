import type { EventId } from "./types"
import type { RelicTier } from "./relics"

// ── Event types ──────────────────────────────────────────────────────────────

export type EventOutcomeType =
    | "gainRelic" // gain a random relic (optionally of a specific tier)
    | "gainScrap" // gain scrap
    | "loseScrap" // lose scrap
    | "sacrificeWeakest" // remove weakest unit from lineup
    | "allUnitsLoseHP" // all units lose HP
    | "frontUnitLoseHP" // front unit loses HP
    | "allUnitsGainATK" // all units gain ATK
    | "allUnitsGainHP" // all units gain HP
    | "strongestGainATK" // strongest unit gains ATK
    | "strongestLoseHP" // strongest unit loses HP
    | "swapAtkHp" // swap ATK and HP of all units
    | "gambleScrap" // 50% double, 50% half
    | "sellBench" // sell all bench units at 2x refund
    | "freeRerolls" // grant free rerolls for next shop
    | "randomUnitGainATK" // random unit gains ATK
    | "removeRelic" // remove a random held relic
    | "buyRelic" // show relics to buy with scrap (handled specially)
    | "healAll" // heal all units

export interface EventOutcome {
    type: EventOutcomeType
    amount?: number
    /** For gainRelic: optionally constrain tier */
    relicTier?: RelicTier
}

export interface EventChoiceDef {
    /** Locale key suffix for the choice label */
    labelKey: string
    outcomes: EventOutcome[]
}

export interface EventCondition {
    type:
        | "minUnits" // lineup has at least N units
        | "minScrap" // player has at least N scrap
        | "hasBench" // bench has at least 1 unit
        | "hasRelics" // player holds at least 1 relic
        | "minRound" // current round >= N
    value?: number
}

export interface EventDef {
    id: EventId
    /** Array of choices (2-3 per event) */
    choices: EventChoiceDef[]
    /** Conditions that must be met for this event to appear */
    conditions?: EventCondition[]
}

// ── Event catalog ────────────────────────────────────────────────────────────

export const EVENT_DEFS: EventDef[] = [
    // ── Trade-off events ────────────────────────────────────────────────────

    {
        id: "allegory-of-the-cave",
        choices: [
            {
                labelKey: "a",
                outcomes: [{ type: "sacrificeWeakest" }, { type: "gainRelic" }],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 4 }],
            },
        ],
        conditions: [{ type: "minUnits", value: 2 }],
    },
    {
        id: "trolley-problem",
        choices: [
            {
                labelKey: "a",
                outcomes: [
                    { type: "allUnitsLoseHP", amount: 2 },
                    { type: "gainRelic" },
                ],
            },
            {
                labelKey: "b",
                outcomes: [
                    { type: "frontUnitLoseHP", amount: 5 },
                    { type: "gainScrap", amount: 6 },
                ],
            },
        ],
        conditions: [{ type: "minUnits", value: 2 }],
    },
    {
        id: "nirvana",
        choices: [
            {
                labelKey: "a",
                outcomes: [
                    { type: "sellBench" },
                    { type: "gainRelic", relicTier: "rare" },
                ],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 2 }],
            },
        ],
        conditions: [{ type: "hasBench" }],
    },

    // ── Gamble / risk-reward events ─────────────────────────────────────────

    {
        id: "zhuangzis-butterfly",
        choices: [
            {
                labelKey: "a",
                outcomes: [{ type: "swapAtkHp" }],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 2 }],
            },
        ],
    },
    {
        id: "pascals-wager",
        choices: [
            {
                labelKey: "a",
                outcomes: [{ type: "gambleScrap" }],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 1 }],
            },
        ],
        conditions: [{ type: "minScrap", value: 2 }],
    },
    {
        id: "burning-library",
        choices: [
            {
                labelKey: "a",
                outcomes: [
                    { type: "loseScrap", amount: 5 },
                    { type: "gainRelic" },
                    { type: "gainRelic" },
                ],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 8 }],
            },
        ],
        conditions: [{ type: "minScrap", value: 5 }],
    },

    // ── Blessing / bounty events ────────────────────────────────────────────

    {
        id: "garden-of-forking-paths",
        choices: [
            {
                labelKey: "a",
                outcomes: [{ type: "gainRelic" }],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 5 }],
            },
            {
                labelKey: "c",
                outcomes: [{ type: "allUnitsGainATK", amount: 2 }],
            },
        ],
    },
    {
        id: "karma",
        choices: [
            {
                labelKey: "a",
                outcomes: [
                    { type: "loseScrap", amount: 3 },
                    { type: "allUnitsGainATK", amount: 2 },
                    { type: "allUnitsGainHP", amount: 2 },
                ],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "randomUnitGainATK", amount: 1 }],
            },
        ],
        conditions: [{ type: "minScrap", value: 3 }],
    },
    {
        id: "memento-mori",
        choices: [
            {
                labelKey: "a",
                outcomes: [
                    { type: "strongestGainATK", amount: 4 },
                    { type: "strongestLoseHP", amount: 3 },
                ],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "allUnitsGainHP", amount: 1 }],
            },
        ],
        conditions: [{ type: "minUnits", value: 1 }],
    },

    // ── Shop / merchant events ──────────────────────────────────────────────

    {
        id: "the-agora",
        choices: [
            {
                labelKey: "a",
                outcomes: [{ type: "buyRelic", relicTier: "common" }],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "buyRelic", relicTier: "rare" }],
            },
            {
                labelKey: "c",
                outcomes: [{ type: "buyRelic", relicTier: "legendary" }],
            },
        ],
        conditions: [{ type: "minScrap", value: 3 }],
    },
    {
        id: "diogenes-lantern",
        choices: [
            {
                labelKey: "a",
                outcomes: [{ type: "freeRerolls", amount: 3 }],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 2 }],
            },
        ],
    },
    {
        id: "socratic-method",
        choices: [
            {
                labelKey: "a",
                outcomes: [
                    { type: "removeRelic" },
                    { type: "gainRelic" },
                    { type: "gainRelic" },
                ],
            },
            {
                labelKey: "b",
                outcomes: [{ type: "gainScrap", amount: 2 }],
            },
        ],
        conditions: [{ type: "hasRelics" }],
    },
]

export const EVENT_MAP: ReadonlyMap<EventId, EventDef> = new Map(
    EVENT_DEFS.map((e) => [e.id, e])
)

// ── Helper functions ─────────────────────────────────────────────────────────

/** Event trigger probability */
export const EVENT_CHANCE = 0.25

/** Check if all conditions are met for an event */
export function checkEventConditions(
    event: EventDef,
    ctx: {
        lineupSize: number
        benchSize: number
        scrap: number
        relicCount: number
        round: number
    }
): boolean {
    if (!event.conditions) return true
    for (const cond of event.conditions) {
        switch (cond.type) {
            case "minUnits":
                if (ctx.lineupSize < (cond.value ?? 1)) return false
                break
            case "minScrap":
                if (ctx.scrap < (cond.value ?? 0)) return false
                break
            case "hasBench":
                if (ctx.benchSize < 1) return false
                break
            case "hasRelics":
                if (ctx.relicCount < 1) return false
                break
            case "minRound":
                if (ctx.round < (cond.value ?? 1)) return false
                break
        }
    }
    return true
}

/** Pick a random event that meets conditions */
export function pickRandomEvent(ctx: {
    lineupSize: number
    benchSize: number
    scrap: number
    relicCount: number
    round: number
}): EventDef | null {
    const eligible = EVENT_DEFS.filter((e) => checkEventConditions(e, ctx))
    if (eligible.length === 0) return null
    return eligible[Math.floor(Math.random() * eligible.length)]
}

/** Get the scrap cost to buy a relic by tier */
export function getRelicBuyCost(tier: RelicTier): number {
    switch (tier) {
        case "common":
            return 3
        case "rare":
            return 5
        case "legendary":
            return 8
        case "secret":
            return 8
    }
}
