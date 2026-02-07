export const ROUTABLE_WINDOWS = [
    "welcome",
    "about",
    "projects",
    "resume",
    "links",
    "guestbook",
    "felixgpt",
    "stats",
    "pinball",
    "terminal",
    "explorer",
    "achievements",
    "autobattler",
] as const

export type RoutableWindow = (typeof ROUTABLE_WINDOWS)[number]

export const ROUTE_MAP: Record<string, RoutableWindow> = {
    "/": "welcome",
    "/about": "about",
    "/projects": "projects",
    "/resume": "resume",
    "/links": "links",
    "/guestbook": "guestbook",
    "/felixgpt": "felixgpt",
    "/stats": "stats",
    "/pinball": "pinball",
    "/terminal": "terminal",
    "/achievements": "achievements",
    "/autobattler": "autobattler",
}
