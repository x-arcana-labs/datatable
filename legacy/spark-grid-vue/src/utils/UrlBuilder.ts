import type { DataTableComponent } from "../types/types"
import { GlobalConfig } from "./GlobalConfig"

export class UrlBuilder {
    static getParams(grid: DataTableComponent): any {
        const params: any = {
            ...(grid.config.initialFilters ?? {}),
            ...grid.filters,
        }

        for (const name in params) {
            if (name.includes(".")) {
                const newName = name.split(".").reverse()[0]
                params[newName] = params[name]
                delete params[name]
            }
        }

        params["page"] = grid.currentPage
        params["limit"] = grid.rowsPerPage

        if (grid.orderBy) {
            params["order_by[field]"] = grid.orderBy.name
            params["order_by[direction]"] = grid.orderBy.direction
        }

        return params
    }

    static async getUrl(grid: DataTableComponent): Promise<string> {
        if (typeof grid.config.url == "function") {
            let urlFunction = grid.config.url()

            const resolved = urlFunction instanceof Promise ? await urlFunction : urlFunction
            return UrlBuilder.applyBaseUrl(resolved)
        }

        return UrlBuilder.applyBaseUrl(grid.config.url ?? '')
    }

    static applyBaseUrl(url: string): string {
        const baseUrl = GlobalConfig.baseUrl
        if (!baseUrl) {
            return url
        }

        if (!url) {
            return baseUrl
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url
        }

        const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
        const normalizedUrl = url.startsWith("/") ? url : `/${url}`

        return `${normalizedBase}${normalizedUrl}`
    }
}
