import { WeltError } from "./types"

export type GrundOpcode =
    | "mav"
    | "vir"
    | "mak"
    | "pav"
    | "tar"
    | "tir"
    | "tin"
    | "tab"
    | "kur"
    | "sur"
    | "mur"
    | "dur"
    | "rav"
    | "rev"
    | "rgv"
    | "nov"

export type GrundOperand =
    | { kind: "register"; index: number }
    | { kind: "immediate"; value: number }
    | { kind: "label"; name: string }
    | { kind: "data"; key: string }

export interface GrundInstruction {
    opcode: GrundOpcode
    operands: GrundOperand[]
    line: number
}

export interface GrundProgram {
    data: Map<string, string>
    instructions: GrundInstruction[]
    labels: Map<string, number>
}

const OPCODES = new Set<string>([
    "mav",
    "vir",
    "mak",
    "pav",
    "tar",
    "tir",
    "tin",
    "tab",
    "kur",
    "sur",
    "mur",
    "dur",
    "rav",
    "rev",
    "rgv",
    "nov",
])

export function parseGrund(source: string): GrundProgram {
    const data = new Map<string, string>()
    const instructions: GrundInstruction[] = []
    const labels = new Map<string, number>()

    const lines = source.split("\n")
    let inDataSection = false
    let inCodeSection = false

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1
        const raw = lines[i]

        const commentIdx = findCommentStart(raw)
        const line = (commentIdx >= 0 ? raw.slice(0, commentIdx) : raw).trim()

        if (line === "" || line.startsWith(";")) continue

        if (line === ".data") {
            inDataSection = true
            inCodeSection = false
            continue
        }

        if (line === ".code") {
            inCodeSection = true
            inDataSection = false
            continue
        }

        if (inDataSection) {
            parseDataEntry(line, data, lineNum)
            continue
        }

        if (!inCodeSection) {
            if (line.startsWith(".") && line.endsWith(":")) {
                inCodeSection = true
            } else if (OPCODES.has(line.split(/\s/)[0].toLowerCase())) {
                inCodeSection = true
            } else {
                continue
            }
        }

        if (line.endsWith(":")) {
            const labelName = line.slice(0, -1).trim()
            labels.set(labelName, instructions.length)
            continue
        }

        const instr = parseInstruction(line, lineNum)
        if (instr) {
            instructions.push(instr)
        }
    }

    return { data, instructions, labels }
}

function findCommentStart(line: string): number {
    let inString = false
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inString = !inString
        } else if (line[i] === ";" && !inString) {
            return i
        }
    }
    return -1
}

function parseDataEntry(
    line: string,
    data: Map<string, string>,
    lineNum: number
): void {
    const match = line.match(/^(\w+):\s*"((?:[^"\\]|\\.)*)"\s*$/)
    if (!match) {
        throw new WeltError(`Invalid data entry: ${line}`, lineNum)
    }
    const key = match[1]
    const value = match[2]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    data.set(key, value)
}

function parseInstruction(line: string, lineNum: number): GrundInstruction {
    const parts = line
        .split(/[\s,]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    const opStr = parts[0].toLowerCase()

    if (!OPCODES.has(opStr)) {
        throw new WeltError(`Unknown opcode: ${opStr}`, lineNum)
    }

    const opcode = opStr as GrundOpcode
    const operands = parts.slice(1).map((p) => parseOperand(p, lineNum))

    return { opcode, operands, line: lineNum }
}

function parseOperand(token: string, lineNum: number): GrundOperand {
    const lower = token.toLowerCase()

    if (lower.startsWith("r") && /^r\d$/.test(lower)) {
        const index = parseInt(lower.slice(1), 10)
        if (index < 0 || index > 7) {
            throw new WeltError(`Register out of range: ${token}`, lineNum)
        }
        return { kind: "register", index }
    }

    if (lower.startsWith(".")) {
        return { kind: "label", name: token }
    }

    if (lower.startsWith("s") && /^s\d+$/.test(lower)) {
        return { kind: "data", key: lower }
    }

    const num = parseInt(token, 10)
    if (!isNaN(num)) {
        return { kind: "immediate", value: num }
    }

    throw new WeltError(`Invalid operand: ${token}`, lineNum)
}
