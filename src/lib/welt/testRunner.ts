import { EXERCISE_6_SOURCE, EXERCISES } from "./exercises"
import { getInitialMemory, runWeltProgram } from "./index"
import type { WeltValue } from "./types"

export interface TestCase {
    inputs: string[]
    expectedOutputs: string[]
}

export interface ExerciseResult {
    name: string
    passed: boolean
    error?: string
}

export function parseWeltTest(source: string): TestCase[] {
    const cases: TestCase[] = []
    let currentInputs: string[] = []
    let currentOutputs: string[] = []

    for (const rawLine of source.split("\n")) {
        const line = rawLine.trim()

        if (line.startsWith(";") || line === "") {
            continue
        }

        if (line === "---") {
            if (currentOutputs.length > 0) {
                cases.push({
                    inputs: currentInputs,
                    expectedOutputs: currentOutputs,
                })
            }
            currentInputs = []
            currentOutputs = []
            continue
        }

        const eingabeMatch = line.match(/^EINGABE\s+"(.*)"$/)
        if (eingabeMatch) {
            currentInputs.push(eingabeMatch[1])
            continue
        }

        const erwarteMatch = line.match(/^ERWARTE\s+"(.*)"$/)
        if (erwarteMatch) {
            currentOutputs.push(erwarteMatch[1])
            continue
        }
    }

    if (currentOutputs.length > 0) {
        cases.push({
            inputs: currentInputs,
            expectedOutputs: currentOutputs,
        })
    }

    return cases
}

function checkIntegrity(): string[] {
    const tampered: string[] = []

    for (const exercise of EXERCISES) {
        if (!exercise.locked) continue
        if (exercise.name === "exercise6") {
            // nothing further to check here at parse time;
            // actual file content is checked against EXERCISE_6_SOURCE at runtime
        }
    }

    return tampered
}

export function checkFileIntegrity(
    welttestContents: Record<string, string>,
    exercise6Content: string
): string[] {
    const tampered: string[] = []

    for (const exercise of EXERCISES) {
        const testKey = `${exercise.name}.welttest`
        const actual = welttestContents[testKey]
        if (actual !== undefined && actual !== exercise.test) {
            tampered.push(testKey)
        }
    }

    if (exercise6Content !== EXERCISE_6_SOURCE) {
        tampered.push("exercise6.welt")
    }

    void checkIntegrity()

    return tampered
}

async function runSingleTest(
    exerciseName: string,
    weltSource: string,
    testSource: string,
    initialMemory: WeltValue[]
): Promise<ExerciseResult> {
    const cases = parseWeltTest(testSource)

    if (cases.length === 0) {
        return {
            name: exerciseName,
            passed: false,
            error: "No test cases found",
        }
    }

    for (let i = 0; i < cases.length; i++) {
        const tc = cases[i]
        const outputs: string[] = []
        let inputIdx = 0

        try {
            await Promise.race([
                runWeltProgram(
                    weltSource,
                    {
                        onOutput: (text) => outputs.push(String(text)),
                        onInput: () => {
                            if (inputIdx < tc.inputs.length) {
                                return Promise.resolve(tc.inputs[inputIdx++])
                            }
                            return Promise.resolve("")
                        },
                    },
                    initialMemory
                ),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 3000)
                ),
            ])
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error"
            return {
                name: exerciseName,
                passed: false,
                error: `Runtime error in case ${i + 1}: ${msg}`,
            }
        }

        if (outputs.length !== tc.expectedOutputs.length) {
            return {
                name: exerciseName,
                passed: false,
                error: `Case ${i + 1}: expected ${tc.expectedOutputs.length} output(s), got ${outputs.length}`,
            }
        }

        for (let j = 0; j < tc.expectedOutputs.length; j++) {
            if (outputs[j] !== tc.expectedOutputs[j]) {
                return {
                    name: exerciseName,
                    passed: false,
                    error: `Case ${i + 1}: expected "${tc.expectedOutputs[j]}", got "${outputs[j]}"`,
                }
            }
        }
    }

    return { name: exerciseName, passed: true }
}

export interface RunAllResult {
    results: ExerciseResult[]
    allPassed: boolean
    tampered: string[]
}

export async function runAllTests(
    exerciseSources: Record<string, string>,
    welttestSources: Record<string, string>,
    memoryWeltContent: string
): Promise<RunAllResult> {
    const tampered = checkFileIntegrity(
        welttestSources,
        exerciseSources["exercise6.welt"] ?? ""
    )

    if (tampered.length > 0) {
        return { results: [], allPassed: false, tampered }
    }

    let initialMemory: WeltValue[]
    try {
        initialMemory = await getInitialMemory(memoryWeltContent)
    } catch {
        return {
            results: [
                {
                    name: "memory.welt",
                    passed: false,
                    error: "Failed to boot memory.welt",
                },
            ],
            allPassed: false,
            tampered: [],
        }
    }

    const results: ExerciseResult[] = []

    for (const exercise of EXERCISES) {
        const weltKey = `${exercise.name}.welt`
        const testKey = `${exercise.name}.welttest`
        const weltSource = exerciseSources[weltKey]
        const testSource = welttestSources[testKey]

        if (!weltSource) {
            results.push({
                name: exercise.name,
                passed: false,
                error: `Missing ${weltKey}`,
            })
            continue
        }

        if (!testSource) {
            results.push({
                name: exercise.name,
                passed: false,
                error: `Missing ${testKey}`,
            })
            continue
        }

        const result = await runSingleTest(
            exercise.name,
            weltSource,
            testSource,
            initialMemory
        )
        results.push(result)
    }

    const allPassed = results.every((r) => r.passed)
    return { results, allPassed, tampered: [] }
}
