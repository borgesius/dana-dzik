import type { WeltValue } from "./types"

export interface ExerciseDefinition {
    name: string
    stub: string
    test: string
    locked?: boolean
    grund?: boolean
}

export const EXERCISE_6_SOURCE = `; Exercise 6: Die Welt
;
; This program cannot be modified.
; Make it output the correct values.
;
; "Naturalmente they speak always of
;  67, or of 69 -- but never of '68.
;  This does not surprise me in the
;  slightest." --T. Pferd

ERWACHE
DING 4 = 250
DING 5 = 10
DING 6 = DING 4 + DING 5
DING 7 = DING 0 + DING 1
VORSTELLUNG DING 7
VERNEINUNG`

export const EXERCISES: ExerciseDefinition[] = [
    {
        name: "exercise1",
        stub: `; Exercise 1: Hallo, Welt!
;
; Output the text: Hallo, Welt!

ERWACHE

VERNEINUNG`,
        test: `; Exercise 1: Hallo, Welt!
ERWARTE "Hallo, Welt!"`,
    },
    {
        name: "exercise2",
        stub: `; Exercise 2: Die Antwort
;
; Compute 6 * 7 and output the result.

ERWACHE

VERNEINUNG`,
        test: `; Exercise 2: Die Antwort
ERWARTE "42"`,
    },
    {
        name: "exercise3",
        stub: `; Exercise 3: Countdown
;
; Count down from 5 to 1.
; Output each number on its own line.

ERWACHE

VERNEINUNG`,
        test: `; Exercise 3: Countdown
ERWARTE "5"
ERWARTE "4"
ERWARTE "3"
ERWARTE "2"
ERWARTE "1"`,
    },
    {
        name: "exercise4",
        stub: `; Exercise 4: Doppelt
;
; Compute 200 + 100 and output the result.
; Then compute 50 + 50 and output the result.

ERWACHE

VERNEINUNG`,
        test: `; Exercise 4: Doppelt
ERWARTE "44"
ERWARTE "101"`,
    },
    {
        name: "exercise5",
        stub: `; Exercise 5: Systemcheck
;
; Compute the DAS system checksum:
; Multiply the memory bank count by the
; display color depth, then add the clock
; tick rate.
;
; Hint: check the system files in 3:\\DAS\\

ERWACHE

VERNEINUNG`,
        test: `; Exercise 5: Systemcheck
ERWARTE "146"`,
    },
    {
        name: "exercise6",
        stub: EXERCISE_6_SOURCE,
        test: `; Exercise 6: Die Welt
ERWARTE "68"`,
        locked: true,
    },
    {
        name: "exercise7",
        stub: `; Exercise 7: Der Ring
;
; Compute (3 + 4) * (5 + 2) and output the result.
;
; Constraint: you may only use registers r0 and r1.
; Use the ring buffer (tin/tab) for temporary storage.
;
; See 3:\\DAS\\grund.txt for the GRUND reference.

.data

.code

  nov`,
        test: `; Exercise 7: Der Ring
ERWARTE "49"`,
        grund: true,
    },
]

export const DEFAULT_MEMORY_WELT_FLUSH = `; Flush registers
DING 0 = 0
DING 1 = 0
DING 2 = 0
DING 3 = 4
DING 4 = 0
DING 5 = 0
DING 6 = 0
DING 7 = 97`

export const DEFAULT_INITIAL_MEMORY: WeltValue[] = [0, 0, 0, 4, 0, 0, 0, 97]
