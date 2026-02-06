import {
    createFileSystem,
    type FileSystem,
    formatPath,
    type FSNode,
    getNode,
    resolvePath,
} from "../lib/terminal/filesystem"

export class FileExplorer {
    private container: HTMLElement
    private fs: FileSystem
    private addressBar: HTMLElement
    private fileList: HTMLElement
    private contextMenu: HTMLElement | null = null
    private currentPath: string[]

    constructor(container: HTMLElement, initialPath?: string) {
        this.container = container
        this.fs = createFileSystem()
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
            document.dispatchEvent(
                new CustomEvent("terminal:open-window", {
                    detail: { windowId: node.windowId },
                })
            )
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

        if (node.name.endsWith(".welt")) {
            const editItem = this.createMenuItem("Edit", () => {
                this.openTerminalWith(`edit ${node.name}`)
            })
            menu.appendChild(editItem)

            const runItem = this.createMenuItem("Run with WELT", () => {
                this.openTerminalWith(`welt ${node.name}`)
            })
            menu.appendChild(runItem)

            const viewItem = this.createMenuItem("View source", () => {
                this.openTerminalWith(`cat ${node.name}`)
            })
            menu.appendChild(viewItem)
        } else if (node.type === "directory") {
            const openItem = this.createMenuItem("Open", () => {
                this.currentPath = [...this.currentPath, node.name]
                this.render()
            })
            menu.appendChild(openItem)
        } else if (node.windowId) {
            const openItem = this.createMenuItem("Open", () => {
                document.dispatchEvent(
                    new CustomEvent("terminal:open-window", {
                        detail: { windowId: node.windowId },
                    })
                )
            })
            menu.appendChild(openItem)
        } else if (node.content) {
            const editItem = this.createMenuItem("Edit", () => {
                this.openTerminalWith(`edit ${node.name}`)
            })
            menu.appendChild(editItem)

            const viewItem = this.createMenuItem("View", () => {
                this.openTerminalWith(`cat ${node.name}`)
            })
            menu.appendChild(viewItem)
        }

        document.body.appendChild(menu)
        this.contextMenu = menu
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
        document.dispatchEvent(
            new CustomEvent("explorer:open-terminal", {
                detail: { cwd, command },
            })
        )
    }
}
