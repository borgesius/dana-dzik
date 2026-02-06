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

export const POPUP_CONTENTS: PopupContent[] = [
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
        type: "error",
        title: "System Error",
        headline: "💾 DOWNLOAD MORE RAM 💾",
        body: "Your computer is running low on memory.",
        buttons: [
            { text: "Download RAM", className: "primary" },
            { text: "Cancel", className: "" },
        ],
    },
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
