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

; Flush registers
DING 0 = 0
DING 1 = 0
DING 2 = 0
DING 3 = 4
DING 4 = 0
DING 5 = 0
DING 6 = 0
DING 7 = 97

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

export const SYS_CONFIG = `; ==========================================
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

export const SYS_LOG = `DAS SYSTEM LOG
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

export const GRUND_SPEC = `================================================
  GRUND - Assembly Notation for the DAS-8
  WORKING DRAFT - NOT FOR DISTRIBUTION
  Dr. T. Pferd, Fatitech Industries
================================================

STATUS: Incomplete. This document describes the
low-level instruction notation for the DAS-8
quaternary core. WELT programs compile to GRUND
before execution.

To compile: welt --grund <filename.welt>
To execute: grund <filename.grund>

DESIGN PRINCIPLES
-----------------
Each instruction is a three-character word from
a constructed morphemic system. The first two
characters encode the WILL (what the machine
intends), the final character encodes the
REPRESENTATION (how the result manifests).

Schopenhauer teaches that will and representation
are inseparable aspects of every act. So too in
GRUND: every instruction simultaneously expresses
an intention and a mode of appearance.

Representation suffixes:
  r = result appears in register
  v = result is void (side effect only)
  n = result pushed to ring (next)
  b = result popped from ring (back)
  k = result is carry flag

INSTRUCTION TABLE (16 opcodes, 4 categories)
---------------------------------------------

Category 0 -- Perception (I/O):
  mav rN          Output register N
  vir rN          Input to register N
  mak             Output carry flag state
  pav rN, rM      Compare rN with rM, set flags

Category 1 -- Taking (Data):
  tar rN, VAL     Load value into register N
  tir rN, rM      Indirect load (TODO: finalize)
  tin rN          Push register to ring buffer
  tab rN          Pop from ring buffer to register

Category 2 -- Combining (Arithmetic):
  kur rN, rM, rK  Add: rN = rM + rK
  sur rN, rM, rK  Subtract: rN = rM - rK
  mur rN, rM, rK  Multiply: rN = rM * rK
  dur rN, rM, rK  Divide: rN = rM / rK

Category 3 -- Reaching (Flow):
  rav ADDR         Jump (unconditional)
  rev ADDR         Jump if equal (after pav)
  rgv ADDR         Jump if greater (after pav)
  nov              Halt

THE RING (Ixion's Wheel)
------------------------
The DAS-8 has no call stack. Instead it provides
a 4-slot circular buffer -- the Ring.

Push with tin, pop with tab. When the ring is
full, pushing overwrites the oldest value. As
Schopenhauer observed of Ixion's wheel: desire
turns endlessly, and what was grasped is lost
to what is grasped next.

The WELT compiler uses the ring for temporary
storage when register pressure exceeds 8 slots.

MACHINE NOTES
-------------
- Only = and > comparisons are native. Other
  comparisons (!=, <, >=, <=) are synthesized
  from sequences of pav/rev/rgv.

- No native MOD instruction. Modulo compiles to:
    dur  tmp, a, b    ; tmp = a / b
    mur  tmp, tmp, b  ; tmp = (a/b) * b
    sur  dst, a, tmp  ; dst = a - (a/b)*b

- Carry flag persists between arithmetic ops.
  The WELT interpreter hides this; GRUND exposes
  it. Use mak to inspect.

- Strings do not exist at the GRUND level. String
  literals become data section entries referenced
  by label (s0, s1, ...).

PROGRAM FORMAT
--------------
  .data
    s0: "Hello"
    s1: "World"

  .code
    tar  r0, s0
    mav  r0
    nov

OPEN QUESTIONS
--------------
- tir (indirect load): addressing mode unclear.
  Current quaternary address space too small for
  practical indirect addressing. Revisit when
  expanding to DAS-16?

- Should the ring dispatch an interrupt on
  overflow? Currently silent. Schopenhauer would
  say: suffering is silent.

- Consider adding a "negate carry" instruction
  (nak?) to complete the perception category
  symmetrically. But 16 opcodes fit the
  quaternary encoding perfectly. 17 would break
  the fourfold structure.

================================================
  (C) 1994 Fatitech Industries
  Dr. T. Pferd - P.O. Box 1888, Turin, Italy
================================================`

export const SYS_KERNEL_GRUND = `; === GRUND (DAS-8 Q4) ===
; source: kernel.welt
; compiled by welt 0.3.1

.data
  s0: "IRQ_HANDLED"
  s1: "tick"
  s2: "KERNEL OK"

.code
  tar  r0, 0
  tar  r1, 255
  tar  r2, 4
.L0:
  pav  r0, r1
  rgv  .L1
  rev  .L1
  dur  r3, r0, r2
  pav  r3, 0
  rev  .L2
  rav  .L3
.L2:
  tar  r4, s0
.L3:
  kur  r0, r0, r7
  tar  r7, 1
  kur  r0, r0, r7
  rav  .L0
.L1:
  tar  r5, 18
  tar  r6, 0
.L4:
  pav  r6, r5
  rgv  .L5
  rev  .L5
  tar  r7, s1
  tar  r7, 1
  kur  r6, r6, r7
  rav  .L4
.L5:
  tar  r7, s2
  mav  r7
  nov`

export const SYS_BOOT_GRUND = `; === GRUND (DAS-8 Q4) ===
; source: boot.welt
; compiled by welt 0.3.1

.data
  s0: "POST: CPU... OK"
  s1: "POST: RAM... OK"
  s2: "POST: HDD... OK"
  s3: "POST: VGA... OK"
  s4: "BOOT OK"

.code
  tar  r0, 0
  tar  r1, 4
.L0:
  pav  r0, r1
  rgv  .L1
  rev  .L1
  pav  r0, 0
  rev  .L2
  rav  .L3
.L2:
  tar  r7, s0
  mav  r7
.L3:
  pav  r0, 1
  rev  .L4
  rav  .L5
.L4:
  tar  r7, s1
  mav  r7
.L5:
  pav  r0, 2
  rev  .L6
  rav  .L7
.L6:
  tar  r7, s2
  mav  r7
.L7:
  pav  r0, 3
  rev  .L8
  rav  .L9
.L8:
  tar  r7, s3
  mav  r7
.L9:
  tar  r7, 1
  kur  r0, r0, r7
  rav  .L0
.L1:
  tar  r7, s4
  mav  r7
  nov`
