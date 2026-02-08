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
            { text: "Later", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Notification",
        headline: "You Have Been Pre-Approved",
        body: "A credit card with a $4,000,000 limit has been issued in your name. It is already in the mail!",
        buttons: [
            { text: "OK", className: "green" },
            { text: "OK", className: "green" },
        ],
    },
    {
        type: "winner",
        title: "Prize Notification",
        headline: "You Have Been Selected",
        body: "The drawing has been completed. Your name was on the slip. Please report to the town square.",
        buttons: [
            { text: "Report", className: "green" },
            { text: "It isn't fair", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Sweepstakes Division",
        headline: "Your Entry Has Been Processed",
        body: "You entered a sweepstakes at some point. You do not remember when. You won.",
        buttons: [
            { text: "Collect", className: "green" },
            { text: "Discard Winnings", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Claims Department",
        headline: "Claim #0000000012 Resolved",
        body: "Your insurance claim has been approved after 14 levels of review. The approved amount has been deducted from the filing fee which has been added to your bill.",
        buttons: [
            { text: "Collect", className: "green" },
            { text: "Appeal", className: "" },
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
    {
        type: "error",
        title: "Error",
        headline: "An Error Has Occurred",
        body: "Something went wrong. It is not clear what. Probably nothing important.",
        buttons: [
            { text: "OK", className: "primary" },
            { text: "Also OK", className: "" },
        ],
    },
    {
        type: "error",
        title: "Task Failed",
        headline: "Operation Completed Unsuccessfully",
        body: "The operation completed, but it did not work. These are different things.",
        buttons: [
            { text: "Understood", className: "primary" },
            { text: "Not Understood", className: "" },
        ],
    },
    {
        type: "error",
        title: "Warning",
        headline: "Disk Usage Advisory",
        body: "Your hard drive is pregnant. It is due in Q3.",
        buttons: [
            { text: "It's a Boy", className: "blue" },
            { text: "It's a Girl", className: "pink" },
        ],
    },
    {
        type: "error",
        title: "System Notice",
        headline: "Clock Desynchronized",
        body: "Your system clock is 43 minutes ahead of itself. Please wait for time to catch up.",
        buttons: [
            { text: "Wait", className: "primary" },
            { text: "Keep Waiting", className: "" },
        ],
    },
    {
        type: "error",
        title: "Process Error",
        headline: "Stack Overflow in Stack Overflow Handler",
        body: "No",
        buttons: [{ text: "Acknowledge", className: "primary" }],
    },
    {
        type: "error",
        title: "System Alert",
        headline: "Printer Not Found",
        body: "No printer is connected.",
        buttons: [
            { text: "OK", className: "primary" },
            { text: "Find Printer", className: "" },
        ],
    },
    {
        type: "error",
        title: "Update Required",
        headline: "Mandatory Restart Pending",
        body: "Hnnnnngh...",
        buttons: [
            { text: "Restart Later", className: "primary" },
            { text: "Restart Much Later", className: "" },
        ],
    },
    {
        type: "error",
        title: "Connectivity",
        headline: "Network Adapter Missing",
        body: "No network adapter is connected.",
        buttons: [{ text: "OK", className: "primary" }],
    },
]

const WARNING_POPUPS: PopupContent[] = [
    {
        type: "warning",
        title: "Security Center",
        headline: "Firewall Status: Uncertain",
        body: "Your firewall is in an indeterminate state.",
        buttons: [
            { text: "Enable Firewall", className: "primary" },
            { text: "Disable Firewall", className: "" },
        ],
    },
    {
        type: "warning",
        title: "License Agreement",
        headline: "Terms of Service Updated",
        body: "The Terms of Service have been updated.",
        buttons: [{ text: "I Agree", className: "primary" }],
    },
    {
        type: "warning",
        title: "Scheduled Maintenance",
        headline: "Maintenance Window",
        body: "Scheduled maintenance will begin at a time that has not been determined. Duration: also undetermined.",
        buttons: [
            { text: "Noted", className: "primary" },
            { text: "Also Noted", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Power Management",
        headline: "Battery at 5%",
        body: "This is a desktop computer.",
        buttons: [
            { text: "Plug In", className: "primary" },
            { text: "Ignore", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Accessibility",
        headline: "Cursor Not Found",
        body: "Your mouse has been deleted.",
        buttons: [{ text: "Order New Mouse", className: "primary" }],
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
        body: "Download PCSpeedUp.scr to fix!",
        buttons: [
            { text: "Speed Up", className: "" },
            { text: "Stay Slow", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Advertisement",
        headline: "Refinance Your Mortgage",
        body: "Rates have never been this low. They have also never been this high. Both are true.",
        buttons: [
            { text: "Learn More", className: "" },
            { text: "Learn Less", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Free Download",
        headline: "Toolbar for Your Toolbar",
        body: "Add a second toolbar to manage your first toolbar. Requires a third toolbar.",
        buttons: [
            { text: "Install", className: "" },
            { text: "No", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Opportunity",
        headline: "Work From Home",
        body: "Earn $47,000/month by simply existing. Details are vague on purpose.",
        buttons: [
            { text: "Sign Up", className: "" },
            { text: "Remain Poor", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Health & Wellness",
        headline: "Doctors Hate This One Trick",
        body: "Local physician reportedly furious about a trick. The trick is not specified.",
        buttons: [
            { text: "See Trick", className: "" },
            { text: "Respect Doctors", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Sponsored Content",
        headline: "You Need a VPN",
        body: "Your ISP is watching you read this popup. This popup was served by your ISP.",
        buttons: [
            { text: "Get VPN", className: "" },
            { text: "Accept Surveillance", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Survey",
        headline: "Quick 45-Minute Survey",
        body: "Answer 200 simple questions. Compensation: the satisfaction of having answered them.",
        buttons: [
            { text: "Begin Survey", className: "" },
            { text: "Decline", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Promotion",
        headline: "Free Trial Offer",
        body: "Try our product free for 30 days. Your credit card will be charged on day 1.",
        buttons: [
            { text: "Start Trial", className: "" },
            { text: "Pass", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Newsletter",
        headline: "Subscribe to Our Newsletter",
        body: "Receive 14 emails per day about topics adjacent to your interests.",
        buttons: [
            { text: "Subscribe", className: "" },
            { text: "Unsubscribe", className: "gray" },
        ],
    },
]

export function getRandomPopup(): PopupContent {
    const allPopups = [
        ...WINNER_POPUPS,
        ...ERROR_POPUPS,
        ...WARNING_POPUPS,
        ...AD_POPUPS,
    ]
    return pick(allPopups)
}

export const POPUP_CONTENTS: PopupContent[] = [
    ...WINNER_POPUPS,
    ...ERROR_POPUPS,
    ...WARNING_POPUPS,
    ...AD_POPUPS,
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
    {
        type: "bonus",
        title: "Account Credit",
        headline: "Unclaimed Funds Detected",
        body: "Funds were found in an account that may or may not be yours. They have been assigned to you regardless.",
        bonusAmount: 0.75,
        buttons: [
            { text: "Accept Funds", className: "green", action: "bonus" },
            { text: "Return to Sender", className: "", action: "close" },
        ],
    },
    {
        type: "bonus",
        title: "Loyalty Program",
        headline: "Points Redeemed",
        body: "Your loyalty points have been automatically converted to cash. You were not enrolled in a loyalty program.",
        bonusAmount: 1.5,
        buttons: [
            { text: "Collect", className: "green", action: "bonus" },
            { text: "Dispute", className: "", action: "close" },
        ],
    },
    {
        type: "bonus",
        title: "Payroll",
        headline: "Payroll Correction",
        body: "A rounding error in your favor has been discovered. Legal says you can keep it.",
        bonusAmount: 0.5,
        buttons: [
            { text: "Keep It", className: "green", action: "bonus" },
            { text: "Report to Accounting", className: "", action: "close" },
        ],
    },
    {
        type: "bonus",
        title: "Reimbursement",
        headline: "Expense Report Approved",
        body: "An expense report you did not file has been approved. The funds are being deposited now.",
        bonusAmount: 1.0,
        buttons: [
            { text: "Accept", className: "green", action: "bonus" },
            { text: "Reject Own Money", className: "", action: "close" },
        ],
    },
]
