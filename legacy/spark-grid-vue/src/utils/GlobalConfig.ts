export type EventProxy = {
    emit: (...args: any[]) => void
    on: (...args: any[]) => void
    off: (...args: any[]) => void
}

export type RequestAdapter = (url: string, params: Record<string, any>, baseUrl?: string) => Promise<any>

export const GlobalConfig: {
    baseUrl?: string
    eventProxy?: EventProxy
    request?: RequestAdapter
} = {}
