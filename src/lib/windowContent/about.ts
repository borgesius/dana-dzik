import { getLocaleManager } from "../localeManager"

export function getAboutContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="about-content">
            <h1>${lm.t("about.title")}</h1>

            <div class="layout">
                <div class="sidebar">
                    <div class="photo-frame photo-slideshow" id="dana-photos">
                        <picture>
                            <source srcset="/assets/dana/IMG_5531.webp" type="image/webp" />
                            <img src="/assets/dana/IMG_5531.jpg" alt="${lm.t("about.altDana")}" />
                        </picture>
                    </div>

                    <hr />

                    <div class="photo-frame photo-slideshow" id="felix-photos">
                        <picture>
                            <source srcset="/assets/felix/IMG_7187.webp" type="image/webp" />
                            <img src="/assets/felix/IMG_7187.jpg" alt="${lm.t("about.altFelix")}" />
                        </picture>
                    </div>
                    <p class="photo-caption">${lm.t("about.felixName")}</p>
                </div>

                <div class="main">
                    <h2>${lm.t("about.hello")}</h2>
                    <p class="bio">
                        ${lm.t("about.bio")}
                    </p>

                    <h3>${lm.t("about.interests")}</h3>
                    <p>${lm.t("about.interestsList")}</p>

                    <h3>${lm.t("about.cat")}</h3>
                    <p>${lm.t("about.catName")}</p>

                    <h3>${lm.t("about.recentlyPlayed")}</h3>
                    <div class="now-playing">
                        🎵 <span id="now-playing-text">${lm.t("about.loading")}</span>
                    </div>

                    <p class="email-link">
                        <a href="mailto:danadzik@gmail.com">${lm.t("about.emailMe")}</a>
                    </p>
                </div>
            </div>
        </div>
    `
}
