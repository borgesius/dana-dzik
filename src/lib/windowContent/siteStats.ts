import { getLocaleManager } from "../localeManager"

export function getSiteStatsContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="stats-content">
            <div class="stats-header">
                <h2>${lm.t("stats.title")}</h2>
                <p class="stats-subtitle">${lm.t("stats.subtitle")}</p>
            </div>

            <div class="stats-loading" id="stats-loading">${lm.t("stats.loading")}</div>

            <div class="stats-grid" id="stats-grid" style="display: none;">
                <div class="stat-card">
                    <div class="stat-icon">👁️</div>
                    <div class="stat-value" id="stat-views">0</div>
                    <div class="stat-label">${lm.t("stats.totalViews")}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">🖱️</div>
                    <div class="stat-value" id="stat-clicks">0</div>
                    <div class="stat-label">${lm.t("stats.windowOpens")}</div>
                </div>
            </div>

            <div class="stats-section" id="stats-heatmap" style="display: none;">
                <h3>${lm.t("stats.viewHeatmap")}</h3>
                <div class="heatmap-grid" id="heatmap-bars"></div>
            </div>

            <div class="stats-section" id="stats-funnel" style="display: none;">
                <h3>${lm.t("stats.conversionFunnel")}</h3>
                <div class="funnel-chart" id="funnel-chart"></div>
            </div>

            <div class="stats-section" id="stats-ab" style="display: none;">
                <h3>${lm.t("stats.abTest")}</h3>
                <p style="font-size: 11px; color: #666; margin: 0 0 10px;">${lm.t("stats.abQuestion")}</p>
                <div class="ab-results" id="ab-results"></div>
            </div>

            <div class="stats-section" id="stats-perf" style="display: none;">
                <h3>${lm.t("stats.performance")}</h3>
                <div id="perf-stats"></div>
            </div>
        </div>
    `
}
