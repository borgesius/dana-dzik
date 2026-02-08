import { interpret } from "./interpreter"
import { tokenize } from "./lexer"
import { parse } from "./parser"
import type { WeltCallbacks, WeltValue } from "./types"

export { WeltError } from "./types"

export async function runWeltProgram(
    source: string,
    callbacks: WeltCallbacks,
    initialMemory?: WeltValue[]
): Promise<WeltValue[]> {
    const tokens = tokenize(source)
    const program = parse(tokens)
    return interpret(program, callbacks, initialMemory)
}

export async function getInitialMemory(
    memoryWeltContent: string
): Promise<WeltValue[]> {
    const tokens = tokenize(memoryWeltContent)
    const program = parse(tokens)
    const noop: WeltCallbacks = {
        onOutput: () => {},
        onInput: () => Promise.resolve(""),
    }
    return interpret(program, noop)
}
