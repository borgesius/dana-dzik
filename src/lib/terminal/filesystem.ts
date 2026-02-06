export type FileType = "file" | "directory" | "executable" | "shortcut"

export interface FSNode {
    name: string
    type: FileType
    windowId?: string
    content?: string
    children?: Record<string, FSNode>
}

export interface FileSystem {
    root: FSNode
    cwd: string[]
}

const FILESYSTEM_STRUCTURE: FSNode = {
    name: "C:",
    type: "directory",
    children: {
        Users: {
            name: "Users",
            type: "directory",
            children: {
                Dana: {
                    name: "Dana",
                    type: "directory",
                    children: {
                        Desktop: {
                            name: "Desktop",
                            type: "directory",
                            children: {
                                "Internet Explorer.lnk": {
                                    name: "Internet Explorer.lnk",
                                    type: "shortcut",
                                    windowId: "welcome",
                                    content:
                                        "[InternetShortcut]\nURL=file:///C:/Program Files/Internet Explorer/iexplore.exe",
                                },
                                "about_me.doc": {
                                    name: "about_me.doc",
                                    type: "file",
                                    windowId: "about",
                                    content: `=== ABOUT DANA ===

Hi, my name is Dana.
I'm a software engineer who lives in San Francisco.

Interests:
- Running
- Cycling
- Technology
- Literature
- Philosophy

Cat: Felix Ramon Vanderbilt

[Use 'open about_me.doc' to view full profile]`,
                                },
                                "cool_projects.zip": {
                                    name: "cool_projects.zip",
                                    type: "file",
                                    windowId: "projects",
                                    content: `Archive: cool_projects.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1337  2026-02-05 12:00   this-website/
     2048  2026-02-05 12:00   secret-projects/
---------                     -------
     3385                     2 files

[Use 'open cool_projects.zip' to extract and view]`,
                                },
                                "resume.pdf": {
                                    name: "resume.pdf",
                                    type: "file",
                                    windowId: "resume",
                                    content: `%PDF-1.4
================================
        DANA DZIK
================================

EXPERIENCE
----------
Senior Software Engineer
Volley - San Francisco, CA
2021 - Present

EDUCATION
---------
University of Chicago
B.A. with Honors in Mathematics and Philosophy

[Use 'open resume.pdf' to view full document]`,
                                },
                                "bookmarks.url": {
                                    name: "bookmarks.url",
                                    type: "shortcut",
                                    windowId: "links",
                                    content: `[InternetShortcut]
URL=about:bookmarks
IconIndex=0`,
                                },
                                "guestbook.exe": {
                                    name: "guestbook.exe",
                                    type: "executable",
                                    windowId: "guestbook",
                                },
                                "FelixGPT.exe": {
                                    name: "FelixGPT.exe",
                                    type: "executable",
                                    windowId: "felixgpt",
                                },
                                "Site Stats.exe": {
                                    name: "Site Stats.exe",
                                    type: "executable",
                                    windowId: "stats",
                                },
                                "terminal.exe": {
                                    name: "terminal.exe",
                                    type: "executable",
                                    windowId: "terminal",
                                },
                            },
                        },
                    },
                },
            },
        },
        "Program Files": {
            name: "Program Files",
            type: "directory",
            children: {
                HACKTERM: {
                    name: "HACKTERM",
                    type: "directory",
                    children: {
                        "readme.txt": {
                            name: "readme.txt",
                            type: "file",
                            content: `HACKTERM v1.0
=============

A totally legitimate hacking terminal.
For educational purposes only.

Commands:
- Type 'help' for available commands
- Type 'sl' if you can't type 'ls' correctly

(c) 2026 Dana Industries`,
                        },
                    },
                },
                Winamp: {
                    name: "Winamp",
                    type: "directory",
                    children: {
                        "winamp.exe": {
                            name: "winamp.exe",
                            type: "executable",
                            content: "It really whips the llama's ass!",
                        },
                    },
                },
            },
        },
        WINDOWS: {
            name: "WINDOWS",
            type: "directory",
            children: {
                system32: {
                    name: "system32",
                    type: "directory",
                    children: {
                        "secrets.txt": {
                            name: "secrets.txt",
                            type: "file",
                            content: `You found the secret file!

The cake is a lie.
The princess is in another castle.
All your base are belong to us.

Congratulations, elite hacker!`,
                        },
                        "config.sys": {
                            name: "config.sys",
                            type: "file",
                            content: `DEVICE=C:\\WINDOWS\\HIMEM.SYS
DOS=HIGH,UMB
FILES=40
BUFFERS=20
STACKS=9,256`,
                        },
                    },
                },
            },
        },
    },
}

export function createFileSystem(): FileSystem {
    return {
        root: FILESYSTEM_STRUCTURE,
        cwd: ["C:", "Users", "Dana", "Desktop"],
    }
}

export function resolvePath(fs: FileSystem, pathStr: string): string[] | null {
    let parts: string[]

    if (pathStr.startsWith("C:\\") || pathStr.startsWith("C:/")) {
        parts = pathStr
            .slice(3)
            .split(/[/\\]/)
            .filter((p) => p.length > 0)
        parts.unshift("C:")
    } else if (pathStr === "C:" || pathStr === "C:\\") {
        parts = ["C:"]
    } else {
        parts = [...fs.cwd]
        const segments = pathStr.split(/[/\\]/).filter((p) => p.length > 0)
        for (const seg of segments) {
            if (seg === ".") {
                continue
            } else if (seg === "..") {
                if (parts.length > 1) {
                    parts.pop()
                }
            } else {
                parts.push(seg)
            }
        }
    }

    return parts
}

export function getNode(fs: FileSystem, path: string[]): FSNode | null {
    if (path.length === 0) return null
    if (path[0] !== "C:") return null

    let node = fs.root
    for (let i = 1; i < path.length; i++) {
        if (node.type !== "directory" || !node.children) {
            return null
        }
        const child = node.children[path[i]]
        if (!child) {
            return null
        }
        node = child
    }

    return node
}

export function getNodeAtPath(fs: FileSystem, pathStr: string): FSNode | null {
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) return null
    return getNode(fs, resolved)
}

export function getCurrentNode(fs: FileSystem): FSNode | null {
    return getNode(fs, fs.cwd)
}

export function formatPath(path: string[]): string {
    if (path.length === 1 && path[0] === "C:") {
        return "C:\\"
    }
    return path.join("\\")
}

export function changeDirectory(
    fs: FileSystem,
    pathStr: string
): { success: boolean; error?: string } {
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) {
        return { success: false, error: `Invalid path: ${pathStr}` }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return {
            success: false,
            error: `The system cannot find the path specified: ${pathStr}`,
        }
    }

    if (node.type !== "directory") {
        return { success: false, error: `Not a directory: ${pathStr}` }
    }

    fs.cwd = resolved
    return { success: true }
}

export function listDirectory(fs: FileSystem): {
    entries: Array<{ name: string; type: FileType }>
    error?: string
} {
    const node = getCurrentNode(fs)
    if (!node || node.type !== "directory" || !node.children) {
        return { entries: [], error: "Cannot list: not a directory" }
    }

    const entries = Object.values(node.children).map((child) => ({
        name: child.name,
        type: child.type,
    }))

    entries.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1
        if (a.type !== "directory" && b.type === "directory") return 1
        return a.name.localeCompare(b.name)
    })

    return { entries }
}

export function getFileContent(
    fs: FileSystem,
    filename: string
): { content?: string; windowId?: string; error?: string } {
    const resolved = resolvePath(fs, filename)
    if (!resolved) {
        return { error: `Invalid path: ${filename}` }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return { error: `File not found: ${filename}` }
    }

    if (node.type === "directory") {
        return { error: `${filename} is a directory` }
    }

    return { content: node.content, windowId: node.windowId }
}

export function getExecutableWindowId(
    fs: FileSystem,
    filename: string
): string | null {
    const resolved = resolvePath(fs, filename)
    if (!resolved) return null

    const node = getNode(fs, resolved)
    if (!node) return null

    return node.windowId ?? null
}

export function buildTree(
    fs: FileSystem,
    path: string[] = fs.cwd,
    prefix: string = ""
): string {
    const node = getNode(fs, path)
    if (!node) return ""

    const lines: string[] = []
    const name = path.length === 1 ? path[0] + "\\" : path[path.length - 1]

    if (path.length === fs.cwd.length) {
        lines.push(name)
    }

    if (node.type === "directory" && node.children) {
        const children = Object.values(node.children)
        children.forEach((child, index) => {
            const last = index === children.length - 1
            const connector = last ? "└── " : "├── "
            const childPrefix = prefix + (last ? "    " : "│   ")

            lines.push(prefix + connector + child.name)

            if (child.type === "directory" && child.children) {
                const childPath = [...path, child.name]
                const subtree = buildTree(fs, childPath, childPrefix)
                if (subtree) {
                    const subtreeLines = subtree.split("\n").slice(1)
                    lines.push(...subtreeLines)
                }
            }
        })
    }

    return lines.join("\n")
}
