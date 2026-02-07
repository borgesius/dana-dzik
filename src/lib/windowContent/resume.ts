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

    // If no career selected, show career selection
    if (!activeCareer) {
        html += renderCareerSelection()
    } else {
        html += renderSkillTree(career, activeCareer)
    }

    // Career history
    const history = career.getCareerHistory()
    if (history.length > 0) {
        html += `
            <hr />
            <h2>Career History</h2>
            <div class="career-history">
        `
        for (const entry of history) {
            const branch = CAREER_BRANCHES.find((b) => b.id === entry.branch)
            const endDate = entry.endedAt
                ? new Date(entry.endedAt).toLocaleDateString()
                : "Present"
            html += `
                <div class="career-history-entry ${entry.endedAt === null ? "current" : "past"}">
                    <strong>${branch?.name ?? entry.branch}</strong>
                    <span class="meta">${new Date(entry.startedAt).toLocaleDateString()} - ${endDate}</span>
                </div>
            `
        }
        html += `</div>`
    }

    // Education (always shown)
    html += `
        <hr />
        <h2>${lm.t("resume.education")}</h2>
        <div class="entry">
            <strong>${lm.t("resume.school")}</strong>
            ${lm.t("resume.degree")}
            <span class="meta">${lm.t("resume.location")}</span>
        </div>
    `

    // Education skill tree
    const eduNodes = getNodesForBranch("education")
    if (eduNodes.length > 0) {
        html += renderBranchNodes(career, "education", eduNodes)
    }

    container.innerHTML = html

    // Wire career selection buttons
    container.querySelectorAll(".career-select-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const branch = btn.getAttribute("data-branch") as CareerBranch
            if (branch) {
                career.selectCareer(branch)
                renderResumeWindow()
            }
        })
    })

    // Wire career switch buttons
    container.querySelectorAll(".career-switch-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const branch = btn.getAttribute("data-branch") as CareerBranch
            if (branch) {
                career.switchCareer(branch)
                renderResumeWindow()
            }
        })
    })

    // Wire node unlock buttons
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

function renderCareerSelection(): string {
    let html = `
        <h2>Choose Your Career Path</h2>
        <p class="career-prompt">Select a career to begin your skill tree progression.</p>
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

function renderSkillTree(career: CareerManager, activeCareer: CareerBranch): string {
    const activeBranch = CAREER_BRANCHES.find((b) => b.id === activeCareer)
    const availablePoints = career.getAvailableSkillPoints()

    let html = `
        <h2>${lm().t("resume.experience")} - ${activeBranch?.name ?? activeCareer}</h2>
        <div class="skill-points-display">
            Skill Points: <strong>${availablePoints}</strong>
        </div>
    `

    // Active career branch
    const activeNodes = getNodesForBranch(activeCareer)
    html += renderBranchNodes(career, activeCareer, activeNodes)

    // Show switch options
    const otherBranches = CAREER_BRANCHES.filter((b) => b.id !== activeCareer)
    html += `
        <div class="career-switch-section">
            <h3>Switch Career</h3>
            <p class="career-switch-warning">Switching makes your current career dormant (skills at 50% effectiveness).</p>
            <div class="career-switch-options">
    `
    for (const branch of otherBranches) {
        const isDormant = career.getUnlockedNodesForBranch(branch.id).length > 0
        html += `
            <button class="career-switch-btn" data-branch="${branch.id}">
                ${branch.name} ${isDormant ? "(has progress)" : ""}
            </button>
        `
    }
    html += `</div></div>`

    return html
}

function renderBranchNodes(
    career: CareerManager,
    _branch: CareerBranch | "education",
    nodes: CareerNodeDef[]
): string {
    const sorted = [...nodes].sort((a, b) => a.tier - b.tier)

    let html = `<div class="skill-tree-branch">`

    for (const node of sorted) {
        const unlocked = career.isNodeUnlocked(node.id)
        const canUnlock = career.canUnlockNode(node.id)
        const prereqsMet = node.prerequisites.every((p) =>
            career.isNodeUnlocked(p)
        )

        const cls = unlocked
            ? "skill-node unlocked"
            : canUnlock
              ? "skill-node available"
              : prereqsMet
                ? "skill-node locked"
                : "skill-node locked prereq-missing"

        html += `
            <div class="${cls}">
                <div class="skill-node-header">
                    <span class="skill-node-name">${node.name}</span>
                    ${unlocked ? '<span class="skill-node-badge">Unlocked</span>' : ""}
                </div>
                <div class="skill-node-desc">${node.description}</div>
                ${canUnlock ? `<button class="node-unlock-btn" data-node="${node.id}">Unlock (1 SP)</button>` : ""}
            </div>
        `
    }

    html += `</div>`
    return html
}

// Helper to avoid import at top level (lazy)
function lm() {
    return getLocaleManager()
}
