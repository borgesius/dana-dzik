import { getLocaleManager } from "../localeManager"
import { getSellRefund } from "./shop"
import type { CombatUnit, FactionId, UnitDef } from "./types"
import { UNIT_MAP } from "./units"

// ── Faction display ─────────────────────────────────────────────────────────

const FACTION_ICONS: Record<FactionId, string> = {
    quickdraw: "⚡",
    deputies: "🏛️",
    clockwork: "♾️",
    prospectors: "🌀",
    drifters: "🎓",
}

const FACTION_COLORS: Record<FactionId, string> = {
    quickdraw: "#cc3333",
    deputies: "#336699",
    clockwork: "#996633",
    prospectors: "#669933",
    drifters: "#999999",
}

export function factionIcon(faction: FactionId): string {
    return FACTION_ICONS[faction] ?? ""
}

export function factionColor(faction: FactionId): string {
    return FACTION_COLORS[faction] ?? "#808080"
}

export function factionLabel(faction: FactionId): string {
    const lm = getLocaleManager()
    const t = lm.t.bind(lm)
    const name = t(`symposium.factions.${faction}`, {
        defaultValue: faction,
    })
    return `${FACTION_ICONS[faction] ?? ""} ${name}`
}

/** Get the localized display name for a unit definition */
export function unitDisplayName(def: UnitDef): string {
    return getLocaleManager().t(`symposium.units.${def.id}`, {
        defaultValue: def.name,
    })
}

// ── Level display ───────────────────────────────────────────────────────────

function levelClass(level: number): string {
    if (level >= 3) return "uc-level-3"
    if (level >= 2) return "uc-level-2"
    return "uc-level-1"
}

function levelStars(level: number): string {
    return "★".repeat(level)
}

// ── Card variants ───────────────────────────────────────────────────────────

export type UnitCardVariant = "shop" | "owned" | "combat" | "collection"

interface ShopCardOptions {
    variant: "shop"
    offerIndex: number
    cost: number
    sold: boolean
    affordable: boolean
}

interface OwnedCardOptions {
    variant: "owned"
    source: "lineup" | "bench"
    index: number
    draggable?: boolean
    slotLabel?: string // e.g. "1" for front slot
}

interface CombatCardOptions {
    variant: "combat"
    side: "player" | "opponent"
}

interface CollectionCardOptions {
    variant: "collection"
}

type CardOptions =
    | ShopCardOptions
    | OwnedCardOptions
    | CombatCardOptions
    | CollectionCardOptions

// ── Render functions ────────────────────────────────────────────────────────

/**
 * Render a unit card from a UnitDef (shop / collection).
 */
export function renderDefCard(def: UnitDef, options: CardOptions): string {
    const lvlCls = levelClass(1)
    const fc = factionColor(def.faction)

    switch (options.variant) {
        case "shop": {
            const cls = options.sold
                ? "uc-card uc-shop sold"
                : options.affordable
                  ? "uc-card uc-shop"
                  : "uc-card uc-shop unaffordable"
            return `
                <button class="${cls} ${lvlCls}" data-offer="${options.offerIndex}"
                    style="--uc-faction-color: ${fc}"
                    ${options.sold ? "disabled" : ""}>
                    <div class="uc-header">
                        <span class="uc-name">${unitDisplayName(def)}</span>
                    </div>
                    <div class="uc-body">
                        <span class="uc-stats">⚔${def.baseATK} ♥${def.baseHP}</span>
                        <span class="uc-faction">${factionIcon(def.faction)}</span>
                    </div>
                    <div class="uc-ability">${def.ability.description}</div>
                    <div class="uc-cost">${options.sold ? getLocaleManager().t("symposium.ui.sold") : `${options.cost} 💭`}</div>
                </button>
            `
        }
        case "collection": {
            return `
                <div class="uc-card uc-collection ${lvlCls}"
                    style="--uc-faction-color: ${fc}"
                    title="${def.ability.description}">
                    <div class="uc-header">
                        <span class="uc-name">${unitDisplayName(def)}</span>
                    </div>
                    <div class="uc-body">
                        <span class="uc-stats">⚔${def.baseATK} ♥${def.baseHP}</span>
                        <span class="uc-faction">${factionLabel(def.faction)}</span>
                    </div>
                </div>
            `
        }
        default:
            return ""
    }
}

/**
 * Render a unit card from a CombatUnit (owned / combat).
 */
export function renderUnitCard(unit: CombatUnit, options: CardOptions): string {
    const def = UNIT_MAP.get(unit.unitDefId)
    const lvlCls = levelClass(unit.level)
    const stars = levelStars(unit.level)
    const fc = factionColor(unit.faction)
    const abilityText = def?.ability.description ?? ""

    switch (options.variant) {
        case "owned": {
            const dragAttr =
                options.draggable !== false
                    ? `draggable="true" data-drag-source="${options.source}" data-drag-idx="${options.index}"`
                    : ""
            const refund = getSellRefund(unit)
            const crossBonusText = def?.ability.crossBonus?.description ?? ""
            const factionBonusText = def?.ability.factionBonus
                ? `+${def.ability.factionBonus.perAlly}/ally`
                : ""
            return `
                <div class="uc-card uc-owned ${lvlCls}" ${dragAttr}
                    style="--uc-faction-color: ${fc}"
                    data-ability="${abilityText}"
                    data-faction-bonus="${factionBonusText}"
                    data-cross-bonus="${crossBonusText}"
                    data-unit-name="${def ? unitDisplayName(def) : unit.unitDefId}"
                    data-unit-level="${unit.level}"
                    data-source="${options.source}" data-idx="${options.index}">
                    ${options.slotLabel ? `<div class="uc-slot-label">${options.slotLabel}</div>` : ""}
                    <div class="uc-header">
                        <span class="uc-name">${def ? unitDisplayName(def) : unit.unitDefId}</span>
                        <span class="uc-level">${stars}</span>
                    </div>
                    <div class="uc-body">
                        <span class="uc-stats">⚔${unit.currentATK} ♥${unit.currentHP}</span>
                        <span class="uc-faction">${factionIcon(unit.faction)}</span>
                    </div>
                    <button class="uc-sell-btn" data-source="${options.source}" data-idx="${options.index}">${getLocaleManager().t("symposium.ui.sell", { amount: refund })}</button>
                </div>
            `
        }
        case "combat": {
            const hpPct = Math.max(
                0,
                Math.round((unit.currentHP / unit.maxHP) * 100)
            )
            const hpColor =
                hpPct > 60 ? "#228b22" : hpPct > 30 ? "#d4a017" : "#cc0000"
            return `
                <div class="uc-card uc-combat ${lvlCls} ${options.side}"
                    style="--uc-faction-color: ${fc}"
                    data-instance="${unit.instanceId}"
                    data-unit-def="${unit.unitDefId}">
                    <div class="uc-header">
                        <span class="uc-name">${def ? unitDisplayName(def) : unit.unitDefId}</span>
                        <span class="uc-level">${stars}</span>
                    </div>
                    <div class="uc-body">
                        <span class="uc-stats">⚔${unit.currentATK}</span>
                        ${unit.shield > 0 ? `<span class="uc-shield">🛡${unit.shield}</span>` : ""}
                    </div>
                    <div class="uc-hp-bar">
                        <div class="uc-hp-fill" style="width: ${hpPct}%; background: ${hpColor}"></div>
                    </div>
                    <div class="uc-hp-text">${unit.currentHP}/${unit.maxHP}</div>
                </div>
            `
        }
        default:
            return ""
    }
}

/**
 * Render an empty lineup slot (drop target).
 */
export function renderEmptySlot(index: number, label: string): string {
    return `
        <div class="uc-slot-empty" data-drop-target="lineup" data-drop-idx="${index}">
            <span class="uc-slot-label">${label}</span>
        </div>
    `
}
