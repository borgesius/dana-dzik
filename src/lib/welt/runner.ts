import { compileProgram } from "./compiler"
import { interpretGrund } from "./grundInterpreter"
import { parseGrund } from "./grundParser"
import { interpret } from "./interpreter"
import { runWeltInWorker } from "./interpreterWorkerClient"
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
    return runWeltInWorker(program, callbacks, initialMemory)
}

export function compileWeltProgram(
    source: string,
    sourceName?: string
): string {
    const tokens = tokenize(source)
    const program = parse(tokens)
    return compileProgram(program, sourceName)
}

export async function runGrundProgram(
    source: string,
    callbacks: WeltCallbacks,
    initialMemory?: WeltValue[]
): Promise<WeltValue[]> {
    const program = parseGrund(source)
    return interpretGrund(program, callbacks, initialMemory)
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
