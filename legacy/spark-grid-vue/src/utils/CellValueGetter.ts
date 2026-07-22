import type { Row, Column, DataTableComponent } from "../types/types"
// @ts-ignore
import { getValue } from './ObjectUtils'

export class CellValueGetter {
    static get(column: Column, row: Row, grid: DataTableComponent): any {
        return () => {
            let value = getValue(row, column.name)

            if (column.valueGetter) {
                value = column.valueGetter(value, row, grid)
            }

            if (grid.config.onBeforeCellMounted) {
                value = grid.config.onBeforeCellMounted(value, column, row, grid)
            }

            return value ?? ""
        }
    }
}