export type SystemEffect =
    | "bsod"
    | "display-corrupt"
    | "clock-haywire"
    | "memory-fault"
    | "restart"

export const FILE_EFFECTS: Record<string, SystemEffect> = {
    "kernel.welt": "bsod",
    "display.welt": "display-corrupt",
    "clock.welt": "clock-haywire",
    "memory.welt": "memory-fault",
    "boot.welt": "restart",
}

export const HEAP_CORRUPTION_MESSAGES = [
    "HEAP CORRUPTION DETECTED",
    "HEAP CORRUPTION DETECTED at 0x00004A2F",
    "Double free in heap segment 3",
]

export const PAGE_FAULT_MESSAGES = [
    "Page fault in non-paged area",
    "PAGE_FAULT_IN_NONPAGED_AREA (0x00000050)",
    "Invalid page table entry at 0x0000BEEF",
]

export const HEAP_UNINIT_MESSAGES = [
    "Heap not initialized -- HEAP_READY not set",
    "Cannot allocate: heap manager offline",
    "Fatal: malloc called before HEAP_READY",
]

export const GENERAL_MEMORY_MESSAGES = [
    "Not enough memory to complete this operation.",
    "Segmentation fault at 0x0000BEEF",
    "Stack overflow in DAS",
    "Fatal: cannot allocate 0 bytes",
    "General protection fault in module WELT.DLL",
    "Exception 0x80000002: ARRAY_BOUNDS_EXCEEDED",
    "IRQL_NOT_LESS_OR_EQUAL",
    "MEMORY_MANAGEMENT (0x0000001A)",
    "Process terminated: resource exhaustion (vital essence depleted)",
]

export const BSOD_TEXT = `
   DAS (Ding an Sich)


   A fatal exception 0E has occurred at 0028:C0034B03 in
   VXD WELT(01) + 00010E36. The current application will
   be terminated.

   *  The system has been halted because modification of
      3:\\DAS\\kernel.welt has compromised
      the integrity of the kernel process scheduler.

   *  Press any key to restart your computer. You will
      lose any unsaved information in all applications.




                    Press any key to continue _`
