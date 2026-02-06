import {
    type Expression,
    type Program,
    type Statement,
    type Token,
    TokenType,
    WeltError,
} from "./types"

export function parse(tokens: Token[]): Program {
    const parser = new Parser(tokens)
    return parser.parse()
}

class Parser {
    private tokens: Token[]
    private pos: number = 0

    constructor(tokens: Token[]) {
        this.tokens = tokens
    }

    public parse(): Program {
        this.skipNewlines()
        this.expect(TokenType.ERWACHE, "Program must begin with ERWACHE")
        this.skipNewlines()

        const statements = this.parseBlock()
        return { statements }
    }

    private parseBlock(until?: TokenType): Statement[] {
        const stmts: Statement[] = []

        while (!this.isAtEnd()) {
            this.skipNewlines()
            if (this.isAtEnd()) break

            if (until && this.check(until)) break

            if (this.check(TokenType.SONST)) break

            const stmt = this.parseStatement()
            if (stmt) {
                stmts.push(stmt)
                if (stmt.kind === "halt") break
            }
        }

        return stmts
    }

    private parseStatement(): Statement | null {
        this.skipNewlines()
        if (this.isAtEnd()) return null

        if (this.check(TokenType.VERNEINUNG)) {
            this.advance()
            return { kind: "halt" }
        }

        if (this.check(TokenType.DING)) {
            return this.parseAssign()
        }

        if (this.check(TokenType.VORSTELLUNG)) {
            return this.parseOutput()
        }

        if (this.check(TokenType.WILLE)) {
            return this.parseInput()
        }

        if (this.check(TokenType.WENN)) {
            return this.parseIf()
        }

        if (this.check(TokenType.SOLANGE)) {
            return this.parseWhile()
        }

        throw new WeltError(
            `Unexpected token: ${this.peek().value}`,
            this.peek().line
        )
    }

    private parseAssign(): Statement {
        this.expect(TokenType.DING, "Expected DING")
        const slotToken = this.expect(
            TokenType.NUMBER,
            "Expected slot number after DING"
        )
        const slot = parseInt(slotToken.value, 10)

        if (slot < 0 || slot > 7) {
            throw new WeltError(
                `DING slot must be 0-7, got ${slot}`,
                slotToken.line
            )
        }

        this.expect(TokenType.IST, "Expected '=' after DING slot")
        const expr = this.parseExpression()

        return { kind: "assign", slot, expr }
    }

    private parseOutput(): Statement {
        this.expect(TokenType.VORSTELLUNG, "Expected VORSTELLUNG")
        const expr = this.parseExpression()
        return { kind: "output", expr }
    }

    private parseInput(): Statement {
        this.expect(TokenType.WILLE, "Expected WILLE")
        const slotToken = this.expect(
            TokenType.NUMBER,
            "Expected slot number after WILLE"
        )
        const slot = parseInt(slotToken.value, 10)

        if (slot < 0 || slot > 7) {
            throw new WeltError(
                `DING slot must be 0-7, got ${slot}`,
                slotToken.line
            )
        }

        return { kind: "input", slot }
    }

    private parseIf(): Statement {
        this.expect(TokenType.WENN, "Expected WENN")
        const condition = this.parseExpression()
        this.expect(TokenType.DANN, "Expected DANN after condition")
        this.skipNewlines()

        const body = this.parseBlock(TokenType.ENDE)
        let elseBody: Statement[] = []

        this.skipNewlines()
        if (this.check(TokenType.SONST)) {
            this.advance()
            this.skipNewlines()
            elseBody = this.parseBlock(TokenType.ENDE)
        }

        this.skipNewlines()
        this.expect(TokenType.ENDE, "Expected ENDE to close WENN block")

        return { kind: "if", condition, body, elseBody }
    }

    private parseWhile(): Statement {
        this.expect(TokenType.SOLANGE, "Expected SOLANGE")
        const condition = this.parseExpression()
        this.skipNewlines()

        const body = this.parseBlock(TokenType.ENDE)

        this.skipNewlines()
        this.expect(TokenType.ENDE, "Expected ENDE to close SOLANGE block")

        return { kind: "while", condition, body }
    }

    private parseExpression(): Expression {
        return this.parseComparison()
    }

    private parseComparison(): Expression {
        let left = this.parseAddSub()

        while (
            this.check(TokenType.IST) ||
            this.check(TokenType.NICHT_GLEICH) ||
            this.check(TokenType.GROESSER) ||
            this.check(TokenType.KLEINER) ||
            this.check(TokenType.GROESSER_GLEICH) ||
            this.check(TokenType.KLEINER_GLEICH)
        ) {
            const opToken = this.advance()
            const op = opToken.value as "=" | "!=" | ">" | "<" | ">=" | "<="
            const right = this.parseAddSub()
            left = { kind: "binary", op, left, right }
        }

        return left
    }

    private parseAddSub(): Expression {
        let left = this.parseMulDiv()

        while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
            const opToken = this.advance()
            const op = opToken.value as "+" | "-"
            const right = this.parseMulDiv()
            left = { kind: "binary", op, left, right }
        }

        return left
    }

    private parseMulDiv(): Expression {
        let left = this.parsePrimary()

        while (
            this.check(TokenType.MAL) ||
            this.check(TokenType.TEIL) ||
            this.check(TokenType.MOD)
        ) {
            const opToken = this.advance()
            const op =
                opToken.value === "MOD" ? "MOD" : (opToken.value as "*" | "/")
            const right = this.parsePrimary()
            left = { kind: "binary", op, left, right }
        }

        return left
    }

    private parsePrimary(): Expression {
        if (this.check(TokenType.NUMBER)) {
            const token = this.advance()
            return { kind: "number", value: parseInt(token.value, 10) }
        }

        if (this.check(TokenType.STRING)) {
            const token = this.advance()
            return { kind: "string", value: token.value }
        }

        if (this.check(TokenType.DING)) {
            this.advance()
            const slotToken = this.expect(
                TokenType.NUMBER,
                "Expected slot number after DING"
            )
            const index = parseInt(slotToken.value, 10)
            if (index < 0 || index > 7) {
                throw new WeltError(
                    `DING slot must be 0-7, got ${index}`,
                    slotToken.line
                )
            }
            return { kind: "slot", index }
        }

        throw new WeltError(
            `Expected expression, got: ${this.peek().value || this.peek().type}`,
            this.peek().line
        )
    }

    private peek(): Token {
        return this.tokens[this.pos]
    }

    private check(type: TokenType): boolean {
        return this.peek().type === type
    }

    private advance(): Token {
        const token = this.tokens[this.pos]
        this.pos++
        return token
    }

    private expect(type: TokenType, message: string): Token {
        if (!this.check(type)) {
            throw new WeltError(message, this.peek().line)
        }
        return this.advance()
    }

    private skipNewlines(): void {
        while (this.pos < this.tokens.length && this.check(TokenType.NEWLINE)) {
            this.advance()
        }
    }

    private isAtEnd(): boolean {
        return this.pos >= this.tokens.length || this.check(TokenType.EOF)
    }
}
