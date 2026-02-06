import {
    SYS_BOOT,
    SYS_CLOCK,
    SYS_DISPLAY,
    SYS_KERNEL,
    SYS_MEMORY,
} from "./terminal/filesystem"
import { runWeltProgram } from "./welt"

export type Severity = "none" | "minor" | "moderate" | "critical"

export interface ValidationResult {
    severity: Severity
    broken: string[]
    values: Record<string, number>
}

const ORIGINALS: Record<string, string> = {
    "kernel.welt": SYS_KERNEL,
    "display.welt": SYS_DISPLAY,
    "clock.welt": SYS_CLOCK,
    "memory.welt": SYS_MEMORY,
    "boot.welt": SYS_BOOT,
}

const VALIDATORS: Record<
    string,
    (content: string) => Promise<ValidationResult>
> = {
    "kernel.welt": validateKernel,
    "display.welt": validateDisplay,
    "clock.welt": validateClock,
    "memory.welt": validateMemory,
    "boot.welt": validateBoot,
}

export async function validateSystemFile(
    filename: string,
    content: string
): Promise<ValidationResult | null> {
    const key = filename.toLowerCase()
    const original = ORIGINALS[key]
    if (original === undefined) return null

    if (content === original) {
        return { severity: "none", broken: [], values: {} }
    }

    const validator = VALIDATORS[key]
    if (!validator) return null

    return validator(content)
}

function extractDingValue(content: string, slot: number): number | undefined {
    const pattern = new RegExp(`DING\\s+${slot}\\s*=\\s*(\\d+)(?!\\s*[+\\-*/])`)
    const match = content.match(pattern)
    return match ? parseInt(match[1], 10) : undefined
}

function hasPattern(content: string, pattern: RegExp): boolean {
    return pattern.test(content)
}

async function tryRun(content: string): Promise<{
    output: string[]
    error: boolean
}> {
    const output: string[] = []
    try {
        await Promise.race([
            runWeltProgram(content, {
                onOutput: (text) => output.push(String(text)),
                onInput: () => Promise.resolve(""),
            }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 2000)
            ),
        ])
        return { output, error: false }
    } catch {
        return { output, error: true }
    }
}

function validateKernel(_content: string): Promise<ValidationResult> {
    return Promise.resolve({
        severity: "critical",
        broken: ["kernel-modified"],
        values: {},
    })
}

function validateBoot(_content: string): Promise<ValidationResult> {
    return Promise.resolve({
        severity: "critical",
        broken: ["boot-modified"],
        values: {},
    })
}

async function validateDisplay(content: string): Promise<ValidationResult> {
    const broken: string[] = []
    const values: Record<string, number> = {}

    const width = extractDingValue(content, 0)
    const height = extractDingValue(content, 1)
    const colorDepth = extractDingValue(content, 2)
    const refreshRate = extractDingValue(content, 5)

    if (width !== undefined) values["width"] = width
    if (height !== undefined) values["height"] = height
    if (colorDepth !== undefined) values["colorDepth"] = colorDepth
    if (refreshRate !== undefined) values["refreshRate"] = refreshRate

    if (width !== 640) broken.push("resolution-width")
    if (height !== 480) broken.push("resolution-height")
    if (colorDepth !== 16) broken.push("color-depth")
    if (refreshRate !== 60) broken.push("refresh-rate")

    const hasPaletteLoop = hasPattern(content, /SOLANGE\s+DING\s+3/)
    const hasVsyncLoop = hasPattern(content, /SOLANGE\s+DING\s+6/)

    if (!hasPaletteLoop) broken.push("palette-loop")
    if (!hasVsyncLoop) broken.push("vsync-loop")

    const { output, error } = await tryRun(content)

    if (error) {
        broken.push("runtime-error")
    } else if (!output.includes("DISPLAY OK")) {
        broken.push("wrong-output")
    }

    return {
        severity: classifySeverity(broken, error),
        broken,
        values,
    }
}

async function validateClock(content: string): Promise<ValidationResult> {
    const broken: string[] = []
    const values: Record<string, number> = {}

    const pitDivisor = extractDingValue(content, 1)
    const tickRate = extractDingValue(content, 2)

    if (pitDivisor !== undefined) values["pitDivisor"] = pitDivisor
    if (tickRate !== undefined) values["tickRate"] = tickRate

    if (pitDivisor !== 65536) broken.push("pit-divisor")
    if (tickRate !== 18) broken.push("tick-rate")

    const hasCalibrationLoop = hasPattern(content, /SOLANGE\s+DING\s+4/)
    const hasRtcSync =
        hasPattern(content, /DING\s+6\s*=/) &&
        hasPattern(content, /DING\s+7\s*=/)

    if (!hasCalibrationLoop) broken.push("calibration-loop")
    if (!hasRtcSync) broken.push("rtc-sync")

    const { output, error } = await tryRun(content)

    if (error) {
        broken.push("runtime-error")
    } else if (!output.includes("CLOCK OK")) {
        broken.push("wrong-output")
    }

    return {
        severity: classifySeverity(broken, error),
        broken,
        values,
    }
}

async function validateMemory(content: string): Promise<ValidationResult> {
    const broken: string[] = []
    const values: Record<string, number> = {}

    const bankCount = extractDingValue(content, 1)
    if (bankCount !== undefined) values["bankCount"] = bankCount

    if (bankCount !== 8) broken.push("bank-count")

    const hasScanLoop = hasPattern(content, /SOLANGE\s+DING\s+0\s*</)
    const hasPageTable = hasPattern(content, /DING\s+5\s*=\s*DING\s+2/)
    const hasHeapReady = hasPattern(content, /DING\s+7\s*=\s*"HEAP_READY"/)

    if (!hasScanLoop) broken.push("scan-loop")
    if (!hasPageTable) broken.push("page-table")
    if (!hasHeapReady) broken.push("heap-ready")

    const { output, error } = await tryRun(content)

    if (error) {
        broken.push("runtime-error")
    } else if (!output.includes("MEMORY OK")) {
        broken.push("wrong-output")
    }

    return {
        severity: classifySeverity(broken, error),
        broken,
        values,
    }
}

function classifySeverity(broken: string[], runtimeError: boolean): Severity {
    if (broken.length === 0) return "minor"
    if (runtimeError || broken.length >= 3) return "critical"
    return "moderate"
}
