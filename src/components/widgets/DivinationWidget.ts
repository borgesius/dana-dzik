import { log } from "@/core/Logger"
import type { DivinationProfile } from "@/lib/divination/types"

import { createWidgetFrame } from "./WidgetFrame"

interface DivinationApiResponse {
    ok: boolean
    data: DivinationProfile | null
    error?: string
}

export class DivinationWidget {
    private widget: HTMLElement

    constructor() {
        const content = document.createElement("div")
        content.className = "divination-widget-content"
        content.innerHTML = `<div>Expand to consult the oracle</div>`

        this.widget = createWidgetFrame("🔮 Divination", "divination-widget", {
            lazy: true,
            onFirstExpand: () => {
                content.innerHTML = `<div>Consulting the aether...</div>`
                void this.fetchDivination(content)
            },
        })

        this.widget.appendChild(content)
    }

    public getElement(): HTMLElement {
        return this.widget
    }

    private async fetchDivination(content: HTMLElement): Promise<void> {
        try {
            const response = await fetch("/api/divination")

            const contentType = response.headers.get("content-type")
            if (!contentType?.includes("application/json")) {
                content.innerHTML = `<div>Oracle unavailable</div>`
                return
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const result = (await response.json()) as DivinationApiResponse

            if (!result.ok || !result.data) {
                content.innerHTML = `<div>No reading yet — awaiting next deployment</div>`
                return
            }

            const p = result.data
            const bioPhys = Math.round(
                ((p.biorhythm.physical.value + 1) / 2) * 100
            )
            const bioEmot = Math.round(
                ((p.biorhythm.emotional.value + 1) / 2) * 100
            )
            const bioIntl = Math.round(
                ((p.biorhythm.intellectual.value + 1) / 2) * 100
            )

            content.innerHTML = `
                <div class="widget-familiar-row">
                    <span class="widget-familiar-emoji">${p.familiar.emoji}</span>
                    <span class="widget-familiar-name">${p.familiar.name}</span>
                </div>
                <div class="widget-bio-mini" title="Physical / Emotional / Intellectual">
                    <div class="widget-bio-bar">
                        <div class="widget-bio-bar-fill" style="width: ${bioPhys}%; background: #e74c3c;"></div>
                    </div>
                    <div class="widget-bio-bar">
                        <div class="widget-bio-bar-fill" style="width: ${bioEmot}%; background: #3498db;"></div>
                    </div>
                    <div class="widget-bio-bar">
                        <div class="widget-bio-bar-fill" style="width: ${bioIntl}%; background: #2ecc71;"></div>
                    </div>
                </div>
                <div class="widget-lucky">
                    ${p.horoscope.signEmoji} Lucky #${p.horoscope.luckyNumber}
                </div>
            `
        } catch (error) {
            log.widgets("Divination widget error: %O", error)
            content.innerHTML = `<div>The spirits are silent</div>`
        }
    }
}
