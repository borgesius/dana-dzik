import { getLocaleManager } from "../localeManager"

export function getGuestbookContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="guestbook-content">
            <h1>${lm.t("guestbook.title")}</h1>

            <a
                href="https://github.com/borgesius/dana-dzik/issues/new?template=guestbook.md&title=%5BGuestbook%5D%20"
                target="_blank"
                class="sign-btn"
            >
                ${lm.t("guestbook.signButton")}
            </a>

            <hr />

            <div id="guestbook-entries" class="entries">
                <p class="loading">${lm.t("guestbook.loadingEntries")}</p>
            </div>
        </div>
    `
}
