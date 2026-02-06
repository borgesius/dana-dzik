export interface PopupButton {
    text: string
    className?: string
    action?: "bonus" | "close"
}

export interface PopupContent {
    type: "error" | "warning" | "winner" | "ad" | "bonus"
    title: string
    headline: string
    body: string
    image?: string
    buttons: PopupButton[]
    bonusAmount?: number
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

const WINNER_POPUPS: PopupContent[] = [
    {
        type: "winner",
        title: "Congratulations!!!",
        headline: "🎉 YOU ARE THE 1,000,000th VISITOR! 🎉",
        body: "Click OK to claim your FREE iPod Nano!",
        buttons: [
            { text: "OK!!!", className: "green" },
            { text: "Claim Later", className: "" },
        ],
    },
    {
        type: "winner",
        title: "You Won!!!",
        headline: "🎉 VISITOR #0x0F4240 DETECTED! 🎉",
        body: "You have been selected!",
        buttons: [
            { text: "Claim Prize", className: "green" },
            { text: "Later (never)", className: "" },
        ],
    },
]

const ERROR_POPUPS: PopupContent[] = [
    {
        type: "error",
        title: "System Error",
        headline: "💾 DOWNLOAD MORE RAM 💾",
        body: "Your computer is running low on memory (-3KB free).",
        buttons: [
            { text: "Download RAM", className: "primary" },
            { text: "Cancel", className: "" },
        ],
    },
    {
        type: "error",
        title: "IRQ Conflict",
        headline: "⚠️ IRQ 7 IS OCCUPIED BY IRQ 7 ⚠️",
        body: "The interrupt request is interrupt",
        buttons: [
            { text: "Ignore", className: "primary" },
            { text: "Ignore Harder", className: "" },
        ],
    },
]

const AD_POPUPS: PopupContent[] = [
    {
        type: "ad",
        title: "Local Singles",
        headline: "😍 HOT SINGLES IN YOUR AREA 😍",
        body: "Just 3 miles away!",
        buttons: [
            { text: "Meet Them", className: "" },
            { text: "No Thanks", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Speed Up PC",
        headline: "🚀 YOUR PC IS RUNNING 340% TOO SLOW 🚀",
        body: "Download PCSpeedUp.exe.scr to fix!",
        buttons: [
            { text: "Speed Up", className: "" },
            { text: "Stay Slow", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Free Screensavers",
        headline: "✨ 10,000 FREE SCREENSAVERS ✨",
        body: "Flying toasters, pipes, and more! (Requires 4GB RAM)",
        buttons: [
            { text: "Download All", className: "" },
            { text: "No", className: "gray" },
        ],
    },
]

export function getRandomPopup(): PopupContent {
    const allPopups = [...WINNER_POPUPS, ...ERROR_POPUPS, ...AD_POPUPS]
    return pick(allPopups)
}

export const POPUP_CONTENTS: PopupContent[] = [
    pick(WINNER_POPUPS),
    pick(ERROR_POPUPS),
    pick(AD_POPUPS),
]

export const BONUS_POPUP_CONTENTS: PopupContent[] = [
    {
        type: "bonus",
        title: "Special Offer!",
        headline: "🎁 CLAIM YOUR BUSINESS BONUS! 🎁",
        body: "You've been selected for a special promotional offer!",
        bonusAmount: 0.5,
        buttons: [
            { text: "CLAIM NOW!", className: "green", action: "bonus" },
            { text: "No Thanks", className: "", action: "close" },
        ],
    },
    {
        type: "bonus",
        title: "Survey Complete!",
        headline: "📋 THANK YOU FOR YOUR FEEDBACK! 📋",
        body: "As a token of appreciation, here's a cash reward!",
        bonusAmount: 1.0,
        buttons: [
            { text: "Collect Reward", className: "green", action: "bonus" },
            { text: "Decline", className: "", action: "close" },
        ],
    },
    {
        type: "bonus",
        title: "Lucky Winner!",
        headline: "🍀 YOU'VE WON A PRIZE! 🍀",
        body: "Click below to add funds to your account!",
        bonusAmount: 2.0,
        buttons: [
            { text: "Add to Account", className: "green", action: "bonus" },
            { text: "Maybe Later", className: "", action: "close" },
        ],
    },
]
