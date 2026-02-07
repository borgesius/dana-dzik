import { BSOD_TEXT } from "../constants"

export function triggerBSOD(onComplete: () => void): void {
    setTimeout(() => {
        document.body.classList.add("crash-flicker")

        setTimeout(() => {
            document.body.classList.remove("crash-flicker")
            showBSODOverlay(onComplete)
        }, 600)
    }, 800)
}

function showBSODOverlay(_onComplete: () => void): void {
    const overlay = document.createElement("div")
    overlay.className = "bsod-overlay"

    const content = document.createElement("pre")
    content.className = "bsod-text"
    content.textContent = BSOD_TEXT
    overlay.appendChild(content)

    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
        overlay.classList.add("active")
    })

    const handleKey = (): void => {
        document.removeEventListener("keydown", handleKey)
        overlay.removeEventListener("click", handleKey)
        window.location.reload()
    }
    document.addEventListener("keydown", handleKey)
    overlay.addEventListener("click", handleKey)
}
