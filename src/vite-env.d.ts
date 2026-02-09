/// <reference types="vite/client" />

import type { DevApi } from "@/components/DevPanel"
import type { DevPanel } from "@/components/DevPanel"

declare global {
    interface Window {
        __devPanel?: DevPanel
        __dev?: DevApi
    }
}
