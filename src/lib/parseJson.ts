export function parseJson<T>(
    raw: string,
    validate: (value: unknown) => value is T
): T | null {
    try {
        const parsed: unknown = JSON.parse(raw)
        return validate(parsed) ? parsed : null
    } catch {
        return null
    }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isApiResponse<T>(
    validate: (data: unknown) => data is T
): (
    value: unknown
) => value is { ok: boolean; data: T | null; error?: string } {
    return (
        value: unknown
    ): value is { ok: boolean; data: T | null; error?: string } => {
        if (!isRecord(value)) return false
        if (typeof value.ok !== "boolean") return false
        if (value.data !== null && !validate(value.data)) return false
        return true
    }
}
