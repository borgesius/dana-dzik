import { formatMoney } from "../../lib/formatMoney"
import { COMMODITIES, type CommodityId } from "../../lib/marketGame/commodities"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import {
    CREDIT_RATING_SCALE,
    DAS_MAX_POSITIONS,
    DAS_MIN_QUANTITY,
    MARGIN_CALL_THRESHOLD,
    RATING_INTEREST_RATE,
    RATING_LEVERAGE_RATIO,
    RATING_YIELD_MULT,
} from "../../lib/marketGame/types"

export class PortfolioMgmtSection {
    private element: HTMLElement
    private contentEl: HTMLElement
    private game: MarketEngine
    private playSound: (type: string) => void

    constructor(game: MarketEngine, playSound: (type: string) => void) {
        this.game = game
        this.playSound = playSound
        this.contentEl = document.createElement("div")
        this.contentEl.className = "desk-content"
        this.element = this.createElement()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "desk-section"

        const heading = document.createElement("h3")
        heading.textContent = "Structured Products Desk"
        section.appendChild(heading)
        section.appendChild(this.contentEl)

        return section
    }

    public updateVisibility(): void {
        this.element.style.display = this.game.isPhaseUnlocked(6)
            ? "block"
            : "none"
    }

    public render(): void {
        if (!this.game.isPhaseUnlocked(6)) return

        const rating = this.game.getCreditRating()
        const debt = this.game.getDebt()
        const capacity = this.game.getBorrowCapacity()
        const yieldPerTick = this.game.getDASYieldPerTick()
        const interestPerTick = this.game.getInterestPerTick()
        const securities = this.game.getSecurities()
        const snapshot = this.game.getSnapshot()
        const ratingIdx = CREDIT_RATING_SCALE.indexOf(rating)

        let html = ""

        // ── Credit Rating Banner ─────────────────────────────────────────
        html += `<div class="desk-rating-banner">
            <span class="desk-rating-label">Internal Risk Committee Rating:</span>
            <span class="desk-rating-value desk-rating-${rating.toLowerCase()}">${rating}</span>
            <span class="desk-rating-bar">${CREDIT_RATING_SCALE.map((r, i) => `<span class="desk-notch${i <= ratingIdx ? " filled" : ""}">${r}</span>`).join("")}</span>
        </div>`

        // ── Summary Strip ────────────────────────────────────────────────
        const netFlow = yieldPerTick - interestPerTick
        const netClass = netFlow >= 0 ? "positive" : "negative"
        html += `<div class="desk-summary">
            <span>Yield: <b>${formatMoney(yieldPerTick)}</b>/tick</span>
            <span>Interest: <b>${formatMoney(interestPerTick)}</b>/tick</span>
            <span>Net: <b class="desk-${netClass}">${netFlow >= 0 ? "+" : ""}${formatMoney(netFlow)}</b>/tick</span>
        </div>`

        // ── Digital Asset Securities ─────────────────────────────────────
        html += `<div class="desk-subsection">
            <h4>Digital Asset Securities (${securities.length}/${DAS_MAX_POSITIONS})</h4>`

        if (securities.length > 0) {
            html += `<div class="desk-das-list">`
            for (const das of securities) {
                const currentPrice =
                    snapshot.markets[das.commodityId]?.price ?? 0
                const commodityName =
                    COMMODITIES.find((c) => c.id === das.commodityId)?.name ??
                    das.commodityId
                const health = currentPrice / das.securitizationPrice
                const healthClass =
                    health > 0.7
                        ? "healthy"
                        : health > 0.55
                          ? "warning"
                          : "critical"
                html += `<div class="desk-das-item">
                    <div class="desk-das-header">
                        <span class="desk-das-id">${das.id}</span>
                        <span class="desk-das-status desk-${healthClass}">${Math.round(health * 100)}%</span>
                    </div>
                    <div class="desk-das-detail">
                        ${das.lockedQuantity}x ${commodityName} @ ${formatMoney(das.securitizationPrice)}
                    </div>
                    <button class="desk-btn desk-unwind-btn" data-unwind="${das.id}">Unwind</button>
                </div>`
            }
            html += `</div>`
        } else {
            html += `<div class="desk-note">No active securities. Securitize commodity holdings to generate yield.</div>`
        }

        // Securitize form
        if (securities.length < DAS_MAX_POSITIONS) {
            const availableCommodities = snapshot.unlockedCommodities.filter(
                (cId) => {
                    const h = snapshot.holdings[cId]
                    return h && h.quantity >= DAS_MIN_QUANTITY
                }
            )
            if (availableCommodities.length > 0) {
                html += `<div class="desk-create-form">
                    <select class="desk-commodity-select">
                        ${availableCommodities
                            .map((cId) => {
                                const name =
                                    COMMODITIES.find((c) => c.id === cId)
                                        ?.name ?? cId
                                const qty =
                                    snapshot.holdings[cId]?.quantity ?? 0
                                return `<option value="${cId}">${name} (${qty} avail)</option>`
                            })
                            .join("")}
                    </select>
                    <input type="number" class="desk-qty-input" placeholder="Qty" min="${DAS_MIN_QUANTITY}" step="1" />
                    <button class="desk-btn desk-securitize-btn">Securitize</button>
                </div>`
            }
        }

        html += `</div>`

        // ── Credit Facility ──────────────────────────────────────────────
        html += `<div class="desk-subsection">
            <h4>Credit Facility</h4>
            <div class="desk-facility-summary">
                <span>Outstanding: <b>${formatMoney(debt)}</b></span>
                <span>Capacity: <b>${formatMoney(capacity + debt)}</b></span>
                <span>Available: <b>${formatMoney(capacity)}</b></span>
                <span>Rate: <b>${(RATING_INTEREST_RATE[rating] * 100).toFixed(2)}%</b>/tick (${rating})</span>
                <span>Max Leverage: <b>${(RATING_LEVERAGE_RATIO[rating] * 100).toFixed(0)}%</b> of portfolio</span>
            </div>`

        // Debt ratio warning
        if (debt > 0) {
            const portfolioVal = this.game.calculatePortfolioValue()
            const ratio = portfolioVal > 0 ? debt / portfolioVal : 0
            const ratioClass =
                ratio > MARGIN_CALL_THRESHOLD
                    ? "critical"
                    : ratio > 0.7
                      ? "warning"
                      : "healthy"
            html += `<div class="desk-ratio desk-${ratioClass}">
                Collateral Ratio: ${(ratio * 100).toFixed(1)}%${ratio > MARGIN_CALL_THRESHOLD ? " -- MARGIN EVENT IMMINENT" : ""}
            </div>`
        }

        html += `<div class="desk-facility-controls">
                <div class="desk-control-row">
                    <input type="number" class="desk-borrow-input" placeholder="Amount" min="1" step="1" />
                    <button class="desk-btn desk-borrow-btn"${capacity <= 0 ? " disabled" : ""}>Borrow</button>
                </div>`

        if (debt > 0) {
            html += `<div class="desk-control-row">
                    <input type="number" class="desk-repay-input" placeholder="Amount" min="1" step="1" />
                    <button class="desk-btn desk-repay-btn">Repay</button>
                    <button class="desk-btn desk-repay-all-btn">Repay All</button>
                </div>`
        }

        html += `</div></div>`

        // ── Yield Multiplier Table (compact) ─────────────────────────────
        html += `<div class="desk-subsection desk-rates-table">
            <h4>Facility Terms by Rating</h4>
            <table><tr><th>Rating</th><th>Yield</th><th>Leverage</th><th>Rate</th></tr>`
        for (const r of CREDIT_RATING_SCALE) {
            const isCurrent = r === rating
            html += `<tr${isCurrent ? ' class="desk-current-rating"' : ""}>
                <td>${r}</td>
                <td>${RATING_YIELD_MULT[r]}x</td>
                <td>${(RATING_LEVERAGE_RATIO[r] * 100).toFixed(0)}%</td>
                <td>${(RATING_INTEREST_RATE[r] * 100).toFixed(2)}%</td>
            </tr>`
        }
        html += `</table></div>`

        this.contentEl.innerHTML = html
        this.wireButtons()
    }

    private wireButtons(): void {
        // Unwind buttons
        this.contentEl
            .querySelectorAll<HTMLElement>("[data-unwind]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const dasId = btn.getAttribute("data-unwind")
                    if (dasId && this.game.unwindDAS(dasId)) {
                        this.playSound("notify")
                        this.render()
                    }
                })
            })

        // Securitize
        const securitizeBtn = this.contentEl.querySelector(
            ".desk-securitize-btn"
        )
        if (securitizeBtn) {
            securitizeBtn.addEventListener("click", () => {
                const select = this.contentEl.querySelector(
                    ".desk-commodity-select"
                ) as HTMLSelectElement
                const qtyInput = this.contentEl.querySelector(
                    ".desk-qty-input"
                ) as HTMLInputElement
                const cId = select?.value as CommodityId
                const qty = parseInt(qtyInput?.value ?? "0")
                if (
                    cId &&
                    qty >= DAS_MIN_QUANTITY &&
                    this.game.securitize(cId, qty)
                ) {
                    this.playSound("notify")
                    this.render()
                }
            })
        }

        // Borrow
        const borrowBtn = this.contentEl.querySelector(".desk-borrow-btn")
        if (borrowBtn) {
            borrowBtn.addEventListener("click", () => {
                const input = this.contentEl.querySelector(
                    ".desk-borrow-input"
                ) as HTMLInputElement
                const amount = parseFloat(input?.value ?? "0")
                if (amount > 0 && this.game.borrow(amount)) {
                    this.playSound("notify")
                    this.render()
                }
            })
        }

        // Repay
        const repayBtn = this.contentEl.querySelector(".desk-repay-btn")
        if (repayBtn) {
            repayBtn.addEventListener("click", () => {
                const input = this.contentEl.querySelector(
                    ".desk-repay-input"
                ) as HTMLInputElement
                const amount = parseFloat(input?.value ?? "0")
                if (amount > 0 && this.game.repay(amount)) {
                    this.playSound("notify")
                    this.render()
                }
            })
        }

        // Repay All
        const repayAllBtn = this.contentEl.querySelector(".desk-repay-all-btn")
        if (repayAllBtn) {
            repayAllBtn.addEventListener("click", () => {
                const debt = this.game.getDebt()
                if (debt > 0 && this.game.repay(debt)) {
                    this.playSound("notify")
                    this.render()
                }
            })
        }
    }
}
