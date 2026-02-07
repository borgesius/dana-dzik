import { AudioWidget } from "./widgets/AudioWidget"
import { NowPlayingWidget } from "./widgets/NowPlayingWidget"
import { StravaWidget } from "./widgets/StravaWidget"

export class Widgets {
    private container: HTMLElement

    constructor(parent: HTMLElement) {
        this.container = document.createElement("div")
        this.container.className = "widgets-container"
        parent.appendChild(this.container)

        const audio = new AudioWidget()
        this.container.appendChild(audio.getElement())

        const nowPlaying = new NowPlayingWidget()
        this.container.appendChild(nowPlaying.getElement())

        const strava = new StravaWidget()
        this.container.appendChild(strava.getElement())
    }
}
