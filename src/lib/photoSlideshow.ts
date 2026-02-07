import { SLIDESHOW_CONFIG } from "../config"

interface SlideshowPhoto {
    jpg: string
    webp: string
}

function toSlideshowPhoto(jpgPath: string): SlideshowPhoto {
    return {
        jpg: jpgPath,
        webp: jpgPath.replace(/\.jpg$/, ".webp"),
    }
}

const DANA_PHOTOS: SlideshowPhoto[] = [
    "/assets/dana/IMG_5099.jpg",
    "/assets/dana/IMG_5531.jpg",
    "/assets/dana/IMG_5576.jpg",
    "/assets/dana/IMG_7045.jpg",
].map(toSlideshowPhoto)

const FELIX_PHOTOS: SlideshowPhoto[] = [
    "/assets/felix/IMG_1420.jpg",
    "/assets/felix/IMG_1428.jpg",
    "/assets/felix/IMG_3391.jpg",
    "/assets/felix/IMG_3831.jpg",
    "/assets/felix/IMG_7187.jpg",
    "/assets/felix/IMG_7440.jpg",
].map(toSlideshowPhoto)

export function initPhotoSlideshows(): void {
    initSlideshow("dana-photos", DANA_PHOTOS)
    initSlideshow("felix-photos", FELIX_PHOTOS)
}

function initSlideshow(containerId: string, photos: SlideshowPhoto[]): void {
    const container = document.getElementById(containerId)
    if (!container) return

    let currentIndex = 0
    const picture = container.querySelector("picture")
    const img = container.querySelector("img")
    if (!img) return

    const source = picture?.querySelector("source")

    setInterval(() => {
        currentIndex = (currentIndex + 1) % photos.length
        const photo = photos[currentIndex]

        img.style.opacity = "0"
        setTimeout(() => {
            if (source) {
                source.srcset = photo.webp
            }
            img.src = photo.jpg
            img.style.opacity = "1"
        }, SLIDESHOW_CONFIG.fadeDuration)
    }, SLIDESHOW_CONFIG.interval)

    img.style.transition = `opacity ${SLIDESHOW_CONFIG.fadeDuration}ms ease`
}
