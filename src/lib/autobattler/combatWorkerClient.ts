/**
 * Client wrapper for the autobattler combat web worker.
 *
 * Provides `resolveCombatAsync()` which offloads combat resolution to a
 * separate thread. Falls back to the synchronous `resolveCombat()` when
 * workers are unavailable.
 */

import { resolveCombat } from "./combat"
import type { CombatResult, CombatUnit } from "./types"

let worker: Worker | null = null
let workerFailed = false

function getWorker(): Worker | null {
    if (workerFailed) return null
    if (worker) return worker

    try {
        worker = new Worker(
            new URL("./combat.worker.ts", import.meta.url),
            { type: "module" }
        )
        return worker
    } catch {
        workerFailed = true
        return null
    }
}

/**
 * Resolve combat asynchronously using a web worker.
 * Falls back to synchronous `resolveCombat()` if workers are unavailable.
 */
export function resolveCombatAsync(
    playerLineup: CombatUnit[],
    opponentLineup: CombatUnit[]
): Promise<CombatResult> {
    const w = getWorker()

    if (!w) {
        return Promise.resolve(resolveCombat(playerLineup, opponentLineup))
    }

    return new Promise<CombatResult>((resolve) => {
        const onMessage = (e: MessageEvent<CombatResult>): void => {
            cleanup()
            resolve(e.data)
        }

        const onError = (): void => {
            cleanup()
            // Fall back to synchronous on worker error
            resolve(resolveCombat(playerLineup, opponentLineup))
        }

        const cleanup = (): void => {
            w.removeEventListener("message", onMessage)
            w.removeEventListener("error", onError)
        }

        w.addEventListener("message", onMessage)
        w.addEventListener("error", onError)
        w.postMessage({ playerLineup, opponentLineup })
    })
}
