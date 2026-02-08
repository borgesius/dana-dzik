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
    {
        type: "winner",
        title: "Ringtone Center",
        headline: "🎵 FREE RINGTONE UNLOCKED! 🎵",
        body: "You have won a free polyphonic ringtone of your choice! Compatible with most Nokia devices.",
        buttons: [
            { text: "Download", className: "green" },
            { text: "Browse More", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Travel Division",
        headline: "Travel Voucher Awarded",
        body: "A $10,000 travel voucher has been credited to your account. Destination must be selected within 24 hours.",
        buttons: [
            { text: "Select Destination", className: "green" },
            { text: "Forfeit", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Virtual Derby",
        headline: "🏇 YOUR HORSE PLACED FIRST! 🏇",
        body: "Your entry in the 3rd Annual Virtual Derby has finished first! Prize money is being transferred.",
        buttons: [
            { text: "Collect Winnings", className: "green" },
            { text: "Donate to Stable", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Dental Rewards",
        headline: "🦷 FREE WHITENING SESSION! 🦷",
        body: "You have been selected for a complimentary dental whitening session at a participating provider near you!",
        buttons: [
            { text: "Schedule Now", className: "green" },
            { text: "Later", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Cash Prize",
        headline: "Cashier's Check Prepared",
        body: "A cashier's check for $50,000 is being prepared in your name. Please allow 6-8 business days.",
        buttons: [
            { text: "Confirm Address", className: "green" },
            { text: "Hold at Branch", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Mare County Sweepstakes",
        headline: "Your Entry Has Been Drawn",
        body: "The Mare County Annual Sweepstakes drawing is complete. Your ticket number matched. Please contact the claims office.",
        buttons: [
            { text: "Contact Office", className: "green" },
            { text: "Later", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Dental Insurance",
        headline: "🎉 FREE COVERAGE FOR ONE YEAR! 🎉",
        body: "Congratulations! You have won a full year of premium dental insurance including two cleanings and one emergency extraction.",
        buttons: [
            { text: "Enroll", className: "green" },
            { text: "View Plan Details", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Electronics Giveaway",
        headline: "You Won a FREE Laptop!",
        body: "A brand new laptop computer has been reserved in your name! Just pay $4.99 shipping and handling.",
        buttons: [
            { text: "Claim Laptop", className: "green" },
            { text: "Decline", className: "" },
        ],
    },
    {
        type: "winner",
        title: "Equestrian Association",
        headline: "Lifetime Membership Granted",
        body: "The American Digital Equestrian Association has awarded you a free lifetime membership. Stable access included.",
        buttons: [
            { text: "Accept", className: "green" },
            { text: "View Benefits", className: "" },
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
        body: "Your system clock is 43 minutes ahead of itself. Please wait for time.",
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
    {
        type: "error",
        title: "Fatal Exception",
        headline: "⚠️ FATAL EXCEPTION 0E ⚠️",
        body: "A fatal exception.",
        buttons: [
            { text: "Restart", className: "primary" },
            { text: "Continue", className: "" },
        ],
    },
    {
        type: "error",
        title: "Input Error",
        headline: "Keyboard Not Found",
        body: "No keyboard detected.",
        buttons: [{ text: "OK", className: "primary" }],
    },
    {
        type: "error",
        title: "Driver Error",
        headline: "EQUINE.SYS Has Stopped",
        body: "EQUINE.SYS has encountered a problem and needs to close. If you continue to experience this error, contact your system administrator.",
        buttons: [
            { text: "Send Report", className: "primary" },
            { text: "Don't Send", className: "" },
        ],
    },
    {
        type: "error",
        title: "Application Error",
        headline: "DentalScan.exe - Illegal Operation",
        body: "DentalScan.exe has performed an illegal operation and will be shut down. Your scan results have not been saved.",
        buttons: [
            { text: "Close", className: "primary" },
            { text: "Details", className: "" },
        ],
    },
    {
        type: "error",
        title: "Memory Error",
        headline: "HIMEM.SYS Missing or Corrupt",
        body: "HIMEM.SYS is missing or corrupt. Extended memory is unavailable.",
        buttons: [{ text: "OK", className: "primary" }],
    },
    {
        type: "error",
        title: "Protection Fault",
        headline: "General Protection Fault",
        body: "A general protection fault has occurred in module UNKNOWN at address -1.",
        buttons: [
            { text: "Close", className: "primary" },
            { text: "Ignore", className: "" },
        ],
    },
    {
        type: "error",
        title: "Memory Allocation",
        headline: "HorseManager.exe - Out of Memory",
        body: "HorseManager.exe was unable to allocate the requested memory block. Please close other applications and try again.",
        buttons: [
            { text: "End Processes", className: "primary" },
            { text: "Cancel", className: "" },
        ],
    },
    {
        type: "error",
        title: "Module Error",
        headline: "Molar.dll Failed to Load",
        body: "The required module Molar.dll could not be found. Please reinstall DentalSuite or contact your system administrator.",
        buttons: [
            { text: "Reinstall", className: "primary" },
            { text: "Cancel", className: "" },
        ],
    },
    {
        type: "error",
        title: "Recovery",
        headline: "System Recovered From Serious Error",
        body: "Windows has recovered from a serious error. A log of the error has been created.",
        buttons: [
            { text: "Send Error Report", className: "primary" },
            { text: "Don't Send", className: "" },
        ],
    },
    {
        type: "error",
        title: "Device Manager",
        headline: "USB Horse Not Recognized",
        body: "One of the USB devices attached to this computer has malfunctioned. Device: Generic USB Horse.",
        buttons: [
            { text: "Troubleshoot", className: "primary" },
            { text: "Eject", className: "" },
        ],
    },
    {
        type: "error",
        title: "Application Crash",
        headline: "GlueFactory.exe Has Stopped Working",
        body: "Windows is checking for a solution to the problem...",
        buttons: [
            { text: "Close Program", className: "primary" },
            { text: "Wait", className: "" },
        ],
    },
    {
        type: "error",
        title: "Runtime Error",
        headline: "Runtime Error at 00:00:00:00",
        body: "An application error has occurred. The instruction at 0x00000000 referenced memory at 0x00000000.",
        buttons: [{ text: "OK", className: "primary" }],
    },
    {
        type: "error",
        title: "System Error",
        headline: "Fluoride Module Not Responding",
        body: "FluroGuard.sys is not responding. Your enamel protection service has been suspended.",
        buttons: [
            { text: "Restart Service", className: "primary" },
            { text: "Cancel", className: "" },
        ],
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
    {
        type: "warning",
        title: "Antivirus",
        headline: "Virus Definitions Outdated",
        body: "Your antivirus definitions are 847 days out of date. Your system may be at risk.",
        buttons: [
            { text: "Update Now", className: "primary" },
            { text: "Remind Me Later", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Password Security",
        headline: "Password Expiration Notice",
        body: "Your password has not been changed in 4,392 days. It may have expired.",
        buttons: [
            { text: "Change Password", className: "primary" },
            { text: "Keep Password", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Email Security",
        headline: "Unauthorized Access Attempt",
        body: "A program is requesting access to your email contacts. This program does not have a name.",
        buttons: [
            { text: "Allow", className: "primary" },
            { text: "Deny", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Stable Management",
        headline: "HorseManager.exe Requesting Privileges",
        body: "HorseManager.exe is requesting elevated administrator privileges to modify stable configurations.",
        buttons: [
            { text: "Grant", className: "primary" },
            { text: "Deny", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Dental Records",
        headline: "Backup Overdue",
        body: "Your dental records have not been backed up since 1969. Data may be at risk.",
        buttons: [
            { text: "Back Up Now", className: "primary" },
            { text: "Remind Me Later", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Certificate Warning",
        headline: "Security Certificate Expired",
        body: "The security certificate for this site expired on January 1, 2004. Do you want to proceed?",
        buttons: [
            { text: "Yes", className: "primary" },
            { text: "No", className: "" },
        ],
    },
    {
        type: "warning",
        title: "ActiveX Control",
        headline: "ActiveX Component Required",
        body: "This page requires an ActiveX control to display correctly. Click here to install HorseViewer.ocx.",
        buttons: [
            { text: "Install", className: "primary" },
            { text: "Block", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Calibration",
        headline: "Fluoride Module Requires Calibration",
        body: "The fluoride dispensing module has drifted outside acceptable parameters. Please recalibrate.",
        buttons: [
            { text: "Calibrate", className: "primary" },
            { text: "Postpone", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Disk Check",
        headline: "Consistency Check Required",
        body: "One or more of your drives needs to be checked for consistency. This check will run automatically on next restart.",
        buttons: [
            { text: "Restart Now", className: "primary" },
            { text: "Restart Later", className: "" },
        ],
    },
    {
        type: "warning",
        title: "Adhesive Systems",
        headline: "Bonding Agent Update Available",
        body: "GlueWorks Pro has released a critical bonding agent update. Adhesion strength may be compromised.",
        buttons: [
            { text: "Update", className: "primary" },
            { text: "Skip", className: "" },
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
        body: "Download PCSpeedUp.scr to fix!",
        buttons: [
            { text: "Speed Up", className: "" },
            { text: "Stay Slow", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Advertisement",
        headline: "Exposed: New Federal Mortgage Loophole",
        body: "Banks don't want you to know about this. Exposed loophole lets homeowners save up to $3,400/yr.",
        buttons: [
            { text: "Learn More", className: "" },
            { text: "Not Now", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Free Download",
        headline: "⬇️ FREE BROWSER COMPANION ⬇️",
        body: "SearchAssist Pro adds 47 helpful features to your browser. Trusted by millions.",
        buttons: [
            { text: "Install Now", className: "" },
            { text: "No Thanks", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Opportunity",
        headline: "💰 WORK FROM HOME 💰",
        body: "Earn $47,000/month from your kitchen table! My sister did it and so can you.",
        buttons: [
            { text: "Sign Up", className: "" },
            { text: "Not Now", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Health & Wellness",
        headline: "Doctors HATE This One Trick",
        body: "A Florida mom lost 30 lbs in 2 weeks using a simple household ingredient.",
        buttons: [
            { text: "See Trick", className: "" },
            { text: "No Thanks", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Sponsored Content",
        headline: "🔒 YOUR CONNECTION IS NOT PRIVATE 🔒",
        body: "Hackers can see everything you do online. Protect yourself with SecureVPN today.",
        buttons: [
            { text: "Get Protected", className: "" },
            { text: "Continue Unprotected", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Survey",
        headline: "📋 COMPLETE THIS SURVEY FOR A FREE GIFT CARD 📋",
        body: "Tell us about your shopping habits and receive a $500 Walmart gift card!",
        buttons: [
            { text: "Begin Survey", className: "" },
            { text: "Decline", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Promotion",
        headline: "Free Trial Offer",
        body: "Try our premium antivirus FREE for 30 days. No credit card required.*",
        buttons: [
            { text: "Start Free Trial", className: "" },
            { text: "No Thanks", className: "gray" },
        ],
    },
    {
        type: "ad",
        title: "Newsletter",
        headline: "📧 DON'T MISS OUT! 📧",
        body: "Get exclusive deals and insider tips delivered straight to your inbox daily!",
        buttons: [
            { text: "Subscribe", className: "" },
            { text: "No Thanks", className: "gray" },
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
