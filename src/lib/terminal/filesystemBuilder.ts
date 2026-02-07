import { DESKTOP_ITEMS } from "../../config/desktop"
import { EXERCISES } from "../welt/exercises"
import { DESKTOP_FILE_CONTENT } from "./content/desktopContent"
import {
    GRUND_SPEC,
    SYS_BOOT,
    SYS_BOOT_GRUND,
    SYS_CLOCK,
    SYS_CONFIG,
    SYS_DISPLAY,
    SYS_KERNEL,
    SYS_KERNEL_GRUND,
    SYS_LOG,
    SYS_MEMORY,
} from "./content/systemFiles"
import {
    getWeltManual,
    WELT_BREATHE,
    WELT_FIZZBUZZ,
    WELT_HELLO,
    WELT_QUEST,
} from "./content/weltContent"
import type { FileSystem, FSNode } from "./filesystem"

const WELT_CHILDREN: Record<string, FSNode> = {
    "README.txt": {
        name: "README.txt",
        type: "file",
        content: `WELT - A Schopenhauerian programming language designed\nfor the DAS (Ding an Sich) architecture
=======================================

Quick start:
  cd examples        Go to examples
  cat hello.welt     View a program
  welt hello.welt    Run it
  edit hello.welt    Edit it

Try:
  welt fizzbuzz.welt    Classic fizzbuzz
  welt quest.welt       A short game

Write your own:
  edit myfile.welt    Create a new file
  welt myfile.welt    Run it

Full docs: cat MANUAL.txt`,
    },
    "welt.exe": {
        name: "welt.exe",
        type: "executable",
        content:
            "WELT Interpreter v0.3.1 (c) 1994 Fatitech Industries\nUsage: welt <filename.welt>",
    },
    "MANUAL.txt": {
        name: "MANUAL.txt",
        type: "file",
        content: "",
    },
    examples: {
        name: "examples",
        type: "directory",
        children: {
            "hello.welt": {
                name: "hello.welt",
                type: "file",
                content: WELT_HELLO,
            },
            "fizzbuzz.welt": {
                name: "fizzbuzz.welt",
                type: "file",
                content: WELT_FIZZBUZZ,
            },
            "quest.welt": {
                name: "quest.welt",
                type: "file",
                content: WELT_QUEST,
            },
            "breathe.welt": {
                name: "breathe.welt",
                type: "file",
                content: WELT_BREATHE,
            },
        },
    },
    exercises: {
        name: "exercises",
        type: "directory",
        children: buildExerciseChildren(),
    },
}

function buildExerciseChildren(): Record<string, FSNode> {
    const children: Record<string, FSNode> = {}

    for (const exercise of EXERCISES) {
        const srcExt = exercise.grund ? ".grund" : ".welt"
        const testExt = exercise.grund ? ".grundtest" : ".welttest"
        const srcName = `${exercise.name}${srcExt}`
        const testName = `${exercise.name}${testExt}`

        children[srcName] = {
            name: srcName,
            type: "file",
            content: exercise.stub,
            readonly: exercise.locked,
        }

        children[testName] = {
            name: testName,
            type: "file",
            content: exercise.test,
            readonly: true,
        }
    }

    children["welttest.exe"] = {
        name: "welttest.exe",
        type: "executable",
        content:
            "WELT Test Runner v1.0\nRuns all .welttest files in the current directory.",
        handler: "welttest",
        readonly: true,
    }

    children["reset.exe"] = {
        name: "reset.exe",
        type: "executable",
        content:
            "WELT Exercise Reset v1.0\nRestores all exercises and system files to defaults.",
        handler: "reset",
        readonly: true,
    }

    return children
}

function buildDesktopChildren(): Record<string, FSNode> {
    const children: Record<string, FSNode> = {}
    for (const item of DESKTOP_ITEMS) {
        const node: FSNode = {
            name: item.filename,
            type: item.fileType,
            windowId: item.windowId,
            content: DESKTOP_FILE_CONTENT[item.filename],
        }
        if (item.fileType === "directory") {
            node.children = item.filename === "WELT" ? WELT_CHILDREN : {}
        }
        children[item.filename] = node
    }
    return children
}

const FILESYSTEM_STRUCTURE: FSNode = {
    name: "3:",
    type: "directory",
    children: {
        Users: {
            name: "Users",
            type: "directory",
            children: {
                Dana: {
                    name: "Dana",
                    type: "directory",
                    children: {
                        Desktop: {
                            name: "Desktop",
                            type: "directory",
                            children: buildDesktopChildren(),
                        },
                    },
                },
            },
        },
        Programme: {
            name: "Programme",
            type: "directory",
            children: {
                HACKTERM: {
                    name: "HACKTERM",
                    type: "directory",
                    children: {
                        "readme.txt": {
                            name: "readme.txt",
                            type: "file",
                            content: `HACKTERM v1.0
=============

A totally legitimate hacking terminal.
For educational purposes only.

Commands:
- Type 'help' for available commands
- Type 'sl' if you can't type 'ls' correctly

(c) 2026 Dana Industries`,
                        },
                    },
                },
                Winamp: {
                    name: "Winamp",
                    type: "directory",
                    children: {
                        "winamp.exe": {
                            name: "winamp.exe",
                            type: "executable",
                            content: "It really whips the llama's ass!",
                        },
                    },
                },
            },
        },
        DAS: {
            name: "DAS",
            type: "directory",
            children: {
                "kernel.welt": {
                    name: "kernel.welt",
                    type: "file",
                    content: SYS_KERNEL,
                },
                "display.welt": {
                    name: "display.welt",
                    type: "file",
                    content: SYS_DISPLAY,
                },
                "clock.welt": {
                    name: "clock.welt",
                    type: "file",
                    content: SYS_CLOCK,
                },
                "memory.welt": {
                    name: "memory.welt",
                    type: "file",
                    content: SYS_MEMORY,
                },
                "boot.welt": {
                    name: "boot.welt",
                    type: "file",
                    content: SYS_BOOT,
                },
                "config.welt": {
                    name: "config.welt",
                    type: "file",
                    content: SYS_CONFIG,
                },
                "syslog.txt": {
                    name: "syslog.txt",
                    type: "file",
                    content: SYS_LOG,
                },
                "grund.txt": {
                    name: "grund.txt",
                    type: "file",
                    content: GRUND_SPEC,
                    readonly: true,
                },
                "kernel.grund": {
                    name: "kernel.grund",
                    type: "file",
                    content: SYS_KERNEL_GRUND,
                    readonly: true,
                },
                "boot.grund": {
                    name: "boot.grund",
                    type: "file",
                    content: SYS_BOOT_GRUND,
                    readonly: true,
                },
            },
        },
    },
}

export function createFileSystem(): FileSystem {
    const root = structuredClone(FILESYSTEM_STRUCTURE)

    const weltDir =
        root.children?.Users?.children?.Dana?.children?.Desktop?.children?.WELT
            ?.children
    if (weltDir?.["MANUAL.txt"]) {
        weltDir["MANUAL.txt"].content = getWeltManual()
    }

    return {
        root,
        cwd: ["3:", "Users", "Dana", "Desktop"],
    }
}

let persistentFs: FileSystem | null = null

export function getSharedFilesystem(): FileSystem {
    if (!persistentFs) {
        persistentFs = createFileSystem()
    }
    return persistentFs
}

export function resetSharedFilesystem(): void {
    persistentFs = null
}
