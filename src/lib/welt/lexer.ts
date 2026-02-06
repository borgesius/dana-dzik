import { type Token, TokenType, WeltError } from "./types"

const KEYWORDS: Record<string, TokenType> = {
    ERWACHE: TokenType.ERWACHE,
    VERNEINUNG: TokenType.VERNEINUNG,
    DING: TokenType.DING,
    VORSTELLUNG: TokenType.VORSTELLUNG,
    WILLE: TokenType.WILLE,
    WENN: TokenType.WENN,
    DANN: TokenType.DANN,
    SONST: TokenType.SONST,
    SOLANGE: TokenType.SOLANGE,
    ENDE: TokenType.ENDE,
    MOD: TokenType.MOD,
}

const TWO_CHAR_OPERATORS: Record<string, TokenType> = {
    "!=": TokenType.NICHT_GLEICH,
    ">=": TokenType.GROESSER_GLEICH,
    "<=": TokenType.KLEINER_GLEICH,
}

const SINGLE_CHAR_OPERATORS: Record<string, TokenType> = {
    "=": TokenType.IST,
    ">": TokenType.GROESSER,
    "<": TokenType.KLEINER,
    "+": TokenType.PLUS,
    "-": TokenType.MINUS,
    "*": TokenType.MAL,
    "/": TokenType.TEIL,
}

export function tokenize(source: string): Token[] {
    const tokens: Token[] = []
    const lines = source.split("\n")

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = stripComment(lines[lineNum])
        let pos = 0

        while (pos < line.length) {
            if (line[pos] === " " || line[pos] === "\t") {
                pos++
                continue
            }

            if (line[pos] === '"') {
                const result = readString(line, pos, lineNum + 1)
                tokens.push(result.token)
                pos = result.nextPos
                continue
            }

            const twoChar = line.slice(pos, pos + 2)
            if (TWO_CHAR_OPERATORS[twoChar]) {
                tokens.push({
                    type: TWO_CHAR_OPERATORS[twoChar],
                    value: twoChar,
                    line: lineNum + 1,
                })
                pos += 2
                continue
            }

            if (SINGLE_CHAR_OPERATORS[line[pos]]) {
                tokens.push({
                    type: SINGLE_CHAR_OPERATORS[line[pos]],
                    value: line[pos],
                    line: lineNum + 1,
                })
                pos++
                continue
            }

            if (isDigit(line[pos])) {
                const result = readNumber(line, pos, lineNum + 1)
                tokens.push(result.token)
                pos = result.nextPos
                continue
            }

            if (isAlpha(line[pos])) {
                const result = readWord(line, pos, lineNum + 1)
                tokens.push(result.token)
                pos = result.nextPos
                continue
            }

            throw new WeltError(
                `Unexpected character: '${line[pos]}'`,
                lineNum + 1
            )
        }

        if (
            tokens.length > 0 &&
            tokens[tokens.length - 1].type !== TokenType.NEWLINE
        ) {
            tokens.push({
                type: TokenType.NEWLINE,
                value: "\\n",
                line: lineNum + 1,
            })
        }
    }

    tokens.push({ type: TokenType.EOF, value: "", line: lines.length })
    return tokens
}

function stripComment(line: string): string {
    let inString = false
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inString = !inString
        } else if (line[i] === ";" && !inString) {
            return line.slice(0, i)
        }
    }
    return line
}

function readString(
    line: string,
    start: number,
    lineNum: number
): { token: Token; nextPos: number } {
    let pos = start + 1
    let value = ""

    while (pos < line.length && line[pos] !== '"') {
        if (line[pos] === "\\" && pos + 1 < line.length) {
            pos++
            if (line[pos] === "n") {
                value += "\n"
            } else if (line[pos] === "t") {
                value += "\t"
            } else if (line[pos] === '"') {
                value += '"'
            } else if (line[pos] === "\\") {
                value += "\\"
            } else {
                value += line[pos]
            }
        } else {
            value += line[pos]
        }
        pos++
    }

    if (pos >= line.length) {
        throw new WeltError("Unterminated string", lineNum)
    }

    return {
        token: { type: TokenType.STRING, value, line: lineNum },
        nextPos: pos + 1,
    }
}

function readNumber(
    line: string,
    start: number,
    lineNum: number
): { token: Token; nextPos: number } {
    let pos = start
    while (pos < line.length && isDigit(line[pos])) {
        pos++
    }
    return {
        token: {
            type: TokenType.NUMBER,
            value: line.slice(start, pos),
            line: lineNum,
        },
        nextPos: pos,
    }
}

function readWord(
    line: string,
    start: number,
    lineNum: number
): { token: Token; nextPos: number } {
    let pos = start
    while (pos < line.length && (isAlpha(line[pos]) || isDigit(line[pos]))) {
        pos++
    }
    const word = line.slice(start, pos)
    const upper = word.toUpperCase()
    const type = KEYWORDS[upper] ?? TokenType.STRING

    return {
        token: {
            type,
            value: type === TokenType.STRING ? word : upper,
            line: lineNum,
        },
        nextPos: pos,
    }
}

function isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9"
}

function isAlpha(ch: string): boolean {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_"
}
