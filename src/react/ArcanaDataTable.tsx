import React, { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createDataTable } from "../core/controller";
import { formatMessage, resolveArcanaLocale, resolveArcanaMessages, type ArcanaLocale, type ArcanaMessages } from "../core/locale";
import { arcanaThemeClass } from "../core/theme";
import { actionStyle, alignmentClass, columnStyle, expandedRowLoadingContent, expanderStyle, pagination, selectionStyle } from "../core/view";
import type { ContextMenuItem, DataTableApi, DataTableColumn, DataTableConfig, DataTableRow, Renderable, SearchOption, StyleMap } from "../core/types";
import { ArcanaSelect } from "./ArcanaSelect";
import { ArcanaDatePicker } from "./ArcanaDatePicker";
import "../assets/SparkGrid.css";

export interface ArcanaDataTableProps<Row extends DataTableRow = DataTableRow> {
  config: DataTableConfig<Row>;
  className?: string;
  onMounted?: (grid: DataTableApi<Row>) => void;
}

function FilterField<Row extends DataTableRow>({ column, value, disabled, messages, locale, onChange }: {
  column: DataTableColumn<Row>; value: unknown; disabled?: boolean; messages: ArcanaMessages; locale: ArcanaLocale; onChange: (value: unknown) => void;
}) {
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [draft, setDraft] = useState<unknown>(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  useEffect(() => { let active = true; Promise.resolve(column.searchConfig?.() ?? []).then((items) => { if (active) setOptions(items); }); return () => { active = false; }; }, [column]);

  const booleanOptions = useMemo<SearchOption[]>(() => [
    { value: "", label: messages.booleanAll },
    { value: "1", label: messages.booleanYes },
    { value: "0", label: messages.booleanNo }
  ], [messages]);
  const filterLabel = formatMessage(messages.filterLabel, { label: column.label });
  const commit = (next: unknown) => { setDraft(next); onChange(next); };
  if (column.searchType === "DATE_RANGE") {
    const range: [string, string] = Array.isArray(draft) ? [String(draft[0] ?? ""), String(draft[1] ?? "")] : ["", ""];
    return <ArcanaDatePicker mode="range" value={range} disabled={disabled} messages={messages} locale={locale} ariaLabel={filterLabel} onChange={commit} />;
  }
  if (column.searchType === "BOOLEAN") {
    return <ArcanaSelect value={String(draft ?? "")} options={booleanOptions} disabled={disabled} messages={messages} placeholder={messages.booleanAll} ariaLabel={filterLabel} onChange={commit} />;
  }
  if (column.searchType === "LIST" || column.searchType === "REMOTE") {
    const selected = Array.isArray(draft) ? draft.map(String) : draft == null || draft === "" ? [] : [String(draft)];
    return <ArcanaSelect multiple value={selected} options={options} disabled={disabled} messages={messages} placeholder={messages.booleanAll} ariaLabel={filterLabel} onChange={commit} />;
  }
  if (column.searchType === "DATE" || column.searchType === "DATE_MONTH") {
    return <ArcanaDatePicker mode={column.searchType === "DATE" ? "date" : "month"} value={String(draft ?? "")} disabled={disabled} messages={messages} locale={locale} ariaLabel={filterLabel} onChange={commit} />;
  }
  return <input type="search" value={String(draft)} disabled={disabled} className="spark-grid-datatable-input" aria-label={filterLabel} onChange={(event) => setDraft(event.target.value)} onBlur={() => onChange(draft)} onKeyDown={(event) => { if (event.key === "Enter") onChange(draft); }} />;
}

function Content({ value }: { value: Renderable }) {
  const resolved = typeof value === "function" ? (value as () => Renderable)() : value;
  if (resolved == null) return null;
  if (React.isValidElement(resolved)) return resolved;
  if (typeof resolved === "string") return <span dangerouslySetInnerHTML={{ __html: resolved }} />;
  if (["number", "boolean"].includes(typeof resolved)) return <span>{String(resolved)}</span>;
  return resolved as React.ReactNode;
}

function ExpandedRowContent<Row extends DataTableRow>({ row, grid, messages }: { row: Row; grid: DataTableApi<Row>; messages: ArcanaMessages }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; content?: Renderable }>({ status: "loading" });
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    try {
      const result = grid.config.expandedRowRenderer?.(row, grid);
      if (result && typeof (result as Promise<Renderable>).then === "function") {
        (result as Promise<Renderable>).then(
          (content) => { if (active) setState({ status: "ready", content }); },
          (error) => { console.error(error); if (active) setState({ status: "error" }); }
        );
      } else {
        setState({ status: "ready", content: result });
      }
    } catch (error) {
      console.error(error);
      setState({ status: "error" });
    }
    return () => { active = false; };
  }, [row, grid]);
  if (state.status === "loading") return <Content value={grid.config.expandedRowLoadingRenderer?.(row, grid) ?? expandedRowLoadingContent(messages)} />;
  if (state.status === "error") return <div className="grid-detail-error">{messages.expandedError}</div>;
  return <Content value={state.content} />;
}

function ArcanaDataTableInner<Row extends DataTableRow = DataTableRow>({ config, className = "", onMounted }: ArcanaDataTableProps<Row>, ref: React.ForwardedRef<DataTableApi<Row>>) {
  const grid = useMemo(() => createDataTable(config), [config]);
  const mountedGrid = useRef<DataTableApi<Row> | null>(null);
  const state = useSyncExternalStore(grid.subscribe, grid.getSnapshot, grid.getSnapshot);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [sortMenu, setSortMenu] = useState<{ x: number; y: number; name: string } | null>(null);
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  useImperativeHandle(ref, () => grid, [grid]);
  useEffect(() => {
    if (mountedGrid.current === grid) return;
    mountedGrid.current = grid;
    onMounted?.(grid);
    if (config.sendRequestOnMounted !== false) void grid.refresh();
  }, [grid, config.sendRequestOnMounted, onMounted]);
  useEffect(() => { if (!menu) return; const close = () => setMenu(null); window.addEventListener("click", close); window.addEventListener("blur", close); return () => { window.removeEventListener("click", close); window.removeEventListener("blur", close); }; }, [menu]);
  useEffect(() => {
    if (!sortMenu) return;
    const close = () => setSortMenu(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSortMenu(null); };
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("blur", close); window.removeEventListener("keydown", onKey); };
  }, [sortMenu]);

  const columns = grid.getColumns();
  const pages = pagination(state.currentPage, state.totalRows, state.rowsPerPage);
  const lastPage = Math.ceil(state.totalRows / state.rowsPerPage);
  const beginning = state.totalRows ? ((state.currentPage - 1) * state.rowsPerPage) + 1 : 0;
  const ending = Math.min(state.currentPage * state.rowsPerPage, state.totalRows);
  const cellStyles = (column: DataTableColumn<Row>, row: Row): React.CSSProperties => ({
    ...columnStyle(column, grid), padding: "8px 10px",
    ...config.onBeforeCellStyleMounted?.(grid.getCellValue(column, row), column, row, grid),
    ...column.onBeforeColumnStyleMounted?.(grid.getCellValue(column, row), row, grid)
  } as React.CSSProperties);
  const openSortMenu = (event: React.MouseEvent, column: DataTableColumn<Row>) => {
    if (config.orderByEnabled === false || column.orderByEnabled === false) return;
    const name = column.filterName ?? column.name;
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setSortMenu((current) => current?.name === name ? null : { x: rect.left, y: rect.bottom + 2, name });
  };
  const applySortOption = (direction: "asc" | "desc" | null) => {
    if (!sortMenu) return;
    void grid.applyOrderBy(direction ? { name: sortMenu.name, direction } : null);
    setSortMenu(null);
  };
  const sortMark = (column: DataTableColumn<Row>) => state.orderBy?.name !== (column.filterName ?? column.name) ? "↕" : state.orderBy.direction === "asc" ? "↑" : "↓";
  const headerValue = (column: DataTableColumn<Row>) => {
    const initial = config.onBeforeHeaderCellMounted?.(column, grid);
    return column.headerContentGetter?.(initial, grid) ?? initial ?? column.label;
  };
  const openMenu = (event: React.MouseEvent, column: DataTableColumn<Row>, row: Row) => {
    const items = config.onContextMenu?.(grid.getCellValue(column, row), column, row, grid);
    if (items?.length) { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY, items }); }
  };
  const reactStyle = (style: StyleMap) => style as React.CSSProperties;
  const selectionCellStyle = (row: Row) => reactStyle({ ...selectionStyle, ...config.onBeforeCheckboxAndRadioButtonStyleMounted?.(row, grid) });
  const expandable = Boolean(config.expandableRowsEnabled);
  const isExpanded = (row: Row) => Boolean(row._uuid && state.expandedRowUuids.includes(row._uuid));
  const toggleExpand = (row: Row) => {
    if (!row._uuid) return;
    isExpanded(row) ? grid.collapseRow(row._uuid) : grid.expandRow(row._uuid);
  };
  const selectRow = (row: Row) => {
    if (config.rowFocusEnabled) setFocusedRow(row._uuid ?? null);
    if (expandable && config.expandRowOnClick) toggleExpand(row);
    config.onClickRow?.(row, grid);
  };
  const selectCell = (column: DataTableColumn<Row>, row: Row) => {
    if (config.cellFocusEnabled ?? true) setFocusedCell(`${row._uuid}:${column.name}`);
    config.onClickCell?.(grid.getCellValue(column, row), column, row, grid);
  };

  const themeClass = arcanaThemeClass(config.theme);
  const messages = resolveArcanaMessages(config);
  const gridLocale = resolveArcanaLocale(config);

  return (
    <div className={`spark-grid grid-wrapper ${themeClass} ${config.responsiveMode === "VERTICAL_RECORD" ? "spark-grid-responsive-vertical" : ""} ${className}`.trim()} aria-label={config.ariaLabel ?? messages.gridLabel} aria-busy={state.loading}>
      {state.error ? <div className="arcana-grid-error" role="alert">{messages.loadError}</div> : null}
      <div className="spark-grid-body" style={config.overflowEnabled ? { maxHeight: config.height ?? 560, overflow: "auto" } : undefined}>
        <div className={`grid-header ${config.stickyHeaderEnabled ? "grid-header-sticky" : ""}`} role="row">
          {expandable ? <div className="grid-header-cell grid-expand-cell" style={reactStyle(expanderStyle)} /> : null}
          {config.checkboxEnabled ? <div className="grid-header-cell" style={reactStyle(selectionStyle)}><input type="checkbox" checked={state.rows.some((row) => row._isChecked)} disabled={config.isCheckboxHeaderDisabled?.(grid)} aria-label={messages.selectAll} onChange={(event) => grid.toggleAll(event.target.checked)} /></div> : null}
          {config.radioButtonSelectionEnabled ? <div className="grid-header-cell" style={reactStyle(selectionStyle)} /> : null}
          {columns.map((column) => <div key={column.name} className={`grid-header-cell ${alignmentClass(column, grid)} ${config.orderByEnabled !== false && column.orderByEnabled !== false ? "grid-header-order" : ""}`} style={reactStyle(columnStyle(column, grid))} role="columnheader" onClick={(event) => openSortMenu(event, column)}><Content value={headerValue(column)} /><span className="arcana-sort" aria-hidden="true">{sortMark(column)}</span></div>)}
          {config.actions ? <div className="grid-header-cell" style={reactStyle(actionStyle(grid))}>{messages.actions}</div> : null}
        </div>
        {config.searchEnabled !== false ? <div className="grid-search-row" role="row">
          {expandable ? <div className="grid-search-row-cell grid-expand-cell" style={reactStyle(expanderStyle)} /> : null}
          {config.checkboxEnabled ? <div className="grid-search-row-cell" style={reactStyle(selectionStyle)} /> : null}{config.radioButtonSelectionEnabled ? <div className="grid-search-row-cell" style={reactStyle(selectionStyle)} /> : null}
          {columns.map((column) => <div key={column.name} className="grid-search-row-cell" style={reactStyle(columnStyle(column, grid))}>{column.searchType === "COMPONENT" ? <Content value={column.searchTypeRenderer?.()} /> : column.searchEnabled ?? true ? <FilterField column={column} value={state.filters[column.filterName ?? column.name] ?? config.initialFilters?.[column.filterName ?? column.name]} disabled={Boolean(config.disableFilterWhenPresentOnInitialFilters && config.initialFilters?.[column.filterName ?? column.name])} messages={messages} locale={gridLocale} onChange={(value) => void grid.applyFilter(column, value)} /> : null}</div>)}
          {config.actions ? <div className="grid-search-row-cell" style={reactStyle(actionStyle(grid))} /> : null}
        </div> : null}
        <div className="grid-body" role="rowgroup">
          {state.loading && !state.rows.length ? <div className="arcana-grid-status" role="status">{messages.loading}</div> : !state.rows.length ? <div className="arcana-grid-status">{messages.empty}</div> : null}
          {state.rows.map((row) => <Fragment key={row._uuid}>
            <div className={`grid-row flex ${row._hasFocus || focusedRow === row._uuid ? "grid-row-focused" : ""} ${row._isChecked || row._isRadioChecked ? "grid-row-checked" : ""}`} role="row" onClick={() => selectRow(row)} onDoubleClick={() => config.onDoubleClickRow?.(row, grid)}>
              {expandable ? <div className="grid-cell grid-expand-cell spark-grid-selection-cell" data-label="" style={reactStyle(expanderStyle)}><button type="button" className={`grid-expand-toggle${isExpanded(row) ? " is-open" : ""}`} aria-expanded={isExpanded(row)} aria-label={isExpanded(row) ? messages.collapseRow : messages.expandRow} onClick={(event) => { event.stopPropagation(); toggleExpand(row); }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div> : null}
              {config.checkboxEnabled ? <div className="grid-cell spark-grid-selection-cell" style={selectionCellStyle(row)}><input type="checkbox" checked={Boolean(row._isChecked)} disabled={row._isCheckboxDisabled} aria-label={messages.selectRow} onClick={(event) => event.stopPropagation()} onChange={(event) => grid.toggleRow(row, event.target.checked)} /></div> : null}
              {config.radioButtonSelectionEnabled ? <div className="grid-cell spark-grid-selection-cell" style={selectionCellStyle(row)}><input type="radio" name={state.uuid} checked={Boolean(row._isRadioChecked)} aria-label={messages.selectRow} onClick={(event) => event.stopPropagation()} onChange={() => grid.setSelectedRadioRow(row)} /></div> : null}
              {columns.map((column) => <div key={column.name} className={`grid-cell ${alignmentClass(column, grid)} ${focusedCell === `${row._uuid}:${column.name}` ? "grid-cell-focused" : ""}`} data-label={column.label} style={cellStyles(column, row)} role="cell" onClick={() => selectCell(column, row)} onDoubleClick={() => config.onDoubleClickCell?.(grid.getCellValue(column, row), column, row, grid)} onContextMenu={(event) => openMenu(event, column, row)}><Content value={grid.getCellValue(column, row)} /></div>)}
              {config.actions ? <div className="grid-cell" data-label={messages.actions} style={reactStyle(actionStyle(grid))}>{config.actions.map((action, index) => action.isVisible?.(row) ?? true ? <Content key={index} value={action.element(row)} /> : null)}</div> : null}
            </div>
            {expandable && isExpanded(row) ? <div className="grid-detail-row" role="row"><div className="grid-detail-cell" role="cell"><ExpandedRowContent row={row} grid={grid} messages={messages} /></div></div> : null}
          </Fragment>)}
        </div>
        {config.footerSummarizerEnabled ? <div className={`grid-summarizer ${config.stickyHeaderEnabled ? "grid-summarizer-sticky" : ""}`}>{expandable ? <div className="grid-summarizer-cell grid-expand-cell" style={reactStyle(expanderStyle)} /> : null}{config.checkboxEnabled ? <div className="grid-summarizer-cell" style={reactStyle(selectionStyle)} /> : null}{config.radioButtonSelectionEnabled ? <div className="grid-summarizer-cell" style={reactStyle(selectionStyle)} /> : null}{columns.map((column) => <div key={column.name} className={`grid-summarizer-cell ${alignmentClass(column, grid)}`} style={{ ...reactStyle(columnStyle(column, grid)), padding: "8px 10px" }}><Content value={grid.getSummarizedValue(column)?.formatted} /></div>)}{config.actions ? <div className="grid-summarizer-cell" style={reactStyle(actionStyle(grid))} /> : null}</div> : null}
      </div>
      {config.footerVisible ?? true ? <div className="grid-footer"><div className="spark-grid-pages">
        {config.isRowsPerPageVisible ?? true ? <label className="spark-grid__per-page">{messages.perPage} <select value={state.rowsPerPage} className="spark-grid-datatable-select" onChange={(event) => void grid.paginate(1, Number(event.target.value))}>{[10,25,50,100,250,500].map((size) => <option key={size} value={size}>{size}</option>)}</select></label> : null}
        {state.totalRows ? <span className="spark-grid__info">{formatMessage(messages.showingRange, { from: beginning, to: ending, total: state.totalRows })}</span> : null}
        <div className="spark-grid__pagination-group"><span className="spark-grid-selected-rows">{grid.getCheckedRows().length ? formatMessage(messages.selectedCount, { count: grid.getCheckedRows().length }) : ""}</span>
          <ul aria-label={messages.pagination}><li><button type="button" disabled={state.currentPage <= 1} aria-label={messages.previousPage} onClick={() => void grid.paginate(state.currentPage - 1, state.rowsPerPage)}>‹</button></li>{pages.map((page) => <li key={page} className={page === state.currentPage ? "current" : ""}><button type="button" disabled={page === state.currentPage} onClick={() => void grid.paginate(page, state.rowsPerPage)}>{page}</button></li>)}<li><button type="button" disabled={state.currentPage >= lastPage} aria-label={messages.nextPage} onClick={() => void grid.paginate(state.currentPage + 1, state.rowsPerPage)}>›</button></li></ul>
        </div>
      </div></div> : null}
      {menu ? <div className={`arcana-context-menu ${themeClass}`} style={{ left: menu.x, top: menu.y }} role="menu" onClick={(event) => event.stopPropagation()}>{menu.items.map((item, index) => <button key={`${item.label}-${index}`} type="button" role="menuitem" onClick={() => { item.onClick?.(); setMenu(null); }}>{item.label}</button>)}</div> : null}
      {sortMenu ? <div className={`arcana-context-menu arcana-sort-menu ${themeClass}`} style={{ left: sortMenu.x, top: sortMenu.y }} role="menu" aria-label={messages.sortMenu} onClick={(event) => event.stopPropagation()}>
        <button type="button" role="menuitem" className={state.orderBy?.name === sortMenu.name && state.orderBy.direction === "asc" ? "is-active" : ""} onClick={() => applySortOption("asc")}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 3.5 8h3v4.5h3V8h3L8 3.5Z" /></svg>{messages.sortAscending}</button>
        <button type="button" role="menuitem" className={state.orderBy?.name === sortMenu.name && state.orderBy.direction === "desc" ? "is-active" : ""} onClick={() => applySortOption("desc")}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 12.5 8h-3V3.5h-3V8h-3L8 12.5Z" /></svg>{messages.sortDescending}</button>
        {state.orderBy?.name === sortMenu.name ? <button type="button" role="menuitem" className="arcana-sort-menu__clear" onClick={() => applySortOption(null)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>{messages.sortClear}</button> : null}
      </div> : null}
    </div>
  );
}

export const ArcanaDataTable = forwardRef(ArcanaDataTableInner) as <Row extends DataTableRow = DataTableRow>(props: ArcanaDataTableProps<Row> & { ref?: React.ForwardedRef<DataTableApi<Row>> }) => React.ReactElement;
export const SparkGrid = ArcanaDataTable;
