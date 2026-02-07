import { isMobile } from "../isMobile"
import { getLocaleManager } from "../localeManager"

export function getWelcomeContent(): string {
    const lm = getLocaleManager()
    const tagline = isMobile()
        ? lm.t("welcome.taglineMobile")
        : lm.t("welcome.taglineDesktop")

    return `
        <div class="welcome-content">
            <h1 class="rainbow-text">${lm.t("welcome.title")}</h1>

            <div class="marquee-container">
                <span class="marquee">
                    ★★★ ${lm.t("welcome.visitorCount")}<span id="visitor-count">...</span>! ★★★
                    ${lm.t("welcome.signGuestbook")} ★★★
                </span>
            </div>

            <img
                src="/assets/gifs/welcome.gif"
                alt="${lm.t("welcome.altWelcome")}"
                class="welcome-gif"
                onerror="this.style.display='none'"
            />

            <p class="tagline">
                ${tagline}
            </p>

            <p class="guestbook-cta">
                <a href="#" data-open-window="guestbook">${lm.t("welcome.ctaGuestbook")}</a>
            </p>

            <div class="blink construction">${lm.t("welcome.underConstruction")}</div>

            <hr />

            <p class="footer">
                ${lm.t("welcome.footer")}
            </p>
        </div>
    `
}
