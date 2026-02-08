import type { RoutableWindow } from "../config/routing"
import { getAboutContent } from "./windowContent/about"
import { getAchievementsContent } from "./windowContent/achievements"
import { getAutobattlerContent } from "./windowContent/autobattler"
import { getCustomizeContent } from "./windowContent/customize"
import { getFelixGPTContent } from "./windowContent/felixgpt"
import { getGuestbookContent } from "./windowContent/guestbook"
import { getLinksContent } from "./windowContent/links"
import { getPinballContent } from "./windowContent/pinball"
import { getProjectsContent } from "./windowContent/projects"
import { getResumeContent } from "./windowContent/resume"
import { getSiteStatsContent } from "./windowContent/siteStats"
import { getWelcomeContent } from "./windowContent/welcome"

export { renderAchievementsWindow } from "./windowContent/achievements"
export { renderAutobattlerWindow } from "./windowContent/autobattler"
export { renderCustomizeWindow } from "./windowContent/customize"
export { renderResumeWindow } from "./windowContent/resume"
export { requestResumeCareerTab } from "./windowContent/resume"

export function getWindowContent(contentType: RoutableWindow): string {
    switch (contentType) {
        case "welcome":
            return getWelcomeContent()
        case "about":
            return getAboutContent()
        case "projects":
            return getProjectsContent()
        case "resume":
            return getResumeContent()
        case "links":
            return getLinksContent()
        case "guestbook":
            return getGuestbookContent()
        case "felixgpt":
            return getFelixGPTContent()
        case "stats":
            return getSiteStatsContent()
        case "pinball":
            return getPinballContent()
        case "terminal":
            return `<div id="terminal-content" class="terminal-container"></div>`
        case "explorer":
            return `<div id="explorer-content"></div>`
        case "achievements":
            return getAchievementsContent()
        case "autobattler":
            return getAutobattlerContent()
        case "customize":
            return getCustomizeContent()
        default:
            return "<p>Content not found</p>"
    }
}
