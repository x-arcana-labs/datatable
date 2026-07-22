import type { DataTableComponent, Row } from "../types/types"

export class RadioButtonSelectedMapper {
    static map(row: Row, grid: DataTableComponent) {
        if (grid._selectedRadioRow) {
            const uuidMatches: boolean = row._uuid == grid._selectedRadioRow._uuid

            if (uuidMatches || this._idMatches(row, grid)) {
                row._isRadioChecked = true;
            }
        }

        return row;
    }

    static _idMatches(row: Row, grid: DataTableComponent): boolean {
        if (!grid._selectedRadioRow) {
            return false
        }

        if (typeof grid.config.uniqueKeyIdentifier == 'string') {
            const uniqueKey = grid.config.uniqueKeyIdentifier
            return row[uniqueKey] == grid._selectedRadioRow[uniqueKey]
        } else if (typeof grid.config.uniqueKeyIdentifier == 'function') {
            return grid.config.uniqueKeyIdentifier(row) == grid.config.uniqueKeyIdentifier(grid._selectedRadioRow)
        }

        return row.id == grid._selectedRadioRow.id
    }
}