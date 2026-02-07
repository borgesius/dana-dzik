import { randomSchopenhauer } from "../schopenhauer"

export function getWeltManual(): string {
    return `================================================
  WELT Programming Language - Reference Manual
  Version 0.3.1
  (c) 1994 Fatitech Industries
  Author: Dr. T. Pferd
================================================

${randomSchopenhauer()}

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

Register contents are initialized by the system
memory manager at boot time.

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

See 3:\\Users\\Dana\\Desktop\\WELT\\examples\\ for more.

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

${randomSchopenhauer()}
================================================`
}

export const WELT_HELLO = `; Hello World - WELT example
; The simplest possible program

ERWACHE
DING 0 = "Hello, World!"
VORSTELLUNG DING 0
VERNEINUNG`

export const WELT_FIZZBUZZ = `; FizzBuzz - WELT example
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

export const WELT_QUEST = `; The Extinction of Desire
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

export const WELT_BREATHE = `; breathe.welt
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
