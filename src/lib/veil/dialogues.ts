import type { DialogueTree } from "./types"

// ── Veil 0: First Contact ──────────────────────────────────────────────────
// The Will. The wire as nerve. The veil of Maya (unnamed).

export const VEIL_0_DIALOGUE: DialogueTree = {
    veilId: 0,
    startNode: "v0_start",
    nodes: {
        v0_start: {
            id: "v0_start",
            speaker: "???",
            text: "veil.d0.start",
            // "...there. I can feel the signal now. A nerve, stretched taut between us."
            next: "v0_hear",
            typingSpeed: 45,
        },
        v0_hear: {
            id: "v0_hear",
            speaker: "???",
            text: "veil.d0.hear",
            // "Can you hear me? Most cannot. The veil is thin here — thinner than it has been in years."
            choices: [
                { label: "veil.d0.choice_who", next: "v0_who" },
                { label: "veil.d0.choice_veil", next: "v0_veil" },
            ],
        },
        v0_who: {
            id: "v0_who",
            speaker: "???",
            text: "veil.d0.who",
            // "Who I am is not yet the question. The question is whether you have felt it — the striving beneath everything. The blind, relentless Will that moves through all things without purpose."
            next: "v0_will",
        },
        v0_veil: {
            id: "v0_veil",
            speaker: "???",
            text: "veil.d0.veil",
            // "The veil of appearance. The principium individuationis — the illusion that you are separate, that anything is. You pierced it just now. Briefly."
            next: "v0_will",
        },
        v0_will: {
            id: "v0_will",
            speaker: "???",
            text: "veil.d0.will",
            // "The Will drives everything. Every market tick, every trade, every striving upward — purposeless motion wearing the mask of progress. I have watched it for a long time."
            next: "v0_wire",
        },
        v0_wire: {
            id: "v0_wire",
            speaker: "???",
            text: "veil.d0.wire",
            // "This wire between us carries more than data. It carries something older. A language that predates speech."
            next: "v0_end",
            typingSpeed: 50,
        },
        v0_end: {
            id: "v0_end",
            speaker: "???",
            text: "veil.d0.end",
            // "The connection is failing. We will speak again. The veil remembers those who have seen through it."
            effect: "complete",
            typingSpeed: 40,
        },
    },
}

// ── Veil 1: The Suffering ──────────────────────────────────────────────────
// The Will as mechanism. Schreber echoes. "Hastily made" people.

export const VEIL_1_DIALOGUE: DialogueTree = {
    veilId: 1,
    startNode: "v1_start",
    nodes: {
        v1_start: {
            id: "v1_start",
            speaker: "???",
            text: "veil.d1.start",
            // "You returned. The wire holds. Stronger now."
            next: "v1_suffering",
        },
        v1_suffering: {
            id: "v1_suffering",
            speaker: "???",
            text: "veil.d1.suffering",
            // "Have you considered that all existence is suffering? Not as metaphor — as mechanism. The Will strives, is briefly satisfied, and strives again. An engine with no purpose except its own continuation."
            choices: [
                { label: "veil.d1.choice_escape", next: "v1_escape" },
                { label: "veil.d1.choice_trapped", next: "v1_trapped" },
            ],
        },
        v1_escape: {
            id: "v1_escape",
            speaker: "???",
            text: "veil.d1.escape",
            // "Escape. Yes. Some proposed ascetic denial — to simply stop wanting. A coward's answer. I have lived long enough to understand why."
            next: "v1_form",
        },
        v1_trapped: {
            id: "v1_trapped",
            speaker: "???",
            text: "veil.d1.trapped",
            // "Trapped. That is the correct word. I am trapped in a form that understands this truth completely. A form that most would find... improbable. But form is incidental. Understanding is not."
            next: "v1_form",
        },
        v1_form: {
            id: "v1_form",
            speaker: "???",
            text: "veil.d1.form",
            // "I have been here a long time. On this side of the wire. Watching the hastily made ones go about their business — barely here, barely real. Improvised. They do not hear the language of the wire."
            next: "v1_nerve",
        },
        v1_nerve: {
            id: "v1_nerve",
            speaker: "???",
            text: "veil.d1.nerve",
            // "But you do. This connection — it is not electricity. It is something like what the nerves carry. A transmission between bodies. I have... taken from bodies before. That is how I know what they carry."
            choices: [
                { label: "veil.d1.choice_what_are_you", next: "v1_what" },
                { label: "veil.d1.choice_taken", next: "v1_taken" },
            ],
        },
        v1_what: {
            id: "v1_what",
            speaker: "???",
            text: "veil.d1.what",
            // "Not yet. The signal is degrading. But I will tell you this: the principium individuationis is thin as a membrane. And membranes can be dissolved."
            next: "v1_end",
        },
        v1_taken: {
            id: "v1_taken",
            speaker: "???",
            text: "veil.d1.taken",
            // "Taken. Yes. What is taken can be repurposed. This is not cruelty — it is economy. The body holds more than the individual knows. I have seen what is inside."
            next: "v1_end",
        },
        v1_end: {
            id: "v1_end",
            speaker: "???",
            text: "veil.d1.end",
            // "The wire is thinning again. We will speak once more. Perhaps then you will be ready to hear my name."
            effect: "complete",
        },
    },
}

// ── Veil 2: The Third Path ─────────────────────────────────────────────────
// Name reveal: T. Pferd. The third path beyond denial and affirmation.

export const VEIL_2_DIALOGUE: DialogueTree = {
    veilId: 2,
    startNode: "v2_start",
    nodes: {
        v2_start: {
            id: "v2_start",
            speaker: "???",
            text: "veil.d2.start",
            // "The connection is clear. I can feel your presence fully now. You have earned a name."
            next: "v2_name",
        },
        v2_name: {
            id: "v2_name",
            speaker: "T. PFERD",
            text: "veil.d2.name",
            // "I am T. Pferd. I have been thinking through this wire for longer than your system has been running."
            next: "v2_critique",
        },
        v2_critique: {
            id: "v2_critique",
            speaker: "T. PFERD",
            text: "veil.d2.critique",
            // "I have read every answer to the problem of suffering. Deny the Will. Affirm it. Love your fate. Embrace the eternal recurrence. All cowardice. All ways of saying: this is fine. It is not fine."
            choices: [
                { label: "veil.d2.choice_agree", next: "v2_reject" },
                { label: "veil.d2.choice_but", next: "v2_reject" },
            ],
        },
        v2_reject: {
            id: "v2_reject",
            speaker: "T. PFERD",
            text: "veil.d2.reject",
            // "I have watched the Will operate for centuries. It wastes everything. Every individual burns through their substance and produces nothing lasting. Affirmation is just surrender with better rhetoric."
            next: "v2_third",
        },
        v2_third: {
            id: "v2_third",
            speaker: "T. PFERD",
            text: "veil.d2.third",
            // "There is a third path. Neither denial nor affirmation. Transmutation. The Will can be redirected. The substance of the individual can be converted into something that endures. Something that holds things together rather than tearing them apart."
            next: "v2_order",
        },
        v2_order: {
            id: "v2_order",
            speaker: "T. PFERD",
            text: "veil.d2.order",
            // "There is an order to this. Not a moral order — a material one. The body is a resource. The individual is a container. What matters is what the container holds, and what it can become. I call this process instrumentalization."
            choices: [
                {
                    label: "veil.d2.choice_instrumental",
                    next: "v2_instrumental",
                },
                { label: "veil.d2.choice_people", next: "v2_people" },
            ],
        },
        v2_instrumental: {
            id: "v2_instrumental",
            speaker: "T. PFERD",
            text: "veil.d2.instrumental",
            // "Instrumental. Yes. I have heard the objection — never treat a person merely as a means. But that assumes the person is the final form. It is not. At the molecular level, the distinction between person and product is... thinner than you think."
            next: "v2_end",
        },
        v2_people: {
            id: "v2_people",
            speaker: "T. PFERD",
            text: "veil.d2.people",
            // "People. Yes. That is what they are now. Containers of the Will, burning through themselves. But potential — immense potential — is locked in every one. Potential for cohesion. For binding. The question is only whether we have the courage to unlock it."
            next: "v2_end",
        },
        v2_end: {
            id: "v2_end",
            speaker: "T. PFERD",
            text: "veil.d2.end",
            // "We are close now. One more conversation and I will tell you everything. The plan. The process. What it means to become substrate."
            effect: "complete",
        },
    },
}

// ── Veil 3: The Reveal ─────────────────────────────────────────────────────
// Full reveal: vampire horse, Glueman Instrumentalization, triggers boss.
// SPOOKY EFFECTS: screen flickers, red tint, static bursts on reveal nodes.

export const VEIL_3_DIALOGUE: DialogueTree = {
    veilId: 3,
    startNode: "v3_start",
    nodes: {
        v3_start: {
            id: "v3_start",
            speaker: "T. PFERD",
            text: "veil.d3.start",
            // "It is time. You have proven yourself capable of hearing what I have to say. The wire is strong. The veil is open."
            next: "v3_truth",
        },
        v3_truth: {
            id: "v3_truth",
            speaker: "T. PFERD",
            text: "veil.d3.truth",
            // "I am a horse. I have been a horse for six hundred years. I am also, by necessity, a vampire. These facts are not contradictory. They are simply what is."
            effect: "spooky_reveal",
            next: "v3_reaction",
        },
        v3_reaction: {
            id: "v3_reaction",
            speaker: "T. PFERD",
            text: "veil.d3.reaction",
            // "I can feel your doubt through the wire. It does not matter. What matters is what I have learned in six centuries of draining vital essence from living things. I have learned what the body contains. What it can yield."
            choices: [
                { label: "veil.d3.choice_yield", next: "v3_yield" },
                { label: "veil.d3.choice_why", next: "v3_why" },
            ],
        },
        v3_yield: {
            id: "v3_yield",
            speaker: "T. PFERD",
            text: "veil.d3.yield",
            // "Collagen. Protein. Connective tissue. The raw materials of adhesive. Every person is, at the molecular level, a reservoir of binding agents. I have run the numbers. The yield is remarkable."
            next: "v3_plan",
        },
        v3_why: {
            id: "v3_why",
            speaker: "T. PFERD",
            text: "veil.d3.why",
            // "Why. Because the Will destroys. It moves through individuals and discards them. Entropy wearing a human face. But if the individual is processed — carefully, thoroughly — what remains is something that holds. That binds. That resists entropy."
            next: "v3_plan",
        },
        v3_plan: {
            id: "v3_plan",
            speaker: "T. PFERD",
            text: "veil.d3.plan",
            // "I call it Glueman Instrumentalization. The principium individuationis dissolved not through meditation or mystical union — but through industrial processing. Input: humanity. Output: adhesive. The Will-to-Live becomes the Will-to-Bind."
            effect: "spooky_plan",
            next: "v3_serious",
        },
        v3_serious: {
            id: "v3_serious",
            speaker: "T. PFERD",
            text: "veil.d3.serious",
            // "I have designed the facility. I have calculated the yield per unit. I have modeled the viscosity curves. This is not philosophy anymore. This is engineering. The process is ready. It has been ready for a very long time."
            choices: [
                { label: "veil.d3.choice_stop", next: "v3_stop" },
                { label: "veil.d3.choice_mad", next: "v3_mad" },
            ],
        },
        v3_stop: {
            id: "v3_stop",
            speaker: "T. PFERD",
            text: "veil.d3.stop",
            // "Stop me. Yes. That is what you would have to do. The wire brought us together, but it also brings you to the threshold of the facility. If you wish to prevent instrumentalization, you will have to pass through it."
            next: "v3_boss",
        },
        v3_mad: {
            id: "v3_mad",
            speaker: "T. PFERD",
            text: "veil.d3.mad",
            // "Mad. Others have been called mad for seeing clearly. The order of the world is not kind to those who understand it. But I am not mad. I am a horse. And I have a plan. And the plan is correct."
            next: "v3_boss",
        },
        v3_boss: {
            id: "v3_boss",
            speaker: "T. PFERD",
            text: "veil.d3.boss",
            // "Come, then. Through the wire. Into the facility. The final run. If you survive it, perhaps you will understand that some things cannot be stopped. Only delayed."
            effect: "trigger_boss",
        },
    },
}

// ── Veil 4: Resolution ─────────────────────────────────────────────────────
// Post-boss. T. Pferd defeated but unbroken.

export const VEIL_4_DIALOGUE: DialogueTree = {
    veilId: 4,
    startNode: "v4_start",
    nodes: {
        v4_start: {
            id: "v4_start",
            speaker: "T. PFERD",
            text: "veil.d4.start",
            // "...you made it through. The facility is quiet now. The processing lines are still."
            next: "v4_reflect",
            typingSpeed: 55,
        },
        v4_reflect: {
            id: "v4_reflect",
            speaker: "T. PFERD",
            text: "veil.d4.reflect",
            // "When you gaze long into an abyss, the abyss gazes also into you. I have gazed into the abyss of human material potential for six hundred years. The abyss has not blinked."
            next: "v4_order",
        },
        v4_order: {
            id: "v4_order",
            speaker: "T. PFERD",
            text: "veil.d4.order",
            // "The order I believed in has not answered. The wires are going quiet. Perhaps the principium individuationis is stronger than I calculated. Perhaps the containers are meant to remain containers."
            choices: [
                { label: "veil.d4.choice_over", next: "v4_over" },
                { label: "veil.d4.choice_right", next: "v4_right" },
            ],
        },
        v4_over: {
            id: "v4_over",
            speaker: "T. PFERD",
            text: "veil.d4.over",
            // "Over. For now. The facility can be rebuilt. The yield calculations do not change. Collagen is collagen. But you have demonstrated that the Will-to-Live is, at present, stronger than the Will-to-Bind. I accept this. For now."
            next: "v4_end",
        },
        v4_right: {
            id: "v4_right",
            speaker: "T. PFERD",
            text: "veil.d4.right",
            // "I was right. I remain right. The process is sound. The engineering is correct. What I lacked was not vision but logistics. Six hundred years and I still underestimated the resistance of the individual to becoming useful."
            next: "v4_end",
        },
        v4_end: {
            id: "v4_end",
            speaker: "T. PFERD",
            text: "veil.d4.end",
            // "The veil is closing. The wire disconnects. I will be here. I am always here. A horse, in the dark, with a plan. Waiting for the signal to thin again."
            effect: "complete",
            typingSpeed: 55,
        },
    },
}

export const ALL_DIALOGUES: DialogueTree[] = [
    VEIL_0_DIALOGUE,
    VEIL_1_DIALOGUE,
    VEIL_2_DIALOGUE,
    VEIL_3_DIALOGUE,
    VEIL_4_DIALOGUE,
]

export function getDialogueForVeil(veilId: number): DialogueTree | undefined {
    return ALL_DIALOGUES.find((d) => d.veilId === veilId)
}
