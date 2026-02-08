const SUFFIXES: [number, string][] = [
    [1e15, "Qa"],
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
]

export function formatMoney(value: number): string {
    const negative = value < 0
    const abs = Math.abs(value)
    let formatted: string

    if (abs >= 1e18) {
        formatted = `$${abs.toExponential(1)}`
    } else if (abs >= 1e3) {
        let result = `${abs}`
        for (const [threshold, suffix] of SUFFIXES) {
            if (abs >= threshold) {
                const scaled = abs / threshold
                result =
                    scaled >= 100
                        ? `$${Math.floor(scaled)}${suffix}`
                        : scaled >= 10
                          ? `$${scaled.toFixed(1)}${suffix}`
                          : `$${scaled.toFixed(1)}${suffix}`
                break
            }
        }
        formatted = result
    } else if (abs >= 1) {
        formatted = `$${abs.toFixed(2)}`
    } else if (abs === 0) {
        formatted = "$0.000"
    } else {
        formatted = `$${abs.toFixed(3)}`
    }

    return negative ? `-${formatted}` : formatted
}

/**
 * Format a commodity quantity for display.
 * Integers show without decimals; fractional values show up to 2 dp with
 * trailing zeros stripped.
 */
export function formatQuantity(value: number): string {
    if (Number.isInteger(value)) return value.toString()
    return parseFloat(value.toFixed(2)).toString()
}

/**
 * Format a quantity with a fixed number of decimal places.
 * Used when the display precision should stay constant regardless of the
 * current value (e.g. harvest output anchored to the commodity's scale).
 */
export function formatQuantityFixed(
    value: number,
    decimalPlaces: number
): string {
    return value.toFixed(decimalPlaces)
}
