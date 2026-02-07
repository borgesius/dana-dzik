import type { GrundInstruction, GrundProgram } from "./grundParser"
import { type WeltCallbacks, WeltError, type WeltValue } from "./types"

const WORD_SIZE = 256
const RING_SIZE = 4
const MAX_ITERATIONS = 1818
const TOTAL_ITERATION_WARN = 1024
const TOTAL_ITERATION_SUFFER = 4096

interface GrundState {
    registers: WeltValue[]
    ring: WeltValue[]
    ringPointer: number
    ringCount: number
    ringTotalPushes: number
    ringOverflowStreak: number
    carry: boolean
    flagEqual: boolean
    flagGreater: boolean
    pc: number
    halted: boolean
    totalIterations: number
    lastOutput: string
}

function createState(initialMemory?: WeltValue[]): GrundState {
    const registers: WeltValue[] = initialMemory
        ? [...initialMemory]
        : [0, 0, 0, 4, 0, 0, 0, 97]
    while (registers.length < 8) registers.push(0)

    return {
        registers,
        ring: [0, 0, 0, 0],
        ringPointer: 0,
        ringCount: 0,
        ringTotalPushes: 0,
        ringOverflowStreak: 0,
        carry: false,
        flagEqual: false,
        flagGreater: false,
        pc: 0,
        halted: false,
        totalIterations: 0,
        lastOutput: "",
    }
}

function wrapByte(val: number): number {
    return ((val % WORD_SIZE) + WORD_SIZE) % WORD_SIZE
}

export async function interpretGrund(
    program: GrundProgram,
    callbacks: WeltCallbacks,
    initialMemory?: WeltValue[]
): Promise<WeltValue[]> {
    const state = createState(initialMemory)
    const { instructions, labels, data } = program

    let iterationCount = 0

    while (state.pc < instructions.length && !state.halted) {
        iterationCount++
        state.totalIterations++

        if (state.totalIterations === TOTAL_ITERATION_WARN) {
            callbacks.onOutput("...")
        } else if (state.totalIterations === TOTAL_ITERATION_SUFFER) {
            callbacks.onOutput("Alles Leben ist Leiden.")
            if (typeof document !== "undefined") {
                document.dispatchEvent(
                    new CustomEvent("welt:error", {
                        detail: { type: "suffering" },
                    })
                )
            }
        }

        if (iterationCount > MAX_ITERATIONS * 8) {
            throw new WeltError(
                "SYSTEM OVERHEAT: Execution exceeded maximum iterations",
                0
            )
        }

        const instr = instructions[state.pc]
        await executeInstruction(instr, state, labels, data, callbacks)

        if (!state.halted) {
            state.pc++
        }
    }

    return [...state.registers]
}

async function executeInstruction(
    instr: GrundInstruction,
    state: GrundState,
    labels: Map<string, number>,
    data: Map<string, string>,
    callbacks: WeltCallbacks
): Promise<void> {
    switch (instr.opcode) {
        case "nov":
            state.halted = true
            break

        case "tar":
            execTar(instr, state, data)
            break

        case "tir":
            execTar(instr, state, data)
            break

        case "tin":
            execTin(instr, state)
            break

        case "tab":
            execTab(instr, state)
            break

        case "mav":
            execMav(instr, state, callbacks)
            break

        case "vir":
            await execVir(instr, state, callbacks)
            break

        case "mak":
            callbacks.onOutput(state.carry ? "1" : "0")
            break

        case "pav":
            execPav(instr, state, data)
            break

        case "kur":
            execArithmetic(instr, state, (a, b) => a + b)
            break

        case "sur":
            execArithmetic(instr, state, (a, b) => a - b)
            break

        case "mur":
            execArithmetic(instr, state, (a, b) => a * b)
            break

        case "dur":
            execDur(instr, state)
            break

        case "rav":
            execJump(instr, state, labels, true)
            break

        case "rev":
            execJump(instr, state, labels, state.flagEqual)
            break

        case "rgv":
            execJump(instr, state, labels, state.flagGreater)
            break
    }
}

function getRegIndex(instr: GrundInstruction, operandIdx: number): number {
    const op = instr.operands[operandIdx]
    if (!op || op.kind !== "register") {
        throw new WeltError(
            `Expected register operand at position ${operandIdx}`,
            instr.line
        )
    }
    return op.index
}

function getValueOperand(
    instr: GrundInstruction,
    operandIdx: number,
    state: GrundState,
    data: Map<string, string>
): WeltValue {
    const op = instr.operands[operandIdx]
    if (!op) {
        throw new WeltError(
            `Missing operand at position ${operandIdx}`,
            instr.line
        )
    }

    switch (op.kind) {
        case "register":
            return state.registers[op.index]
        case "immediate":
            return op.value
        case "data": {
            const val = data.get(op.key)
            if (val === undefined) {
                throw new WeltError(
                    `Undefined data reference: ${op.key}`,
                    instr.line
                )
            }
            return val
        }
        case "label":
            throw new WeltError(
                `Cannot use label as value: ${op.name}`,
                instr.line
            )
    }
}

function execTar(
    instr: GrundInstruction,
    state: GrundState,
    data: Map<string, string>
): void {
    const dest = getRegIndex(instr, 0)
    const value = getValueOperand(instr, 1, state, data)
    if (typeof value === "number") {
        state.registers[dest] = wrapByte(value)
    } else {
        state.registers[dest] = value
    }
}

function execTin(instr: GrundInstruction, state: GrundState): void {
    const src = getRegIndex(instr, 0)
    const value = state.registers[src]

    const isOverflow = state.ringCount >= RING_SIZE

    if (isOverflow) {
        state.ringOverflowStreak++
        if (typeof document !== "undefined") {
            document.dispatchEvent(
                new CustomEvent("grund:ring-overflow", {
                    detail: { pointer: state.ringPointer },
                })
            )
            if (state.ringOverflowStreak >= RING_SIZE) {
                document.dispatchEvent(new CustomEvent("grund:ring-spin"))
            }
        }
    }

    state.ring[state.ringPointer] = value
    state.ringPointer = (state.ringPointer + 1) % RING_SIZE
    if (state.ringCount < RING_SIZE) {
        state.ringCount++
    }

    state.ringTotalPushes++
    if (
        state.ringTotalPushes >= RING_SIZE &&
        state.ringPointer === 0 &&
        typeof document !== "undefined"
    ) {
        document.dispatchEvent(new CustomEvent("grund:ring-cycle"))
    }
}

function execTab(instr: GrundInstruction, state: GrundState): void {
    const dest = getRegIndex(instr, 0)

    if (state.ringCount <= 0) {
        throw new WeltError("Ring buffer underflow: nothing to pop", instr.line)
    }

    state.ringPointer = (state.ringPointer - 1 + RING_SIZE) % RING_SIZE
    state.ringCount--
    state.registers[dest] = state.ring[state.ringPointer]
}

function execMav(
    instr: GrundInstruction,
    state: GrundState,
    callbacks: WeltCallbacks
): void {
    const src = getRegIndex(instr, 0)
    const val = state.registers[src]
    let text = String(val)

    if (text.length > 1 && text === state.lastOutput) {
        const dropIndex = (text.length - 1) % 5
        text = text.slice(0, dropIndex) + text.slice(dropIndex + 1)
        state.lastOutput = ""
    } else {
        state.lastOutput = text
    }

    callbacks.onOutput(text)
}

async function execVir(
    instr: GrundInstruction,
    state: GrundState,
    callbacks: WeltCallbacks
): Promise<void> {
    const dest = getRegIndex(instr, 0)
    const input = await callbacks.onInput()
    const num = Number(input)
    state.registers[dest] = isNaN(num) ? input : num
}

function execPav(
    instr: GrundInstruction,
    state: GrundState,
    data: Map<string, string>
): void {
    const leftVal = getValueOperand(instr, 0, state, data)
    const rightVal = getValueOperand(instr, 1, state, data)

    const left = typeof leftVal === "number" ? leftVal : Number(leftVal)
    const right = typeof rightVal === "number" ? rightVal : Number(rightVal)

    if (isNaN(left) || isNaN(right)) {
        state.flagEqual = leftVal === rightVal
        state.flagGreater = String(leftVal) > String(rightVal)
    } else {
        state.flagEqual = left === right
        state.flagGreater = left > right
    }
}

function execArithmetic(
    instr: GrundInstruction,
    state: GrundState,
    op: (a: number, b: number) => number
): void {
    const dest = getRegIndex(instr, 0)
    const leftVal = state.registers[getRegIndex(instr, 1)]
    const rightVal = state.registers[getRegIndex(instr, 2)]

    const left = typeof leftVal === "number" ? leftVal : Number(leftVal)
    const right = typeof rightVal === "number" ? rightVal : Number(rightVal)

    if (isNaN(left) || isNaN(right)) {
        throw new WeltError("Arithmetic on non-numeric values", instr.line)
    }

    let raw = op(left, right)

    if (state.carry) {
        raw += 1
    }

    state.carry = raw >= WORD_SIZE || raw < 0
    state.registers[dest] = wrapByte(raw)
}

function execDur(instr: GrundInstruction, state: GrundState): void {
    const dest = getRegIndex(instr, 0)
    const leftVal = state.registers[getRegIndex(instr, 1)]
    const rightVal = state.registers[getRegIndex(instr, 2)]

    const left = typeof leftVal === "number" ? leftVal : Number(leftVal)
    const right = typeof rightVal === "number" ? rightVal : Number(rightVal)

    if (isNaN(left) || isNaN(right)) {
        throw new WeltError("Arithmetic on non-numeric values", instr.line)
    }

    if (right === 0) {
        throw new WeltError("DIVISION BY ZERO: CRT flickering", instr.line)
    }

    let raw = Math.floor(left / right)

    if (state.carry) {
        raw += 1
    }

    state.carry = raw >= WORD_SIZE || raw < 0
    state.registers[dest] = wrapByte(raw)
}

function execJump(
    instr: GrundInstruction,
    state: GrundState,
    labels: Map<string, number>,
    condition: boolean
): void {
    if (!condition) return

    const op = instr.operands[0]
    if (!op || op.kind !== "label") {
        throw new WeltError("Jump requires a label operand", instr.line)
    }

    const target = labels.get(op.name)
    if (target === undefined) {
        throw new WeltError(`Undefined label: ${op.name}`, instr.line)
    }

    state.pc = target - 1
}
