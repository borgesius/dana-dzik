const MOBILE_BREAKPOINT = 768

let cachedResult: boolean | null = null

export function isMobile(): boolean {
    if (cachedResult !== null) return cachedResult
    cachedResult =
        window.innerWidth <= MOBILE_BREAKPOINT ||
        ("ontouchstart" in window && window.innerWidth <= MOBILE_BREAKPOINT)
    return cachedResult
}
