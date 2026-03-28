import { onAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { getCareerManager } from "../progression/CareerManager"
import {
    CAREER_BRANCHES,
    CAREER_NODE_MAP,
    type CareerNodeDef,
    COVAL_STARTER_NODE,
    EDUCATION_STARTER_NODE,
    EDUCATION_UNDERGRAD_NODE,
    ENGINEERING_STARTER_NODE,
    getNodesForBranch,
    SKILLS_STARTER_NODE,
} from "../progression/careers"
import { renderCareerTreeWindow } from "./careerTree"

// ── Base resume entries (always shown, even before unlock) ──────────────────

const BASE_EXPERIENCE: CareerNodeDef[] = [
    COVAL_STARTER_NODE,
    ENGINEERING_STARTER_NODE,
]
const BASE_EDUCATION: CareerNodeDef[] = [
    EDUCATION_UNDERGRAD_NODE,
    EDUCATION_STARTER_NODE,
]

const RESUME_CAREER_TREE_ID = "resume-career-tree"

let pendingCareerTab = false

/**
 * Request that the resume window switch to the Career Development tab.
 * Works whether the window is already open or about to be rendered.
 */
export function requestResumeCareerTab(): void {
    pendingCareerTab = true
    // If already rendered, switch immediately
    const tab = document.querySelector<HTMLElement>(
        '.resume-tab[data-tab="career"]'
    )
    if (tab) {
        tab.click()
        pendingCareerTab = false
    }
}

export function getResumeContent(): string {
    return `<div id="resume-wrapper" class="resume-tabs-wrapper"></div>`
}

export function renderResumeWindow(): void {
    const wrapper = document.getElementById("resume-wrapper")
    if (!wrapper) return

    const lm = getLocaleManager()
    const career = getCareerManager()

    wrapper.innerHTML = `
        <div class="resume-tab-bar">
            <button class="resume-tab active" data-tab="resume">${lm.t("resume.tabResume")}</button>
            <button class="resume-tab" data-tab="career">${lm.t("resume.tabCareer")}</button>
        </div>
        <div id="resume-content" class="resume-content resume-tab-pane active"></div>
        <div id="${RESUME_CAREER_TREE_ID}" class="career-tree-content resume-tab-pane"></div>
    `

    renderResumeTab()
    wireResumeTabs(wrapper)

    const refreshVisibleTab = (): void => {
        if (!document.getElementById("resume-wrapper")) return
        const activeTab = wrapper.querySelector(".resume-tab.active")
        if (activeTab?.getAttribute("data-tab") === "career") {
            renderCareerTreeWindow(RESUME_CAREER_TREE_ID)
        }
        renderResumeTab()
    }

    career.on("nodeUnlocked", refreshVisibleTab)
    career.on("careerSwitched", refreshVisibleTab)
    onAppEvent("progression:level-up", refreshVisibleTab)

    if (pendingCareerTab) {
        const careerTab = wrapper.querySelector<HTMLElement>(
            '.resume-tab[data-tab="career"]'
        )
        if (careerTab) careerTab.click()
        pendingCareerTab = false
    }
}

// ── Tab switching ───────────────────────────────────────────────────────────

function wireResumeTabs(wrapper: HTMLElement): void {
    const tabs = wrapper.querySelectorAll<HTMLElement>(".resume-tab")
    const resumePane = wrapper.querySelector("#resume-content") as HTMLElement
    const careerPane = wrapper.querySelector(
        `#${RESUME_CAREER_TREE_ID}`
    ) as HTMLElement

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab

            tabs.forEach((t) => t.classList.remove("active"))
            tab.classList.add("active")

            if (target === "career") {
                resumePane.classList.remove("active")
                careerPane.classList.add("active")
                renderCareerTreeWindow(RESUME_CAREER_TREE_ID)
            } else {
                careerPane.classList.remove("active")
                resumePane.classList.add("active")
                renderResumeTab()
            }
        })
    })
}

// ── Resume tab content ──────────────────────────────────────────────────────

function renderResumeTab(): void {
    const container = document.getElementById("resume-content")
    if (!container) return

    const career = getCareerManager()
    const lm = getLocaleManager()

    let html = `
        <header>
            <h1>${lm.t("resume.name")}</h1>
            <a href="mailto:danadzik@gmail.com">danadzik@gmail.com</a>
        </header>
        <hr />
    `

    // ── Experience section ──────────────────────────────────────────────
    html += `<h2>${lm.t("resume.experience")}</h2>`

    const activeCareer = career.getActiveCareer()
    const allBranches = [
        ...(activeCareer ? [activeCareer] : []),
        ...CAREER_BRANCHES.filter((b) => b.id !== activeCareer).map(
            (b) => b.id
        ),
    ]

    // Determine the active job (highest-tier unlocked node in active career)
    let activeJobId: string | null = null
    if (activeCareer) {
        const activeNodes = getNodesForBranch(activeCareer)
            .filter((n) => career.isNodeUnlocked(n.id))
            .sort((a, b) => b.tier - a.tier)
        if (activeNodes.length > 0) {
            activeJobId = activeNodes[0].id
        }
    }
    // If no career nodes unlocked, Coval (first BASE_EXPERIENCE entry) is the active job
    if (!activeJobId) {
        activeJobId = BASE_EXPERIENCE[0].id
    }

    const shownNodeIds = new Set<string>()
    let experienceHtml = ""

    for (const branchId of allBranches) {
        // Use unlock order from career manager (most recent first)
        const unlockedIds = career.getUnlockedNodesForBranch(branchId)
        const unlocked = [...unlockedIds]
            .reverse()
            .map((id) => CAREER_NODE_MAP.get(id))
            .filter((n): n is CareerNodeDef => n !== undefined)

        for (const node of unlocked) {
            shownNodeIds.add(node.id)
            const isDormant =
                node.branch !== activeCareer && node.branch !== "education"
            const isActiveJob = node.id === activeJobId
            experienceHtml += renderResumeEntry(node, isDormant, isActiveJob)
        }
    }

    // Always show base entries (Coval first, then Volley) if not shown via unlock
    let baseHtml = ""
    for (const baseEntry of BASE_EXPERIENCE) {
        if (!shownNodeIds.has(baseEntry.id) && baseEntry.id) {
            const isActiveJob = baseEntry.id === activeJobId
            baseHtml += renderResumeEntry(baseEntry, false, isActiveJob)
        }
    }
    experienceHtml = baseHtml + experienceHtml

    html += experienceHtml

    // ── Education section ───────────────────────────────────────────────
    html += `<hr /><h2>${lm.t("resume.education")}</h2>`

    // Use unlock order from career manager (most recent first)
    const unlockedEduIds = career.getUnlockedNodesForBranch("education")
    const unlockedEdu = [...unlockedEduIds]
        .reverse()
        .map((id) => CAREER_NODE_MAP.get(id))
        .filter((n): n is CareerNodeDef => n !== undefined)

    let educationHtml = ""
    const shownEduIds = new Set<string>()

    for (const node of unlockedEdu) {
        shownEduIds.add(node.id)
        educationHtml += renderResumeEntry(node, false)
    }

    // Always show base education entries if they haven't appeared via unlock
    for (const base of BASE_EDUCATION) {
        if (!shownEduIds.has(base.id) && base.id) {
            educationHtml += renderResumeEntry(base, false)
        }
    }

    html += educationHtml

    // ── Skills section ────────────────────────────────────────────────────
    html += renderSkillsSection()

    container.innerHTML = html
}

// ── Render a single resume entry (read-only) ────────────────────────────────

function renderResumeEntry(
    node: CareerNodeDef,
    isDormant: boolean,
    isActiveJob: boolean = false
): string {
    const classes = [
        "resume-entry",
        isDormant ? "dormant" : "",
        isActiveJob ? "active-job" : "",
    ]
        .filter(Boolean)
        .join(" ")

    return `
        <div class="${classes}">
            <div class="resume-entry-header">
                <strong class="resume-entry-title">${node.name}</strong>
                <span class="resume-entry-dates">${node.dateRange}</span>
            </div>
            <div class="resume-entry-company">${node.company}</div>
            <ul class="resume-entry-bullets">
                ${node.bullets.map((b) => `<li>${b}</li>`).join("")}
            </ul>
            <div class="resume-entry-bonus ${isDormant ? "dormant" : ""}">
                ${isDormant ? "🔒 " : "✓ "}${node.bonusLabel}${isDormant ? " (dormant — 50%)" : ""}
            </div>
        </div>
    `
}

// ── Skills section (base skills + unlockable skill nodes) ───────────────────

function renderSkillsSection(): string {
    const career = getCareerManager()
    const lm = getLocaleManager()

    let html = `
        <hr />
        <h2>${lm.t("resume.skills")}</h2>
    `

    // Always show the base skills line
    html += `
        <div class="resume-entry">
            <strong class="resume-entry-title">${SKILLS_STARTER_NODE.name}</strong>
            <div class="resume-entry-bonus">✓ ${SKILLS_STARTER_NODE.bonusLabel}</div>
        </div>
    `

    // Show unlocked skill nodes (in order unlocked)
    const unlockedSkillIds = career.getUnlockedNodesForBranch("skills")
    const unlockedSkills = unlockedSkillIds
        .map((id) => CAREER_NODE_MAP.get(id))
        .filter((n): n is CareerNodeDef => n !== undefined)

    for (const node of unlockedSkills) {
        html += `
            <div class="resume-entry">
                <strong class="resume-entry-title">${node.name}</strong>
                <div class="resume-entry-bonus">✓ ${node.bonusLabel}</div>
            </div>
        `
    }

    return html
}
