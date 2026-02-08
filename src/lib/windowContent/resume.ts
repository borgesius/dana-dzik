import { getLocaleManager } from "../localeManager"
import { getCareerManager } from "../progression/CareerManager"
import {
    CAREER_BRANCHES,
    CAREER_NODE_MAP,
    type CareerNodeDef,
    ENGINEERING_STARTER_NODE,
    getNodesForBranch,
} from "../progression/careers"

// ── Base resume entries (always shown, even before unlock) ──────────────────

const BASE_EXPERIENCE: CareerNodeDef = ENGINEERING_STARTER_NODE
const BASE_EDUCATION: CareerNodeDef =
    CAREER_NODE_MAP.get("edu-undergrad") ?? ({} as CareerNodeDef)

export function getResumeContent(): string {
    return `<div id="resume-content" class="resume-content"></div>`
}

export function renderResumeWindow(): void {
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

    const shownNodeIds = new Set<string>()
    let experienceHtml = ""

    for (const branchId of allBranches) {
        const nodes = getNodesForBranch(branchId)
        const unlocked = nodes
            .filter((n) => career.isNodeUnlocked(n.id))
            .sort((a, b) => b.tier - a.tier)

        for (const node of unlocked) {
            shownNodeIds.add(node.id)
            const isDormant =
                node.branch !== activeCareer && node.branch !== "education"
            experienceHtml += renderResumeEntry(node, isDormant)
        }
    }

    // Always show the base Volley entry if it hasn't appeared via unlock
    if (!shownNodeIds.has(BASE_EXPERIENCE.id) && BASE_EXPERIENCE.id) {
        experienceHtml =
            renderResumeEntry(BASE_EXPERIENCE, false) + experienceHtml
    }

    html += experienceHtml

    // ── Education section ───────────────────────────────────────────────
    html += `<hr /><h2>${lm.t("resume.education")}</h2>`

    const eduNodes = getNodesForBranch("education")
    const unlockedEdu = eduNodes
        .filter((n) => career.isNodeUnlocked(n.id))
        .sort((a, b) => b.tier - a.tier)

    let educationHtml = ""
    const shownEduIds = new Set<string>()

    for (const node of unlockedEdu) {
        shownEduIds.add(node.id)
        educationHtml += renderResumeEntry(node, false)
    }

    // Always show the base UChicago entry if it hasn't appeared via unlock
    if (!shownEduIds.has(BASE_EDUCATION.id) && BASE_EDUCATION.id) {
        educationHtml = renderResumeEntry(BASE_EDUCATION, false) + educationHtml
    }

    html += educationHtml

    // ── Skills summary (active bonuses) ─────────────────────────────────
    html += renderSkillsSummary()

    container.innerHTML = html
}

// ── Render a single resume entry (read-only) ────────────────────────────────

function renderResumeEntry(node: CareerNodeDef, isDormant: boolean): string {
    return `
        <div class="resume-entry ${isDormant ? "dormant" : ""}">
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

// ── Skills summary (all active bonuses) ─────────────────────────────────────

function renderSkillsSummary(): string {
    const career = getCareerManager()
    const allNodes = [
        ...CAREER_BRANCHES.flatMap((b) => getNodesForBranch(b.id)),
        ...getNodesForBranch("education"),
    ]

    const activeNodes = allNodes.filter((n) => career.isNodeUnlocked(n.id))
    if (activeNodes.length === 0) return ""

    const activeCareer = career.getActiveCareer()

    let html = `
        <hr />
        <h2>Skills &amp; Proficiencies</h2>
        <ul class="resume-skills-list">
    `

    for (const node of activeNodes) {
        const isDormant =
            node.branch !== activeCareer && node.branch !== "education"
        html += `<li class="${isDormant ? "dormant" : ""}">${node.bonusLabel}${isDormant ? " (50%)" : ""}</li>`
    }

    html += `</ul>`
    return html
}
