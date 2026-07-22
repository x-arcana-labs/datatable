import type { DataTableComponent } from "../types"
import { GlobalConfig } from "./GlobalConfig"

export class EventEmitter {
    static onRequestStarted(state: DataTableComponent) {
        if (typeof state.config.onRequestStarted == "function") {
            state.config.onRequestStarted(state)
        }
    }

    static onRequestFinished(response: any, state: DataTableComponent) {
        if (typeof state.config.onRequestFinished == "function") {
            state.config.onRequestFinished(response, state)
        }
    }

    static emit(grid: DataTableComponent, name: string, data: any): void {
        grid.$emit(name, data)
        GlobalConfig.eventProxy?.emit(name, data)
    }

    static on(event: string, callback: Function) {
        GlobalConfig.eventProxy?.on(event, callback)
    }

    static off(event: string, callback: Function) {
        GlobalConfig.eventProxy?.off(event, callback)
    }
}