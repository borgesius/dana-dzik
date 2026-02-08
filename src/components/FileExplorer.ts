import type { RoutableWindow } from "../config/routing"
import { emitAppEvent } from "../lib/events"
import {
    createDirectory,
    createFile,
    deleteFile,
    type FileSystem,
    formatPath,
    type FSNode,
    getNode,
    renameFile,
    resolvePath,
} from "../lib/terminal/filesystem"
import { getSharedFilesystem } from "../lib/terminal/filesystemBuilder"

export class FileExplorer {
    private container: HTMLElement
    private fs: FileSystem
    private addressBar: HTMLElement
    private fileList: HTMLElement
    private contextMenu: HTMLElement | null = null
    private currentPath: string[]

    constructor(container: HTMLElement, initialPath?: string) {
        this.container = container
        this.fs = getSharedFilesystem()
        this.container.innerHTML = ""
        this.container.className = "explorer-container"

        if (initialPath) {
            const resolved = resolvePath(this.fs, initialPath)
            this.currentPath = resolved ?? this.fs.cwd
        } else {
            this.currentPath = this.fs.cwd
        }

        const toolbar = document.createElement("div")
        toolbar.className = "explorer-toolbar"

        const upBtn = document.createElement("button")
        upBtn.className = "explorer-up-btn"
        upBtn.textContent = "Up"
        upBtn.addEventListener("click", () => this.navigateUp())
        toolbar.appendChild(upBtn)

        this.addressBar = document.createElement("div")
        this.addressBar.className = "explorer-address-bar"
        toolbar.appendChild(this.addressBar)

        this.container.appendChild(toolbar)

        this.fileList = document.createElement("div")
        this.fileList.className = "explorer-file-list"
        this.container.appendChild(this.fileList)

        document.addEventListener("click", () => this.hideContextMenu())

        this.fileList.addEventListener("contextmenu", (e) => {
            // Only fire if clicking the empty area, not a file row
            if ((e.target as HTMLElement).closest(".explorer-row")) return
            e.preventDefault()
            e.stopPropagation()
            this.showBackgroundContextMenu(e)
        })

        this.render()
    }

    private render(): void {
        this.addressBar.textContent = formatPath(this.currentPath)
        this.fileList.innerHTML = ""

        const node = getNode(this.fs, this.currentPath)
        if (!node || node.type !== "directory" || !node.children) return

        const entries = Object.values(node.children).sort((a, b) => {
            if (a.type === "directory" && b.type !== "directory") return -1
            if (a.type !== "directory" && b.type === "directory") return 1
            return a.name.localeCompare(b.name)
        })

        for (const entry of entries) {
            const row = document.createElement("div")
            row.className = "explorer-row"
            row.dataset.name = entry.name

            const icon = document.createElement("span")
            icon.className = "explorer-row-icon"
            icon.textContent = this.getIcon(entry)
            row.appendChild(icon)

            const name = document.createElement("span")
            name.className = "explorer-row-name"
            name.textContent = entry.name
            row.appendChild(name)

            const type = document.createElement("span")
            type.className = "explorer-row-type"
            type.textContent = this.getTypeLabel(entry)
            row.appendChild(type)

            row.addEventListener("dblclick", () =>
                this.handleDoubleClick(entry)
            )
            row.addEventListener("contextmenu", (e) =>
                this.handleRightClick(e, entry)
            )

            this.fileList.appendChild(row)
        }
    }

    private getIcon(node: FSNode): string {
        if (node.type === "directory") return "📁"
        if (node.name.endsWith(".welt")) return "📜"
        if (node.type === "executable") return "⚙️"
        if (node.type === "shortcut") return "🔗"
        if (node.name.endsWith(".txt")) return "📄"
        return "📄"
    }

    private getTypeLabel(node: FSNode): string {
        if (node.type === "directory") return "File Folder"
        if (node.name.endsWith(".welt")) return "WELT Program"
        if (node.type === "executable") return "Application"
        if (node.type === "shortcut") return "Shortcut"
        return "File"
    }

    private handleDoubleClick(node: FSNode): void {
        if (node.type === "directory") {
            this.currentPath = [...this.currentPath, node.name]
            this.render()
            return
        }

        if (node.windowId) {
            emitAppEvent("terminal:open-window", {
                windowId: node.windowId as RoutableWindow,
            })
            return
        }

        if (node.handler) {
            this.openTerminalWith(node.name)
            return
        }

        if (node.name.endsWith(".welt")) {
            this.openTerminalWith(`edit ${node.name}`)
            return
        }

        if (node.content) {
            this.openTerminalWith(`cat ${node.name}`)
        }
    }

    private handleRightClick(e: MouseEvent, node: FSNode): void {
        e.preventDefault()
        e.stopPropagation()
        this.hideContextMenu()

        const menu = document.createElement("div")
        menu.className = "explorer-context-menu"
        menu.style.left = `${e.clientX}px`
        menu.style.top = `${e.clientY}px`

        const isWelt = node.name.endsWith(".welt")

        if (isWelt) {
            menu.appendChild(
                this.createMenuItem("Run with WELT", () => {
                    this.openTerminalWith(`welt ${node.name}`)
                })
            )
            menu.appendChild(
                this.createMenuItem("Compile to Grund", () => {
                    this.openTerminalWith(`welt --grund ${node.name}`)
                })
            )
            menu.appendChild(
                this.createMenuItem("View source", () => {
                    this.openTerminalWith(`cat ${node.name}`)
                })
            )
        }

        if (node.type === "directory") {
            menu.appendChild(
                this.createMenuItem("Open", () => {
                    this.currentPath = [...this.currentPath, node.name]
                    this.render()
                })
            )
        }

        if (node.windowId) {
            menu.appendChild(
                this.createMenuItem("Open", () => {
                    emitAppEvent("terminal:open-window", {
                        windowId: node.windowId as RoutableWindow,
                    })
                })
            )
        }

        if (node.handler) {
            menu.appendChild(
                this.createMenuItem("Run", () => {
                    this.openTerminalWith(node.name)
                })
            )
        }

        if (isWelt) {
            menu.appendChild(
                this.createMenuItem("Edit", () => {
                    this.openTerminalWith(`edit ${node.name}`)
                })
            )
            menu.appendChild(
                this.createMenuItem("Run with WELT", () => {
                    this.openTerminalWith(`welt ${node.name}`)
                })
            )
            menu.appendChild(
                this.createMenuItem("View source", () => {
                    this.openTerminalWith(`cat ${node.name}`)
                })
            )
        }

        if (node.content && !isWelt && !node.readonly) {
            menu.appendChild(
                this.createMenuItem("Edit", () => {
                    this.openTerminalWith(`edit ${node.name}`)
                })
            )
        }

        if (node.content && !isWelt) {
            menu.appendChild(
                this.createMenuItem("View", () => {
                    this.openTerminalWith(`cat ${node.name}`)
                })
            )
        }

        // ── Rename ────────────────────────────────────────────────────────
        if (!node.readonly) {
            menu.appendChild(
                this.createMenuItem("Rename", () => {
                    const newName = prompt("New name:", node.name)
                    if (!newName || newName === node.name) return
                    const pathStr =
                        formatPath(this.currentPath) + "\\" + node.name
                    const result = renameFile(this.fs, pathStr, newName)
                    if (result.success) {
                        emitAppEvent("terminal:command", {
                            command: "mv",
                            raw: `mv ${node.name} ${newName}`,
                        })
                        this.render()
                    }
                })
            )
        }

        // ── Delete ────────────────────────────────────────────────────────
        if (!node.readonly) {
            menu.appendChild(
                this.createMenuItem("Delete", () => {
                    if (!confirm(`Delete "${node.name}"?`)) return
                    const pathStr =
                        formatPath(this.currentPath) + "\\" + node.name
                    const result = deleteFile(this.fs, pathStr)
                    if (result.success) {
                        emitAppEvent("terminal:command", {
                            command: "rm",
                            raw: `rm ${node.name}`,
                        })
                        this.render()
                    }
                })
            )
        }

        // ── New File / New Folder (on directories) ────────────────────────
        if (node.type === "directory") {
            menu.appendChild(this.createSeparator())
            menu.appendChild(
                this.createMenuItem("New File", () => {
                    const name = prompt("File name:")
                    if (!name) return
                    const dirPath =
                        formatPath(this.currentPath) + "\\" + node.name
                    const result = createFile(this.fs, dirPath, name, "")
                    if (result.success) {
                        emitAppEvent("terminal:command", {
                            command: "touch",
                            raw: `touch ${name}`,
                        })
                        this.render()
                    }
                })
            )
            menu.appendChild(
                this.createMenuItem("New Folder", () => {
                    const name = prompt("Folder name:")
                    if (!name) return
                    const dirPath =
                        formatPath(this.currentPath) + "\\" + node.name
                    const result = createDirectory(this.fs, dirPath, name)
                    if (result.success) {
                        emitAppEvent("terminal:command", {
                            command: "mkdir",
                            raw: `mkdir ${name}`,
                        })
                        this.render()
                    }
                })
            )
        }

        document.body.appendChild(menu)
        this.contextMenu = menu
    }

    private showBackgroundContextMenu(e: MouseEvent): void {
        this.hideContextMenu()

        const menu = document.createElement("div")
        menu.className = "explorer-context-menu"
        menu.style.left = `${e.clientX}px`
        menu.style.top = `${e.clientY}px`

        menu.appendChild(
            this.createMenuItem("New File", () => {
                const name = prompt("File name:")
                if (!name) return
                const dirPath = formatPath(this.currentPath)
                const result = createFile(this.fs, dirPath, name, "")
                if (result.success) {
                    emitAppEvent("terminal:command", {
                        command: "touch",
                        raw: `touch ${name}`,
                    })
                    this.render()
                }
            })
        )
        menu.appendChild(
            this.createMenuItem("New Folder", () => {
                const name = prompt("Folder name:")
                if (!name) return
                const dirPath = formatPath(this.currentPath)
                const result = createDirectory(this.fs, dirPath, name)
                if (result.success) {
                    emitAppEvent("terminal:command", {
                        command: "mkdir",
                        raw: `mkdir ${name}`,
                    })
                    this.render()
                }
            })
        )

        document.body.appendChild(menu)
        this.contextMenu = menu
    }

    private createSeparator(): HTMLElement {
        const sep = document.createElement("div")
        sep.className = "explorer-context-separator"
        sep.style.height = "1px"
        sep.style.background = "var(--theme-border-light, #888)"
        sep.style.margin = "2px 4px"
        return sep
    }

    private createMenuItem(label: string, onClick: () => void): HTMLElement {
        const item = document.createElement("div")
        item.className = "explorer-context-item"
        item.textContent = label
        item.addEventListener("click", (e) => {
            e.stopPropagation()
            this.hideContextMenu()
            onClick()
        })
        return item
    }

    private hideContextMenu(): void {
        if (this.contextMenu) {
            this.contextMenu.remove()
            this.contextMenu = null
        }
    }

    private navigateUp(): void {
        if (this.currentPath.length > 1) {
            this.currentPath = this.currentPath.slice(0, -1)
            this.render()
        }
    }

    private openTerminalWith(command: string): void {
        const cwd = formatPath(this.currentPath)
        emitAppEvent("explorer:open-terminal", { cwd, command })
    }
}
