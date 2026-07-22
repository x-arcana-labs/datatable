import { globalConfig } from "./config";
import type {
  DataResponse,
  DataTableApi,
  DataTableColumn,
  DataTableConfig,
  DataTableMode,
  DataTableRow,
  DataTableSnapshot,
  OrderBy,
  Renderable,
  SearchType,
  SummarizedValue
} from "./types";

const empty = (value: unknown) => value == null || value === "" || (Array.isArray(value) && value.length === 0);
const id = () => globalThis.crypto?.randomUUID?.() ?? `arcana-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

export function getValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

export class DataTableController<Row extends DataTableRow = DataTableRow> implements DataTableApi<Row> {
  readonly config: DataTableConfig<Row>;
  readonly mode: DataTableMode;
  uuid = id();
  rows: Row[] = [];
  filters: Record<string, unknown> = {};
  orderBy?: OrderBy;
  loading = false;
  error: unknown = null;
  currentPage = 1;
  totalRows = 0;
  rowsPerPage: number;
  selectedRadioRow: Row | null = null;
  expandedRowUuids: string[] = [];
  revision = 0;
  datasetSize = 0;
  private dataset: Row[] = [];
  private listeners = new Set<() => void>();
  private snapshot!: DataTableSnapshot<Row>;

  constructor(config: DataTableConfig<Row>) {
    this.config = config;
    this.mode = config.mode ?? (Array.isArray(config.dataset) ? "dataset" : "remote");
    this.rowsPerPage = Math.max(1, config.rowsPerPage ?? 10);
    this.updateSnapshot();

    if (this.mode === "dataset") {
      this.dataset = this.normalizeRows(config.dataset ?? []);
      this.recomputeDataset();
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DataTableSnapshot<Row> => this.snapshot;

  private updateSnapshot(): void {
    this.datasetSize = this.mode === "dataset" ? this.dataset.length : 0;
    this.snapshot = {
      uuid: this.uuid,
      mode: this.mode,
      datasetSize: this.datasetSize,
      rows: this.rows,
      filters: this.filters,
      orderBy: this.orderBy,
      loading: this.loading,
      error: this.error,
      currentPage: this.currentPage,
      totalRows: this.totalRows,
      rowsPerPage: this.rowsPerPage,
      selectedRadioRow: this.selectedRadioRow,
      expandedRowUuids: this.expandedRowUuids,
      revision: this.revision
    };
  }

  private notify(): void {
    // Rows no longer present (page/dataset/filter changes) are collapsed.
    if (this.expandedRowUuids.length) {
      const alive = new Set(this.rows.map((row) => row._uuid));
      const pruned = this.expandedRowUuids.filter((uuid) => alive.has(uuid));
      if (pruned.length !== this.expandedRowUuids.length) this.expandedRowUuids = pruned;
    }
    this.revision += 1;
    this.updateSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  async fetch(): Promise<void> {
    if (this.mode === "dataset") {
      this.recomputeDataset();
      return;
    }

    this.config.onRequestStarted?.(this);
    if (this.config.showLoadingDuringRequest ?? true) {
      this.loading = true;
      this.notify();
    }
    this.error = null;

    try {
      const response = await this.fetchRemoteData();
      this.config.onRequestFinished?.(response, this);
      if (isDataResponse<Row>(response)) {
        this.rows = this.normalizeRows(response.rows);
        this.totalRows = response.total;
        this.currentPage = response.page;
      } else {
        this.rows = this.normalizeRows(Array.isArray(response) ? response as Row[] : []);
        this.totalRows = this.rows.length;
      }
    } catch (error) {
      this.error = error;
      this.config.onRequestError?.(error, this);
      throw error;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  refresh = (): Promise<void> => this.fetch();

  private async fetchRemoteData(): Promise<Row[] | DataResponse<Row> | unknown> {
    const params = this.getRequestParams();
    if (this.config.datasource) return this.config.datasource(params);

    const rawUrl = typeof this.config.url === "function" ? await this.config.url() : this.config.url ?? "";
    const url = applyBaseUrl(rawUrl);
    if (globalConfig.request) return globalConfig.request(url, params, globalConfig.baseUrl);
    if (!url) throw new Error("Remote mode requires a datasource, url or global request adapter.");

    const query = new URLSearchParams(Object.entries(params).flatMap(([key, value]) => {
      if (Array.isArray(value)) return value.map((item) => [key, String(item)]);
      return [[key, String(value ?? "")]];
    })).toString();
    const response = await fetch(`${url}${query ? `${url.includes("?") ? "&" : "?"}${query}` : ""}`);
    if (!response.ok) throw new Error(`Arcana DataTable request failed (${response.status})`);
    return response.json();
  }

  private getRequestParams(): Record<string, unknown> {
    const source = { ...(this.config.initialFilters ?? {}), ...this.filters };
    const params: Record<string, unknown> = {};
    Object.entries(source).forEach(([key, value]) => {
      const parts = key.split(".");
      params[parts[parts.length - 1] ?? key] = value;
    });
    params.page = this.currentPage;
    params.limit = this.rowsPerPage;
    if (this.orderBy) {
      params["order_by[field]"] = this.orderBy.name;
      params["order_by[direction]"] = this.orderBy.direction;
    }
    return params;
  }

  setRows(rows: Row[]): Row[] {
    if (this.mode === "dataset") return this.setDataset(rows);
    this.rows = this.normalizeRows(rows);
    this.totalRows = this.rows.length;
    this.notify();
    return this.rows;
  }

  setDataset(rows: Row[]): Row[] {
    if (this.mode !== "dataset") {
      throw new Error("setDataset() is only available when mode is 'dataset'.");
    }
    this.dataset = this.normalizeRows(rows);
    this.currentPage = 1;
    this.recomputeDataset();
    return this.dataset;
  }

  getDataset(): Row[] {
    return this.mode === "dataset" ? [...this.dataset] : [];
  }

  clearRows(): void {
    if (this.mode === "dataset") this.dataset = [];
    this.rows = [];
    this.totalRows = 0;
    this.currentPage = 1;
    this.notify();
  }

  removeRow(uuid: string): void {
    if (this.mode === "dataset") {
      this.dataset = this.dataset.filter((row) => row._uuid !== uuid);
      this.recomputeDataset();
      return;
    }
    this.rows = this.rows.filter((row) => row._uuid !== uuid);
    this.totalRows = Math.max(0, this.totalRows - 1);
    this.notify();
  }

  addRow(row: Row): void {
    if (this.mode === "dataset") {
      this.dataset = [...this.dataset, ...this.normalizeRows([row])];
      this.recomputeDataset();
      return;
    }
    this.rows = [...this.rows, ...this.normalizeRows([row])];
    this.totalRows += 1;
    this.notify();
  }

  updateRow(uuid: string, patch: Partial<Row>): void {
    if (this.mode === "dataset") {
      this.dataset = this.dataset.map((row) => row._uuid === uuid ? { ...row, ...patch } : row);
      this.recomputeDataset();
      return;
    }
    this.rows = this.rows.map((row) => row._uuid === uuid ? { ...row, ...patch } : row);
    this.notify();
  }

  upsert(uuid: string, row: Row): void {
    const collection = this.mode === "dataset" ? this.dataset : this.rows;
    collection.some((item) => item._uuid === uuid) ? this.updateRow(uuid, row) : this.addRow(row);
  }

  getRows(): Row[] { return this.rows; }
  getCheckedRows(): Row[] { return (this.mode === "dataset" ? this.dataset : this.rows).filter((row) => Boolean(row._isChecked)); }
  isEmpty(): boolean { return this.rows.length === 0; }
  isNotEmpty(): boolean { return this.rows.length > 0; }

  getColumns(): DataTableColumn<Row>[] {
    const columns = typeof this.config.columns === "function" ? this.config.columns() : this.config.columns;
    return columns.filter((column) => column.isVisible?.() ?? true);
  }

  async setFilter(name: string, value: unknown): Promise<void> {
    this.filters = { ...this.filters, [name]: empty(value) ? "" : value };
    this.currentPage = 1;
    globalConfig.eventProxy?.emit("grid-filter", { name, value, uuid: this.uuid });
    if (this.mode === "dataset") {
      this.recomputeDataset();
    } else {
      this.notify();
      await this.fetch();
    }
  }

  async setFilters(filters: Record<string, unknown>): Promise<void> {
    this.filters = { ...this.filters };
    Object.entries(filters).forEach(([name, value]) => {
      this.filters[name] = empty(value) ? "" : value;
      globalConfig.eventProxy?.emit("grid-filter", { name, value, uuid: this.uuid });
    });
    this.currentPage = 1;
    if (this.mode === "dataset") {
      this.recomputeDataset();
    } else {
      this.notify();
      await this.fetch();
    }
  }

  getFilters(): Record<string, unknown> { return { ...this.filters }; }

  async applyFilter(column: DataTableColumn<Row>, value: unknown): Promise<void> {
    await this.setFilter(column.filterName ?? column.name, value);
  }

  async applyOrderBy(orderBy: OrderBy | null): Promise<void> {
    this.orderBy = orderBy ?? undefined;
    this.currentPage = 1;
    if (this.mode === "dataset") {
      this.recomputeDataset();
    } else {
      this.notify();
      await this.fetch();
    }
  }

  async paginate(page: number, rowsPerPage: number): Promise<void> {
    this.currentPage = Math.max(1, page);
    this.rowsPerPage = Math.max(1, rowsPerPage);
    if (this.mode === "dataset") {
      this.recomputeDataset();
    } else {
      this.notify();
      await this.fetch();
    }
  }

  toggleRow(row: Row, checked = !row._isChecked): void {
    if (row._isCheckboxDisabled) return;
    row._isChecked = checked;
    checked ? this.config.onRowChecked?.(row, "checkbox") : this.config.onRowUnchecked?.(row, "checkbox");
    this.config.onCheckboxStateChanged?.(row, this);
    this.notify();
  }

  toggleAll(checked = !this.rows.some((row) => row._isChecked)): void {
    this.rows.forEach((row) => {
      if (row._isCheckboxDisabled) return;
      row._isChecked = checked;
      checked ? this.config.onRowChecked?.(row, "checkbox") : this.config.onRowUnchecked?.(row, "checkbox");
      this.config.onCheckboxStateChanged?.(row, this);
    });
    this.notify();
  }

  clearCheckedRows(): void {
    (this.mode === "dataset" ? this.dataset : this.rows).forEach((row) => { row._isChecked = false; });
    this.notify();
  }

  expandRow(uuid: string): void {
    if (this.expandedRowUuids.includes(uuid)) return;
    const row = this.rows.find((item) => item._uuid === uuid);
    if (!row) return;
    this.expandedRowUuids = [...this.expandedRowUuids, uuid];
    this.config.onRowExpanded?.(row, this);
    this.notify();
  }

  collapseRow(uuid: string): void {
    if (!this.expandedRowUuids.includes(uuid)) return;
    const row = this.rows.find((item) => item._uuid === uuid);
    this.expandedRowUuids = this.expandedRowUuids.filter((item) => item !== uuid);
    if (row) this.config.onRowCollapsed?.(row, this);
    this.notify();
  }

  getExpandedRows(): Row[] {
    return this.rows.filter((row) => row._uuid != null && this.expandedRowUuids.includes(row._uuid));
  }

  getSelectedRadioRow(): Row | null { return this.selectedRadioRow; }

  clearRadioRowSelection(): void {
    (this.mode === "dataset" ? this.dataset : this.rows).forEach((row) => {
      if (row._isRadioChecked) this.config.onRowUnchecked?.(row, "radio");
      row._isRadioChecked = false;
    });
    this.selectedRadioRow = null;
    this.notify();
  }

  setSelectedRadioRow(row: Row): void {
    (this.mode === "dataset" ? this.dataset : this.rows).forEach((item) => {
      if (item._isRadioChecked) this.config.onRowUnchecked?.(item, "radio");
      item._isRadioChecked = false;
    });
    row._isRadioChecked = true;
    this.selectedRadioRow = row;
    this.config.onRowChecked?.(row, "radio");
    this.config.onRadioStateChanged?.(row, this);
    this.notify();
  }

  getCellValue(column: DataTableColumn<Row>, row: Row): Renderable {
    let value: Renderable = getValue(row, column.name);
    if (column.valueGetter) value = column.valueGetter(value, row, this);
    if (this.config.onBeforeCellMounted) value = this.config.onBeforeCellMounted(value, column, row, this);
    return value ?? "";
  }

  getSummarizedValue(column: DataTableColumn<Row>, onlyIsChecked = true): SummarizedValue | null {
    const aggregate = column.type === "CURRENCY" || column.type === "NUMBER" || column.summarizerValueGetter ||
      (column.isCreatedDynamically && column.metadata?.value_formatter === "currency");
    if (!aggregate) return null;
    const raw = this.rows
      .filter((row) => !(onlyIsChecked && this.config.summarizeOnlyChecked) || row._isChecked)
      .map((row) => column.summarizerValueGetter?.(getValue(row, column.name), row) ?? getValue(row, column.name))
      .map(Number)
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0);
    return { raw, formatted: column.summarizerValueFormatter?.(raw) ?? raw };
  }

  private normalizeRows(rows: Row[]): Row[] {
    return (Array.isArray(rows) ? rows : []).map((source) => {
      let row = { ...source, _uuid: source._uuid ?? id() } as Row;
      if (this.config.isRowChecked) row._isChecked = this.config.isRowChecked(row);
      if (this.config.isCheckboxRowDisabled) row._isCheckboxDisabled = this.config.isCheckboxRowDisabled(row);
      if (this.selectedRadioRow && this.sameRow(row, this.selectedRadioRow)) row._isRadioChecked = true;
      if (this.config.onBeforeRowMounted) row = this.config.onBeforeRowMounted(row, this);
      return row;
    });
  }

  private recomputeDataset(): void {
    const filtered = this.applyLocalFilters(this.dataset);
    const sorted = this.applyLocalSort(filtered);
    this.totalRows = sorted.length;
    const lastPage = Math.max(1, Math.ceil(this.totalRows / this.rowsPerPage));
    this.currentPage = Math.min(Math.max(1, this.currentPage), lastPage);
    const start = (this.currentPage - 1) * this.rowsPerPage;
    this.rows = sorted.slice(start, start + this.rowsPerPage);
    this.loading = false;
    this.error = null;
    this.notify();
  }

  private applyLocalFilters(rows: Row[]): Row[] {
    const filters = { ...(this.config.initialFilters ?? {}), ...this.filters };
    return rows.filter((row) => Object.entries(filters).every(([name, filter]) => {
      if (empty(filter)) return true;
      const column = this.getColumns().find((item) => (item.filterName ?? item.name) === name || item.name === name);
      const value = getValue(row, column?.name ?? name);
      return matchesFilter(value, filter, column?.searchType);
    }));
  }

  private applyLocalSort(rows: Row[]): Row[] {
    if (!this.orderBy) return [...rows];
    const column = this.getColumns().find((item) => (item.filterName ?? item.name) === this.orderBy?.name || item.name === this.orderBy?.name);
    const path = column?.name ?? this.orderBy.name;
    const direction = this.orderBy.direction === "desc" ? -1 : 1;
    return rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => compareValues(getValue(left.row, path), getValue(right.row, path)) * direction || left.index - right.index)
      .map(({ row }) => row);
  }

  private sameRow(a: Row, b: Row): boolean {
    const key = this.config.uniqueKeyIdentifier;
    if (typeof key === "function") return key(a) === key(b);
    if (typeof key === "string") return a[key] === b[key];
    return a.id === b.id;
  }
}

function matchesFilter(value: unknown, filter: unknown, type?: SearchType): boolean {
  if (type === "DATE_RANGE" && Array.isArray(filter)) {
    const comparable = toComparable(value);
    const start = empty(filter[0]) ? null : toComparable(filter[0]);
    const end = empty(filter[1]) ? null : toComparable(filter[1]);
    return (start == null || comparable >= start) && (end == null || comparable <= end);
  }

  if (type === "DATE_MONTH") {
    return String(value ?? "").slice(0, 7) === String(filter).slice(0, 7);
  }

  if (type === "DATE") {
    return String(value ?? "").slice(0, 10) === String(filter).slice(0, 10);
  }

  if (type === "BOOLEAN") {
    return normalizeBoolean(value) === normalizeBoolean(filter);
  }

  if (Array.isArray(filter)) {
    const rowValues = Array.isArray(value) ? value : [value];
    return filter.some((expected) => rowValues.some((current) => String(current) === String(expected)));
  }

  return String(value ?? "").toLocaleLowerCase("pt-BR").includes(String(filter).toLocaleLowerCase("pt-BR"));
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function toComparable(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const date = Date.parse(String(value));
  return Number.isNaN(date) ? Number(value) : date;
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (left instanceof Date || right instanceof Date) return toComparable(left) - toComparable(right);
  if (typeof left === "number" && typeof right === "number") return left - right;
  return collator.compare(String(left), String(right));
}

function isDataResponse<Row extends DataTableRow>(value: unknown): value is DataResponse<Row> {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<DataResponse<Row>>;
  return Array.isArray(response.rows) && typeof response.total === "number" && typeof response.page === "number";
}

function applyBaseUrl(url: string): string {
  const base = globalConfig.baseUrl;
  if (!base || /^https?:\/\//.test(url)) return url || base || "";
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

export const createDataTable = <Row extends DataTableRow = DataTableRow>(config: DataTableConfig<Row>) => new DataTableController<Row>(config);
