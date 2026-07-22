import type { Column, DataTableComponent } from "../types/types"

export class DataTableStyler {
    static getCheckboxColumnStyles(): object {
        return {
            "width": "60px",
            "min-width": "60px",
            "max-width": "60px",
            "flex-basis": "60px",
            "justify-content": "center",
            "padding": "10px",
            "text-align": "center"
        }
    }

    static getColumnStyle(column: Column, grid: DataTableComponent): object {
        let style: any = {}
        let width: any

        if (grid.config.calculateCellWidth && !column.width) {
            width = DataTableStyler.calculateColumnWidth(grid)
        } else {
            width = column.width ?? grid.config.cellMinWidth
        }

        if (width) {
            if (parseInt(width) == width) {
                width = `${width}px`
            }

            style["max-width"] = width
            style["min-width"] = width
            style["flex-basis"] = width
        } else {
            style["flex"] = 1
        }

        return style
    }

    static getBodyRowColumnStyle(column: Column, grid: DataTableComponent): object {
        let style: any = grid.rowStyle ?? {
            "padding": "8px 10px"
        }

        return {
            ...DataTableStyler.getColumnStyle(column, grid),
            ...style,
        }
    }

    static getSearchRowColumnStyle(column: Column, grid: DataTableComponent): object {
        return DataTableStyler.getColumnStyle(column, grid)
    }

    static getHeaderRowColumnStyle(column: Column, grid: DataTableComponent): object {
        return DataTableStyler.getColumnStyle(column, grid)
    }

    static getActionRowColumn(grid: DataTableComponent): object {
        const width = DataTableStyler.calculateActionsWidth(grid);

        return {
            "width": width,
            "min-width": width,
            "max-width": width,
            "flex-basis": width,
            "justify-content": "center",
            "padding": "10px",
            "text-align": "center"
        }
    }

    static calculateActionsWidth(grid: DataTableComponent): string | number {
        return grid.config.actionsWidth ?? `${((grid.config.actions?.length ?? 0) * 50) + 50}px`
    }

    static calculateColumnWidth(grid: DataTableComponent): string {
        let columnsCount = grid.getColumns()
            .filter((c: Column) => !c.width)
            .length
        let actionsWidth: number = 0

        if (grid.config.actions) {
            columnsCount += 1;
            actionsWidth = parseInt(
                DataTableStyler.calculateActionsWidth(grid)
                    .toString()
                    .replace(/\D/g, "")
            )
        }

        const totalWidthPixels = grid.getColumns()
            .filter((c: Column) => c.width && c.width.toString().includes("px"))
            .map((c: Column) => parseInt(c.width!.toString().replace("px", "")))
            .reduce((a: number, b: number) => a + b, 0)

        const totalWidthPercentage = grid.getColumns()
            .filter((c: Column) => c.width && c.width.toString().includes("%"))
            .map((c: Column) => parseInt(c.width!.toString().replace("%", "")))
            .reduce((a: number, b: number) => a + b, 0)

        const dividedWidthPixels = (totalWidthPixels + actionsWidth) / columnsCount
        const baseWidthPercentage = parseFloat(((100 - totalWidthPercentage) / columnsCount).toFixed(4))

        return `calc(${baseWidthPercentage}% - ${dividedWidthPixels}px)`
    }

    static getCellTextAlignment(column: Column, grid: DataTableComponent): object {
        const alignment: any = column.textAlignment ?? grid.config.textAlignment

        return {
            'grid-cell-center-alignment': alignment == 'center',
            'grid-cell-left-alignment': alignment == 'left' || !alignment,
            'grid-cell-right-alignment': alignment == 'right',
        }
    }
}