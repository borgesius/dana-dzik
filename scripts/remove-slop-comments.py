#!/usr/bin/env python3
"""Remove redundant 'LLM slop' comments that merely restate what the next line does.

Preserves:
- JSDoc (/** */)
- Section markers (// ── ... ──, // === ... ===, // --------)
- Comments explaining WHY, workarounds, TODOs, browser quirks
- Geometry/layout labels in pinball
- Serialization section labels
- Branch labels in if/else chains
- Fix references (// Fix #N: ...)
- Prestige upgrade effect labels
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Map of file (relative to ROOT) -> set of 1-indexed line numbers to remove
REMOVALS: dict[str, set[int]] = {}


def add(filepath: str, lines: list[int]):
    REMOVALS[filepath] = set(lines)


# ── CombatAnimator.ts ──
add("src/lib/autobattler/CombatAnimator.ts", [
    212,  # // Update round indicator
    221,  # // Update front unit highlights after each action
    344,  # // Screen shake + big hit sound on big hits
    367,  # // Screen shake on death
    381,  # // Show ability callout on caster
    395,  # // Screen shake on big ability hits
    414,  # // Show ability callout on caster
    515,  # // Show ability callout on caster
    582,  # // Check if this is a big hit (>40% of max HP)
])

# ── MarketEngine.ts ──
add("src/lib/marketGame/MarketEngine.ts", [
    214,  # // Pre-fill the trend queue with ~1 year of segments
    270,  # // Push completed segment to history (if there was one active)
    280,  # // Trim history to ~1 year of ticks
    291,  # // Pop the next segment from the queue
    315,  # // Refill the queue
    657,  # // Tenure ticking (raise demands)
    663,  # // Morale ticking (burnout, chemistry, quit detection)
    1453, # // Default check
    1487, # // Remove defaulted DAS (collateral lost)
    1492, # // Default immediately drops rating
    1525, # // Emit money change from yield/interest
    1532, # // Record for achievement tracking
    1536, # // Force-liquidate lowest-value DAS
    1890, # // Restore org chart if present
    1904, # // Restore DAS ID counter
    2018, # // Reset Phase 6: Structured Products Desk
])

# ── topology.ts ── (keep canvas section labels: Background, Border, Label, Address)
add("src/lib/netmon/topology.ts", [
    272,  # // Fade facility node after 8s of no traffic
    277,  # // Draw traffic edges
    280,  # // Draw particles
    283,  # // Draw nodes
])

# ── CubeRunner.ts ── (keep section markers with ── decoration, keep Fix refs)
add("src/lib/veil/CubeRunner.ts", [
    668,  # // Update particles always (even during countdown/death)
    709,  # // Grace timer countdown
    724,  # // Speed curve with optional pulse
    732,  # // Audio intensity
    735,  # // Boss heartbeat acceleration
    751,  # // Lane shift (with optional inversion)
    790,  # // Player trail particles
    807,  # // Spawn obstacles (pattern or random)
    812,  # // Process pattern queue
    849,  # // Move obstacles
    912,  # // Glue walls
    931,  # // Animate glue wall drips
    941,  # // Taunts (boss: subliminal flash)
    964,  # // Blackout hazard
    979,  # // Boss ember particles
    996,  # // Decay screen shake, flashes
    1298, # // Screen shake offset
    1640, # // Subtle glow column on starting lane
])

# ── DialogueManager.ts ──
add("src/lib/veil/DialogueManager.ts", [
    232,  # // Auto-advance
    273,  # // Red flicker
    277,  # // Static burst
    283,  # // Briefly corrupt the dialogue text
    299,  # // Screen shake
])

# ── PinballGame.ts ── (keep geometry labels + serialization section labels)
add("src/lib/pinball/PinballGame.ts", [
    479,  # // Particle burst
    482,  # // Screen shake scales with multiplier
    489,  # // Check fever activation
    504,  # // Force the fever quote onto the ticker
    509,  # // Big celebratory burst from center
    565,  # // Big celebration
    707,  # // Drain effects
    766,  # // During fever, always show the fever quote
    803,  # // Particles on top of entities
    807,  # // Flash overlay (all-targets)
    1056, # // Always update visual-only systems on main thread
])

# ── windowContent/autobattler.ts ──
add("src/lib/windowContent/autobattler.ts", [
    125,  # // Personal bests section
    198,  # // Wire bestiary tab switching
    298,  # // Opponent archetypes by faction
    509,  # // Track units bought for relic unlock
    511,  # // Check relic unlock conditions at run end
    521,  # // Check relic unlocks after each combat (for mid-run conditions)
    692,  # // Relic bar
    721,  # // Synergy bar
    767,  # // Opponent preview
    850,  # // Animate purchase
    859,  # // Check for level-up merge
    871,  # // Show scrap change
    876,  # // Show level-up burst on merged card
    882,  # // Find the actual merged card
    914,  # // Animate reroll: flip existing cards then re-render
    942,  # // Animate sell: dissolve the card
    1380, # // Calculate win streak
    1393, # // Win streak display
    1398, # // Boss defeat special
    1433, # // Translate unit IDs to display names in log
    1444, # // Rewards with translated names and staggered reveal
    1475, # // Boss relic choice UI
    1496, # // Held relics bar
    1500, # // Full run summary
    1511, # // Relic choice click handlers
    1531, # // Transition back to lobby
    1590, # // Relic bar
])

# ── windowContent/careerTree.ts ──
add("src/lib/windowContent/careerTree.ts", [
    257,  # // Node unlock buttons
    268,  # // Mastery buttons
    281,  # // Career switch buttons
])

# ── windowContent/md.ts ──
add("src/lib/windowContent/md.ts", [
    113,  # // Emit achievement event for opening M.D.
    124,  # // Resize observer for canvas
    129,  # // Node click -> filter log
    138,  # // Filter input
    144,  # // Pause button
    176,  # // Collapse
    184,  # // Collapse previous
    242,  # // Load existing packets
    252,  # // Subscribe to new packets
])

# ── EmployeesSection.ts ──
add("src/components/businessPanel/EmployeesSection.ts", [
    422,  # // Deny raise
    571,  # // Check existing employee cards (for swap)
])

# ── PrestigeSection.ts ──
add("src/components/businessPanel/PrestigeSection.ts", [
    374,  # // Wire up event listeners
])

# ── PortfolioMgmtSection.ts ──
add("src/components/businessPanel/PortfolioMgmtSection.ts", [
    116,  # // Securitize form
    157,  # // Debt ratio warning
    208,  # // Unwind buttons
    221,  # // Securitize
    246,  # // Borrow
    261,  # // Repay
    276,  # // Repay All
])

# ── DeployWidget.ts ──
add("src/components/toolbars/DeployWidget.ts", [
    150,  # // Info rows first (version, env, build time, commit)
    154,  # // Branch visualizer below
    246,  # // Wire hover events on commit circles
])

# ── VeilWidget.ts ──
add("src/components/widgets/VeilWidget.ts", [
    35,   # // Check initial visibility
    40,   # // Listen for events that affect visibility and content
    120,  # // Attach event listeners
])

# ── init/core.ts ──
add("src/init/core.ts", [
    208,  # // Use a simple notification popup (displayed briefly then auto-dismissed)
])

# ── api/achievement-counts.ts ──
add("api/achievement-counts.ts", [
    185,  # // Discover all achievement keys by scanning for the pattern
    205,  # // Strip the prefix to get the achievement ID
])

# ── scripts/sync-locales.mjs ──
add("scripts/sync-locales.mjs", [
    12,   # // Key missing entirely — copy from source (English fallback)
    18,   # // Both are objects — recurse
])


def remove_comment_lines(filepath: Path, line_numbers: set[int]) -> tuple[int, list[str]]:
    """Remove comment lines and collapse resulting double blank lines."""
    with open(filepath, "r") as f:
        lines = f.readlines()

    removed = 0
    new_lines: list[str] = []
    issues: list[str] = []

    for i, line in enumerate(lines):
        lineno = i + 1
        if lineno in line_numbers:
            stripped = line.strip()
            # Safety: only remove if this is actually a comment line
            if stripped.startswith("//") or stripped.startswith("/*"):
                removed += 1
                # Don't add this line
                continue
            else:
                issues.append(f"  WARNING: Line {lineno} is not a comment: {stripped[:60]}")
        new_lines.append(line)

    # Collapse triple+ blank lines down to double (preserves intentional spacing)
    collapsed: list[str] = []
    blank_count = 0
    for line in new_lines:
        if line.strip() == "":
            blank_count += 1
            if blank_count <= 2:
                collapsed.append(line)
        else:
            blank_count = 0
            collapsed.append(line)

    return removed, issues, collapsed


def main():
    total_removed = 0
    total_files = 0
    all_issues: list[str] = []

    for relpath, line_numbers in sorted(REMOVALS.items()):
        filepath = ROOT / relpath
        if not filepath.exists():
            print(f"SKIP (not found): {relpath}")
            continue

        removed, issues, new_content = remove_comment_lines(filepath, line_numbers)

        if issues:
            all_issues.extend([f"{relpath}:"] + issues)

        if removed > 0:
            with open(filepath, "w") as f:
                f.writelines(new_content)
            total_files += 1
            total_removed += removed
            print(f"  {relpath}: removed {removed}/{len(line_numbers)} comments")
        else:
            print(f"  {relpath}: nothing to remove (already clean?)")

    print(f"\nTotal: removed {total_removed} comments across {total_files} files")

    if all_issues:
        print("\nIssues:")
        for issue in all_issues:
            print(issue)


if __name__ == "__main__":
    main()
