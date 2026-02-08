import type { RoutableWindow } from "./routing"

export interface DesktopItemConfig {
    id: string
    filename: string
    label?: string
    icon: string
    windowId: RoutableWindow
    fileType: "file" | "executable" | "shortcut" | "directory"
}

export const DESKTOP_ITEMS: DesktopItemConfig[] = [
    {
        id: "internet-explorer",
        filename: "Internet Explorer.lnk",
        label: "Internet Explorer",
        icon: "🌐",
        windowId: "welcome",
        fileType: "shortcut",
    },
    {
        id: "about-me",
        filename: "about_me.doc",
        icon: "📄",
        windowId: "about",
        fileType: "file",
    },
    {
        id: "projects",
        filename: "cool_projects.zip",
        icon: "📦",
        windowId: "projects",
        fileType: "file",
    },
    {
        id: "resume",
        filename: "resume.pdf",
        icon: "📕",
        windowId: "resume",
        fileType: "file",
    },
    {
        id: "links",
        filename: "bookmarks.url",
        icon: "🔗",
        windowId: "links",
        fileType: "shortcut",
    },
    {
        id: "guestbook",
        filename: "guestbook.exe",
        icon: "📖",
        windowId: "guestbook",
        fileType: "executable",
    },
    {
        id: "felixgpt",
        filename: "FelixGPT.exe",
        icon: "🐱",
        windowId: "felixgpt",
        fileType: "executable",
    },
    {
        id: "stats",
        filename: "Site Stats.exe",
        icon: "📊",
        windowId: "stats",
        fileType: "executable",
    },
    {
        id: "pinball",
        filename: "Pinball.exe",
        icon: "🪩",
        windowId: "pinball",
        fileType: "executable",
    },
    {
        id: "terminal",
        filename: "terminal.exe",
        icon: "💻",
        windowId: "terminal",
        fileType: "executable",
    },
    {
        id: "welt",
        filename: "WELT",
        icon: "📁",
        windowId: "explorer",
        fileType: "directory",
    },
    {
        id: "autobattler",
        filename: "SYMPOSIUM.exe",
        icon: "📜",
        windowId: "autobattler",
        fileType: "executable",
    },
    {
        id: "career-development",
        filename: "Career Development.exe",
        label: "Career Development",
        icon: "📋",
        windowId: "resume",
        fileType: "executable",
    },
]
