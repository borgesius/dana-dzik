export interface PopupButton {
    text: string
    className?: string
}

export interface PopupContent {
    type: "error" | "warning" | "winner" | "ad"
    title: string
    headline: string
    body: string
    image?: string
    buttons: PopupButton[]
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
