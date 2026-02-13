/**
 * Typed DOM helpers to reduce `as` casts at call sites.
 * Use when reading data attributes that are known to conform to a union type.
 */

/**
 * Get a data attribute value, typed as the expected string union.
 * Use when the attribute value is known to be one of a fixed set (e.g. unit IDs, upgrade IDs).
 */
export function getDataAttribute<T extends string>(
    el: Element,
    name: string
): T | null {
    const attr = name.startsWith("data-") ? name : `data-${name}`
    const value = el.getAttribute(attr)
    return value ? (value as T) : null
}
