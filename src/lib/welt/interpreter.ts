import {
    type Expression,
    type Program,
    type Statement,
    type WeltCallbacks,
    WeltError,
    type WeltValue,
} from "./types"

const MAX_ITERATIONS = 10000

export async function interpret(
    program: Program,
    callbacks: WeltCallbacks
): Promise<void> {
    const memory: WeltValue[] = new Array<WeltValue>(8).fill(0)
    await executeBlock(program.statements, memory, callbacks)
}

async function executeBlock(
    statements: Statement[],
    memory: WeltValue[],
    callbacks: WeltCallbacks
): Promise<boolean> {
    for (const stmt of statements) {
        const halted = await executeStatement(stmt, memory, callbacks)
        if (halted) return true
    }
    return false
}

async function executeStatement(
    stmt: Statement,
    memory: WeltValue[],
    callbacks: WeltCallbacks
): Promise<boolean> {
    switch (stmt.kind) {
        case "halt":
            return true

        case "assign":
            memory[stmt.slot] = evaluate(stmt.expr, memory)
            return false

        case "output": {
            const val = evaluate(stmt.expr, memory)
            callbacks.onOutput(String(val))
            return false
        }

        case "input": {
            const input = await callbacks.onInput()
            const num = Number(input)
            memory[stmt.slot] = isNaN(num) ? input : num
            return false
        }

        case "if": {
            const condition = evaluate(stmt.condition, memory)
            if (isTruthy(condition)) {
                return await executeBlock(stmt.body, memory, callbacks)
            } else if (stmt.elseBody.length > 0) {
                return await executeBlock(stmt.elseBody, memory, callbacks)
            }
            return false
        }

        case "while": {
            let iterations = 0
            while (isTruthy(evaluate(stmt.condition, memory))) {
                iterations++
                if (iterations > MAX_ITERATIONS) {
                    throw new WeltError(
                        "SYSTEM OVERHEAT: Loop exceeded maximum iterations",
                        0
                    )
                }
                const halted = await executeBlock(stmt.body, memory, callbacks)
                if (halted) return true
            }
            return false
        }
    }
}

function evaluate(expr: Expression, memory: WeltValue[]): WeltValue {
    switch (expr.kind) {
        case "number":
            return expr.value

        case "string":
            return expr.value

        case "slot":
            return memory[expr.index]

        case "binary":
            return evaluateBinary(expr.op, expr.left, expr.right, memory)
    }
}

function evaluateBinary(
    op: string,
    left: Expression,
    right: Expression,
    memory: WeltValue[]
): WeltValue {
    const lval = evaluate(left, memory)
    const rval = evaluate(right, memory)

    if (op === "+") {
        if (typeof lval === "string" || typeof rval === "string") {
            return String(lval) + String(rval)
        }
        return lval + rval
    }

    if (op === "=") return lval === rval ? 1 : 0
    if (op === "!=") return lval !== rval ? 1 : 0

    const lnum = toNumber(lval)
    const rnum = toNumber(rval)

    switch (op) {
        case "-":
            return lnum - rnum
        case "*":
            return lnum * rnum
        case "/":
            if (rnum === 0) {
                throw new WeltError("DIVISION BY ZERO: CRT flickering", 0)
            }
            return Math.floor(lnum / rnum)
        case "MOD":
            if (rnum === 0) {
                throw new WeltError("MODULO BY ZERO: Faint smell of smoke", 0)
            }
            return lnum % rnum
        case ">":
            return lnum > rnum ? 1 : 0
        case "<":
            return lnum < rnum ? 1 : 0
        case ">=":
            return lnum >= rnum ? 1 : 0
        case "<=":
            return lnum <= rnum ? 1 : 0
        default:
            throw new WeltError(`Unknown operator: ${op}`, 0)
    }
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
