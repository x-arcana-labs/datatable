import type { ArcanaMessages } from "./locale";
import type { DataTableApi, DataTableColumn, DataTableRow, StyleMap } from "./types";

export function columnStyle<Row extends DataTableRow>(column: DataTableColumn<Row>, grid: DataTableApi<Row>): StyleMap {
  let width: string | number | undefined = column.width ?? grid.config.cellMinWidth;
  if (grid.config.calculateCellWidth && !column.width) {
    const flexible = Math.max(1, grid.getColumns().filter((item) => !item.width).length);
    width = `${100 / flexible}%`;
  }
  if (typeof width === "number") width = `${width}px`;
  return width ? { width, minWidth: width, maxWidth: width, flexBasis: width } : { flex: 1 };
}

export const selectionStyle: StyleMap = {
  width: "60px", minWidth: "60px", maxWidth: "60px", flexBasis: "60px", justifyContent: "center", padding: "10px", textAlign: "center"
};

export const expanderStyle: StyleMap = {
  width: "38px", minWidth: "38px", maxWidth: "38px", flexBasis: "38px", justifyContent: "center", padding: "4px", textAlign: "center"
};

/**
 * Built-in loading state for async `expandedRowRenderer`. Kept as an HTML
 * string so both adapters render the exact same markup (strings are rendered
 * as HTML, like in cells).
 */
export const expandedRowLoadingHtml =
  '<span class="grid-detail-loading"><span class="grid-detail-spinner" aria-hidden="true"></span>Carregando detalhes…</span>';

/** Discreet, themable error copy shown when the async renderer rejects. */
export const expandedRowErrorMessage = "Não foi possível carregar os detalhes.";

/** Localized variant of `expandedRowLoadingHtml`, built from the resolved messages. */
export function expandedRowLoadingContent(messages: ArcanaMessages): string {
  return `<span class="grid-detail-loading"><span class="grid-detail-spinner" aria-hidden="true"></span>${messages.expandedLoading}</span>`;
}

export function actionStyle<Row extends DataTableRow>(grid: DataTableApi<Row>): StyleMap {
  const width = grid.config.actionsWidth ?? `${((grid.config.actions?.length ?? 0) * 50) + 50}px`;
  return { width, minWidth: width, maxWidth: width, flexBasis: width, justifyContent: "center", padding: "10px", textAlign: "center" };
}

export const alignmentClass = <Row extends DataTableRow>(column: DataTableColumn<Row>, grid: DataTableApi<Row>) =>
  `grid-cell-${column.textAlignment ?? grid.config.textAlignment ?? "left"}-alignment`;

const UNITLESS_PROPERTIES = new Set(["flex", "flexGrow", "flexShrink", "opacity", "zIndex", "fontWeight", "lineHeight", "order"]);

/**
 * Serializes one or more `StyleMap`s into an inline `style` string. Numbers
 * receive `px` (except unitless properties), mirroring what React does with
 * `CSSProperties`, so the Svelte and Angular adapters style cells identically.
 */
export function inlineStyle(...styles: Array<StyleMap | undefined>): string {
  const merged: StyleMap = Object.assign({}, ...styles);
  return Object.entries(merged)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([property, value]) => {
      const kebab = property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      const suffix = typeof value === "number" && !UNITLESS_PROPERTIES.has(property) ? "px" : "";
      return `${kebab}: ${value}${suffix}`;
    })
    .join("; ");
}

export function pagination(current: number, total: number, perPage: number): number[] {
  const last = Math.ceil(total / perPage);
  if (last <= 0) return [];
  const start = Math.max(1, current - 2);
  const end = Math.min(last, current + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

