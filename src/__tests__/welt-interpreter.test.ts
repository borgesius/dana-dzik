import { describe, expect, it } from "vitest"

import { runWeltProgram, WeltError } from "../lib/welt"

function runProgram(source: string, inputs: string[] = []): Promise<string[]> {
    const output: string[] = []
    let inputIndex = 0

    return runWeltProgram(source, {
        onOutput: (text) => output.push(text),
        onInput: () => {
            const val = inputs[inputIndex] ?? ""
            inputIndex++
            return Promise.resolve(val)
        },
    }).then(() => output)
}

describe("WELT Interpreter", () => {
    describe("hello world", () => {
        it("outputs a string literal", async () => {
            const output = await runProgram(`
                ERWACHE
                VORSTELLUNG "Hello, World!"
                VERNEINUNG
            `)
            expect(output).toEqual(["Hello, World!"])
        })

        it("outputs from a DING slot", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = "Hello!"
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["Hello!"])
        })
    })

    describe("DING assignment", () => {
        it("stores numbers", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 42
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["42"])
        })

        it("stores strings", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 3 = "test"
                VORSTELLUNG DING 3
                VERNEINUNG
            `)
            expect(output).toEqual(["test"])
        })

        it("rejects slots outside 0-7", async () => {
            await expect(
                runProgram(`
                    ERWACHE
                    DING 8 = 1
                    VERNEINUNG
                `)
            ).rejects.toThrow(WeltError)
        })
    })

    describe("arithmetic", () => {
        it("adds numbers", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 3 + 4
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["7"])
        })

        it("subtracts numbers", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 10 - 3
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["7"])
        })

        it("multiplies numbers", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 6 * 7
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["42"])
        })

        it("divides numbers (integer division)", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 7 / 2
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["3"])
        })

        it("computes modulo", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 17 MOD 5
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["2"])
        })

        it("concatenates strings with +", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = "Hello" + " " + "World"
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["Hello World"])
        })

        it("errors on division by zero", async () => {
            await expect(
                runProgram(`
                    ERWACHE
                    DING 0 = 1 / 0
                    VERNEINUNG
                `)
            ).rejects.toThrow("DIVISION BY ZERO")
        })
    })

    describe("comparison", () => {
        it("equality returns 1 for true", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 5 = 5
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["1"])
        })

        it("equality returns 0 for false", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 5 = 3
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["0"])
        })

        it("compares strings", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = "hello"
                DING 1 = DING 0 = "hello"
                VORSTELLUNG DING 1
                VERNEINUNG
            `)
            expect(output).toEqual(["1"])
        })

        it("greater than works", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 5 > 3
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["1"])
        })

        it("less than works", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 3 < 5
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["1"])
        })

        it("not equal works", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 3 != 5
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["1"])
        })
    })

    describe("WENN conditionals", () => {
        it("executes body when true", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 1
                WENN DING 0 = 1 DANN
                    VORSTELLUNG "yes"
                ENDE
                VERNEINUNG
            `)
            expect(output).toEqual(["yes"])
        })

        it("skips body when false", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 0
                WENN DING 0 = 1 DANN
                    VORSTELLUNG "yes"
                ENDE
                VORSTELLUNG "after"
                VERNEINUNG
            `)
            expect(output).toEqual(["after"])
        })

        it("executes SONST when false", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 0
                WENN DING 0 = 1 DANN
                    VORSTELLUNG "yes"
                SONST
                    VORSTELLUNG "no"
                ENDE
                VERNEINUNG
            `)
            expect(output).toEqual(["no"])
        })

        it("handles nested conditionals", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 2
                WENN DING 0 = 1 DANN
                    VORSTELLUNG "one"
                SONST
                    WENN DING 0 = 2 DANN
                        VORSTELLUNG "two"
                    SONST
                        VORSTELLUNG "other"
                    ENDE
                ENDE
                VERNEINUNG
            `)
            expect(output).toEqual(["two"])
        })
    })

    describe("SOLANGE loops", () => {
        it("loops until condition is false", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 0
                SOLANGE DING 0 < 3
                    VORSTELLUNG DING 0
                    DING 0 = DING 0 + 1
                ENDE
                VERNEINUNG
            `)
            expect(output).toEqual(["0", "1", "2"])
        })

        it("skips loop if condition starts false", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 10
                SOLANGE DING 0 < 3
                    VORSTELLUNG "nope"
                ENDE
                VORSTELLUNG "done"
                VERNEINUNG
            `)
            expect(output).toEqual(["done"])
        })

        it("prevents infinite loops", async () => {
            await expect(
                runProgram(`
                    ERWACHE
                    DING 0 = 1
                    SOLANGE DING 0 = 1
                        VORSTELLUNG "loop"
                    ENDE
                    VERNEINUNG
                `)
            ).rejects.toThrow("SYSTEM OVERHEAT")
        })
    })

    describe("WILLE input", () => {
        it("reads string input", async () => {
            const output = await runProgram(
                `
                ERWACHE
                WILLE 0
                VORSTELLUNG DING 0
                VERNEINUNG
            `,
                ["hello"]
            )
            expect(output).toEqual(["hello"])
        })

        it("reads numeric input as number", async () => {
            const output = await runProgram(
                `
                ERWACHE
                WILLE 0
                DING 1 = DING 0 + 1
                VORSTELLUNG DING 1
                VERNEINUNG
            `,
                ["5"]
            )
            expect(output).toEqual(["6"])
        })
    })

    describe("VERNEINUNG halts", () => {
        it("stops execution mid-program", async () => {
            const output = await runProgram(`
                ERWACHE
                VORSTELLUNG "before"
                VERNEINUNG
                VORSTELLUNG "after"
            `)
            expect(output).toEqual(["before"])
        })

        it("halts inside a loop", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 0
                SOLANGE DING 0 < 10
                    VORSTELLUNG DING 0
                    WENN DING 0 = 2 DANN
                        VERNEINUNG
                    ENDE
                    DING 0 = DING 0 + 1
                ENDE
            `)
            expect(output).toEqual(["0", "1", "2"])
        })
    })

    describe("error handling", () => {
        it("requires ERWACHE at start", async () => {
            await expect(runProgram(`VORSTELLUNG "hello"`)).rejects.toThrow(
                WeltError
            )
        })

        it("rejects unterminated strings", async () => {
            await expect(
                runProgram(`
                    ERWACHE
                    VORSTELLUNG "hello
                    VERNEINUNG
                `)
            ).rejects.toThrow("Unterminated string")
        })

        it("rejects unexpected tokens", async () => {
            await expect(
                runProgram(`
                    ERWACHE
                    DANN
                    VERNEINUNG
                `)
            ).rejects.toThrow(WeltError)
        })
    })

    describe("fizzbuzz integration", () => {
        it("produces correct fizzbuzz output for 1-15", async () => {
            const output = await runProgram(`
                ERWACHE
                DING 0 = 1
                SOLANGE DING 0 <= 15
                    DING 1 = DING 0 MOD 15
                    DING 2 = DING 0 MOD 3
                    DING 3 = DING 0 MOD 5
                    WENN DING 1 = 0 DANN
                        VORSTELLUNG "FizzBuzz"
                    SONST
                        WENN DING 2 = 0 DANN
                            VORSTELLUNG "Fizz"
                        SONST
                            WENN DING 3 = 0 DANN
                                VORSTELLUNG "Buzz"
                            SONST
                                VORSTELLUNG DING 0
                            ENDE
                        ENDE
                    ENDE
                    DING 0 = DING 0 + 1
                ENDE
                VERNEINUNG
            `)
            expect(output).toEqual([
                "1",
                "2",
                "Fizz",
                "4",
                "Buzz",
                "Fizz",
                "7",
                "8",
                "Fizz",
                "Buzz",
                "11",
                "Fizz",
                "13",
                "14",
                "FizzBuzz",
            ])
        })
    })

    describe("comments", () => {
        it("ignores comments", async () => {
            const output = await runProgram(`
                ; This is a comment
                ERWACHE
                DING 0 = 42 ; inline comment
                VORSTELLUNG DING 0
                VERNEINUNG
            `)
            expect(output).toEqual(["42"])
        })

        it("does not treat semicolons in strings as comments", async () => {
            const output = await runProgram(`
                ERWACHE
                VORSTELLUNG "hello; world"
                VERNEINUNG
            `)
            expect(output).toEqual(["hello; world"])
        })
    })
})
