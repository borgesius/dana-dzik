import { getLocaleManager } from "../localeManager"
import {
    getCareerManager,
    type CareerManager,
} from "../progression/CareerManager"
import {
    CAREER_BRANCHES,
    getNodesForBranch,
    type CareerNodeDef,
} from "../progression/careers"
import type { CareerBranch } from "../progression/types"

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

    const activeCareer = career.getActiveCareer()

    // If no career selected, show career selection prompt
    if (!activeCareer) {
        html += renderCareerSelection()
    } else {
        html += renderExperience(career, activeCareer)
    }

    // Education section (always shown — entries render as resume items too)
    html += `
        <hr />
        <h2>${lm.t("resume.education")}</h2>
    `
    const eduNodes = getNodesForBranch("education")
    html += renderBranchEntries(career, eduNodes, true)

    // Skills summary (active bonuses)
    if (activeCareer) {
        html += renderSkillsSummary(career)
    }

    container.innerHTML = html
    wireButtons(container, career)
}

// ── Career selection (shown before any career is picked) ────────────────────

function renderCareerSelection(): string {
    let html = `
        <h2>Choose Your Career Path</h2>
        <p class="career-prompt">Select a career to begin building your experience.</p>
        <div class="career-selection-grid">
    `

    for (const branch of CAREER_BRANCHES) {
        html += `
            <button class="career-select-btn" data-branch="${branch.id}">
                <div class="career-select-name">${branch.name}</div>
                <div class="career-select-desc">${branch.description}</div>
            </button>
        `
    }

    html += `</div>`
    return html
}

// ── Experience section ──────────────────────────────────────────────────────

function renderExperience(
    career: CareerManager,
    activeCareer: CareerBranch
): string {
    const availablePoints = career.getAvailableSkillPoints()

    let html = `
        <h2>${lm().t("resume.experience")}</h2>
        <div class="skill-points-display">
            Skill Points Available: <strong>${availablePoints}</strong>
        </div>
    `

    // Collect ALL unlocked experience entries across all branches, sorted by
    // tier descending (most senior first) — like a real resume
    const allBranches: (CareerBranch | "education")[] = [
        activeCareer,
        ...CAREER_BRANCHES.filter((b) => b.id !== activeCareer).map(
            (b) => b.id
        ),
    ]

    for (const branchId of allBranches) {
        const nodes = getNodesForBranch(branchId)
        if (branchId === "education") continue // handled separately
        html += renderBranchEntries(career, nodes, false)
    }

    // Next available position to unlock (teaser)
    html += renderNextPosition(career, activeCareer)

    // Career switch section
    html += renderCareerSwitch(career, activeCareer)

    return html
}

// ── Branch entries — unlocked nodes as resume experience items ──────────────

function renderBranchEntries(
    career: CareerManager,
    nodes: CareerNodeDef[],
    isEducation: boolean
): string {
    // Show unlocked entries in reverse tier order (most recent/senior first)
    const unlocked = nodes
        .filter((n) => career.isNodeUnlocked(n.id))
        .sort((a, b) => b.tier - a.tier)

    if (unlocked.length === 0 && !isEducation) return ""

    let html = ""

    for (const node of unlocked) {
        const isDormant =
            !isEducation &&
            node.branch !== career.getActiveCareer() &&
            node.branch !== "education"

        html += `
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

    // For education, show locked nodes as grayed-out teasers
    if (isEducation) {
        const locked = nodes
            .filter((n) => !career.isNodeUnlocked(n.id))
            .sort((a, b) => a.tier - b.tier)
        for (const node of locked) {
            const canUnlock = career.canUnlockNode(node.id)
            html += renderLockedEntry(node, canUnlock)
        }
    }

    return html
}

// ── Next available position (teaser for the next unlock) ────────────────────

function renderNextPosition(
    career: CareerManager,
    activeCareer: CareerBranch
): string {
    const nodes = getNodesForBranch(activeCareer)
    const locked = nodes
        .filter((n) => !career.isNodeUnlocked(n.id))
        .sort((a, b) => a.tier - b.tier)

    if (locked.length === 0) return ""

    let html = `<div class="resume-next-positions">`
    for (const node of locked) {
        const canUnlock = career.canUnlockNode(node.id)
        html += renderLockedEntry(node, canUnlock)
    }
    html += `</div>`
    return html
}

function renderLockedEntry(node: CareerNodeDef, canUnlock: boolean): string {
    const prereqsMet = node.prerequisites.every((p) =>
        getCareerManager().isNodeUnlocked(p)
    )

    if (canUnlock) {
        return `
            <div class="resume-entry available">
                <div class="resume-entry-header">
                    <strong class="resume-entry-title">${node.name}</strong>
                    <span class="resume-entry-dates">${node.dateRange}</span>
                </div>
                <div class="resume-entry-company">${node.company}</div>
                <div class="resume-entry-bonus available">${node.bonusLabel}</div>
                <button class="node-unlock-btn" data-node="${node.id}">Accept Position (1 SP)</button>
            </div>
        `
    }

    return `
        <div class="resume-entry locked ${prereqsMet ? "" : "prereq-missing"}">
            <div class="resume-entry-header">
                <strong class="resume-entry-title">${node.name}</strong>
                <span class="resume-entry-dates">${node.dateRange}</span>
            </div>
            <div class="resume-entry-company">${node.company}</div>
            <div class="resume-entry-bonus locked">${prereqsMet ? "Requires skill point" : "Prerequisite position required"}</div>
        </div>
    `
}

// ── Skills summary (all active bonuses) ─────────────────────────────────────

function renderSkillsSummary(career: CareerManager): string {
    // Gather all unlocked nodes across every branch
    const allNodes = [
        ...CAREER_BRANCHES.flatMap((b) => getNodesForBranch(b.id)),
        ...getNodesForBranch("education"),
    ]

    const activeNodes = allNodes.filter((n) => career.isNodeUnlocked(n.id))
    if (activeNodes.length === 0) return ""

    const activeCareer = career.getActiveCareer()

    let html = `
        <hr />
        <h2>Skills & Proficiencies</h2>
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

// ── Career switch ───────────────────────────────────────────────────────────

function renderCareerSwitch(
    career: CareerManager,
    activeCareer: CareerBranch
): string {
    const otherBranches = CAREER_BRANCHES.filter((b) => b.id !== activeCareer)

    let html = `
        <div class="career-switch-section">
            <h3>Explore Other Opportunities</h3>
            <p class="career-switch-warning">Switching careers makes your current positions dormant (bonuses at 50% effectiveness).</p>
            <div class="career-switch-options">
    `
    for (const branch of otherBranches) {
        const hasProgress =
            career.getUnlockedNodesForBranch(branch.id).length > 0
        html += `
            <button class="career-switch-btn" data-branch="${branch.id}">
                ${branch.name} ${hasProgress ? "(has experience)" : ""}
            </button>
        `
    }
    html += `</div></div>`

    return html
}

// ── Button wiring ───────────────────────────────────────────────────────────

function wireButtons(container: HTMLElement, career: CareerManager): void {
    // Career selection
    container.querySelectorAll(".career-select-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const branch = btn.getAttribute("data-branch") as CareerBranch
            if (branch) {
                career.selectCareer(branch)
                renderResumeWindow()
            }
        })
    })

    // Career switching
    container.querySelectorAll(".career-switch-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const branch = btn.getAttribute("data-branch") as CareerBranch
            if (branch) {
                career.switchCareer(branch)
                renderResumeWindow()
            }
        })
    })

    // Node unlocking
    container.querySelectorAll(".node-unlock-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const nodeId = btn.getAttribute("data-node")
            if (nodeId) {
                career.unlockNode(nodeId)
                renderResumeWindow()
            }
        })
    })
}

// Helper to avoid import at top level (lazy)
function lm() {
    return getLocaleManager()
}
