import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input,
  OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject
} from "@angular/core";
import { createDataTable } from "../core/controller";
import { formatMessage, resolveArcanaLocale, resolveArcanaMessages, type ArcanaLocale, type ArcanaMessages } from "../core/locale";
import { arcanaThemeClass } from "../core/theme";
import { actionStyle, alignmentClass, columnStyle, expanderStyle, inlineStyle, pagination, selectionStyle } from "../core/view";
import type {
  ContextMenuItem, DataTableAction, DataTableApi, DataTableColumn, DataTableConfig,
  DataTableRow, DataTableSnapshot, OrderBy, Renderable
} from "../core/types";
import { ArcanaContentDirective } from "./content.directive";
import { ArcanaExpandedRowComponent } from "./expanded-row.component";
import { ArcanaFilterFieldComponent } from "./filter-field.component";

/**
 * `ArcanaDataTable` — Angular standalone adapter over the framework-agnostic
 * controller (`core/controller.ts`). Markup, classes and behavior mirror the
 * React/Vue/Svelte adapters: header with the sort menu, filter row,
 * checkbox/radio selection, actions, context menu, footer with pagination,
 * summarizer, themes and expandable rows.
 *
 * Custom content (`valueGetter`, `actions[].element`, `expandedRowRenderer`,
 * …) accepts what `Renderable` allows in a framework-neutral way: HTML
 * strings, numbers/booleans, DOM nodes or callbacks returning any of those.
 *
 * The imperative controller is exposed as `api` (template refs work well:
 * `<arcana-data-table #table …>` → `table.api.refresh()`).
 */
@Component({
  selector: "arcana-data-table",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArcanaContentDirective, ArcanaExpandedRowComponent, ArcanaFilterFieldComponent],
  styles: [":host { display: block; }"],
  template: `
    <div class="spark-grid grid-wrapper {{ themeClass() }}{{ config.responsiveMode === 'VERTICAL_RECORD' ? ' spark-grid-responsive-vertical' : '' }}{{ className ? ' ' + className : '' }}" [attr.aria-label]="config.ariaLabel ?? msg.gridLabel" [attr.aria-busy]="snap.loading">
      @if (snap.error) {
        <div class="arcana-grid-error" role="alert">{{ msg.loadError }}</div>
      }
      <div class="spark-grid-body" [style]="bodyStyle()">
        <div class="grid-header" [class.grid-header-sticky]="config.stickyHeaderEnabled" role="row">
          @if (expandable()) { <div class="grid-header-cell grid-expand-cell" [style]="expanderCellStyle"></div> }
          @if (config.checkboxEnabled) {
            <div class="grid-header-cell" [style]="selectionHeaderStyle">
              <input type="checkbox" [checked]="hasCheckedRows()" [disabled]="isHeaderCheckboxDisabled()" [attr.aria-label]="msg.selectAll" (change)="toggleAll($event)" />
            </div>
          }
          @if (config.radioButtonSelectionEnabled) { <div class="grid-header-cell" [style]="selectionHeaderStyle"></div> }
          @for (column of columns; track column.name) {
            <div class="grid-header-cell {{ alignment(column) }}" [class.grid-header-order]="orderable(column)" [style]="headerCellStyle(column)" role="columnheader" (click)="openSortMenu($event, column)"><span [arcanaContent]="headerValue(column)"></span><span class="arcana-sort" aria-hidden="true">{{ sortMark(column) }}</span></div>
          }
          @if (config.actions) { <div class="grid-header-cell" [style]="actionsCellStyle()">{{ msg.actions }}</div> }
        </div>
        @if (config.searchEnabled !== false) {
          <div class="grid-search-row" role="row">
            @if (expandable()) { <div class="grid-search-row-cell grid-expand-cell" [style]="expanderCellStyle"></div> }
            @if (config.checkboxEnabled) { <div class="grid-search-row-cell" [style]="selectionHeaderStyle"></div> }
            @if (config.radioButtonSelectionEnabled) { <div class="grid-search-row-cell" [style]="selectionHeaderStyle"></div> }
            @for (column of columns; track column.name) {
              @if (column.searchType === "COMPONENT") {
                <div class="grid-search-row-cell" [style]="headerCellStyle(column)"><span [arcanaContent]="searchRenderer(column)"></span></div>
              } @else if (column.searchEnabled ?? true) {
                <div class="grid-search-row-cell" arcanaFilterField [column]="column" [value]="filterValue(column)" [disabled]="disabledFilter(column)" [messages]="msg" [locale]="gridLocale" [style]="headerCellStyle(column)" (valueChange)="applyFilter(column, $event)"></div>
              } @else {
                <div class="grid-search-row-cell" [style]="headerCellStyle(column)"></div>
              }
            }
            @if (config.actions) { <div class="grid-search-row-cell" [style]="actionsCellStyle()"></div> }
          </div>
        }
        <div class="grid-body" role="rowgroup">
          @if (snap.loading && !snap.rows.length) {
            <div class="arcana-grid-status" role="status">{{ msg.loading }}</div>
          } @else if (!snap.rows.length) {
            <div class="arcana-grid-status">{{ msg.empty }}</div>
          }
          @for (row of snap.rows; track row._uuid) {
            <div class="grid-row flex" [class.grid-row-focused]="row._hasFocus || focusedRow === row._uuid" [class.grid-row-checked]="row._isChecked || row._isRadioChecked" role="row" (click)="selectRow(row)" (dblclick)="onDoubleClickRow(row)">
              @if (expandable()) {
                <div class="grid-cell grid-expand-cell spark-grid-selection-cell" data-label="" [style]="expanderCellStyle">
                  <button type="button" class="grid-expand-toggle" [class.is-open]="isExpanded(row)" [attr.aria-expanded]="isExpanded(row)" [attr.aria-label]="isExpanded(row) ? msg.collapseRow : msg.expandRow" (click)="onExpandToggle($event, row)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                </div>
              }
              @if (config.checkboxEnabled) {
                <div class="grid-cell spark-grid-selection-cell" [style]="selectionCellStyle(row)">
                  <input type="checkbox" [checked]="!!row._isChecked" [disabled]="!!row._isCheckboxDisabled" [attr.aria-label]="msg.selectRow" (click)="$event.stopPropagation()" (change)="toggleRow(row, $event)" />
                </div>
              }
              @if (config.radioButtonSelectionEnabled) {
                <div class="grid-cell spark-grid-selection-cell" [style]="selectionCellStyle(row)">
                  <input type="radio" [name]="snap.uuid" [checked]="!!row._isRadioChecked" [attr.aria-label]="msg.selectRow" (click)="$event.stopPropagation()" (change)="selectRadio(row)" />
                </div>
              }
              @for (column of columns; track column.name) {
                <div class="grid-cell {{ alignment(column) }}" [class.grid-cell-focused]="focusedCell === row._uuid + ':' + column.name" [attr.data-label]="column.label" [style]="cellStyle(column, row)" role="cell" (click)="selectCell(column, row)" (dblclick)="onDoubleClickCell(column, row)" (contextmenu)="openMenu($event, column, row)"><span [arcanaContent]="cellValue(column, row)"></span></div>
              }
              @if (config.actions) {
                <div class="grid-cell" [attr.data-label]="msg.actions" [style]="actionsCellStyle()">
                  @for (action of config.actions; track $index) {
                    @if (action.isVisible ? action.isVisible(row) : true) { <span [arcanaContent]="actionContent(action, row)"></span> }
                  }
                </div>
              }
            </div>
            @if (expandable() && isExpanded(row)) {
              <div class="grid-detail-row" role="row"><div class="grid-detail-cell" role="cell" arcanaExpandedRow [row]="row" [grid]="grid"></div></div>
            }
          }
        </div>
        @if (config.footerSummarizerEnabled) {
          <div class="grid-summarizer" [class.grid-summarizer-sticky]="config.stickyHeaderEnabled">
            @if (expandable()) { <div class="grid-summarizer-cell grid-expand-cell" [style]="expanderCellStyle"></div> }
            @if (config.checkboxEnabled) { <div class="grid-summarizer-cell" [style]="selectionHeaderStyle"></div> }
            @if (config.radioButtonSelectionEnabled) { <div class="grid-summarizer-cell" [style]="selectionHeaderStyle"></div> }
            @for (column of columns; track column.name) {
              <div class="grid-summarizer-cell {{ alignment(column) }}" [style]="summarizerCellStyle(column)"><span [arcanaContent]="summarizedValue(column)"></span></div>
            }
            @if (config.actions) { <div class="grid-summarizer-cell" [style]="actionsCellStyle()"></div> }
          </div>
        }
      </div>
      @if (config.footerVisible ?? true) {
        <div class="grid-footer"><div class="spark-grid-pages">
          @if (config.isRowsPerPageVisible ?? true) {
            <label class="spark-grid__per-page">{{ msg.perPage }} <select [value]="snap.rowsPerPage" class="spark-grid-datatable-select" (change)="onPerPageChange($event)">
              @for (size of pageSizes; track size) { <option [value]="size">{{ size }}</option> }
            </select></label>
          }
          @if (snap.totalRows) { <span class="spark-grid__info">{{ rangeInfo() }}</span> }
          <div class="spark-grid__pagination-group"><span class="spark-grid-selected-rows">{{ checkedLabel() }}</span>
            <ul [attr.aria-label]="msg.pagination"><li><button type="button" [disabled]="snap.currentPage <= 1" [attr.aria-label]="msg.previousPage" (click)="paginate(snap.currentPage - 1)">‹</button></li>@for (page of pages(); track page) {<li [class.current]="page === snap.currentPage"><button type="button" [disabled]="page === snap.currentPage" (click)="paginate(page)">{{ page }}</button></li>}<li><button type="button" [disabled]="snap.currentPage >= lastPage()" [attr.aria-label]="msg.nextPage" (click)="paginate(snap.currentPage + 1)">›</button></li></ul>
          </div>
        </div></div>
      }
      @if (menu; as contextMenuState) {
        <div class="arcana-context-menu {{ themeClass() }}" [style]="menuStyle(contextMenuState.x, contextMenuState.y)" role="menu" (click)="$event.stopPropagation()">
          @for (item of contextMenuState.items; track $index) {
            <button type="button" role="menuitem" (click)="runMenuItem(item)">{{ item.label }}</button>
          }
        </div>
      }
      @if (sortMenu; as sortMenuState) {
        <div class="arcana-context-menu arcana-sort-menu {{ themeClass() }}" [style]="menuStyle(sortMenuState.x, sortMenuState.y)" role="menu" [attr.aria-label]="msg.sortMenu" (click)="$event.stopPropagation()">
          <button type="button" role="menuitem" [class.is-active]="isSortActive(sortMenuState.name, 'asc')" (click)="applySortOption('asc')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 3.5 8h3v4.5h3V8h3L8 3.5Z" /></svg>{{ msg.sortAscending }}</button>
          <button type="button" role="menuitem" [class.is-active]="isSortActive(sortMenuState.name, 'desc')" (click)="applySortOption('desc')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 12.5 8h-3V3.5h-3V8h-3L8 12.5Z" /></svg>{{ msg.sortDescending }}</button>
          @if (snap.orderBy?.name === sortMenuState.name) {
            <button type="button" role="menuitem" class="arcana-sort-menu__clear" (click)="applySortOption(null)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>{{ msg.sortClear }}</button>
          }
        </div>
      }
    </div>
  `
})
export class ArcanaDataTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: DataTableConfig<DataTableRow>;
  @Input() className = "";
  @Output() mounted = new EventEmitter<DataTableApi<DataTableRow>>();

  grid!: DataTableApi<DataTableRow>;
  snap!: DataTableSnapshot<DataTableRow>;
  columns: DataTableColumn<DataTableRow>[] = [];
  /** Resolved built-in strings (config.messages > config.locale > global default). */
  msg: ArcanaMessages = resolveArcanaMessages();
  gridLocale: ArcanaLocale = resolveArcanaLocale();
  menu: { x: number; y: number; items: ContextMenuItem[] } | null = null;
  sortMenu: { x: number; y: number; name: string } | null = null;
  focusedRow: string | null = null;
  focusedCell: string | null = null;

  readonly pageSizes = [10, 25, 50, 100, 250, 500];
  readonly expanderCellStyle = inlineStyle(expanderStyle);
  readonly selectionHeaderStyle = inlineStyle(selectionStyle);

  private unsubscribe: (() => void) | null = null;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly closeMenus = () => {
    if (!this.menu && !this.sortMenu) return;
    this.menu = null;
    this.sortMenu = null;
    this.cdr.markForCheck();
  };
  private readonly onWindowKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.closeMenus();
  };

  /** The imperative controller (`DataTableApi`) backing this grid. */
  get api(): DataTableApi<DataTableRow> {
    return this.grid;
  }

  ngOnInit(): void {
    if (!this.grid) this.attach(this.config);
    this.mounted.emit(this.grid);
    if (this.config.sendRequestOnMounted !== false) void this.grid.refresh();
    window.addEventListener("click", this.closeMenus);
    window.addEventListener("blur", this.closeMenus);
    window.addEventListener("keydown", this.onWindowKey);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes["config"]) return;
    const isFirst = changes["config"].isFirstChange();
    this.attach(this.config);
    if (!isFirst && this.config.sendRequestOnMounted !== false) void this.grid.refresh();
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    window.removeEventListener("click", this.closeMenus);
    window.removeEventListener("blur", this.closeMenus);
    window.removeEventListener("keydown", this.onWindowKey);
  }

  private attach(config: DataTableConfig<DataTableRow>): void {
    this.unsubscribe?.();
    this.msg = resolveArcanaMessages(config);
    this.gridLocale = resolveArcanaLocale(config);
    this.grid = createDataTable(config);
    this.snap = this.grid.getSnapshot();
    this.columns = this.grid.getColumns();
    this.unsubscribe = this.grid.subscribe(() => {
      this.snap = this.grid.getSnapshot();
      this.columns = this.grid.getColumns();
      this.cdr.markForCheck();
    });
  }

  themeClass(): string {
    return arcanaThemeClass(this.config.theme);
  }

  expandable(): boolean {
    return Boolean(this.config.expandableRowsEnabled);
  }

  bodyStyle(): string | null {
    return this.config.overflowEnabled ? `max-height: ${this.config.height ?? 560}px; overflow: auto` : null;
  }

  alignment(column: DataTableColumn<DataTableRow>): string {
    return alignmentClass(column, this.grid);
  }

  orderable(column: DataTableColumn<DataTableRow>): boolean {
    return this.config.orderByEnabled !== false && column.orderByEnabled !== false;
  }

  headerCellStyle(column: DataTableColumn<DataTableRow>): string {
    return inlineStyle(columnStyle(column, this.grid));
  }

  actionsCellStyle(): string {
    return inlineStyle(actionStyle(this.grid));
  }

  summarizerCellStyle(column: DataTableColumn<DataTableRow>): string {
    return inlineStyle(columnStyle(column, this.grid), { padding: "8px 10px" });
  }

  cellStyle(column: DataTableColumn<DataTableRow>, row: DataTableRow): string {
    return inlineStyle(
      columnStyle(column, this.grid),
      { padding: "8px 10px" },
      this.config.onBeforeCellStyleMounted?.(this.grid.getCellValue(column, row), column, row, this.grid),
      column.onBeforeColumnStyleMounted?.(this.grid.getCellValue(column, row), row, this.grid)
    );
  }

  selectionCellStyle(row: DataTableRow): string {
    return inlineStyle(selectionStyle, this.config.onBeforeCheckboxAndRadioButtonStyleMounted?.(row, this.grid));
  }

  menuStyle(x: number, y: number): string {
    return `left: ${x}px; top: ${y}px`;
  }

  hasCheckedRows(): boolean {
    return this.snap.rows.some((row) => row._isChecked);
  }

  isHeaderCheckboxDisabled(): boolean {
    return Boolean(this.config.isCheckboxHeaderDisabled?.(this.grid));
  }

  toggleAll(event: Event): void {
    this.grid.toggleAll((event.target as HTMLInputElement).checked);
  }

  toggleRow(row: DataTableRow, event: Event): void {
    this.grid.toggleRow(row, (event.target as HTMLInputElement).checked);
  }

  selectRadio(row: DataTableRow): void {
    this.grid.setSelectedRadioRow(row);
  }

  headerValue(column: DataTableColumn<DataTableRow>): Renderable {
    const initial = this.config.onBeforeHeaderCellMounted?.(column, this.grid);
    return column.headerContentGetter?.(initial, this.grid) ?? initial ?? column.label;
  }

  searchRenderer(column: DataTableColumn<DataTableRow>): Renderable {
    return column.searchTypeRenderer?.();
  }

  cellValue(column: DataTableColumn<DataTableRow>, row: DataTableRow): Renderable {
    return this.grid.getCellValue(column, row);
  }

  actionContent(action: DataTableAction<DataTableRow>, row: DataTableRow): Renderable {
    return action.element(row);
  }

  summarizedValue(column: DataTableColumn<DataTableRow>): Renderable {
    return this.grid.getSummarizedValue(column)?.formatted;
  }

  filterValue(column: DataTableColumn<DataTableRow>): unknown {
    return this.snap.filters[column.filterName ?? column.name] ?? this.config.initialFilters?.[column.filterName ?? column.name];
  }

  disabledFilter(column: DataTableColumn<DataTableRow>): boolean {
    return Boolean(this.config.disableFilterWhenPresentOnInitialFilters && this.config.initialFilters?.[column.filterName ?? column.name]);
  }

  applyFilter(column: DataTableColumn<DataTableRow>, value: unknown): void {
    void this.grid.applyFilter(column, value);
  }

  openSortMenu(event: MouseEvent, column: DataTableColumn<DataTableRow>): void {
    if (!this.orderable(column)) return;
    const name = column.filterName ?? column.name;
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.sortMenu = this.sortMenu?.name === name ? null : { x: rect.left, y: rect.bottom + 2, name };
  }

  applySortOption(direction: OrderBy["direction"] | null): void {
    if (!this.sortMenu) return;
    void this.grid.applyOrderBy(direction ? { name: this.sortMenu.name, direction } : null);
    this.sortMenu = null;
  }

  isSortActive(name: string, direction: OrderBy["direction"]): boolean {
    return this.snap.orderBy?.name === name && this.snap.orderBy.direction === direction;
  }

  sortMark(column: DataTableColumn<DataTableRow>): string {
    if (this.snap.orderBy?.name !== (column.filterName ?? column.name)) return "↕";
    return this.snap.orderBy.direction === "asc" ? "↑" : "↓";
  }

  openMenu(event: MouseEvent, column: DataTableColumn<DataTableRow>, row: DataTableRow): void {
    const items = this.config.onContextMenu?.(this.grid.getCellValue(column, row), column, row, this.grid);
    if (items?.length) {
      event.preventDefault();
      this.menu = { x: event.clientX, y: event.clientY, items };
    }
  }

  runMenuItem(item: ContextMenuItem): void {
    item.onClick?.();
    this.menu = null;
  }

  isExpanded(row: DataTableRow): boolean {
    return Boolean(row._uuid && this.snap.expandedRowUuids.includes(row._uuid));
  }

  onExpandToggle(event: MouseEvent, row: DataTableRow): void {
    event.stopPropagation();
    this.toggleExpand(row);
  }

  private toggleExpand(row: DataTableRow): void {
    if (!row._uuid) return;
    this.isExpanded(row) ? this.grid.collapseRow(row._uuid) : this.grid.expandRow(row._uuid);
  }

  selectRow(row: DataTableRow): void {
    if (this.config.rowFocusEnabled) this.focusedRow = row._uuid ?? null;
    if (this.expandable() && this.config.expandRowOnClick) this.toggleExpand(row);
    this.config.onClickRow?.(row, this.grid);
  }

  onDoubleClickRow(row: DataTableRow): void {
    this.config.onDoubleClickRow?.(row, this.grid);
  }

  selectCell(column: DataTableColumn<DataTableRow>, row: DataTableRow): void {
    if (this.config.cellFocusEnabled ?? true) this.focusedCell = `${row._uuid}:${column.name}`;
    this.config.onClickCell?.(this.grid.getCellValue(column, row), column, row, this.grid);
  }

  onDoubleClickCell(column: DataTableColumn<DataTableRow>, row: DataTableRow): void {
    this.config.onDoubleClickCell?.(this.grid.getCellValue(column, row), column, row, this.grid);
  }

  pages(): number[] {
    return pagination(this.snap.currentPage, this.snap.totalRows, this.snap.rowsPerPage);
  }

  lastPage(): number {
    return Math.ceil(this.snap.totalRows / this.snap.rowsPerPage);
  }

  beginning(): number {
    return this.snap.totalRows ? ((this.snap.currentPage - 1) * this.snap.rowsPerPage) + 1 : 0;
  }

  ending(): number {
    return Math.min(this.snap.currentPage * this.snap.rowsPerPage, this.snap.totalRows);
  }

  checkedLabel(): string {
    const total = this.grid.getCheckedRows().length;
    return total ? formatMessage(this.msg.selectedCount, { count: total }) : "";
  }

  rangeInfo(): string {
    return formatMessage(this.msg.showingRange, { from: this.beginning(), to: this.ending(), total: this.snap.totalRows });
  }

  paginate(page: number): void {
    void this.grid.paginate(page, this.snap.rowsPerPage);
  }

  onPerPageChange(event: Event): void {
    void this.grid.paginate(1, Number((event.target as HTMLSelectElement).value));
  }
}
