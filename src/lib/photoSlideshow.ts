import { SLIDESHOW_CONFIG } from "../config"

const DANA_PHOTOS = [
    "/assets/dana/IMG_5099.jpg",
    "/assets/dana/IMG_5531.jpg",
    "/assets/dana/IMG_5576.jpg",
    "/assets/dana/IMG_7045.jpg",
]

const FELIX_PHOTOS = [
    "/assets/felix/IMG_1420.jpg",
    "/assets/felix/IMG_1428.jpg",
    "/assets/felix/IMG_3391.jpg",
    "/assets/felix/IMG_3831.jpg",
    "/assets/felix/IMG_7187.jpg",
    "/assets/felix/IMG_7440.jpg",
]

/** Initializes photo slideshows for the about page. */
export function initPhotoSlideshows(): void {
    initSlideshow("dana-photos", DANA_PHOTOS)
    initSlideshow("felix-photos", FELIX_PHOTOS)
}

function initSlideshow(containerId: string, photos: string[]): void {
    const container = document.getElementById(containerId)
    if (!container) return

    let currentIndex = 0
    const img = container.querySelector("img")
    if (!img) return

    setInterval(() => {
        currentIndex = (currentIndex + 1) % photos.length

        img.style.opacity = "0"
        setTimeout(() => {
            img.src = photos[currentIndex]
            img.style.opacity = "1"
        }, SLIDESHOW_CONFIG.fadeDuration)
    }, SLIDESHOW_CONFIG.interval)

    img.style.transition = `opacity ${SLIDESHOW_CONFIG.fadeDuration}ms ease`
}
