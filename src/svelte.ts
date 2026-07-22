import type { Component } from "svelte";
import type { ArcanaLocale, ArcanaMessages } from "./core/locale";
import type { DataTableApi, DataTableConfig, DataTableRow, SearchOption } from "./core/types";
import ArcanaDataTableComponent from "./svelte/ArcanaDataTable.svelte";
import ArcanaSelectComponent from "./svelte/ArcanaSelect.svelte";
import ArcanaDatePickerComponent from "./svelte/ArcanaDatePicker.svelte";

export * from "./index";

export interface ArcanaDataTableProps {
  config: DataTableConfig<DataTableRow>;
  class?: string;
  onMounted?: (grid: DataTableApi<DataTableRow>) => void;
}

/** Imperative surface exported by the component instance (`bind:this`). */
export interface ArcanaDataTableExports {
  getApi(): DataTableApi<DataTableRow>;
  refresh(): Promise<void>;
  fetch(): Promise<void>;
  setRows(rows: DataTableRow[]): DataTableRow[];
  setDataset(rows: DataTableRow[]): DataTableRow[];
  getDataset(): DataTableRow[];
  clearRows(): void;
  addRow(row: DataTableRow): void;
  removeRow(uuid: string): void;
  updateRow(uuid: string, row: Partial<DataTableRow>): void;
  upsert(uuid: string, row: DataTableRow): void;
  getRows(): DataTableRow[];
  getCheckedRows(): DataTableRow[];
  clearCheckedRows(): void;
  setFilter(name: string, value: unknown): Promise<void>;
  setFilters(filters: Record<string, unknown>): Promise<void>;
  expandRow(uuid: string): void;
  collapseRow(uuid: string): void;
  getExpandedRows(): DataTableRow[];
}

export interface ArcanaSelectProps {
  value: unknown;
  options?: SearchOption[];
  onChange: (value: unknown) => void;
  multiple?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  /** Resolved message table; defaults to the global default locale pack. */
  messages?: ArcanaMessages;
}

export interface ArcanaDatePickerProps {
  mode: "date" | "month" | "range";
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  /** Resolved message table; defaults to the global default locale pack. */
  messages?: ArcanaMessages;
  /** Locale of the calendar display names (months/weekdays via Intl). */
  locale?: ArcanaLocale;
}

export const ArcanaDataTable: Component<ArcanaDataTableProps, ArcanaDataTableExports> =
  ArcanaDataTableComponent as unknown as Component<ArcanaDataTableProps, ArcanaDataTableExports>;
export const ArcanaSelect: Component<ArcanaSelectProps> = ArcanaSelectComponent as unknown as Component<ArcanaSelectProps>;
export const ArcanaDatePicker: Component<ArcanaDatePickerProps> = ArcanaDatePickerComponent as unknown as Component<ArcanaDatePickerProps>;
export const SparkGrid = ArcanaDataTable;
