/**
 * Web Worker that resolves autobattler combat off the main thread.
 *
 * Receives player and opponent lineups, returns the full CombatResult.
 */

import { resolveCombat } from "./combat"
import type { CombatResult, CombatUnit } from "./types"

export interface CombatWorkerRequest {
    playerLineup: CombatUnit[]
    opponentLineup: CombatUnit[]
}

self.onmessage = (e: MessageEvent<CombatWorkerRequest>): void => {
    const { playerLineup, opponentLineup } = e.data
    const result: CombatResult = resolveCombat(playerLineup, opponentLineup)
    self.postMessage(result)
}
