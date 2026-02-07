import { emitAppEvent } from "../events"
import {
    type Expression,
    type Program,
    type Statement,
    type WeltCallbacks,
    WeltError,
    type WeltValue,
} from "./types"

const MAX_ITERATIONS = 1818
const WORD_SIZE = 256

interface InterpreterState {
    memory: WeltValue[]
    carry: boolean
    totalIterations: number
    lastOutput: string
}

function createInitialState(initialMemory?: WeltValue[]): InterpreterState {
    return {
        memory: initialMemory ? [...initialMemory] : [0, 0, 0, 4, 0, 0, 0, 97],
        carry: false,
        totalIterations: 0,
        lastOutput: "",
    }
}

function wrapByte(val: number): number {
    return ((val % WORD_SIZE) + WORD_SIZE) % WORD_SIZE
}

function wrapStore(val: WeltValue): WeltValue {
    if (typeof val === "number") {
        return wrapByte(val)
    }
    return val
}

export async function interpret(
    program: Program,
    callbacks: WeltCallbacks,
    initialMemory?: WeltValue[]
): Promise<WeltValue[]> {
    const state = createInitialState(initialMemory)
    const halted = await executeBlock(program.statements, state, callbacks)
    if (!halted) {
        callbacks.onOutput("Programm endete ohne Verneinung.")
    }
    return [...state.memory]
}

async function executeBlock(
    statements: Statement[],
    state: InterpreterState,
    callbacks: WeltCallbacks
): Promise<boolean> {
    for (const stmt of statements) {
        const halted = await executeStatement(stmt, state, callbacks)
        if (halted) return true
    }
    return false
}

async function executeStatement(
    stmt: Statement,
    state: InterpreterState,
    callbacks: WeltCallbacks
): Promise<boolean> {
    switch (stmt.kind) {
        case "halt":
            return true

        case "assign":
            state.memory[stmt.slot] = wrapStore(evaluate(stmt.expr, state))
            return false

        case "output": {
            const val = evaluate(stmt.expr, state)
            let text = String(val)

            if (text.length > 1 && text === state.lastOutput) {
                const dropIndex = (text.length - 1) % 5
                text = text.slice(0, dropIndex) + text.slice(dropIndex + 1)
                state.lastOutput = ""
            } else {
                state.lastOutput = text
            }

            callbacks.onOutput(text)
            return false
        }

        case "input": {
            const input = await callbacks.onInput()
            const num = Number(input)
            state.memory[stmt.slot] = wrapStore(isNaN(num) ? input : num)
            return false
        }

        case "if": {
            const condition = evaluate(stmt.condition, state)
            if (isTruthy(condition)) {
                return await executeBlock(stmt.body, state, callbacks)
            } else if (stmt.elseBody.length > 0) {
                return await executeBlock(stmt.elseBody, state, callbacks)
            }
            return false
        }

        case "while": {
            let iterations = 0
            while (isTruthy(evaluate(stmt.condition, state))) {
                iterations++
                state.totalIterations++

                if (state.totalIterations === 1024) {
                    callbacks.onOutput("...")
                } else if (state.totalIterations === 4096) {
                    callbacks.onOutput("Alles Leben ist Leiden.")
                    if (typeof document !== "undefined") {
                        emitAppEvent("welt:error", { type: "suffering" })
                    }
                }

                if (iterations > MAX_ITERATIONS) {
                    throw new WeltError(
                        "SYSTEM OVERHEAT: Loop exceeded maximum iterations",
                        0
                    )
                }
                const halted = await executeBlock(stmt.body, state, callbacks)
                if (halted) return true
            }
            return false
        }
    }
}

function evaluate(expr: Expression, state: InterpreterState): WeltValue {
    switch (expr.kind) {
        case "number":
            return expr.value

        case "string":
            return expr.value

        case "slot":
            return state.memory[expr.index]

        case "binary":
            return evaluateBinary(expr.op, expr.left, expr.right, state)
    }
}

function evaluateBinary(
    op: string,
    left: Expression,
    right: Expression,
    state: InterpreterState
): WeltValue {
    const lval = evaluate(left, state)
    const rval = evaluate(right, state)

    if (op === "+") {
        if (typeof lval === "string" || typeof rval === "string") {
            return String(lval) + String(rval)
        }
    }

    if (op === "=") return lval === rval ? 1 : 0
    if (op === "!=") return lval !== rval ? 1 : 0

    const lnum = toNumber(lval)
    const rnum = toNumber(rval)

    switch (op) {
        case ">":
            return lnum > rnum ? 1 : 0
        case "<":
            return lnum < rnum ? 1 : 0
        case ">=":
            return lnum >= rnum ? 1 : 0
        case "<=":
            return lnum <= rnum ? 1 : 0
    }

    let raw: number
    switch (op) {
        case "+":
            raw = lnum + rnum
            break
        case "-":
            raw = lnum - rnum
            break
        case "*":
            raw = lnum * rnum
            break
        case "/":
            if (rnum === 0) {
                throw new WeltError("DIVISION BY ZERO: CRT flickering", 0)
            }
            raw = Math.floor(lnum / rnum)
            break
        case "MOD":
            if (rnum === 0) {
                throw new WeltError("MODULO BY ZERO: Faint smell of smoke", 0)
            }
            raw = lnum % rnum
            break
        default:
            throw new WeltError(`Unknown operator: ${op}`, 0)
    }

    if (state.carry) {
        raw += 1
    }

    state.carry = raw >= WORD_SIZE || raw < 0

    return wrapByte(raw)
}

function toNumber(val: WeltValue): number {
    if (typeof val === "number") return val
    const n = Number(val)
    if (isNaN(n)) {
        throw new WeltError(
            `Cannot use "${val}" as a number -- DING contains non-numeric data`,
            0
        )
    }
    return n
}

function isTruthy(val: WeltValue): boolean {
    if (typeof val === "number") return val !== 0
    return val.length > 0
}
