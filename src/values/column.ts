export const DataTableSearchType = {
    DATE: "DATE",
    DATE_MONTH: "DATE_MONTH",
    REMOTE: "REMOTE",
    LIST: "LIST",
    DATE_RANGE: "DATE_RANGE",
    BOOLEAN: "BOOLEAN",
    COMPONENT: "COMPONENT"
} as const;

export const GridSearchType = DataTableSearchType;

export const DataTableColumnType = {
    TEXT: "TEXT",
    NUMBER: "NUMBER",
    PERCENTAGE: "PERCENTAGE",
    CURRENCY: "CURRENCY"
} as const;

export const GridColumnType = DataTableColumnType;

export const ResponsiveMode = {
    HORIZONTAL_OVERFLOW: "HORIZONTAL_OVERFLOW",
    VERTICAL_RECORD: "VERTICAL_RECORD",
} as const;

export type ResponsiveModeType = typeof ResponsiveMode[keyof typeof ResponsiveMode];

export const DataMode = {
    REMOTE: "remote",
    DATASET: "dataset",
} as const;
