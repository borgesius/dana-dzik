import type { FileSystem, FSNode } from "./filesystem"
import { getNode } from "./filesystem"
import { createFileSystem } from "./filesystemBuilder"

export interface FilesystemDiff {
    modified: Record<string, string>
    created: Record<string, string>
    deleted: string[]
}

function collectFiles(
    node: FSNode,
    path: string[],
    out: Map<string, string | undefined>
): void {
    const fullPath = path.join("\\")

    if (node.type !== "directory") {
        out.set(fullPath, node.content)
        return
    }

    if (!node.children) return
    for (const child of Object.values(node.children)) {
        collectFiles(child, [...path, child.name], out)
    }
}

export function diffFilesystem(current: FileSystem): FilesystemDiff {
    const defaultFs = createFileSystem()

    const defaultFiles = new Map<string, string | undefined>()
    collectFiles(defaultFs.root, ["3:"], defaultFiles)

    const currentFiles = new Map<string, string | undefined>()
    collectFiles(current.root, ["3:"], currentFiles)

    const modified: Record<string, string> = {}
    const created: Record<string, string> = {}
    const deleted: string[] = []

    for (const [path, content] of currentFiles) {
        if (defaultFiles.has(path)) {
            if (content !== defaultFiles.get(path) && content !== undefined) {
                modified[path] = content
            }
        } else if (content !== undefined) {
            created[path] = content
        }
    }

    for (const path of defaultFiles.keys()) {
        if (!currentFiles.has(path)) {
            deleted.push(path)
        }
    }

    return { modified, created, deleted }
}

export function patchFilesystem(fs: FileSystem, diff: FilesystemDiff): void {
    for (const path of diff.deleted) {
        const parts = path.split("\\")
        if (parts.length < 2) continue
        const parentPath = parts.slice(0, -1)
        const parentNode = getNode(fs, parentPath)
        if (parentNode?.type === "directory" && parentNode.children) {
            const name = parts[parts.length - 1]
            delete parentNode.children[name]
        }
    }

    for (const [path, content] of Object.entries(diff.modified)) {
        const parts = path.split("\\")
        const node = getNode(fs, parts)
        if (node && node.type !== "directory") {
            node.content = content
        }
    }

    for (const [path, content] of Object.entries(diff.created)) {
        const parts = path.split("\\")
        if (parts.length < 2) continue
        const parentParts = parts.slice(0, -1)
        const name = parts[parts.length - 1]

        let parentNode = getNode(fs, parentParts)

        if (!parentNode) {
            for (let i = 1; i < parentParts.length; i++) {
                const existing = getNode(fs, parentParts.slice(0, i + 1))
                if (!existing) {
                    const parent = getNode(fs, parentParts.slice(0, i))
                    if (parent?.type === "directory") {
                        if (!parent.children) parent.children = {}
                        parent.children[parentParts[i]] = {
                            name: parentParts[i],
                            type: "directory",
                            children: {},
                        }
                    }
                }
            }
            parentNode = getNode(fs, parentParts)
        }

        if (parentNode?.type === "directory") {
            if (!parentNode.children) parentNode.children = {}
            parentNode.children[name] = {
                name,
                type: "file",
                content,
            }
        }
    }
}
