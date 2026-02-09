import "./styles/themes/_variables.css"
import "./styles/themes/win95.css"
import "./styles/themes/mac-classic.css"
import "./styles/themes/apple2.css"
import "./styles/themes/c64.css"
import "./styles/themes/amiga.css"
import "./styles/themes/next.css"
import "./styles/themes/vaporwave.css"
import "./styles/themes/golden.css"
import "./styles/themes/nocturnal.css"
import "./styles/themes/void.css"
import "./styles/themes/arcana.css"
import "./styles/themes/color-schemes.css"
import "./styles/business-game.css"
import "./styles/content.css"
import "./styles/desktop.css"
import "./styles/effects.css"
import "./styles/pinball.css"
import "./styles/taskbar.css"
import "./styles/explorer.css"
import "./styles/terminal.css"
import "./styles/widgets.css"
import "./styles/windows.css"
import "./styles/mobile.css"
import "./styles/achievements.css"
import "./styles/cosmetic-toast.css"
import "./styles/cosmetic-fonts.css"
import "./styles/cosmetic-taskbar.css"
import "./styles/cosmetic-animations.css"
import "./styles/autobattler.css"
import "./styles/chrome-variants.css"
import "./styles/dev-panel.css"
import "./styles/veil.css"

import { initCore, initServices } from "./init/core"
import { initDesktop } from "./init/desktop"
import { initMobile } from "./init/mobile"
import { isMobile } from "./lib/isMobile"

initCore()

void (async (): Promise<void> => {
    await initServices()

    const app = document.getElementById("app")
    if (app) {
        if (isMobile()) {
            initMobile(app)
        } else {
            initDesktop(app)
        }
    }
})()
