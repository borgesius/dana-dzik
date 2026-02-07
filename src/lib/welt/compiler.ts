import type { BinaryExpression, Expression, Program, Statement } from "./types"

const SCRATCH_REG = 7
const SCRATCH_REG2 = 6

interface CompilerState {
    lines: string[]
    dataEntries: Map<string, string>
    labelCounter: number
    dataCounter: number
}

function createState(): CompilerState {
    return {
        lines: [],
        dataEntries: new Map(),
        labelCounter: 0,
        dataCounter: 0,
    }
}

function nextLabel(state: CompilerState): string {
    return `.L${state.labelCounter++}`
}

function addData(state: CompilerState, value: string): string {
    for (const [key, existing] of state.dataEntries) {
        if (existing === value) return key
    }
    const key = `s${state.dataCounter++}`
    state.dataEntries.set(key, value)
    return key
}

function emit(state: CompilerState, line: string): void {
    state.lines.push(line)
}

function emitLabel(state: CompilerState, label: string): void {
    state.lines.push(`${label}:`)
}

function pad(instr: string): string {
    return `  ${instr.padEnd(24)}`
}

export function compileProgram(program: Program, sourceName?: string): string {
    const state = createState()

    for (const stmt of program.statements) {
        compileStatement(stmt, state)
    }

    const header = [
        `; === GRUND (DAS-8 Q4) ===`,
        sourceName ? `; source: ${sourceName}` : null,
        `; compiled by welt 0.3.1`,
        ``,
    ]
        .filter((l) => l !== null)
        .join("\n")

    const dataSection = buildDataSection(state)
    const codeSection = state.lines.join("\n")

    return `${header}\n${dataSection}\n.code\n${codeSection}\n`
}

function buildDataSection(state: CompilerState): string {
    if (state.dataEntries.size === 0) {
        return ".data"
    }
    const entries: string[] = [".data"]
    for (const [key, value] of state.dataEntries) {
        const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        entries.push(`  ${key}: "${escaped}"`)
    }
    return entries.join("\n")
}

function compileStatement(stmt: Statement, state: CompilerState): void {
    switch (stmt.kind) {
        case "halt":
            emit(state, `${pad("nov")}; VERNEINUNG`)
            break

        case "assign":
            compileAssign(stmt.slot, stmt.expr, state)
            break

        case "output":
            compileOutput(stmt.expr, state)
            break

        case "input":
            emit(state, `${pad(`vir  r${stmt.slot}`)}; WILLE ${stmt.slot}`)
            break

        case "if":
            compileIf(stmt.condition, stmt.body, stmt.elseBody, state)
            break

        case "while":
            compileWhile(stmt.condition, stmt.body, state)
            break
    }
}

function compileAssign(
    slot: number,
    expr: Expression,
    state: CompilerState
): void {
    const comment = `; DING ${slot} = ${exprToString(expr)}`

    switch (expr.kind) {
        case "number":
            emit(state, `${pad(`tar  r${slot}, ${expr.value}`)}${comment}`)
            break

        case "string": {
            const ref = addData(state, expr.value)
            emit(state, `${pad(`tar  r${slot}, ${ref}`)}${comment}`)
            break
        }

        case "slot":
            emit(state, `${pad(`tar  r${slot}, r${expr.index}`)}${comment}`)
            break

        case "binary":
            compileArithmeticExpr(expr, slot, state)
            emit(state, `${pad("")}${comment}`)
            break
    }
}

function compileArithmeticExpr(
    expr: BinaryExpression,
    destReg: number,
    state: CompilerState
): void {
    const leftReg = resolveOperand(expr.left, SCRATCH_REG, state)
    const needsRingForRight =
        leftReg === SCRATCH_REG && !isSimpleOperand(expr.right)
    if (needsRingForRight) {
        emit(state, pad(`tin  r${SCRATCH_REG}`))
    }
    const rightReg = resolveOperand(
        expr.right,
        needsRingForRight ? SCRATCH_REG : SCRATCH_REG2,
        state
    )
    if (needsRingForRight) {
        emit(state, pad(`tab  r${SCRATCH_REG}`))
    }

    if (expr.op === "+" && isStringExpr(expr.left)) {
        const leftRef = resolveStringOperand(expr.left, state)
        const rightRef = resolveStringOperand(expr.right, state)
        if (leftRef !== null && rightRef !== null) {
            emit(state, pad(`tar  r${destReg}, ${leftRef}`))
            return
        }
    }

    const op = expr.op
    switch (op) {
        case "+":
            emit(state, pad(`kur  r${destReg}, r${leftReg}, r${rightReg}`))
            break
        case "-":
            emit(state, pad(`sur  r${destReg}, r${leftReg}, r${rightReg}`))
            break
        case "*":
            emit(state, pad(`mur  r${destReg}, r${leftReg}, r${rightReg}`))
            break
        case "/":
            emit(state, pad(`dur  r${destReg}, r${leftReg}, r${rightReg}`))
            break
        case "MOD":
            compileModulo(destReg, leftReg, rightReg, state)
            break
        case "=":
        case "!=":
        case ">":
        case "<":
        case ">=":
        case "<=":
            compileComparison(op, destReg, leftReg, rightReg, state)
            break
    }
}

function compileModulo(
    dest: number,
    leftReg: number,
    rightReg: number,
    state: CompilerState
): void {
    const tmpReg = dest === SCRATCH_REG ? SCRATCH_REG2 : SCRATCH_REG
    emit(state, pad(`dur  r${tmpReg}, r${leftReg}, r${rightReg}`))
    emit(state, pad(`mur  r${tmpReg}, r${tmpReg}, r${rightReg}`))
    emit(state, pad(`sur  r${dest}, r${leftReg}, r${tmpReg}`))
}

function compileComparison(
    op: string,
    dest: number,
    leftReg: number,
    rightReg: number,
    state: CompilerState
): void {
    const trueLabel = nextLabel(state)
    const endLabel = nextLabel(state)

    emit(state, pad(`tar  r${dest}, 1`))

    switch (op) {
        case "=":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rev  ${trueLabel}`))
            break
        case "!=":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rev  ${trueLabel}`))
            emit(state, pad(`rav  ${endLabel}`))
            emitLabel(state, trueLabel)
            emit(state, pad(`tar  r${dest}, 0`))
            emitLabel(state, endLabel)
            return
        case ">":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rgv  ${trueLabel}`))
            break
        case "<":
            emit(state, pad(`pav  r${rightReg}, r${leftReg}`))
            emit(state, pad(`rgv  ${trueLabel}`))
            break
        case ">=":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rgv  ${trueLabel}`))
            emit(state, pad(`rev  ${trueLabel}`))
            break
        case "<=":
            emit(state, pad(`pav  r${rightReg}, r${leftReg}`))
            emit(state, pad(`rgv  ${trueLabel}`))
            emit(state, pad(`rev  ${trueLabel}`))
            break
    }

    emit(state, pad(`tar  r${dest}, 0`))
    emitLabel(state, trueLabel)
}

function compileOutput(expr: Expression, state: CompilerState): void {
    const comment = `; VORSTELLUNG ${exprToString(expr)}`

    switch (expr.kind) {
        case "number":
            emit(state, pad(`tar  r${SCRATCH_REG}, ${expr.value}`))
            emit(state, `${pad(`mav  r${SCRATCH_REG}`)}${comment}`)
            break

        case "string": {
            const ref = addData(state, expr.value)
            emit(state, pad(`tar  r${SCRATCH_REG}, ${ref}`))
            emit(state, `${pad(`mav  r${SCRATCH_REG}`)}${comment}`)
            break
        }

        case "slot":
            emit(state, `${pad(`mav  r${expr.index}`)}${comment}`)
            break

        case "binary":
            compileArithmeticExpr(expr, SCRATCH_REG, state)
            emit(state, `${pad(`mav  r${SCRATCH_REG}`)}${comment}`)
            break
    }
}

function compileIf(
    condition: Expression,
    body: Statement[],
    elseBody: Statement[],
    state: CompilerState
): void {
    const elseLabel = nextLabel(state)
    const endLabel = elseBody.length > 0 ? nextLabel(state) : elseLabel

    compileConditionBranch(condition, elseLabel, state)

    for (const stmt of body) {
        compileStatement(stmt, state)
    }

    if (elseBody.length > 0) {
        emit(state, pad(`rav  ${endLabel}`))
        emitLabel(state, elseLabel)
        for (const stmt of elseBody) {
            compileStatement(stmt, state)
        }
        emitLabel(state, endLabel)
    } else {
        emitLabel(state, elseLabel)
    }
}

function compileWhile(
    condition: Expression,
    body: Statement[],
    state: CompilerState
): void {
    const loopLabel = nextLabel(state)
    const endLabel = nextLabel(state)

    emitLabel(state, loopLabel)
    compileConditionBranch(condition, endLabel, state)

    for (const stmt of body) {
        compileStatement(stmt, state)
    }

    emit(state, pad(`rav  ${loopLabel}`))
    emitLabel(state, endLabel)
}

function compileConditionBranch(
    condition: Expression,
    falseLabel: string,
    state: CompilerState
): void {
    if (condition.kind !== "binary") {
        const reg = resolveOperand(condition, SCRATCH_REG, state)
        emit(state, pad(`pav  r${reg}, 0`))
        emit(state, pad(`rev  ${falseLabel}`))
        return
    }

    const leftReg = resolveOperand(condition.left, SCRATCH_REG, state)
    const rightReg = resolveOperand(condition.right, SCRATCH_REG2, state)

    switch (condition.op) {
        case "=":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rev  ${falseLabel}`))
            emit(state, pad(`rav  ${falseLabel}`))
            state.lines.pop()
            {
                const skipLabel = nextLabel(state)
                emit(state, pad(`rev  ${skipLabel}`))
                emit(state, pad(`rav  ${falseLabel}`))
                emitLabel(state, skipLabel)
            }
            break

        case "!=":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rev  ${falseLabel}`))
            break

        case ">":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            {
                const skipLabel = nextLabel(state)
                emit(state, pad(`rgv  ${skipLabel}`))
                emit(state, pad(`rav  ${falseLabel}`))
                emitLabel(state, skipLabel)
            }
            break

        case "<":
            emit(state, pad(`pav  r${rightReg}, r${leftReg}`))
            {
                const skipLabel = nextLabel(state)
                emit(state, pad(`rgv  ${skipLabel}`))
                emit(state, pad(`rav  ${falseLabel}`))
                emitLabel(state, skipLabel)
            }
            break

        case ">=":
            emit(state, pad(`pav  r${rightReg}, r${leftReg}`))
            emit(state, pad(`rgv  ${falseLabel}`))
            break

        case "<=":
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rgv  ${falseLabel}`))
            break

        default:
            emit(state, pad(`pav  r${leftReg}, r${rightReg}`))
            emit(state, pad(`rev  ${falseLabel}`))
            break
    }
}

function resolveOperand(
    expr: Expression,
    targetReg: number,
    state: CompilerState
): number {
    switch (expr.kind) {
        case "slot":
            return expr.index
        case "number":
            emit(state, pad(`tar  r${targetReg}, ${expr.value}`))
            return targetReg
        case "string": {
            const ref = addData(state, expr.value)
            emit(state, pad(`tar  r${targetReg}, ${ref}`))
            return targetReg
        }
        case "binary":
            compileArithmeticExpr(expr, targetReg, state)
            return targetReg
    }
}

function isSimpleOperand(expr: Expression): boolean {
    return expr.kind === "slot" || expr.kind === "number"
}

function isStringExpr(expr: Expression): boolean {
    return expr.kind === "string"
}

function resolveStringOperand(
    _expr: Expression,
    _state: CompilerState
): string | null {
    return null
}

function exprToString(expr: Expression): string {
    switch (expr.kind) {
        case "number":
            return String(expr.value)
        case "string":
            return `"${expr.value}"`
        case "slot":
            return `DING ${expr.index}`
        case "binary":
            return `${exprToString(expr.left)} ${expr.op} ${exprToString(expr.right)}`
    }
}
