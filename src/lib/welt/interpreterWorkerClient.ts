/**
 * Client wrapper for the Welt interpreter web worker.
 *
 * Bridges the callback protocol (onOutput, onInput) over postMessage.
 * Falls back to the direct `interpret()` call if workers are unavailable.
 */

import { interpret } from "./interpreter"
import {
    type Program,
    type WeltCallbacks,
    WeltError,
    type WeltValue,
} from "./types"

let worker: Worker | null = null
let workerFailed = false

function getWorker(): Worker | null {
    if (workerFailed) return null
    if (worker) return worker

    try {
        worker = new Worker(
            new URL("./interpreter.worker.ts", import.meta.url),
            { type: "module" }
        )
        return worker
    } catch {
        workerFailed = true
        return null
    }
}

interface WorkerOutputMessage {
    type: "output"
    text: string
}

interface WorkerInputRequestMessage {
    type: "input-request"
}

interface WorkerDoneMessage {
    type: "done"
    memory: WeltValue[]
}

interface WorkerErrorMessage {
    type: "error"
    message: string
    line: number
}

type WorkerMessage =
    | WorkerOutputMessage
    | WorkerInputRequestMessage
    | WorkerDoneMessage
    | WorkerErrorMessage

/**
 * Run a Welt program in a web worker, bridging onOutput/onInput callbacks
 * over the postMessage channel.
 *
 * Falls back to direct `interpret()` when workers are unavailable.
 */
export async function runWeltInWorker(
    program: Program,
    callbacks: WeltCallbacks,
    initialMemory?: WeltValue[]
): Promise<WeltValue[]> {
    const w = getWorker()

    if (!w) {
        // Synchronous fallback
        return interpret(program, callbacks, initialMemory)
    }

    return new Promise<WeltValue[]>((resolve, reject) => {
        const onMessage = (e: MessageEvent<WorkerMessage>): void => {
            const msg = e.data

            switch (msg.type) {
                case "output":
                    callbacks.onOutput(msg.text)
                    break

                case "input-request":
                    void callbacks.onInput().then((text) => {
                        w.postMessage({ type: "input-response", text })
                    })
                    break

                case "done":
                    cleanup()
                    resolve(msg.memory)
                    break

                case "error":
                    cleanup()
                    reject(new WeltError(msg.message, msg.line))
                    break
            }
        }

        const onError = (): void => {
            cleanup()
            // Fall back to synchronous execution on worker error
            interpret(program, callbacks, initialMemory)
                .then(resolve)
                .catch(reject)
        }

        const cleanup = (): void => {
            w.removeEventListener("message", onMessage)
            w.removeEventListener("error", onError)
        }

        w.addEventListener("message", onMessage)
        w.addEventListener("error", onError)
        w.postMessage({ type: "run", program, initialMemory })
    })
}
