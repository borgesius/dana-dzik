interface WidgetFrameOptions {
    lazy?: boolean
    onFirstExpand?: () => void
}

export function createWidgetFrame(
    title: string,
    id: string,
    options?: WidgetFrameOptions
): HTMLElement {
    const widget = document.createElement("div")
    widget.className = "widget"
    widget.id = id

    const titlebar = document.createElement("div")
    titlebar.className = "widget-titlebar"
    titlebar.innerHTML = `
        <span class="widget-title">${title}</span>
        <button class="widget-btn minimize" title="Minimize">_</button>
    `

    const minimizeBtn = titlebar.querySelector(".minimize") as HTMLButtonElement

    if (options?.lazy) {
        widget.classList.add("minimized")
        minimizeBtn.textContent = "□"
    }

    let firstExpandFired = false
    minimizeBtn.addEventListener("click", () => {
        widget.classList.toggle("minimized")
        minimizeBtn.textContent = widget.classList.contains("minimized")
            ? "□"
            : "_"

        if (
            !firstExpandFired &&
            !widget.classList.contains("minimized") &&
            options?.onFirstExpand
        ) {
            firstExpandFired = true
            options.onFirstExpand()
        }
    })

    makeDraggable(widget, titlebar)

    widget.appendChild(titlebar)
    return widget
}

function makeDraggable(widget: HTMLElement, handle: HTMLElement): void {
    let isDragging = false
    let offsetX = 0
    let offsetY = 0

    handle.style.cursor = "grab"

    handle.addEventListener("mousedown", (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest(".widget-btn")) return

        isDragging = true
        handle.style.cursor = "grabbing"

        if (!widget.classList.contains("widget-dragged")) {
            const rect = widget.getBoundingClientRect()
            widget.style.position = "fixed"
            widget.style.left = `${rect.left}px`
            widget.style.top = `${rect.top}px`
            widget.style.width = `${rect.width}px`
            widget.style.margin = "0"
            widget.classList.add("widget-dragged")
        }

        const rect = widget.getBoundingClientRect()
        offsetX = e.clientX - rect.left
        offsetY = e.clientY - rect.top

        const onMouseMove = (e: MouseEvent): void => {
            if (!isDragging) return
            widget.style.left = `${e.clientX - offsetX}px`
            widget.style.top = `${e.clientY - offsetY}px`
        }

        const onMouseUp = (): void => {
            isDragging = false
            handle.style.cursor = "grab"
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
    })
}
