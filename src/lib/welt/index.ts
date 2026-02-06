import { interpret } from "./interpreter"
import { tokenize } from "./lexer"
import { parse } from "./parser"
import type { WeltCallbacks } from "./types"

export { WeltError } from "./types"

export async function runWeltProgram(
    source: string,
    callbacks: WeltCallbacks
): Promise<void> {
    const tokens = tokenize(source)
    const program = parse(tokens)
    await interpret(program, callbacks)
}
