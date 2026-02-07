import type { Severity } from "../../systemFileValidator"
import {
    GENERAL_MEMORY_MESSAGES,
    HEAP_CORRUPTION_MESSAGES,
    HEAP_UNINIT_MESSAGES,
    PAGE_FAULT_MESSAGES,
} from "../constants"

export function triggerMemoryFault(
    severity: Severity,
    broken: string[],
    values: Record<string, number>,
    onComplete: () => void,
    playSound: (type: string) => void
): void {
    const has = (key: string): boolean => broken.includes(key)
    let count: number
    let messages: string[]

    if (severity === "critical") {
        count = 8 + Math.floor(Math.random() * 4)
        messages = [
            ...HEAP_CORRUPTION_MESSAGES,
            ...PAGE_FAULT_MESSAGES,
            ...HEAP_UNINIT_MESSAGES,
            ...GENERAL_MEMORY_MESSAGES,
        ]
    } else {
        const bankCount = values["bankCount"] ?? 8
        count = Math.max(1, Math.min(12, bankCount))

        messages = [...GENERAL_MEMORY_MESSAGES]
        if (has("scan-loop")) messages.push(...HEAP_CORRUPTION_MESSAGES)
        if (has("page-table")) messages.push(...PAGE_FAULT_MESSAGES)
        if (has("heap-ready")) messages.push(...HEAP_UNINIT_MESSAGES)
    }

    spawnErrorPopups(count, messages, onComplete, playSound)
}

function spawnErrorPopups(
    count: number,
    messages: string[],
    onComplete: () => void,
    playSound: (type: string) => void
): void {
    let spawned = 0
    let zIndex = 95000

    const spawnNext = (): void => {
        if (spawned >= count) {
            onComplete()
            return
        }

        const msg = messages[Math.floor(Math.random() * messages.length)]
        spawnErrorPopup(msg, zIndex++, playSound)
        spawned++

        setTimeout(spawnNext, 300 + Math.random() * 700)
    }

    setTimeout(spawnNext, 500)
}

function spawnErrorPopup(
    message: string,
    zIndex: number,
    playSound: (type: string) => void
): void {
    const popup = document.createElement("div")
    popup.className = "system-error-popup"
    popup.style.zIndex = zIndex.toString()

    const maxX = window.innerWidth - 380
    const maxY = window.innerHeight - 180
    popup.style.left = `${60 + Math.random() * maxX}px`
    popup.style.top = `${60 + Math.random() * maxY}px`

    const titlebar = document.createElement("div")
    titlebar.className = "system-error-titlebar"
    titlebar.innerHTML = `<span>DAS</span><button class="system-error-close">\u00d7</button>`

    const body = document.createElement("div")
    body.className = "system-error-body"
    body.innerHTML = `<span class="system-error-icon">\u26d4</span><span>${message}</span>`

    const footer = document.createElement("div")
    footer.className = "system-error-footer"
    const okBtn = document.createElement("button")
    okBtn.textContent = "OK"
    okBtn.className = "system-error-ok"
    footer.appendChild(okBtn)

    popup.appendChild(titlebar)
    popup.appendChild(body)
    popup.appendChild(footer)
    document.body.appendChild(popup)

    const close = (): void => {
        popup.remove()
    }
    okBtn.addEventListener("click", close)
    titlebar
        .querySelector(".system-error-close")
        ?.addEventListener("click", close)

    makePopupDraggable(popup, titlebar)
    playSound("popup")
}

function makePopupDraggable(popup: HTMLElement, handle: HTMLElement): void {
    let dragging = false
    let offset = { x: 0, y: 0 }

    handle.addEventListener("mousedown", (e) => {
        if ((e.target as HTMLElement).closest(".system-error-close")) return
        dragging = true
        const rect = popup.getBoundingClientRect()
        offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        popup.style.zIndex = "95100"
    })

    const onMove = (e: MouseEvent): void => {
        if (!dragging) return
        popup.style.left = `${e.clientX - offset.x}px`
        popup.style.top = `${e.clientY - offset.y}px`
    }

    const onUp = (): void => {
        dragging = false
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
}
