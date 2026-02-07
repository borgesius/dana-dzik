import { getLocaleManager } from "../localeManager"

export type FileType = "file" | "directory" | "executable" | "shortcut"

export interface FSNode {
    name: string
    type: FileType
    windowId?: string
    handler?: string
    readonly?: boolean
    content?: string
    children?: Record<string, FSNode>
}

export interface FileSystem {
    root: FSNode
    cwd: string[]
}

export function resolvePath(fs: FileSystem, pathStr: string): string[] | null {
    let parts: string[]

    if (pathStr.startsWith("3:\\") || pathStr.startsWith("3:/")) {
        parts = pathStr
            .slice(3)
            .split(/[/\\]/)
            .filter((p) => p.length > 0)
        parts.unshift("3:")
    } else if (pathStr === "3:" || pathStr === "3:\\") {
        parts = ["3:"]
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

function findChild(
    children: Record<string, FSNode>,
    name: string
): FSNode | null {
    if (children[name]) return children[name]
    const lower = name.toLowerCase()
    for (const key of Object.keys(children)) {
        if (key.toLowerCase() === lower) return children[key]
    }
    return null
}

export function getNode(fs: FileSystem, path: string[]): FSNode | null {
    if (path.length === 0) return null
    if (path[0] !== "3:") return null

    let node = fs.root
    for (let i = 1; i < path.length; i++) {
        if (node.type !== "directory" || !node.children) {
            return null
        }
        const child = findChild(node.children, path[i])
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
    if (path.length === 1 && path[0] === "3:") {
        return "3:\\"
    }
    return path.join("\\")
}

export function changeDirectory(
    fs: FileSystem,
    pathStr: string
): { success: boolean; error?: string } {
    const lm = getLocaleManager()
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) {
        return {
            success: false,
            error: lm.t("filesystem.invalidPath", { path: pathStr }),
        }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return {
            success: false,
            error: lm.t("filesystem.pathNotFound", { path: pathStr }),
        }
    }

    if (node.type !== "directory") {
        return {
            success: false,
            error: lm.t("filesystem.notADirectory", { path: pathStr }),
        }
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
        return {
            entries: [],
            error: getLocaleManager().t("filesystem.cannotList"),
        }
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
    const lm = getLocaleManager()
    const resolved = resolvePath(fs, filename)
    if (!resolved) {
        return { error: lm.t("filesystem.invalidPath", { path: filename }) }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return { error: lm.t("filesystem.fileNotFound", { path: filename }) }
    }

    if (node.type === "directory") {
        return { error: lm.t("filesystem.isADirectory", { path: filename }) }
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

const MAX_FILE_BYTES = 4096

export function writeFile(
    fs: FileSystem,
    pathStr: string,
    content: string
): { success: boolean; error?: string } {
    const lm = getLocaleManager()
    const resolved = resolvePath(fs, pathStr)
    if (!resolved) {
        return {
            success: false,
            error: lm.t("filesystem.invalidPath", { path: pathStr }),
        }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return {
            success: false,
            error: lm.t("filesystem.fileNotFound", { path: pathStr }),
        }
    }

    if (node.type === "directory") {
        return {
            success: false,
            error: lm.t("filesystem.isADirectory", { path: pathStr }),
        }
    }

    if (new Blob([content]).size > MAX_FILE_BYTES) {
        return {
            success: false,
            error: lm.t("filesystem.fileSizeLimit", { limit: MAX_FILE_BYTES }),
        }
    }

    node.content = content
    return { success: true }
}

export function createFile(
    fs: FileSystem,
    dirPathStr: string,
    name: string,
    content: string
): { success: boolean; error?: string } {
    const lm = getLocaleManager()
    const resolved = resolvePath(fs, dirPathStr)
    if (!resolved) {
        return {
            success: false,
            error: lm.t("filesystem.invalidPath", { path: dirPathStr }),
        }
    }

    const dirNode = getNode(fs, resolved)
    if (!dirNode) {
        return {
            success: false,
            error: lm.t("filesystem.dirNotFound", { path: dirPathStr }),
        }
    }

    if (dirNode.type !== "directory") {
        return {
            success: false,
            error: lm.t("filesystem.notADirectory", { path: dirPathStr }),
        }
    }

    if (!dirNode.children) {
        dirNode.children = {}
    }

    if (dirNode.children[name]) {
        return {
            success: false,
            error: lm.t("filesystem.fileExists", { name }),
        }
    }

    if (new Blob([content]).size > MAX_FILE_BYTES) {
        return {
            success: false,
            error: lm.t("filesystem.fileSizeLimit", { limit: MAX_FILE_BYTES }),
        }
    }

    dirNode.children[name] = {
        name,
        type: "file",
        content,
    }

    return { success: true }
}

export function deleteFile(
    fs: FileSystem,
    pathStr: string
): { success: boolean; error?: string } {
    const lm = getLocaleManager()
    const resolved = resolvePath(fs, pathStr)
    if (!resolved || resolved.length < 2) {
        return {
            success: false,
            error: lm.t("filesystem.invalidPath", { path: pathStr }),
        }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return {
            success: false,
            error: lm.t("filesystem.notFound", { path: pathStr }),
        }
    }

    if (
        node.type === "directory" &&
        node.children &&
        Object.keys(node.children).length > 0
    ) {
        return {
            success: false,
            error: lm.t("filesystem.dirNotEmpty", { path: pathStr }),
        }
    }

    const parentPath = resolved.slice(0, -1)
    const parentNode = getNode(fs, parentPath)
    if (
        !parentNode ||
        parentNode.type !== "directory" ||
        !parentNode.children
    ) {
        return { success: false, error: lm.t("filesystem.parentNotFound") }
    }

    const fileName = resolved[resolved.length - 1]
    const key = Object.keys(parentNode.children).find(
        (k) => k.toLowerCase() === fileName.toLowerCase()
    )
    if (key) {
        delete parentNode.children[key]
    }

    return { success: true }
}

export function renameFile(
    fs: FileSystem,
    pathStr: string,
    newName: string
): { success: boolean; error?: string } {
    const lm = getLocaleManager()
    const resolved = resolvePath(fs, pathStr)
    if (!resolved || resolved.length < 2) {
        return {
            success: false,
            error: lm.t("filesystem.invalidPath", { path: pathStr }),
        }
    }

    const node = getNode(fs, resolved)
    if (!node) {
        return {
            success: false,
            error: lm.t("filesystem.notFound", { path: pathStr }),
        }
    }

    const parentPath = resolved.slice(0, -1)
    const parentNode = getNode(fs, parentPath)
    if (
        !parentNode ||
        parentNode.type !== "directory" ||
        !parentNode.children
    ) {
        return { success: false, error: lm.t("filesystem.parentNotFound") }
    }

    if (parentNode.children[newName]) {
        return {
            success: false,
            error: lm.t("filesystem.alreadyExists", { name: newName }),
        }
    }

    const oldKey = Object.keys(parentNode.children).find(
        (k) => k.toLowerCase() === resolved[resolved.length - 1].toLowerCase()
    )
    if (!oldKey) {
        return {
            success: false,
            error: lm.t("filesystem.notFound", { path: pathStr }),
        }
    }

    node.name = newName
    parentNode.children[newName] = node
    delete parentNode.children[oldKey]

    return { success: true }
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
