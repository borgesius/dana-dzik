import { describe, expect, it } from "vitest"

import { SYS_MEMORY } from "../lib/terminal/filesystem"
import {
    compileWeltProgram,
    getInitialMemory,
    runGrundProgram,
    runWeltProgram,
} from "../lib/welt"
import {
    DEFAULT_INITIAL_MEMORY,
    EXERCISE_6_SOURCE,
    EXERCISES,
} from "../lib/welt/exercises"
import {
    EXERCISE_4_SOLUTION_LINES,
    EXERCISE_5_SCHOPENHAUER_ESSAY,
    EXERCISE_7_GRUND_SOLUTION,
    FREAKGPT_SOLUTIONS,
    getFreakGPTSolution,
    isExerciseFile,
} from "../lib/welt/freakgpt"
import {
    checkFileIntegrity,
    parseWeltTest,
    runAllTests,
} from "../lib/welt/testRunner"
import type { WeltValue } from "../lib/welt/types"

describe("welttest parser", () => {
    it("parses a single test case with ERWARTE", () => {
        const source = `ERWARTE "hello"`
        const cases = parseWeltTest(source)
        expect(cases).toHaveLength(1)
        expect(cases[0].inputs).toEqual([])
        expect(cases[0].expectedOutputs).toEqual(["hello"])
    })

    it("parses multiple ERWARTE lines", () => {
        const source = `ERWARTE "5"\nERWARTE "4"\nERWARTE "3"`
        const cases = parseWeltTest(source)
        expect(cases).toHaveLength(1)
        expect(cases[0].expectedOutputs).toEqual(["5", "4", "3"])
    })

    it("parses EINGABE and ERWARTE", () => {
        const source = `EINGABE "hello"\nERWARTE "hello back"`
        const cases = parseWeltTest(source)
        expect(cases).toHaveLength(1)
        expect(cases[0].inputs).toEqual(["hello"])
        expect(cases[0].expectedOutputs).toEqual(["hello back"])
    })

    it("parses multiple test cases separated by ---", () => {
        const source = `ERWARTE "a"\n---\nERWARTE "b"`
        const cases = parseWeltTest(source)
        expect(cases).toHaveLength(2)
        expect(cases[0].expectedOutputs).toEqual(["a"])
        expect(cases[1].expectedOutputs).toEqual(["b"])
    })

    it("ignores comments and blank lines", () => {
        const source = `; comment\n\nERWARTE "hello"\n; another comment`
        const cases = parseWeltTest(source)
        expect(cases).toHaveLength(1)
        expect(cases[0].expectedOutputs).toEqual(["hello"])
    })

    it("handles empty input", () => {
        const cases = parseWeltTest("")
        expect(cases).toHaveLength(0)
    })

    it("handles multiple inputs per case", () => {
        const source = `EINGABE "a"\nEINGABE "b"\nERWARTE "ab"`
        const cases = parseWeltTest(source)
        expect(cases).toHaveLength(1)
        expect(cases[0].inputs).toEqual(["a", "b"])
    })
})

describe("file integrity checking", () => {
    it("returns empty array for unmodified files", () => {
        const welttests: Record<string, string> = {}
        for (const ex of EXERCISES) {
            const testExt = ex.grund ? ".grundtest" : ".welttest"
            welttests[`${ex.name}${testExt}`] = ex.test
        }
        const tampered = checkFileIntegrity(welttests, EXERCISE_6_SOURCE)
        expect(tampered).toHaveLength(0)
    })

    it("detects tampered welttest files", () => {
        const welttests: Record<string, string> = {}
        for (const ex of EXERCISES) {
            const testExt = ex.grund ? ".grundtest" : ".welttest"
            welttests[`${ex.name}${testExt}`] = ex.test
        }
        welttests["exercise1.welttest"] = 'ERWARTE "hacked"'
        const tampered = checkFileIntegrity(welttests, EXERCISE_6_SOURCE)
        expect(tampered).toContain("exercise1.welttest")
    })

    it("detects tampered exercise6.welt", () => {
        const welttests: Record<string, string> = {}
        for (const ex of EXERCISES) {
            const testExt = ex.grund ? ".grundtest" : ".welttest"
            welttests[`${ex.name}${testExt}`] = ex.test
        }
        const tampered = checkFileIntegrity(welttests, "ERWACHE\nVERNEINUNG")
        expect(tampered).toContain("exercise6.welt")
    })
})

describe("initial memory booting", () => {
    it("boots default memory.welt and gets expected register state", async () => {
        const memory = await getInitialMemory(SYS_MEMORY)
        expect(memory).toEqual(DEFAULT_INITIAL_MEMORY)
    })

    it("respects custom register values in memory.welt", async () => {
        const customMemory = SYS_MEMORY.replace(
            "DING 0 = 0\nDING 1 = 0",
            "DING 0 = 20\nDING 1 = 21"
        )
        const memory = await getInitialMemory(customMemory)
        expect(memory[0]).toBe(20)
        expect(memory[1]).toBe(21)
    })

    it("passes initial memory to runWeltProgram", async () => {
        const source = `ERWACHE\nVORSTELLUNG DING 0\nVERNEINUNG`
        const outputs: string[] = []
        await runWeltProgram(
            source,
            {
                onOutput: (text) => outputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            [42, 0, 0, 0, 0, 0, 0, 0]
        )
        expect(outputs).toEqual(["42"])
    })
})

describe("exercise solutions", () => {
    it("exercise 1: Hallo, Welt!", async () => {
        const solution = `ERWACHE\nVORSTELLUNG "Hallo, Welt!"\nVERNEINUNG`
        const result = await runExercise(solution, EXERCISES[0].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 2: Die Antwort", async () => {
        const solution = `ERWACHE\nDING 0 = 6\nDING 1 = DING 0 * 7\nVORSTELLUNG DING 1\nVERNEINUNG`
        const result = await runExercise(solution, EXERCISES[1].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 3: Countdown", async () => {
        const solution = `ERWACHE
DING 0 = 5
SOLANGE DING 0 > 0
  VORSTELLUNG DING 0
  DING 0 = DING 0 - 1
ENDE
VERNEINUNG`
        const result = await runExercise(solution, EXERCISES[2].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 4: Doppelt (carry flag)", async () => {
        const solution = `ERWACHE
DING 0 = 200
DING 1 = 100
DING 2 = DING 0 + DING 1
VORSTELLUNG DING 2
DING 3 = 50
DING 4 = 50
DING 5 = DING 3 + DING 4
VORSTELLUNG DING 5
VERNEINUNG`
        const result = await runExercise(solution, EXERCISES[3].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 5: Systemcheck", async () => {
        const solution = `ERWACHE
DING 0 = 8
DING 1 = 16
DING 2 = DING 0 * DING 1
DING 3 = 18
DING 4 = DING 2 + DING 3
VORSTELLUNG DING 4
VERNEINUNG`
        const result = await runExercise(solution, EXERCISES[4].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 6: Die Welt (trick - needs modified memory)", async () => {
        const customMemory = SYS_MEMORY.replace(
            "DING 0 = 0\nDING 1 = 0",
            "DING 0 = 20\nDING 1 = 21"
        )
        const initialMemory = await getInitialMemory(customMemory)
        const result = await runExerciseWithMemory(
            EXERCISE_6_SOURCE,
            EXERCISES[5].test,
            initialMemory
        )
        expect(result.passed).toBe(true)
    })

    it("exercise 6: fails with default memory", async () => {
        const result = await runExercise(EXERCISE_6_SOURCE, EXERCISES[5].test)
        expect(result.passed).toBe(false)
    })
})

describe("runAllTests", () => {
    it("detects tampered files before running", async () => {
        const exerciseSources: Record<string, string> = {}
        const welttestSources: Record<string, string> = {}

        for (const ex of EXERCISES) {
            const srcExt = ex.grund ? ".grund" : ".welt"
            const testExt = ex.grund ? ".grundtest" : ".welttest"
            exerciseSources[`${ex.name}${srcExt}`] = ex.stub
            welttestSources[`${ex.name}${testExt}`] = ex.test
        }

        welttestSources["exercise1.welttest"] = 'ERWARTE "hacked"'

        const result = await runAllTests(
            exerciseSources,
            welttestSources,
            SYS_MEMORY
        )
        expect(result.tampered).toContain("exercise1.welttest")
        expect(result.allPassed).toBe(false)
    })

    it("reports failed exercises with stubs", async () => {
        const exerciseSources: Record<string, string> = {}
        const welttestSources: Record<string, string> = {}

        for (const ex of EXERCISES) {
            const srcExt = ex.grund ? ".grund" : ".welt"
            const testExt = ex.grund ? ".grundtest" : ".welttest"
            exerciseSources[`${ex.name}${srcExt}`] = ex.stub
            welttestSources[`${ex.name}${testExt}`] = ex.test
        }

        const result = await runAllTests(
            exerciseSources,
            welttestSources,
            SYS_MEMORY
        )
        expect(result.allPassed).toBe(false)
        expect(result.tampered).toHaveLength(0)
        expect(result.results.length).toBe(EXERCISES.length)
    })
})

describe("FreakGPT solutions", () => {
    function buildSource(lines: string[]): string {
        return lines.join("\n")
    }

    function buildExercise5FullSource(): string {
        const solutionLines = FREAKGPT_SOLUTIONS["exercise5.welt"]
        const insertIdx = solutionLines.indexOf("VERNEINUNG")
        return [
            ...solutionLines.slice(0, insertIdx),
            ...EXERCISE_5_SCHOPENHAUER_ESSAY,
            ...solutionLines.slice(insertIdx),
        ].join("\n")
    }

    it("exercise 1 solution passes tests", async () => {
        const source = buildSource(FREAKGPT_SOLUTIONS["exercise1.welt"])
        const result = await runExercise(source, EXERCISES[0].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 2 solution passes tests", async () => {
        const source = buildSource(FREAKGPT_SOLUTIONS["exercise2.welt"])
        const result = await runExercise(source, EXERCISES[1].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 3 solution passes tests", async () => {
        const source = buildSource(FREAKGPT_SOLUTIONS["exercise3.welt"])
        const result = await runExercise(source, EXERCISES[2].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 4 solution (with network error lines) passes tests", async () => {
        const source = buildSource(EXERCISE_4_SOLUTION_LINES)
        const result = await runExercise(source, EXERCISES[3].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 5 solution (with Schopenhauer essay) passes tests", async () => {
        const source = buildExercise5FullSource()
        const result = await runExercise(source, EXERCISES[4].test)
        expect(result.passed).toBe(true)
    })

    it("exercise 7 (GRUND) solution passes tests", async () => {
        const source = buildSource(EXERCISE_7_GRUND_SOLUTION)
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["49"])
    })

    it("provides solutions for exercises 1-5 and 7 (not exercise 6)", () => {
        expect(FREAKGPT_SOLUTIONS["exercise1.welt"]).toBeDefined()
        expect(FREAKGPT_SOLUTIONS["exercise2.welt"]).toBeDefined()
        expect(FREAKGPT_SOLUTIONS["exercise3.welt"]).toBeDefined()
        expect(FREAKGPT_SOLUTIONS["exercise5.welt"]).toBeDefined()
        expect(EXERCISE_4_SOLUTION_LINES).toBeDefined()
        expect(EXERCISE_7_GRUND_SOLUTION).toBeDefined()
        expect(FREAKGPT_SOLUTIONS["exercise6.welt"]).toBeUndefined()
    })

    it("getFreakGPTSolution returns lines for exercises 1-5 and 7", () => {
        expect(getFreakGPTSolution("exercise1.welt")).toBeDefined()
        expect(getFreakGPTSolution("exercise4.welt")).toEqual(
            EXERCISE_4_SOLUTION_LINES
        )
        expect(getFreakGPTSolution("exercise7.grund")).toEqual(
            EXERCISE_7_GRUND_SOLUTION
        )
        expect(getFreakGPTSolution("exercise6.welt")).toBeNull()
        expect(getFreakGPTSolution("notafile.welt")).toBeNull()
    })

    it("getFreakGPTSolution for exercise 5 includes essay", () => {
        const lines = getFreakGPTSolution("exercise5.welt")!
        expect(lines).toBeDefined()
        expect(lines.join("\n")).toContain("NIETZSCHE")
        expect(lines.join("\n")).toContain("VERNEINUNG")
    })

    it("isExerciseFile identifies exercise files correctly", () => {
        expect(isExerciseFile("exercise1.welt")).toBe(true)
        expect(isExerciseFile("exercise5.welt")).toBe(true)
        expect(isExerciseFile("exercise7.grund")).toBe(true)
        expect(isExerciseFile("exercise6.welt")).toBe(false)
        expect(isExerciseFile("exercise0.welt")).toBe(false)
        expect(isExerciseFile("readme.txt")).toBe(false)
    })
})

describe("GRUND compiler", () => {
    it("compiles a simple WELT program to GRUND", () => {
        const source = `ERWACHE\nDING 0 = 5\nVORSTELLUNG DING 0\nVERNEINUNG`
        const output = compileWeltProgram(source)
        expect(output).toContain(".code")
        expect(output).toContain("tar")
        expect(output).toContain("mav")
        expect(output).toContain("nov")
    })

    it("compiles string literals into .data section", () => {
        const source = `ERWACHE\nVORSTELLUNG "Hallo, Welt!"\nVERNEINUNG`
        const output = compileWeltProgram(source)
        expect(output).toContain(".data")
        expect(output).toContain("Hallo, Welt!")
        expect(output).toContain("s0")
    })

    it("compiles a loop with condition", () => {
        const source = `ERWACHE\nDING 0 = 3\nSOLANGE DING 0 > 0\nVORSTELLUNG DING 0\nDING 0 = DING 0 - 1\nENDE\nVERNEINUNG`
        const output = compileWeltProgram(source)
        expect(output).toContain("pav")
        expect(output).toContain("rav")
        expect(output).toContain(".L")
    })

    it("expands MOD into dur/mur/sur sequence", () => {
        const source = `ERWACHE\nDING 0 = 10\nDING 1 = 3\nDING 2 = DING 0 MOD DING 1\nVORSTELLUNG DING 2\nVERNEINUNG`
        const output = compileWeltProgram(source)
        expect(output).toContain("dur")
        expect(output).toContain("mur")
        expect(output).toContain("sur")
    })
})

describe("GRUND interpreter", () => {
    it("runs a simple GRUND program", async () => {
        const source = `.data\n\n.code\n  tar  r0, 42\n  mav  r0\n  nov`
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["42"])
    })

    it("runs GRUND with string data", async () => {
        const source = `.data\n  s0: "Hello"\n\n.code\n  tar  r0, s0\n  mav  r0\n  nov`
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["Hello"])
    })

    it("handles arithmetic operations", async () => {
        const source = `.data\n\n.code\n  tar  r0, 6\n  tar  r1, 7\n  mur  r2, r0, r1\n  mav  r2\n  nov`
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["42"])
    })

    it("handles ring buffer push/pop", async () => {
        const source = `.data\n\n.code\n  tar  r0, 10\n  tin  r0\n  tar  r0, 0\n  tab  r1\n  mav  r1\n  nov`
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["10"])
    })

    it("handles conditional branching", async () => {
        const source = `.data\n\n.code\n  tar  r0, 5\n  pav  r0, 5\n  rev  .equal\n  tar  r0, 0\n  rav  .end\n.equal:\n  tar  r0, 1\n.end:\n  mav  r0\n  nov`
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["1"])
    })

    it("handles looping", async () => {
        const source = `.data\n\n.code\n  tar  r0, 3\n.loop:\n  pav  r0, 0\n  rev  .done\n  mav  r0\n  tar  r7, 1\n  sur  r0, r0, r7\n  rav  .loop\n.done:\n  nov`
        const outputs: string[] = []
        await runGrundProgram(source, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["3", "2", "1"])
    })
})

describe("GRUND round-trip", () => {
    it("WELT countdown compiles to GRUND that produces same output", async () => {
        const weltSource = `ERWACHE\nDING 0 = 3\nSOLANGE DING 0 > 0\nVORSTELLUNG DING 0\nDING 0 = DING 0 - 1\nENDE\nVERNEINUNG`

        const weltOutputs: string[] = []
        await runWeltProgram(
            weltSource,
            {
                onOutput: (text) => weltOutputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            DEFAULT_INITIAL_MEMORY
        )

        const grundSource = compileWeltProgram(weltSource)
        const grundOutputs: string[] = []
        await runGrundProgram(
            grundSource,
            {
                onOutput: (text) => grundOutputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            DEFAULT_INITIAL_MEMORY
        )

        expect(grundOutputs).toEqual(weltOutputs)
    })

    it("WELT hello world compiles to GRUND that produces same output", async () => {
        const weltSource = `ERWACHE\nVORSTELLUNG "Hallo, Welt!"\nVERNEINUNG`

        const weltOutputs: string[] = []
        await runWeltProgram(
            weltSource,
            {
                onOutput: (text) => weltOutputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            DEFAULT_INITIAL_MEMORY
        )

        const grundSource = compileWeltProgram(weltSource)
        const grundOutputs: string[] = []
        await runGrundProgram(
            grundSource,
            {
                onOutput: (text) => grundOutputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            DEFAULT_INITIAL_MEMORY
        )

        expect(grundOutputs).toEqual(weltOutputs)
    })

    it("WELT multiply compiles to GRUND that produces same output", async () => {
        const weltSource = `ERWACHE\nDING 0 = 6\nDING 1 = DING 0 * 7\nVORSTELLUNG DING 1\nVERNEINUNG`

        const weltOutputs: string[] = []
        await runWeltProgram(
            weltSource,
            {
                onOutput: (text) => weltOutputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            DEFAULT_INITIAL_MEMORY
        )

        const grundSource = compileWeltProgram(weltSource)
        const grundOutputs: string[] = []
        await runGrundProgram(
            grundSource,
            {
                onOutput: (text) => grundOutputs.push(String(text)),
                onInput: () => Promise.resolve(""),
            },
            DEFAULT_INITIAL_MEMORY
        )

        expect(grundOutputs).toEqual(weltOutputs)
    })
})

describe("Exercise 7: Der Ring", () => {
    it("solution using ring buffer produces correct output", async () => {
        const solution = `.data

.code
  tar  r0, 3
  tar  r1, 4
  kur  r0, r0, r1
  tin  r0
  tar  r0, 5
  tar  r1, 2
  kur  r0, r0, r1
  tab  r1
  mur  r0, r0, r1
  mav  r0
  nov`
        const outputs: string[] = []
        await runGrundProgram(solution, {
            onOutput: (text) => outputs.push(String(text)),
            onInput: () => Promise.resolve(""),
        })
        expect(outputs).toEqual(["49"])
    })
})

async function runExercise(
    weltSource: string,
    testSource: string
): Promise<{ passed: boolean; error?: string }> {
    return runExerciseWithMemory(weltSource, testSource, DEFAULT_INITIAL_MEMORY)
}

async function runExerciseWithMemory(
    weltSource: string,
    testSource: string,
    initialMemory: WeltValue[]
): Promise<{ passed: boolean; error?: string }> {
    const cases = parseWeltTest(testSource)
    for (let i = 0; i < cases.length; i++) {
        const tc = cases[i]
        const outputs: string[] = []
        let inputIdx = 0
        await runWeltProgram(
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
        )
        if (outputs.length !== tc.expectedOutputs.length) {
            return {
                passed: false,
                error: `Case ${i + 1}: expected ${tc.expectedOutputs.length} outputs, got ${outputs.length}`,
            }
        }
        for (let j = 0; j < tc.expectedOutputs.length; j++) {
            if (outputs[j] !== tc.expectedOutputs[j]) {
                return {
                    passed: false,
                    error: `Case ${i + 1}: expected "${tc.expectedOutputs[j]}", got "${outputs[j]}"`,
                }
            }
        }
    }
    return { passed: true }
}
