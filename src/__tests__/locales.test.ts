import { readdirSync, readFileSync } from "fs"
import { join, resolve } from "path"
import { describe, expect, it } from "vitest"

const LOCALES_DIR = resolve(__dirname, "../locales")

function loadLocale(name: string): Record<string, unknown> {
    const raw = readFileSync(join(LOCALES_DIR, `${name}.json`), "utf-8")
    return JSON.parse(raw) as Record<string, unknown>
}

function getLocaleFiles(): string[] {
    return readdirSync(LOCALES_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", ""))
}

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = []
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === "object" && !Array.isArray(value)) {
            keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
        } else {
            keys.push(fullKey)
        }
    }
    return keys.sort()
}

function extractInterpolationVars(value: string): string[] {
    const matches = value.match(/\{\{(\w+)\}\}/g) ?? []
    return matches.sort()
}

describe("locale files", () => {
    const locales = getLocaleFiles()
    const enLocale = loadLocale("en")
    const enKeys = flattenKeys(enLocale)

    it("has at least en locale", () => {
        expect(locales).toContain("en")
    })

    describe("key parity", () => {
        for (const locale of locales) {
            if (locale === "en") continue

            it(`${locale}.json has the same keys as en.json`, () => {
                const otherLocale = loadLocale(locale)
                const otherKeys = flattenKeys(otherLocale)

                const missingInOther = enKeys.filter(
                    (k) => !otherKeys.includes(k)
                )
                const extraInOther = otherKeys.filter(
                    (k) => !enKeys.includes(k)
                )

                expect(
                    missingInOther,
                    `${locale} is missing keys: ${missingInOther.join(", ")}`
                ).toEqual([])
                expect(
                    extraInOther,
                    `${locale} has extra keys: ${extraInOther.join(", ")}`
                ).toEqual([])
            })
        }
    })

    describe("interpolation variables", () => {
        function getLeafValues(
            obj: Record<string, unknown>,
            prefix = ""
        ): [string, string][] {
            const result: [string, string][] = []
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key
                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {
                    result.push(
                        ...getLeafValues(
                            value as Record<string, unknown>,
                            fullKey
                        )
                    )
                } else if (typeof value === "string") {
                    result.push([fullKey, value])
                }
            }
            return result
        }

        const enLeaves = getLeafValues(enLocale)
        const enVarsMap = new Map<string, string[]>()
        for (const [key, value] of enLeaves) {
            const vars = extractInterpolationVars(value)
            if (vars.length > 0) {
                enVarsMap.set(key, vars)
            }
        }

        for (const locale of locales) {
            if (locale === "en") continue

            it(`${locale}.json has matching interpolation variables`, () => {
                const otherLocale = loadLocale(locale)
                const otherLeaves = getLeafValues(otherLocale)
                const otherMap = new Map(otherLeaves)

                for (const [key, expectedVars] of enVarsMap) {
                    const otherValue = otherMap.get(key)
                    if (!otherValue) continue

                    const otherVars = extractInterpolationVars(otherValue)
                    expect(
                        otherVars,
                        `${locale}:${key} has mismatched interpolation vars`
                    ).toEqual(expectedVars)
                }
            })
        }
    })

    describe("no empty values", () => {
        for (const locale of locales) {
            it(`${locale}.json has no empty string values`, () => {
                const data = loadLocale(locale)

                function checkNoEmptyStrings(
                    obj: Record<string, unknown>,
                    path: string
                ): void {
                    for (const [key, value] of Object.entries(obj)) {
                        const fullPath = `${path}.${key}`
                        if (typeof value === "string") {
                            expect(
                                value.trim().length,
                                `${locale}:${fullPath} is empty`
                            ).toBeGreaterThan(0)
                        } else if (
                            value &&
                            typeof value === "object" &&
                            !Array.isArray(value)
                        ) {
                            checkNoEmptyStrings(
                                value as Record<string, unknown>,
                                fullPath
                            )
                        }
                    }
                }

                checkNoEmptyStrings(data, locale)
            })
        }
    })

    describe("ticker symbols not translated", () => {
        const TICKER_SYMBOLS = ["EMAIL", "ADS", "DOM", "BW", "SOFT", "VC"]

        for (const locale of locales) {
            it(`${locale}.json keeps ticker symbols as keys in commodityExchange.commodities`, () => {
                const data = loadLocale(locale)
                const exchange = (
                    data as Record<string, Record<string, unknown>>
                ).commodityExchange as
                    | Record<string, Record<string, unknown>>
                    | undefined

                if (!exchange?.commodities) return

                const commodityKeys = Object.keys(exchange.commodities)
                for (const symbol of TICKER_SYMBOLS) {
                    expect(
                        commodityKeys,
                        `${locale} should have ${symbol} as a key`
                    ).toContain(symbol)
                }
            })
        }
    })
})
