import type { Row, DataTableComponent } from "../types/types"

export class CheckboxSelectedMapper {
    static map(row: Row, grid: DataTableComponent): Row {
        if (typeof grid.config.isRowChecked == "function") {
            row._isChecked = grid.config.isRowChecked(row);
        }

        if (typeof grid.config.isCheckboxRowDisabled == "function") {
            row._isCheckboxDisabled = grid.config.isCheckboxRowDisabled(row);
        }

        return row;
    }
}