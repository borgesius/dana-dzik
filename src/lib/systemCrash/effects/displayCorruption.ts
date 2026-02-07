import type { Severity } from "../../systemFileValidator"

export function triggerDisplayCorruption(
    severity: Severity,
    broken: string[],
    values: Record<string, number>,
    onComplete: () => void
): void {
    const body = document.body
    const has = (key: string): boolean => broken.includes(key)

    if (severity === "critical") {
        runDisplayPhases(
            body,
            [
                { cls: "sys-corrupt-heavy", duration: 2000 },
                { cls: "sys-corrupt-tear", duration: 1500 },
                { cls: "sys-corrupt-color", duration: 3000 },
                { cls: "sys-corrupt-shake", duration: 2000 },
            ],
            onComplete
        )
        return
    }

    const phases: Array<{ cls: string; duration: number }> = []

    if (has("resolution-width") || has("resolution-height")) {
        const scaleX = values["width"] !== undefined ? values["width"] / 640 : 1
        const scaleY =
            values["height"] !== undefined ? values["height"] / 480 : 1

        if (scaleX !== 1 || scaleY !== 1) {
            const clampedX = Math.max(0.3, Math.min(2.5, scaleX))
            const clampedY = Math.max(0.3, Math.min(2.5, scaleY))
            body.style.transform = `scale(${clampedX}, ${clampedY})`
            body.style.transformOrigin = "top left"

            setTimeout(() => {
                body.style.transform = ""
                body.style.transformOrigin = ""
            }, 12000)
        }

        phases.push({ cls: "sys-corrupt-shake", duration: 1500 })
    }

    if (has("color-depth")) {
        const depth = values["colorDepth"] ?? 0
        const saturation = Math.max(0, Math.min(500, (depth / 16) * 100))
        body.style.filter = `saturate(${saturation}%)`

        setTimeout(() => {
            body.style.filter = ""
        }, 12000)
    }

    if (has("refresh-rate")) {
        const rate = values["refreshRate"] ?? 0
        const flickerDuration = rate > 0 ? Math.max(500, 15000 / rate) : 3000
        phases.push({
            cls: "sys-corrupt-heavy",
            duration: Math.min(flickerDuration, 4000),
        })
    }

    if (has("palette-loop")) {
        phases.push({ cls: "sys-corrupt-color", duration: 3000 })
    }

    if (has("vsync-loop")) {
        phases.push({ cls: "sys-corrupt-tear", duration: 2000 })
    }

    if (phases.length === 0) {
        phases.push({ cls: "sys-corrupt-shake", duration: 1000 })
    }

    runDisplayPhases(body, phases, onComplete)
}

function runDisplayPhases(
    body: HTMLElement,
    phases: Array<{ cls: string; duration: number }>,
    onComplete: () => void
): void {
    let delay = 500
    for (const phase of phases) {
        setTimeout(() => {
            body.classList.add(phase.cls)
            setTimeout(() => {
                body.classList.remove(phase.cls)
            }, phase.duration)
        }, delay)
        delay += phase.duration * 0.6
    }

    setTimeout(() => {
        body.classList.add("sys-corrupt-mild")
    }, delay)

    setTimeout(() => {
        body.classList.remove("sys-corrupt-mild")
        onComplete()
    }, delay + 15000)
}
