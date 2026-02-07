import { getLocaleManager } from "../localeManager"

export function getFelixGPTContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="felixgpt-content">
            <div class="felixgpt-header">
                <picture>
                    <source srcset="/assets/felix/IMG_7187.webp" type="image/webp" />
                    <img src="/assets/felix/IMG_7187.jpg" alt="Felix" class="felix-avatar" />
                </picture>
                <div class="felix-info">
                    <h2>${lm.t("felixgpt.title")}</h2>
                    <p class="felix-status">${lm.t("felixgpt.status")}</p>
                </div>
            </div>

            <div class="chat-messages" id="felix-messages">
                <div class="message felix">
                    <span class="message-text">${lm.t("felixgpt.greeting")}</span>
                </div>
            </div>

            <form class="chat-input" id="felix-form">
                <input
                    type="text"
                    id="felix-input"
                    placeholder="${lm.t("felixgpt.placeholder")}"
                    autocomplete="off"
                />
                <button type="submit">${lm.t("felixgpt.send")}</button>
            </form>
        </div>
    `
}
