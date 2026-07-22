import { EventEmitter } from "../utils/EventEmitter"
import { UrlBuilder } from "../utils/UrlBuilder"
import { GlobalConfig } from "./GlobalConfig"
import type { DataTableComponent } from "../types/types"

export class DataFetcher {
    static async fetch(this: DataTableComponent): Promise<void> {
        const showLoading: boolean = this.config.showLoadingDuringRequest ?? true

        EventEmitter.onRequestStarted(this)

        if (showLoading) {
            this.loading = true
        }

        try {
            const response: any = await DataFetcher._fetchData.call(this)

            EventEmitter.onRequestFinished(response, this)

            if (response.rows?.length >= 0 && response.total >= 0 && response.page) {
                this.setRows(response.rows)
                this.totalRows = response.total
                this.currentPage = response.page
            } else {
                const rows = Array.isArray(response) ? response : []
                this.setRows(rows)
                this.totalRows = rows.length
                this.currentPage = 1
            }

        } finally {
            if (showLoading) {
                this.loading = false
            }
        }
    }

    static async _fetchData(this: DataTableComponent): Promise<any> {
        if (this.config.datasource) {
            return this.config.datasource(UrlBuilder.getParams(this))
        }

        const url: string = await UrlBuilder.getUrl(this)
        const params = UrlBuilder.getParams(this)

        if (GlobalConfig.request) {
            return GlobalConfig.request(url, params, GlobalConfig.baseUrl)
        }

        const queryString = new URLSearchParams(params).toString()
        const fetchUrl = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url

        const response = await fetch(fetchUrl)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} `)
        }

        return await response.json()
    }
}
