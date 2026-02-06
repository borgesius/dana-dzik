export enum TokenType {
    ERWACHE = "ERWACHE",
    VERNEINUNG = "VERNEINUNG",
    DING = "DING",
    VORSTELLUNG = "VORSTELLUNG",
    WILLE = "WILLE",
    WENN = "WENN",
    DANN = "DANN",
    SONST = "SONST",
    SOLANGE = "SOLANGE",
    ENDE = "ENDE",
    IST = "=",
    NICHT_GLEICH = "!=",
    GROESSER = ">",
    KLEINER = "<",
    GROESSER_GLEICH = ">=",
    KLEINER_GLEICH = "<=",
    PLUS = "+",
    MINUS = "-",
    MAL = "*",
    TEIL = "/",
    MOD = "MOD",
    NUMBER = "NUMBER",
    STRING = "STRING",
    NEWLINE = "NEWLINE",
    EOF = "EOF",
}

export interface Token {
    type: TokenType
    value: string
    line: number
}

export type WeltValue = number | string

export interface AssignStatement {
    kind: "assign"
    slot: number
    expr: Expression
}

export interface OutputStatement {
    kind: "output"
    expr: Expression
}

export interface InputStatement {
    kind: "input"
    slot: number
}

export interface IfStatement {
    kind: "if"
    condition: Expression
    body: Statement[]
    elseBody: Statement[]
}

export interface WhileStatement {
    kind: "while"
    condition: Expression
    body: Statement[]
}

export interface HaltStatement {
    kind: "halt"
}

export type Statement =
    | AssignStatement
    | OutputStatement
    | InputStatement
    | IfStatement
    | WhileStatement
    | HaltStatement

export interface NumberLiteral {
    kind: "number"
    value: number
}

export interface StringLiteral {
    kind: "string"
    value: string
}

export interface SlotReference {
    kind: "slot"
    index: number
}

export interface BinaryExpression {
    kind: "binary"
    op: "+" | "-" | "*" | "/" | "MOD" | "=" | "!=" | ">" | "<" | ">=" | "<="
    left: Expression
    right: Expression
}

export type Expression =
    | NumberLiteral
    | StringLiteral
    | SlotReference
    | BinaryExpression

export interface Program {
    statements: Statement[]
}

export interface WeltCallbacks {
    onOutput: (text: string) => void
    onInput: () => Promise<string>
}

export class WeltError extends Error {
    public readonly line: number

    constructor(message: string, line: number) {
        super(message)
        this.name = "WeltError"
        this.line = line
    }
}
