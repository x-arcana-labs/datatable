import { describe, it, expect } from 'vitest'
import { ArcanaDataTable } from '../src'
import { DataTableSearchType, DataTableColumnType } from '../src/values/column'

describe('Package Exports', () => {
    it('exports ArcanaDataTable plugin', () => {
        expect(ArcanaDataTable).toBeDefined()
        expect(ArcanaDataTable.install).toBeDefined()
        expect(typeof ArcanaDataTable.install).toBe('function')
    })

    it('exports DataTableSearchType enum', () => {
        expect(DataTableSearchType).toBeDefined()
        expect(DataTableSearchType.DATE).toBe('DATE')
        expect(DataTableSearchType.DATE_MONTH).toBe('DATE_MONTH')
        expect(DataTableSearchType.REMOTE).toBe('REMOTE')
        expect(DataTableSearchType.LIST).toBe('LIST')
        expect(DataTableSearchType.DATE_RANGE).toBe('DATE_RANGE')
        expect(DataTableSearchType.BOOLEAN).toBe('BOOLEAN')
        expect(DataTableSearchType.COMPONENT).toBe('COMPONENT')
    })

    it('exports DataTableColumnType enum', () => {
        expect(DataTableColumnType).toBeDefined()
        expect(DataTableColumnType.TEXT).toBe('TEXT')
        expect(DataTableColumnType.NUMBER).toBe('NUMBER')
        expect(DataTableColumnType.PERCENTAGE).toBe('PERCENTAGE')
        expect(DataTableColumnType.CURRENCY).toBe('CURRENCY')
    })
})

describe('ArcanaDataTable Plugin', () => {
    it('registers component when install is called', () => {
        const mockApp = {
            component: (name: string, component: any) => {
                expect(name).toBe('ArcanaDataTable')
                expect(component).toBeDefined()
            }
        }

        ArcanaDataTable.install(mockApp as any, {})
    })
})
