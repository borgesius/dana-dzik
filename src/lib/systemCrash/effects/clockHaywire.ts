import type { Severity } from "../../systemFileValidator"

export function triggerClockHaywire(
    severity: Severity,
    broken: string[],
    values: Record<string, number>,
    onComplete: () => void
): void {
    const clock = document.querySelector(".tray-clock") as HTMLElement
    if (!clock) {
        onComplete()
        return
    }

    const has = (key: string): boolean => broken.includes(key)

    if (severity === "critical") {
        runFullClockHaywire(clock, onComplete)
        return
    }

    if (has("tick-rate")) {
        const tickRate = values["tickRate"] ?? 18
        const ratio = tickRate / 18
        runClockSpeedShift(clock, ratio, onComplete)
        return
    }

    if (has("calibration-loop")) {
        runClockDrift(clock, onComplete)
        return
    }

    if (has("rtc-sync")) {
        runClockFrozen(clock, onComplete)
        return
    }

    if (has("pit-divisor")) {
        runClockJumpy(clock, values["pitDivisor"] ?? 65536, onComplete)
        return
    }

    runFullClockHaywire(clock, onComplete)
}

function runFullClockHaywire(clock: HTMLElement, onComplete: () => void): void {
    const glitchTimes = [
        "88:88:88",
        "??:?? AM",
        "25:61 PM",
        "-4:30 PM",
        "NaN:NaN",
        "\u221e:00 PM",
        "00:00:00",
        "99:99 AM",
        "12:00 AM PM",
        "3... 2... 1",
        "ERROR",
        "DESYNC",
        "\u2592\u2592:\u2592\u2592",
        "HELP",
        "1997",
    ]

    let ticks = 0
    const maxTicks = 80
    const interval = setInterval(() => {
        clock.textContent =
            glitchTimes[Math.floor(Math.random() * glitchTimes.length)]
        clock.classList.toggle("crash-clock-glitch", Math.random() > 0.5)
        ticks++

        if (ticks >= maxTicks) {
            clearInterval(interval)
            clock.classList.remove("crash-clock-glitch")
            clock.textContent = "??:?? AM"
            onComplete()
        }
    }, 100)
}

function runClockSpeedShift(
    clock: HTMLElement,
    ratio: number,
    onComplete: () => void
): void {
    const clampedRatio = Math.max(0.1, Math.min(20, ratio))
    const intervalMs = Math.max(50, 1000 / clampedRatio)
    let elapsed = 0
    const baseTime = new Date()

    const interval = setInterval(() => {
        elapsed += intervalMs * clampedRatio
        const fakeTime = new Date(baseTime.getTime() + elapsed)
        clock.textContent = fakeTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        })
        clock.classList.toggle("crash-clock-glitch", Math.random() > 0.8)

        if (elapsed > 60000 * clampedRatio) {
            clearInterval(interval)
            clock.classList.remove("crash-clock-glitch")
            onComplete()
        }
    }, intervalMs)
}

function runClockDrift(clock: HTMLElement, onComplete: () => void): void {
    const glitchTimes = [
        "??:?? AM",
        "25:61 PM",
        "NaN:NaN",
        "ERROR",
        "DESYNC",
        "88:88",
    ]
    let ticks = 0
    const maxTicks = 40

    const interval = setInterval(() => {
        if (Math.random() > 0.4) {
            clock.textContent =
                glitchTimes[Math.floor(Math.random() * glitchTimes.length)]
            clock.classList.add("crash-clock-glitch")
        } else {
            const now = new Date()
            clock.textContent = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })
            clock.classList.remove("crash-clock-glitch")
        }
        ticks++

        if (ticks >= maxTicks) {
            clearInterval(interval)
            clock.classList.remove("crash-clock-glitch")
            clock.textContent = "??:?? AM"
            onComplete()
        }
    }, 200)
}

function runClockFrozen(clock: HTMLElement, onComplete: () => void): void {
    const frozenTime = "12:00 AM"
    clock.textContent = frozenTime
    clock.classList.add("crash-clock-glitch")

    setTimeout(() => {
        clock.classList.remove("crash-clock-glitch")
        onComplete()
    }, 15000)
}

function runClockJumpy(
    clock: HTMLElement,
    pitDivisor: number,
    onComplete: () => void
): void {
    const jumpMagnitude = Math.abs(pitDivisor - 65536) / 6553
    let ticks = 0
    const maxTicks = 50

    const interval = setInterval(() => {
        const now = new Date()
        const offset = (Math.random() - 0.5) * jumpMagnitude * 3600000
        const jumped = new Date(now.getTime() + offset)
        clock.textContent = jumped.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        clock.classList.toggle("crash-clock-glitch", Math.random() > 0.6)
        ticks++

        if (ticks >= maxTicks) {
            clearInterval(interval)
            clock.classList.remove("crash-clock-glitch")
            onComplete()
        }
    }, 150)
}
