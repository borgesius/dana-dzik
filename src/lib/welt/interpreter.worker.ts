/**
 * Web Worker that runs the Welt interpreter off the main thread.
 *
 * Message protocol:
 *   Main → Worker: { type: 'run', program, initialMemory? }
 *   Main → Worker: { type: 'input-response', text }
 *   Worker → Main: { type: 'output', text }
 *   Worker → Main: { type: 'input-request' }
 *   Worker → Main: { type: 'done', memory }
 *   Worker → Main: { type: 'error', message, line }
 */

import { interpret } from "./interpreter"
import type { Program, WeltCallbacks, WeltValue } from "./types"
import { WeltError } from "./types"

interface RunMessage {
    type: "run"
    program: Program
    initialMemory?: WeltValue[]
}

interface InputResponseMessage {
    type: "input-response"
    text: string
}

type IncomingMessage = RunMessage | InputResponseMessage

// Queue for pending input requests
let inputResolve: ((text: string) => void) | null = null

self.onmessage = (e: MessageEvent<IncomingMessage>): void => {
    const msg = e.data

    if (msg.type === "input-response") {
        if (inputResolve) {
            const resolve = inputResolve
            inputResolve = null
            resolve(msg.text)
        }
        return
    }

    if (msg.type === "run") {
        void runInterpreter(msg.program, msg.initialMemory)
    }
}

async function runInterpreter(
    program: Program,
    initialMemory?: WeltValue[]
): Promise<void> {
    const callbacks: WeltCallbacks = {
        onOutput(text: string): void {
            self.postMessage({ type: "output", text })
        },
        onInput(): Promise<string> {
            return new Promise<string>((resolve) => {
                inputResolve = resolve
                self.postMessage({ type: "input-request" })
            })
        },
    }

    try {
        const memory = await interpret(program, callbacks, initialMemory)
        self.postMessage({ type: "done", memory })
    } catch (err) {
        if (err instanceof WeltError) {
            self.postMessage({
                type: "error",
                message: err.message,
                line: err.line,
            })
        } else {
            self.postMessage({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Unknown interpreter error",
                line: 0,
            })
        }
    }
}
