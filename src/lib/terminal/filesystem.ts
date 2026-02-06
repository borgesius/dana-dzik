import { DESKTOP_ITEMS } from "../../config"

export type FileType = "file" | "directory" | "executable" | "shortcut"

export interface FSNode {
    name: string
    type: FileType
    windowId?: string
    content?: string
    children?: Record<string, FSNode>
}

export interface FileSystem {
    root: FSNode
    cwd: string[]
}

const WELT_MANUAL = `================================================
  WELT Programming Language - Reference Manual
  Version 0.3.1
  (c) 1994 Fatitech Industries
  Author: Dr. T. Pferd
================================================

"The world is my representation." -- Schopenhauer

OVERVIEW
--------
WELT is the native programming language of the
DAS (Ding an Sich) system. It was designed in
1994 to make full use of the DAS-8's quaternary
architecture.

The name derives from Schopenhauer's magnum opus,
"Die Welt als Wille und Vorstellung" (The World
as Will and Representation). As Schopenhauer
observed, the world presents itself to us in two
aspects: the will (raw input, desire) and the
representation (what we perceive). WELT reflects
this duality in its I/O model.

QUICK START
-----------
  welt hello.welt       Run a program
  edit hello.welt       Edit a program
  cat hello.welt        View source code

LANGUAGE REFERENCE
------------------

  ERWACHE               Begin program (required)
  VERNEINUNG            End program (halt)

  DING n = expr         Store value in slot n
                        (n = 0 through 7)
  VORSTELLUNG expr      Output to display
  WILLE n               Read input into slot n

  WENN expr DANN        If / then
  SONST                 Else
  ENDE                  End block

  SOLANGE expr          While loop
  ENDE                  End loop

  Operators:  + - * / MOD
  Comparison: = != > < >= <=
  Comments:   ; (semicolon to end of line)

MEMORY (DING)
-------------
The DAS-8 provides 8 general-purpose registers,
designated DING 0 through DING 7. Each DING holds
4 quaternary digits (numeric range 0-255) or a
text string. The quaternary design reflects
Schopenhauer's fourfold root of sufficient reason.

As Schopenhauer tells us, we never apprehend the
thing-in-itself (Ding an sich) directly -- only
its representation. Similarly, a DING's contents
are only revealed through VORSTELLUNG.

  HARDWARE NOTICE: The ALU carry flag is not
  automatically cleared between operations.
  Sequential arithmetic may produce unexpected
  results if prior operations overflow. This is
  by design.

INPUT & OUTPUT
--------------
WILLE (the will) reads raw input from the user.
As the will is blind and striving, WILLE accepts
whatever the user provides without judgment.

VORSTELLUNG (representation) renders a value to
the display buffer.

  NOTE: Rapid consecutive VORSTELLUNG calls may
  cause display flicker on different CRT models.

EXAMPLE
-------
  ERWACHE
  DING 0 = "Hello, World!"
  VORSTELLUNG DING 0
  VERNEINUNG

See C:\\Users\\Dana\\Desktop\\WELT\\examples\\ for more.

KNOWN ISSUES
------------
- Programs exceeding 1818 loop iterations will
  trigger the thermal protection circuit.
- Numeric values exceeding 255 will overflow
  silently due to the quaternary register width.

SUPPORT
-------
For technical support, mail a self-addressed
stamped envelope to:
  Fatitech Industries
  Attn: Dr. T. Pferd
  P.O. Box 1888
  Turin, Italy

"Life is suffering." -- Schopenhauer
================================================`

const WELT_HELLO = `; Hello World - WELT example
; The simplest possible program

ERWACHE
DING 0 = "Hello, World!"
VORSTELLUNG DING 0
VERNEINUNG`

const WELT_FIZZBUZZ = `; FizzBuzz - WELT example
; Prints 1 to 50, replacing multiples
; of 3 with Fizz, 5 with Buzz, both
; with FizzBuzz.

ERWACHE
DING 0 = 1

SOLANGE DING 0 <= 50
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

VERNEINUNG`

const WELT_QUEST = `; The Extinction of Desire
; A meditation in WELT
;
; DING 0 = room
; DING 1 = attachments carried
; DING 4 = input
; DING 5 = state (0=play, 1=done)
; DING 6 = temp

ERWACHE
DING 0 = 0
DING 1 = 0
DING 5 = 0

VORSTELLUNG "================================"
VORSTELLUNG "   THE EXTINCTION OF DESIRE"
VORSTELLUNG "================================"
VORSTELLUNG ""
VORSTELLUNG "You open your eyes."
VORSTELLUNG ""

SOLANGE DING 5 = 0

  WENN DING 0 = 0 DANN
    VORSTELLUNG "A bright room. Objects line every"
    VORSTELLUNG "surface: glassware, trinkets, old"
    VORSTELLUNG "photographs. Each one pulls at you."
    WENN DING 1 > 0 DANN
      DING 6 = "You carry " + DING 1 + " attachments."
      VORSTELLUNG DING 6
    ENDE
    VORSTELLUNG "Commands: TAKE, EAST"
  ENDE

  WENN DING 0 = 1 DANN
    VORSTELLUNG "A dark room. What you carried feels"
    VORSTELLUNG "heavier here. The weight of wanting"
    VORSTELLUNG "presses down on everything."
    WENN DING 1 > 0 DANN
      DING 6 = "You carry " + DING 1 + " attachments."
      VORSTELLUNG DING 6
      VORSTELLUNG "Commands: RELEASE, WEST, NORTH"
    SONST
      VORSTELLUNG "Your hands are empty."
      VORSTELLUNG "Commands: WEST, NORTH"
    ENDE
  ENDE

  WENN DING 0 = 2 DANN
    VORSTELLUNG "A still pool. Your reflection stares"
    VORSTELLUNG "back at you, then dissolves."
    WENN DING 1 > 0 DANN
      DING 6 = "You carry " + DING 1 + " attachments."
      VORSTELLUNG DING 6
      VORSTELLUNG "Commands: RELEASE, SOUTH"
    SONST
      VORSTELLUNG "You carry nothing. A door has"
      VORSTELLUNG "appeared where none was before."
      VORSTELLUNG "Commands: SOUTH, ENTER"
    ENDE
  ENDE

  VORSTELLUNG ""
  WILLE 4

  WENN DING 4 = "take" DANN
    WENN DING 0 = 0 DANN
      DING 1 = DING 1 + 1
      VORSTELLUNG "You pick something up. It feels"
      VORSTELLUNG "important. ...But you are not"
      VORSTELLUNG "sure why."
    ENDE
  ENDE

  WENN DING 4 = "release" DANN
    WENN DING 1 > 0 DANN
      DING 1 = DING 1 - 1
      WENN DING 1 = 0 DANN
        VORSTELLUNG "You let go of the last thing."
        VORSTELLUNG "Your hands are empty."
        VORSTELLUNG "You feel lighter than before."
      SONST
        VORSTELLUNG "You set something down."
        VORSTELLUNG "It meant less than you thought."
      ENDE
    SONST
      VORSTELLUNG "You have nothing to release."
    ENDE
  ENDE

  WENN DING 4 = "east" DANN
    WENN DING 0 = 0 DANN
      DING 0 = 1
    ENDE
  ENDE

  WENN DING 4 = "west" DANN
    WENN DING 0 = 1 DANN
      DING 0 = 0
    ENDE
  ENDE

  WENN DING 4 = "north" DANN
    WENN DING 0 = 1 DANN
      DING 0 = 2
    ENDE
  ENDE

  WENN DING 4 = "south" DANN
    WENN DING 0 = 2 DANN
      DING 0 = 1
    ENDE
  ENDE

  WENN DING 4 = "enter" DANN
    WENN DING 0 = 2 DANN
      WENN DING 1 = 0 DANN
        DING 5 = 1
        VORSTELLUNG ""
        VORSTELLUNG "You step through."
        VORSTELLUNG ""
        VORSTELLUNG "An empty room."
        VORSTELLUNG "No objects. No desire."
        VORSTELLUNG "No VORSTELLUNG. No WILLE."
        VORSTELLUNG ""
        VORSTELLUNG "Nothing remains to want."
      ENDE
    ENDE
  ENDE

  VORSTELLUNG ""
ENDE

VERNEINUNG`

const WELT_BREATHE = `; breathe.welt
; CRT persistence creates the visual rhythm.
; Do not adjust your monitor.

ERWACHE
DING 0 = 0
VORSTELLUNG "Close your eyes."
VORSTELLUNG ""
SOLANGE DING 0 < 4
  VORSTELLUNG "    . . . breathe . . .    "
  VORSTELLUNG "    . . . breathe . . .    "
  VORSTELLUNG ""
  DING 0 = DING 0 + 1
ENDE
VORSTELLUNG "Open your eyes."
VERNEINUNG`

export const SYS_KERNEL = `; ==========================================
; DAS KERNEL v4.51
; (C) 1997 Fatitech Industries
; ==========================================
; DO NOT MODIFY THIS FILE.
; System stability depends on the integrity
; of this module. Unauthorized changes will
; cause a FATAL EXCEPTION.
;
; Interrupt vector table initialization and
; process scheduler for quaternary core.

ERWACHE
DING 0 = 0
DING 1 = 255
DING 2 = 4

; Initialize IVT slots
SOLANGE DING 0 < DING 1
  DING 3 = DING 0 MOD DING 2
  WENN DING 3 = 0 DANN
    DING 4 = "IRQ_HANDLED"
  ENDE
  DING 0 = DING 0 + 1
ENDE

; Scheduler heartbeat
DING 5 = 18
DING 6 = 0
SOLANGE DING 6 < DING 5
  DING 7 = "tick"
  DING 6 = DING 6 + 1
ENDE

VORSTELLUNG "KERNEL OK"
VERNEINUNG`

export const SYS_DISPLAY = `; ==========================================
; DAS DISPLAY DRIVER v2.1
; (C) 1997 Fatitech Industries
; ==========================================
; DO NOT MODIFY THIS FILE.
; Controls CRT framebuffer and refresh
; timing. Changes will cause DISPLAY
; CORRUPTION.
;
; Manages all VORSTELLUNG operations for
; the system's 640x480 display output.

ERWACHE
DING 0 = 640
DING 1 = 480
DING 2 = 16

; Initialize color palette
DING 3 = 0
SOLANGE DING 3 < DING 2
  DING 4 = DING 3 * 16
  DING 3 = DING 3 + 1
ENDE

; Sync framebuffer
DING 5 = 60
DING 6 = 0
SOLANGE DING 6 < DING 5
  DING 7 = "vsync"
  DING 6 = DING 6 + 1
ENDE

VORSTELLUNG "DISPLAY OK"
VERNEINUNG`

export const SYS_CLOCK = `; ==========================================
; DAS SYSTEM CLOCK v1.3
; (C) 1997 Fatitech Industries
; ==========================================
; DO NOT MODIFY THIS FILE.
; Manages system timer interrupt (IRQ 0)
; and real-time clock sync. Changes will
; DESYNCHRONIZE the system clock.

ERWACHE
DING 0 = 0
DING 1 = 65536
DING 2 = 18

; Calibrate PIT channel 0
DING 3 = 0
DING 4 = 0
SOLANGE DING 4 < DING 2
  DING 5 = DING 4 * DING 3
  DING 4 = DING 4 + 1
ENDE

; RTC sync
DING 6 = 32
DING 7 = DING 6 / 2

VORSTELLUNG "CLOCK OK"
VERNEINUNG`

export const SYS_MEMORY = `; ==========================================
; DAS MEMORY MANAGER v3.0
; (C) 1997 Fatitech Industries
; ==========================================
; DO NOT MODIFY THIS FILE.
; Handles memory allocation and garbage
; collection for quaternary address space.
; Changes will cause MEMORY FAULTS.

ERWACHE
DING 0 = 0
DING 1 = 8
DING 2 = 0

; Scan memory banks
SOLANGE DING 0 < DING 1
  DING 3 = DING 0 * 32
  DING 4 = DING 3 + 255
  DING 2 = DING 2 + DING 4
  DING 0 = DING 0 + 1
ENDE

; Initialize page table
DING 5 = DING 2 / 4
DING 6 = 0
DING 7 = "HEAP_READY"

VORSTELLUNG "MEMORY OK"
VERNEINUNG`

export const SYS_BOOT = `; ==========================================
; DAS BOOT SEQUENCE v4.51
; (C) 1997 Fatitech Industries
; ==========================================
; DO NOT MODIFY THIS FILE.
; POST and system initialization routine.
; Changes will trigger a SYSTEM REBOOT.

ERWACHE
DING 0 = 0
DING 1 = 4

; POST checks
SOLANGE DING 0 < DING 1
  WENN DING 0 = 0 DANN
    VORSTELLUNG "POST: CPU... OK"
  ENDE
  WENN DING 0 = 1 DANN
    VORSTELLUNG "POST: RAM... OK"
  ENDE
  WENN DING 0 = 2 DANN
    VORSTELLUNG "POST: HDD... OK"
  ENDE
  WENN DING 0 = 3 DANN
    VORSTELLUNG "POST: VGA... OK"
  ENDE
  DING 0 = DING 0 + 1
ENDE

DING 7 = "BOOT OK"
VORSTELLUNG DING 7
VERNEINUNG`

const SYS_CONFIG = `; ==========================================
; DAS SYSTEM CONFIGURATION
; (C) 1997 Fatitech Industries
; ==========================================
; Master configuration. Loaded at boot
; before all other system modules.
;
; Module load order:
;   1. kernel.welt   - Process scheduler
;   2. memory.welt   - Allocation manager
;   3. display.welt  - CRT driver
;   4. clock.welt    - Timer interrupt
;   5. boot.welt     - POST sequence

ERWACHE
DING 0 = 5
DING 1 = 0

SOLANGE DING 1 < DING 0
  WENN DING 1 = 0 DANN
    VORSTELLUNG "LOAD: kernel.welt"
  ENDE
  WENN DING 1 = 1 DANN
    VORSTELLUNG "LOAD: memory.welt"
  ENDE
  WENN DING 1 = 2 DANN
    VORSTELLUNG "LOAD: display.welt"
  ENDE
  WENN DING 1 = 3 DANN
    VORSTELLUNG "LOAD: clock.welt"
  ENDE
  WENN DING 1 = 4 DANN
    VORSTELLUNG "LOAD: boot.welt"
  ENDE
  DING 1 = DING 1 + 1
ENDE

VORSTELLUNG "CONFIG OK"
VERNEINUNG`

const SYS_LOG = `DAS SYSTEM LOG
==================

[1997-03-14 08:00:01] BOOT: POST sequence initiated
[1997-03-14 08:00:02] KERNEL: Interrupt vector table loaded
[1997-03-14 08:00:03] MEMORY: 8 banks scanned, 2296 qbytes free
[1997-03-14 08:00:03] DISPLAY: CRT initialized at 640x480x16
[1997-03-14 08:00:04] CLOCK: PIT calibrated, 18 ticks/sec
[1997-03-14 08:00:04] BOOT: All modules loaded
[1997-03-14 08:00:04] KERNEL: System ready
[1997-03-14 09:14:22] CLOCK: Minor drift detected (+3 ticks)
[1997-03-14 11:30:00] MEMORY: GC freed 128 qbytes
[1997-03-14 14:07:11] DISPLAY: Vsync missed (frame 84201)
[1997-03-14 14:07:11] DISPLAY: Recovered
[1997-03-14 17:45:33] KERNEL: Process WELT.EXE started (PID 7)
[1997-03-14 17:45:58] KERNEL: Process WELT.EXE halted (PID 7)
[1997-03-14 19:00:00] CLOCK: Drift corrected
[1997-03-14 23:59:59] KERNEL: Day boundary, resetting counters
[1997-03-15 00:00:01] MEMORY: Overnight defrag complete
...
[2026-??-?? ??:??:??] CLOCK: Cannot determine current time
[2026-??-?? ??:??:??] KERNEL: System age exceeds expected
                       operational lifetime by 10,522 days
[2026-??-?? ??:??:??] KERNEL: Continuing anyway`

const DESKTOP_FILE_CONTENT: Partial<Record<string, string>> = {
    "Internet Explorer.lnk":
        "[InternetShortcut]\nURL=file:///C:/Program Files/Internet Explorer/iexplore.exe",
    "about_me.doc": `=== ABOUT DANA ===

Hi, my name is Dana.
I'm a software engineer who lives in San Francisco.

Interests:
- Running
- Cycling
- Technology
- Literature
- Philosophy

Cat: Felix Ramon Vanderbilt

[Use 'open about_me.doc' to view full profile]`,
    "cool_projects.zip": `Archive: cool_projects.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1337  2026-02-05 12:00   this-website/
     2048  2026-02-05 12:00   secret-projects/
---------                     -------
     3385                     2 files

[Use 'open cool_projects.zip' to extract and view]`,
    "resume.pdf": `%PDF-1.4
================================
        DANA DZIK
================================

EXPERIENCE
----------
Senior Software Engineer
Volley - San Francisco, CA
2021 - Present

EDUCATION
---------
University of Chicago
B.A. with Honors in Mathematics and Philosophy

[Use 'open resume.pdf' to view full document]`,
    "bookmarks.url": `[InternetShortcut]
URL=about:bookmarks
IconIndex=0`,
}

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
        content: WELT_MANUAL,
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
    name: "C:",
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
        "Program Files": {
            name: "Program Files",
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
        WINDOWS: {
            name: "WINDOWS",
            type: "directory",
            children: {
                system32: {
                    name: "system32",
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
                    },
                },
            },
        },
    },
}

export function createFileSystem(): FileSystem {
    return {
        root: FILESYSTEM_STRUCTURE,
        cwd: ["C:", "Users", "Dana", "Desktop"],
    }
}

export function resolvePath(fs: FileSystem, pathStr: string): string[] | null {
    let parts: string[]

    if (pathStr.startsWith("C:\\") || pathStr.startsWith("C:/")) {
        parts = pathStr
            .slice(3)
            .split(/[/\\]/)
            .filter((p) => p.length > 0)
        parts.unshift("C:")
    } else if (pathStr === "C:" || pathStr === "C:\\") {
        parts = ["C:"]
    } else {
        parts = [...fs.cwd]
        const segments = pathStr.split(/[/\\]/).filter((p) => p.length > 0)
        for (const seg of segments) {
            if (seg === ".") {
                continue
            } else if (seg === "..") {
                if (parts.length > 1) {
                    parts.pop()
                }
            } else {
                parts.push(seg)
            }
        }
    }

    return parts
}

function findChild(
    children: Record<string, FSNode>,
    name: string
): FSNode | null {
    if (children[name]) return children[name]
    const lower = name.toLowerCase()
    for (const key of Object.keys(children)) {
        if (key.toLowerCase() === lower) return children[key]
    }
    return null
}

export function getNode(fs: FileSystem, path: string[]): FSNode | null {
    if (path.length === 0) return null
    if (path[0] !== "C:") return null

    let node = fs.root
    for (let i = 1; i < path.length; i++) {
        if (node.type !== "directory" || !node.children) {
            return null
        }
        const child = findChild(node.children, path[i])
        if (!child) {
            return null
        }
        node = child
    }

    return node
}

export function getNodeAtPath(fs: FileSystem, pathStr: string): FSNode | null {
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) return null
    return getNode(fs, resolved)
}

export function getCurrentNode(fs: FileSystem): FSNode | null {
    return getNode(fs, fs.cwd)
}

export function formatPath(path: string[]): string {
    if (path.length === 1 && path[0] === "C:") {
        return "C:\\"
    }
    return path.join("\\")
}

export function changeDirectory(
    fs: FileSystem,
    pathStr: string
): { success: boolean; error?: string } {
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) {
        return { success: false, error: `Invalid path: ${pathStr}` }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return {
            success: false,
            error: `The system cannot find the path specified: ${pathStr}`,
        }
    }

    if (node.type !== "directory") {
        return { success: false, error: `Not a directory: ${pathStr}` }
    }

    fs.cwd = resolved
    return { success: true }
}

export function listDirectory(fs: FileSystem): {
    entries: Array<{ name: string; type: FileType }>
    error?: string
} {
    const node = getCurrentNode(fs)
    if (!node || node.type !== "directory" || !node.children) {
        return { entries: [], error: "Cannot list: not a directory" }
    }

    const entries = Object.values(node.children).map((child) => ({
        name: child.name,
        type: child.type,
    }))

    entries.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1
        if (a.type !== "directory" && b.type === "directory") return 1
        return a.name.localeCompare(b.name)
    })

    return { entries }
}

export function getFileContent(
    fs: FileSystem,
    filename: string
): { content?: string; windowId?: string; error?: string } {
    const resolved = resolvePath(fs, filename)
    if (!resolved) {
        return { error: `Invalid path: ${filename}` }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return { error: `File not found: ${filename}` }
    }

    if (node.type === "directory") {
        return { error: `${filename} is a directory` }
    }

    return { content: node.content, windowId: node.windowId }
}

export function getExecutableWindowId(
    fs: FileSystem,
    filename: string
): string | null {
    const resolved = resolvePath(fs, filename)
    if (!resolved) return null

    const node = getNode(fs, resolved)
    if (!node) return null

    return node.windowId ?? null
}

export function writeFile(
    fs: FileSystem,
    pathStr: string,
    content: string
): { success: boolean; error?: string } {
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) {
        return { success: false, error: `Invalid path: ${pathStr}` }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return { success: false, error: `File not found: ${pathStr}` }
    }

    if (node.type === "directory") {
        return { success: false, error: `${pathStr} is a directory` }
    }

    node.content = content
    return { success: true }
}

export function createFile(
    fs: FileSystem,
    dirPathStr: string,
    name: string,
    content: string
): { success: boolean; error?: string } {
    const resolved = resolvePath(fs, dirPathStr)
    if (!resolved) {
        return { success: false, error: `Invalid path: ${dirPathStr}` }
    }

    const dirNode = getNode(fs, resolved)
    if (!dirNode) {
        return {
            success: false,
            error: `Directory not found: ${dirPathStr}`,
        }
    }

    if (dirNode.type !== "directory") {
        return { success: false, error: `Not a directory: ${dirPathStr}` }
    }

    if (!dirNode.children) {
        dirNode.children = {}
    }

    if (dirNode.children[name]) {
        return { success: false, error: `File already exists: ${name}` }
    }

    dirNode.children[name] = {
        name,
        type: "file",
        content,
    }

    return { success: true }
}

export function buildTree(
    fs: FileSystem,
    path: string[] = fs.cwd,
    prefix: string = ""
): string {
    const node = getNode(fs, path)
    if (!node) return ""

    const lines: string[] = []
    const name = path.length === 1 ? path[0] + "\\" : path[path.length - 1]

    if (path.length === fs.cwd.length) {
        lines.push(name)
    }

    if (node.type === "directory" && node.children) {
        const children = Object.values(node.children)
        children.forEach((child, index) => {
            const last = index === children.length - 1
            const connector = last ? "└── " : "├── "
            const childPrefix = prefix + (last ? "    " : "│   ")

            lines.push(prefix + connector + child.name)

            if (child.type === "directory" && child.children) {
                const childPath = [...path, child.name]
                const subtree = buildTree(fs, childPath, childPrefix)
                if (subtree) {
                    const subtreeLines = subtree.split("\n").slice(1)
                    lines.push(...subtreeLines)
                }
            }
        })
    }

    return lines.join("\n")
}
