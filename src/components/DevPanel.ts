import { ROUTABLE_WINDOWS, type RoutableWindow } from "../config/routing"
import { getAchievementManager } from "../lib/achievements/AchievementManager"
import { ACHIEVEMENT_MAP } from "../lib/achievements/definitions"
import { getCollectionManager } from "../lib/autobattler/CollectionManager"
import { ALL_UNITS } from "../lib/autobattler/units"
import { isCalmMode, setCalmMode } from "../lib/calmMode"
import {
    getCosmeticManager,
    type CosmeticType,
} from "../lib/cosmetics/CosmeticManager"
import { COSMETIC_DEFINITIONS } from "../lib/cosmetics/definitions"
import { getMarketGame } from "../lib/marketGame/MarketEngine"
import { getPrestigeManager } from "../lib/prestige/PrestigeManager"
import { getCareerManager } from "../lib/progression/CareerManager"
import { getProgressionManager } from "../lib/progression/ProgressionManager"
import { saveManager } from "../lib/saveManager"
import { getThemeManager } from "../lib/themeManager"
import { getVeilManager } from "../lib/veil/VeilManager"
import type { WindowManager } from "./WindowManager"

export class DevPanel {
    private el: HTMLElement
    private visible = false
    private windowManager: WindowManager
    private dragOffset = { x: 0, y: 0 }
    private isDragging = false

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager
        this.el = this.build()
        document.body.appendChild(this.el)

        // Ctrl+Shift+D to toggle
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === "D") {
                e.preventDefault()
                this.toggle()
            }
        })
    }

    public toggle(): void {
        this.visible = !this.visible
        this.el.style.display = this.visible ? "flex" : "none"
    }

    public show(): void {
        this.visible = true
        this.el.style.display = "flex"
    }

    public hide(): void {
        this.visible = false
        this.el.style.display = "none"
    }

    // ── Build panel ──────────────────────────────────────────────────────────

    private build(): HTMLElement {
        const panel = document.createElement("div")
        panel.className = "dev-panel"
        panel.style.display = "none"

        // Header (draggable)
        const header = document.createElement("div")
        header.className = "dev-panel-header"
        header.innerHTML = `<span class="dev-panel-title">Dev Cheats</span>`
        const closeBtn = document.createElement("button")
        closeBtn.className = "dev-panel-close"
        closeBtn.textContent = "X"
        closeBtn.addEventListener("click", () => this.hide())
        header.appendChild(closeBtn)
        panel.appendChild(header)

        // Make draggable
        header.addEventListener("mousedown", (e) => {
            this.isDragging = true
            const rect = panel.getBoundingClientRect()
            this.dragOffset.x = e.clientX - rect.left
            this.dragOffset.y = e.clientY - rect.top
            e.preventDefault()
        })
        document.addEventListener("mousemove", (e) => {
            if (!this.isDragging) return
            panel.style.left = `${e.clientX - this.dragOffset.x}px`
            panel.style.top = `${e.clientY - this.dragOffset.y}px`
            panel.style.right = "auto"
        })
        document.addEventListener("mouseup", () => {
            this.isDragging = false
        })

        // Scrollable body
        const body = document.createElement("div")
        body.className = "dev-panel-body"

        body.appendChild(this.buildWindowsSection())
        body.appendChild(this.buildProgressionSection())
        body.appendChild(this.buildMarketSection())
        body.appendChild(this.buildPrestigeSection())
        body.appendChild(this.buildAutobattlerSection())
        body.appendChild(this.buildAchievementsSection())
        body.appendChild(this.buildCosmeticsSection())
        body.appendChild(this.buildVeilSection())
        body.appendChild(this.buildCareerSection())
        body.appendChild(this.buildSaveSection())

        panel.appendChild(body)
        return panel
    }

    // ── Section helpers ──────────────────────────────────────────────────────

    private createSection(title: string, collapsed = true): {
        section: HTMLElement
        content: HTMLElement
    } {
        const section = document.createElement("div")
        section.className = "dev-section"

        const header = document.createElement("div")
        header.className = "dev-section-header"
        header.innerHTML = `<span class="dev-section-arrow">${collapsed ? ">" : "v"}</span> ${title}`

        const content = document.createElement("div")
        content.className = "dev-section-content"
        content.style.display = collapsed ? "none" : "block"

        header.addEventListener("click", () => {
            const isHidden = content.style.display === "none"
            content.style.display = isHidden ? "block" : "none"
            const arrow = header.querySelector(
                ".dev-section-arrow"
            ) as HTMLElement
            if (arrow) arrow.textContent = isHidden ? "v" : ">"
        })

        section.appendChild(header)
        section.appendChild(content)
        return { section, content }
    }

    private btn(label: string, onClick: () => void): HTMLButtonElement {
        const b = document.createElement("button")
        b.className = "dev-btn"
        b.textContent = label
        b.addEventListener("click", () => {
            onClick()
            this.flash(b)
        })
        return b
    }

    private flash(el: HTMLElement): void {
        el.classList.add("dev-flash")
        setTimeout(() => el.classList.remove("dev-flash"), 300)
    }

    private inputRow(
        label: string,
        placeholder: string,
        onSubmit: (value: string) => void
    ): HTMLElement {
        const row = document.createElement("div")
        row.className = "dev-input-row"

        const input = document.createElement("input")
        input.type = "text"
        input.placeholder = placeholder
        input.className = "dev-input"

        const btn = this.btn(label, () => {
            onSubmit(input.value)
            input.value = ""
        })

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                onSubmit(input.value)
                input.value = ""
                this.flash(btn)
            }
        })

        row.appendChild(input)
        row.appendChild(btn)
        return row
    }

    private labelEl(text: string): HTMLElement {
        const el = document.createElement("div")
        el.className = "dev-label"
        el.textContent = text
        return el
    }

    private btnRow(...buttons: HTMLButtonElement[]): HTMLElement {
        const row = document.createElement("div")
        row.className = "dev-btn-row"
        buttons.forEach((b) => row.appendChild(b))
        return row
    }

    // ── Windows / Navigation ─────────────────────────────────────────────────

    private buildWindowsSection(): HTMLElement {
        const { section, content } = this.createSection("Windows / Navigation")

        content.appendChild(
            this.btn("Open All", () => {
                for (const id of ROUTABLE_WINDOWS) {
                    this.windowManager.openWindow(id)
                }
            })
        )

        const grid = document.createElement("div")
        grid.className = "dev-btn-grid"
        for (const id of ROUTABLE_WINDOWS) {
            grid.appendChild(
                this.btn(id, () =>
                    this.windowManager.openWindow(id as RoutableWindow)
                )
            )
        }
        content.appendChild(grid)

        return section
    }

    // ── Progression ──────────────────────────────────────────────────────────

    private buildProgressionSection(): HTMLElement {
        const { section, content } = this.createSection("Progression")
        const pm = getProgressionManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Level: ${pm.getLevel()} | XP: ${pm.getTotalXP()}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(
            this.inputRow("Set Level", "e.g. 25", (v) => {
                const level = parseInt(v, 10)
                if (!isNaN(level) && level >= 0) {
                    pm.devSetLevel(level)
                    saveManager.requestSave()
                    updateStatus()
                }
            })
        )

        content.appendChild(
            this.inputRow("Add XP", "e.g. 5000", (v) => {
                const xp = parseInt(v, 10)
                if (!isNaN(xp) && xp > 0) {
                    pm.addXP(xp)
                    saveManager.requestSave()
                    updateStatus()
                }
            })
        )

        content.appendChild(
            this.btnRow(
                this.btn("Lvl 5", () => {
                    pm.devSetLevel(5)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("Lvl 10", () => {
                    pm.devSetLevel(10)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("Lvl 20", () => {
                    pm.devSetLevel(20)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("Lvl 30", () => {
                    pm.devSetLevel(30)
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        return section
    }

    // ── Market / Economy ─────────────────────────────────────────────────────

    private buildMarketSection(): HTMLElement {
        const { section, content } = this.createSection("Market / Economy")
        const market = getMarketGame()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Cash: $${market.getCash().toFixed(2)} | Lifetime: $${market.getLifetimeEarnings().toFixed(2)} | Phase: ${market.getMaxUnlockedPhase()}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(this.labelEl("Add Cash"))
        content.appendChild(
            this.btnRow(
                this.btn("+$1K", () => {
                    market.devAddCash(1_000)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+$10K", () => {
                    market.devAddCash(10_000)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+$100K", () => {
                    market.devAddCash(100_000)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+$1M", () => {
                    market.devAddCash(1_000_000)
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        content.appendChild(this.labelEl("Phases"))
        content.appendChild(
            this.btnRow(
                ...([1, 2, 3, 4, 5, 6] as const).map((p) =>
                    this.btn(`Phase ${p}`, () => {
                        market.unlockPhase(p)
                        saveManager.requestSave()
                        updateStatus()
                    })
                )
            )
        )
        content.appendChild(
            this.btn("Unlock All Phases", () => {
                market.devUnlockAllPhases()
                saveManager.requestSave()
                updateStatus()
            })
        )

        return section
    }

    // ── Prestige / Ascension ─────────────────────────────────────────────────

    private buildPrestigeSection(): HTMLElement {
        const { section, content } = this.createSection("Prestige / Ascension")
        const pm = getPrestigeManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Prestige: ${pm.getCount()} | Hindsight: ${pm.getCurrency()} | Ascension: ${pm.getAscensionCount()} | Foresight: ${pm.getForesight()}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(
            this.inputRow("Set Prestige #", "e.g. 5", (v) => {
                const n = parseInt(v, 10)
                if (!isNaN(n) && n >= 0) {
                    pm.devSetPrestigeCount(n)
                    saveManager.requestSave()
                    updateStatus()
                }
            })
        )

        content.appendChild(this.labelEl("Add Hindsight"))
        content.appendChild(
            this.btnRow(
                this.btn("+10", () => {
                    pm.devAddHindsight(10)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+100", () => {
                    pm.devAddHindsight(100)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+1000", () => {
                    pm.devAddHindsight(1000)
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        content.appendChild(
            this.inputRow("Set Ascension #", "e.g. 2", (v) => {
                const n = parseInt(v, 10)
                if (!isNaN(n) && n >= 0) {
                    pm.devSetAscensionCount(n)
                    saveManager.requestSave()
                    updateStatus()
                }
            })
        )

        content.appendChild(this.labelEl("Add Foresight"))
        content.appendChild(
            this.btnRow(
                this.btn("+5", () => {
                    pm.devAddForesight(5)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+25", () => {
                    pm.devAddForesight(25)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+100", () => {
                    pm.devAddForesight(100)
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        return section
    }

    // ── Autobattler ──────────────────────────────────────────────────────────

    private buildAutobattlerSection(): HTMLElement {
        const { section, content } = this.createSection("Autobattler")
        const cm = getCollectionManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Wins: ${cm.getWonRuns()} | Runs: ${cm.getCompletedRuns()} | Units: ${cm.getCollectionSize()}/${ALL_UNITS.length} | Bosses: ${cm.getTotalBossesDefeated()}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(
            this.btnRow(
                this.btn("Unlock All Units", () => {
                    cm.devUnlockAllUnits()
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+5 Wins", () => {
                    cm.devAddWins(5)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("+10 Wins", () => {
                    cm.devAddWins(10)
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        content.appendChild(
            this.btnRow(
                this.btn("Record Win", () => {
                    cm.recordRunComplete(true, undefined, 0, [], 10)
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("Set 5 Bosses", () => {
                    cm.devSetBossesDefeated(5)
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        return section
    }

    // ── Achievements ─────────────────────────────────────────────────────────

    private buildAchievementsSection(): HTMLElement {
        const { section, content } = this.createSection("Achievements")
        const am = getAchievementManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Earned: ${am.getEarnedCount()} / ${am.getTotalCount()}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(
            this.btnRow(
                this.btn("Unlock All", () => {
                    for (const id of ACHIEVEMENT_MAP.keys()) {
                        am.earn(id as never)
                    }
                    saveManager.requestSave()
                    updateStatus()
                }),
                this.btn("Reset All", () => {
                    // Re-deserialize with empty data
                    am.deserialize({
                        earned: {},
                        counters: {},
                        sets: {},
                        reported: [],
                    })
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        content.appendChild(
            this.inputRow("Unlock by ID", "e.g. first-trade", (v) => {
                if (v.trim()) {
                    const result = am.earn(v.trim() as never)
                    if (result) {
                        saveManager.requestSave()
                        updateStatus()
                    } else {
                        console.warn(`[DevPanel] Could not earn achievement: ${v}`)
                    }
                }
            })
        )

        return section
    }

    // ── Cosmetics ────────────────────────────────────────────────────────────

    private buildCosmeticsSection(): HTMLElement {
        const { section, content } = this.createSection("Cosmetics")
        const cm = getCosmeticManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Unlocked: ${cm.getUnlockedCount()} / ${COSMETIC_DEFINITIONS.length}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(
            this.btn("Unlock All", () => {
                for (const def of COSMETIC_DEFINITIONS) {
                    cm.unlock(def.type, def.id)
                }
                saveManager.requestSave()
                updateStatus()
            })
        )

        const types: CosmeticType[] = [
            "cursor-trail",
            "wallpaper",
            "window-chrome",
        ]
        for (const type of types) {
            const defs = COSMETIC_DEFINITIONS.filter((d) => d.type === type)
            content.appendChild(this.labelEl(type))
            const grid = document.createElement("div")
            grid.className = "dev-btn-grid"
            for (const def of defs) {
                grid.appendChild(
                    this.btn(`${def.icon} ${def.id}`, () => {
                        cm.unlock(type, def.id)
                        cm.setActive(type, def.id)
                        saveManager.requestSave()
                        updateStatus()
                    })
                )
            }
            content.appendChild(grid)
        }

        return section
    }

    // ── Veil System ──────────────────────────────────────────────────────────

    private buildVeilSection(): HTMLElement {
        const { section, content } = this.createSection("Veil System")
        const vm = getVeilManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Completed: ${vm.getCompletedCount()}/5 | Active: ${vm.isActive() ? `Veil ${vm.getCurrentVeil()}` : "None"} | Next: ${vm.getNextVeilId() ?? "All done"}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(this.labelEl("Trigger Veil"))
        content.appendChild(
            this.btnRow(
                ...[0, 1, 2, 3, 4].map((id) =>
                    this.btn(`Veil ${id}`, () => {
                        vm.triggerVeil(id as 0 | 1 | 2 | 3 | 4)
                        updateStatus()
                    })
                )
            )
        )

        content.appendChild(this.labelEl("Complete Veil"))
        content.appendChild(
            this.btnRow(
                ...[0, 1, 2, 3, 4].map((id) =>
                    this.btn(`Complete ${id}`, () => {
                        vm.completeVeil(id as 0 | 1 | 2 | 3 | 4)
                        saveManager.requestSave()
                        updateStatus()
                    })
                )
            )
        )

        content.appendChild(
            this.btnRow(
                this.btn("Dismiss Active", () => {
                    vm.dismissVeil()
                    updateStatus()
                }),
                this.btn("Complete All", () => {
                    for (let i = 0; i <= 4; i++) {
                        vm.completeVeil(i as 0 | 1 | 2 | 3 | 4)
                    }
                    saveManager.requestSave()
                    updateStatus()
                })
            )
        )

        return section
    }

    // ── Career Tree ──────────────────────────────────────────────────────────

    private buildCareerSection(): HTMLElement {
        const { section, content } = this.createSection("Career Tree")
        const cm = getCareerManager()

        const status = document.createElement("div")
        status.className = "dev-status"
        const updateStatus = (): void => {
            status.textContent = `Career: ${cm.getActiveCareer() ?? "None"} | Skill Points: ${cm.getAvailableSkillPoints()}`
        }
        updateStatus()
        content.appendChild(status)

        content.appendChild(this.labelEl("Select / Switch Career"))
        const branches = [
            "engineering",
            "trading",
            "growth",
            "executive",
        ] as const
        content.appendChild(
            this.btnRow(
                ...branches.map((b) =>
                    this.btn(b, () => {
                        if (cm.getActiveCareer() === null) {
                            cm.selectCareer(b)
                        } else {
                            cm.switchCareer(b)
                        }
                        saveManager.requestSave()
                        updateStatus()
                    })
                )
            )
        )

        return section
    }

    // ── Save / Misc ──────────────────────────────────────────────────────────

    private buildSaveSection(): HTMLElement {
        const { section, content } = this.createSection("Save / Misc", false)

        content.appendChild(
            this.btnRow(
                this.btn("Force Save", () => {
                    saveManager.saveImmediate()
                }),
                this.btn("Dump State", () => {
                    const raw = localStorage.getItem("save")
                    if (raw) {
                        console.log(
                            "[DevPanel] Current save:",
                            JSON.parse(raw)
                        )
                    }
                }),
                this.btn("Reset", () => {
                    if (confirm("Reset all save data?")) {
                        saveManager.reset()
                    }
                })
            )
        )

        content.appendChild(
            this.btnRow(
                this.btn("Export Save", () => {
                    saveManager.saveImmediate()
                    const raw = localStorage.getItem("save")
                    if (raw) {
                        const blob = new Blob([raw], {
                            type: "application/json",
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `dana-dzik-save-${Date.now()}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                    }
                }),
                this.btn("Import Save", () => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = ".json"
                    input.addEventListener("change", () => {
                        const file = input.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (): void => {
                            try {
                                const text = reader.result as string
                                JSON.parse(text) // validate
                                localStorage.setItem("save", text)
                                window.location.reload()
                            } catch {
                                console.error("[DevPanel] Invalid save file")
                            }
                        }
                        reader.readAsText(file)
                    })
                    input.click()
                })
            )
        )

        content.appendChild(this.labelEl("Theme"))
        const themes = ["win95", "mac-classic", "apple2", "c64"] as const
        content.appendChild(
            this.btnRow(
                ...themes.map((t) =>
                    this.btn(t, () => {
                        getThemeManager().setTheme(t)
                    })
                )
            )
        )

        content.appendChild(
            this.btn(`Calm Mode: ${isCalmMode() ? "ON" : "OFF"}`, function (this: void) {
                setCalmMode(!isCalmMode())
                saveManager.requestSave()
                // Update the button text
                const btn = document.querySelector(
                    '.dev-btn[data-calm-toggle]'
                ) as HTMLElement
                if (btn) btn.textContent = `Calm Mode: ${isCalmMode() ? "ON" : "OFF"}`
            })
        )
        // Tag the calm mode button for self-update
        const lastBtn = content.lastElementChild as HTMLElement
        if (lastBtn) lastBtn.setAttribute("data-calm-toggle", "1")

        return section
    }
}

// ── window.__dev console API ─────────────────────────────────────────────────

interface DevApi {
    addCash: (amount: number) => void
    addXP: (amount: number) => void
    setLevel: (level: number) => void
    unlockAllAchievements: () => void
    unlockAllCosmetics: () => void
    unlockAllUnits: () => void
    unlockAllPhases: () => void
    triggerVeil: (id: number) => void
    completeVeil: (id: number) => void
    addHindsight: (amount: number) => void
    addForesight: (amount: number) => void
    setPrestige: (count: number) => void
    openWindow: (id: string) => void
    save: () => void
    exportSave: () => string | null
    importSave: (json: string) => void
    state: () => unknown
    togglePanel: () => void
}

export function attachDevApi(
    panel: DevPanel,
    windowManager: WindowManager
): void {
    const api: DevApi = {
        addCash: (amount) => {
            getMarketGame().devAddCash(amount)
            saveManager.requestSave()
        },
        addXP: (amount) => {
            getProgressionManager().addXP(amount)
            saveManager.requestSave()
        },
        setLevel: (level) => {
            getProgressionManager().devSetLevel(level)
            saveManager.requestSave()
        },
        unlockAllAchievements: () => {
            const am = getAchievementManager()
            for (const id of ACHIEVEMENT_MAP.keys()) {
                am.earn(id as never)
            }
            saveManager.requestSave()
        },
        unlockAllCosmetics: () => {
            const cm = getCosmeticManager()
            for (const def of COSMETIC_DEFINITIONS) {
                cm.unlock(def.type, def.id)
            }
            saveManager.requestSave()
        },
        unlockAllUnits: () => {
            getCollectionManager().devUnlockAllUnits()
            saveManager.requestSave()
        },
        unlockAllPhases: () => {
            getMarketGame().devUnlockAllPhases()
            saveManager.requestSave()
        },
        triggerVeil: (id) => {
            getVeilManager().triggerVeil(id as 0 | 1 | 2 | 3 | 4)
        },
        completeVeil: (id) => {
            getVeilManager().completeVeil(id as 0 | 1 | 2 | 3 | 4)
            saveManager.requestSave()
        },
        addHindsight: (amount) => {
            getPrestigeManager().devAddHindsight(amount)
            saveManager.requestSave()
        },
        addForesight: (amount) => {
            getPrestigeManager().devAddForesight(amount)
            saveManager.requestSave()
        },
        setPrestige: (count) => {
            getPrestigeManager().devSetPrestigeCount(count)
            saveManager.requestSave()
        },
        openWindow: (id) => {
            if (
                ROUTABLE_WINDOWS.includes(id as RoutableWindow)
            ) {
                windowManager.openWindow(id as RoutableWindow)
            } else {
                console.warn(`[__dev] Unknown window: ${id}`)
            }
        },
        save: () => saveManager.saveImmediate(),
        exportSave: () => localStorage.getItem("save"),
        importSave: (json) => {
            try {
                JSON.parse(json) // validate
                localStorage.setItem("save", json)
                console.log("[__dev] Save imported. Reload to apply.")
            } catch {
                console.error("[__dev] Invalid JSON")
            }
        },
        state: () => {
            const raw = localStorage.getItem("save")
            return raw ? JSON.parse(raw) : null
        },
        togglePanel: () => panel.toggle(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__dev = api
    console.log(
        "%c[DevPanel] Dev cheats loaded. Use window.__dev for console access.",
        "color: #00ff88; font-weight: bold"
    )
    console.log(
        "%cAvailable: __dev.addCash(n), __dev.setLevel(n), __dev.unlockAllAchievements(), __dev.triggerVeil(n), etc.",
        "color: #888"
    )
}
