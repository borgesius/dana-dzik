/**
 * Client wrapper for the pinball physics Web Worker.
 *
 * Creates a single reusable worker. Falls back to synchronous
 * physics if workers are unavailable (the PinballGame keeps its
 * existing stepPhysics as the fallback).
 */

import type { PhysicsInput, PhysicsOutput } from "./physicsTypes"

let worker: Worker | null = null
let workerFailed = false
let pendingResolve: ((result: PhysicsOutput) => void) | null = null

function getWorker(): Worker | null {
    if (workerFailed) return null
    if (worker) return worker

    try {
        worker = new Worker(new URL("./physics.worker.ts", import.meta.url), {
            type: "module",
        })
        worker.onmessage = (event: MessageEvent<PhysicsOutput>): void => {
            if (pendingResolve) {
                pendingResolve(event.data)
                pendingResolve = null
            }
        }
        worker.onerror = (): void => {
            workerFailed = true
            worker = null
        }
        return worker
    } catch {
        workerFailed = true
        return null
    }
}

/**
 * Request a physics step from the worker.
 * Returns null if the worker is unavailable (caller should fall back).
 *
 * Note: only one physics step can be in-flight at a time (60 fps games
 * should not overlap). If a previous step is still pending it will be
 * silently replaced.
 */
export function requestPhysicsStep(
    input: PhysicsInput
): Promise<PhysicsOutput> | null {
    const w = getWorker()
    if (!w) return null

    return new Promise<PhysicsOutput>((resolve) => {
        pendingResolve = resolve
        w.postMessage(input)
    })
}

export function isPhysicsWorkerAvailable(): boolean {
    return getWorker() !== null
}
