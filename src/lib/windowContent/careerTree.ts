import {
    type CareerManager,
    getCareerManager,
} from "../progression/CareerManager"
import {
    CAREER_BRANCHES,
    type CareerNodeDef,
    getNodesForBranch,
    MASTERY_DEFS,
} from "../progression/careers"
import type { CareerBranch } from "../progression/types"

export function getCareerTreeContent(): string {
    return `<div id="career-tree-content" class="career-tree-content"></div>`
}

export function renderCareerTreeWindow(): void {
    const container = document.getElementById("career-tree-content")
    if (!container) return

    const career = getCareerManager()
    const activeCareer = career.getActiveCareer()
    const availablePoints = career.getAvailableSkillPoints()

    let html = ""

    // ── Header ──────────────────────────────────────────────────────────
    html += `
        <div class="ct-header">
            <div class="ct-sp-display">
                Skill Points: <strong>${availablePoints}</strong>
            </div>
            <div class="ct-active-career">
                Active: <strong>${getBranchLabel(activeCareer)}</strong>
            </div>
        </div>
    `

    // ── Career branches ─────────────────────────────────────────────────
    for (const branch of CAREER_BRANCHES) {
        const isActive = branch.id === activeCareer
        const isLocked =
            branch.id === "executive" && !career.isExecutiveUnlocked()

        html += renderBranch(career, branch.id, branch.name, isActive, isLocked)
    }

    // ── Education tree ──────────────────────────────────────────────────
    html += renderBranch(career, "education", "Education", true, false)

    // ── Mastery section (unlocks after all career tree nodes purchased) ─
    html += renderMasterySection(career)

    // ── Career switch section ───────────────────────────────────────────
    if (activeCareer) {
        html += renderCareerSwitch(career, activeCareer)
    }

    container.innerHTML = html
    wireCareerTreeButtons(container, career)
}

// ── Branch rendering ────────────────────────────────────────────────────────

function renderBranch(
    career: CareerManager,
    branchId: CareerBranch | "education",
    label: string,
    isActive: boolean,
    isLocked: boolean
): string {
    const nodes = getNodesForBranch(branchId).sort((a, b) => a.tier - b.tier)
    const unlockedCount = nodes.filter((n) =>
        career.isNodeUnlocked(n.id)
    ).length

    let html = `
        <div class="ct-branch ${isActive ? "active" : ""} ${isLocked ? "locked" : ""}">
            <div class="ct-branch-header">
                <span class="ct-branch-name">${isLocked ? "🔒 " : ""}${label}</span>
                <span class="ct-branch-progress">${unlockedCount}/${nodes.length}</span>
                ${isActive && branchId !== "education" ? '<span class="ct-branch-active-badge">ACTIVE</span>' : ""}
            </div>
    `

    if (isLocked) {
        html += `<div class="ct-branch-locked-msg">Requires experience in 2 different career branches</div>`
    } else {
        html += `<div class="ct-node-list">`
        for (const node of nodes) {
            html += renderNode(career, node, isActive)
        }
        html += `</div>`
    }

    html += `</div>`
    return html
}

function renderNode(
    career: CareerManager,
    node: CareerNodeDef,
    isBranchActive: boolean
): string {
    const isUnlocked = career.isNodeUnlocked(node.id)
    const canUnlock = career.canUnlockNode(node.id)
    const prereqsMet = node.prerequisites.every((p) => career.isNodeUnlocked(p))

    const activeCareer = career.getActiveCareer()
    const isDormant =
        isUnlocked &&
        node.branch !== "education" &&
        node.branch !== activeCareer

    let statusClass = "ct-locked"
    let statusIcon = "○"
    if (isUnlocked && isDormant) {
        statusClass = "ct-dormant"
        statusIcon = "🔒"
    } else if (isUnlocked) {
        statusClass = "ct-unlocked"
        statusIcon = "●"
    } else if (canUnlock) {
        statusClass = "ct-available"
        statusIcon = "◎"
    } else if (!prereqsMet) {
        statusClass = "ct-prereq-missing"
        statusIcon = "○"
    }

    let html = `
        <div class="ct-node ${statusClass}">
            <div class="ct-node-header">
                <span class="ct-node-status">${statusIcon}</span>
                <span class="ct-node-title">${node.name}</span>
                <span class="ct-node-tier">T${node.tier}</span>
            </div>
            <div class="ct-node-company">${node.company}</div>
            <div class="ct-node-bonus">${node.bonusLabel}${isDormant ? " (dormant — 50%)" : ""}</div>
    `

    if (canUnlock) {
        html += `<button class="ct-unlock-btn" data-node="${node.id}">Accept Position (1 SP)</button>`
    } else if (!isUnlocked && !prereqsMet) {
        html += `<div class="ct-node-prereq">Requires: ${getPrereqNames(node)}</div>`
    } else if (!isUnlocked && prereqsMet && !isBranchActive) {
        html += `<div class="ct-node-prereq">Switch to this career to unlock</div>`
    } else if (!isUnlocked && prereqsMet) {
        html += `<div class="ct-node-prereq">Requires skill point</div>`
    }

    html += `</div>`
    return html
}

// ── Mastery ─────────────────────────────────────────────────────────────────

function renderMasterySection(career: CareerManager): string {
    const totalMastery = career.getTotalMasteryRanks()
    const available = career.getAvailableSkillPoints()

    // Show mastery section if player has any mastery ranks or has spare points
    // (implies they've likely invested in all career nodes)
    if (totalMastery === 0 && available === 0) return ""

    let html = `
        <div class="ct-branch mastery">
            <div class="ct-branch-header">
                <span class="ct-branch-name">Mastery</span>
                <span class="ct-branch-progress">${totalMastery} ranks</span>
            </div>
            <div class="ct-node-list">
    `

    for (const mastery of MASTERY_DEFS) {
        const rank = career.getMasteryRank(mastery.id)
        const canBuy = career.canPurchaseMastery(mastery.id)
        const maxed = mastery.maxRanks > 0 && rank >= mastery.maxRanks

        html += `
            <div class="ct-node ${maxed ? "ct-unlocked" : canBuy ? "ct-available" : "ct-locked"}">
                <div class="ct-node-header">
                    <span class="ct-node-status">${maxed ? "★" : rank > 0 ? "●" : "○"}</span>
                    <span class="ct-node-title">${mastery.name}</span>
                    <span class="ct-node-tier">Rank ${rank}${mastery.maxRanks > 0 ? `/${mastery.maxRanks}` : ""}</span>
                </div>
                <div class="ct-node-bonus">${mastery.description}</div>
                ${canBuy ? `<button class="ct-mastery-btn" data-mastery="${mastery.id}">Invest (1 SP)</button>` : ""}
            </div>
        `
    }

    html += `</div></div>`
    return html
}

// ── Career switch ───────────────────────────────────────────────────────────

function renderCareerSwitch(
    career: CareerManager,
    activeCareer: CareerBranch
): string {
    const otherBranches = CAREER_BRANCHES.filter((b) => b.id !== activeCareer)

    let html = `
        <div class="ct-switch-section">
            <h3>Explore Other Opportunities</h3>
            <p class="ct-switch-warning">Switching careers makes your current branch dormant (bonuses at 50% effectiveness).</p>
            <div class="ct-switch-options">
    `

    for (const branch of otherBranches) {
        const hasProgress =
            career.getUnlockedNodesForBranch(branch.id).length > 0
        const isLocked =
            branch.id === "executive" && !career.isExecutiveUnlocked()

        if (isLocked) {
            html += `
                <div class="ct-switch-btn locked" title="Requires experience in 2 different career branches">
                    🔒 ${branch.name}
                </div>
            `
        } else {
            html += `
                <button class="ct-switch-btn" data-branch="${branch.id}">
                    ${branch.name}${hasProgress ? " (has experience)" : ""}
                </button>
            `
        }
    }

    html += `</div></div>`
    return html
}

// ── Button wiring ───────────────────────────────────────────────────────────

function wireCareerTreeButtons(
    container: HTMLElement,
    career: CareerManager
): void {
    // Node unlock buttons
    container.querySelectorAll<HTMLElement>(".ct-unlock-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const nodeId = btn.getAttribute("data-node")
            if (nodeId) {
                career.unlockNode(nodeId)
                renderCareerTreeWindow()
            }
        })
    })

    // Mastery buttons
    container
        .querySelectorAll<HTMLElement>(".ct-mastery-btn")
        .forEach((btn) => {
            btn.addEventListener("click", () => {
                const masteryId = btn.getAttribute("data-mastery")
                if (masteryId) {
                    career.purchaseMastery(masteryId)
                    renderCareerTreeWindow()
                }
            })
        })

    // Career switch buttons
    container.querySelectorAll<HTMLElement>(".ct-switch-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const branch = btn.getAttribute("data-branch") as CareerBranch
            if (branch) {
                career.switchCareer(branch)
                renderCareerTreeWindow()
            }
        })
    })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getBranchLabel(branch: CareerBranch | null): string {
    if (!branch) return "None"
    const def = CAREER_BRANCHES.find((b) => b.id === branch)
    return def?.name ?? branch
}

function getPrereqNames(node: CareerNodeDef): string {
    return node.prerequisites
        .map((id) => {
            const n = getNodesForBranch(node.branch).find((nd) => nd.id === id)
            return n?.name ?? id
        })
        .join(", ")
}
