<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { createDataTable } from "../core/controller";
import { formatMessage, resolveArcanaLocale, resolveArcanaMessages } from "../core/locale";
import { arcanaThemeClass } from "../core/theme";
import { actionStyle, alignmentClass, columnStyle, expandedRowLoadingContent, expanderStyle, pagination, selectionStyle } from "../core/view";
import type { DataTableApi, DataTableColumn, DataTableConfig, DataTableRow, Renderable } from "../core/types";
import FilterField from "./FilterField.vue";
import "../assets/SparkGrid.css";

const props = defineProps<{ config: DataTableConfig<DataTableRow> }>();
const emit = defineEmits<{ mounted: [grid: DataTableApi<DataTableRow>] }>();
const grid = shallowRef(createDataTable(props.config));
const revision = shallowRef(0);
const menu = ref<{ x: number; y: number; items: import("../core/types").ContextMenuItem[] } | null>(null);
const sortMenu = ref<{ x: number; y: number; name: string } | null>(null);
const focusedRow = ref<string | null>(null);
const focusedCell = ref<string | null>(null);
let unsubscribe = grid.value.subscribe(() => { revision.value += 1; });

watch(() => props.config, (config) => {
  unsubscribe();
  grid.value = createDataTable(config);
  unsubscribe = grid.value.subscribe(() => { revision.value += 1; });
  if (config.sendRequestOnMounted !== false) void grid.value.refresh();
});

const closeMenus = () => { menu.value = null; sortMenu.value = null; };
const onWindowKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenus(); };
onMounted(() => {
  emit("mounted", grid.value);
  if (props.config.sendRequestOnMounted !== false) void grid.value.refresh();
  window.addEventListener("click", closeMenus);
  window.addEventListener("blur", closeMenus);
  window.addEventListener("keydown", onWindowKey);
});
onBeforeUnmount(() => {
  unsubscribe();
  window.removeEventListener("click", closeMenus);
  window.removeEventListener("blur", closeMenus);
  window.removeEventListener("keydown", onWindowKey);
});

defineExpose({
  get api() { return grid.value; },
  refresh: () => grid.value.refresh(), fetch: () => grid.value.fetch(), setRows: (rows: DataTableRow[]) => grid.value.setRows(rows),
  setDataset: (rows: DataTableRow[]) => grid.value.setDataset(rows), getDataset: () => grid.value.getDataset(),
  clearRows: () => grid.value.clearRows(), addRow: (row: DataTableRow) => grid.value.addRow(row),
  removeRow: (uuid: string) => grid.value.removeRow(uuid), updateRow: (uuid: string, row: Partial<DataTableRow>) => grid.value.updateRow(uuid, row),
  upsert: (uuid: string, row: DataTableRow) => grid.value.upsert(uuid, row), getRows: () => grid.value.getRows(),
  getCheckedRows: () => grid.value.getCheckedRows(), clearCheckedRows: () => grid.value.clearCheckedRows(),
  setFilter: (name: string, value: unknown) => grid.value.setFilter(name, value), setFilters: (filters: Record<string, unknown>) => grid.value.setFilters(filters),
  expandRow: (uuid: string) => grid.value.expandRow(uuid), collapseRow: (uuid: string) => grid.value.collapseRow(uuid),
  getExpandedRows: () => grid.value.getExpandedRows()
});

const themeClass = computed(() => arcanaThemeClass(props.config.theme));
const msg = computed(() => resolveArcanaMessages(props.config));
const gridLocale = computed(() => resolveArcanaLocale(props.config));
const state = computed(() => { revision.value; return grid.value.getSnapshot(); });
const columns = computed(() => { revision.value; return grid.value.getColumns(); });
const pages = computed(() => pagination(state.value.currentPage, state.value.totalRows, state.value.rowsPerPage));
const lastPage = computed(() => Math.ceil(state.value.totalRows / state.value.rowsPerPage));
const beginning = computed(() => state.value.totalRows ? ((state.value.currentPage - 1) * state.value.rowsPerPage) + 1 : 0);
const ending = computed(() => Math.min(state.value.currentPage * state.value.rowsPerPage, state.value.totalRows));
const searchable = (column: DataTableColumn<DataTableRow>) => props.config.searchEnabled !== false && (column.searchEnabled ?? true);
const disabledFilter = (column: DataTableColumn<DataTableRow>) => Boolean(props.config.disableFilterWhenPresentOnInitialFilters && props.config.initialFilters?.[column.filterName ?? column.name]);
const openSortMenu = (event: MouseEvent, column: DataTableColumn<DataTableRow>) => {
  if (props.config.orderByEnabled === false || column.orderByEnabled === false) return;
  const name = column.filterName ?? column.name;
  event.stopPropagation();
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  sortMenu.value = sortMenu.value?.name === name ? null : { x: rect.left, y: rect.bottom + 2, name };
};
const applySortOption = (direction: "asc" | "desc" | null) => {
  if (!sortMenu.value) return;
  void grid.value.applyOrderBy(direction ? { name: sortMenu.value.name, direction } : null);
  sortMenu.value = null;
};
const sortMark = (column: DataTableColumn<DataTableRow>) => state.value.orderBy?.name !== (column.filterName ?? column.name) ? "↕" : state.value.orderBy.direction === "asc" ? "↑" : "↓";
const headerValue = (column: DataTableColumn<DataTableRow>) => column.headerContentGetter?.(props.config.onBeforeHeaderCellMounted?.(column, grid.value), grid.value) ?? props.config.onBeforeHeaderCellMounted?.(column, grid.value) ?? column.label;
const cellStyle = (column: DataTableColumn<DataTableRow>, row: DataTableRow) => ({ ...columnStyle(column, grid.value), padding: "8px 10px", ...props.config.onBeforeCellStyleMounted?.(grid.value.getCellValue(column, row), column, row, grid.value), ...column.onBeforeColumnStyleMounted?.(grid.value.getCellValue(column, row), row, grid.value) });
const selectRadio = (row: DataTableRow) => grid.value.setSelectedRadioRow(row);
const expandable = computed(() => Boolean(props.config.expandableRowsEnabled));
const isExpanded = (row: DataTableRow) => Boolean(row._uuid && state.value.expandedRowUuids.includes(row._uuid));
const toggleExpand = (row: DataTableRow) => {
  if (!row._uuid) return;
  isExpanded(row) ? grid.value.collapseRow(row._uuid) : grid.value.expandRow(row._uuid);
};
const onExpandToggle = (event: MouseEvent, row: DataTableRow) => {
  event.stopPropagation();
  toggleExpand(row);
};
const onRow = (row: DataTableRow) => {
  if (props.config.rowFocusEnabled) focusedRow.value = row._uuid ?? null;
  if (expandable.value && props.config.expandRowOnClick) toggleExpand(row);
  props.config.onClickRow?.(row, grid.value);
};
const onCell = (column: DataTableColumn<DataTableRow>, row: DataTableRow) => {
  if (props.config.cellFocusEnabled ?? true) focusedCell.value = `${row._uuid}:${column.name}`;
  props.config.onClickCell?.(grid.value.getCellValue(column, row), column, row, grid.value);
};
const selectionCellStyle = (row: DataTableRow) => ({ ...selectionStyle, ...props.config.onBeforeCheckboxAndRadioButtonStyleMounted?.(row, grid.value) });
const context = (event: MouseEvent, column: DataTableColumn<DataTableRow>, row: DataTableRow) => {
  const items = props.config.onContextMenu?.(grid.value.getCellValue(column, row), column, row, grid.value);
  if (items?.length) { event.preventDefault(); menu.value = { x: event.clientX, y: event.clientY, items }; }
};
const RuntimeContent = defineComponent({ props: { value: null }, setup(runtimeProps) { return () => {
  const value = typeof runtimeProps.value === "function" ? (runtimeProps.value as () => unknown)() : runtimeProps.value;
  if (value == null) return null;
  if (typeof value === "string") return h("span", { innerHTML: value });
  if (typeof value === "number" || typeof value === "boolean") return h("span", String(value));
  return value as never;
}; }});
const ExpandedRowContent = defineComponent({ props: { row: null }, setup(detailProps) {
  const detail = ref<{ status: "loading" | "ready" | "error"; content?: Renderable }>({ status: "loading" });
  let active = true;
  let generation = 0;
  const resolve = (row: DataTableRow) => {
    const current = ++generation;
    detail.value = { status: "loading" };
    try {
      const result = props.config.expandedRowRenderer?.(row, grid.value);
      if (result && typeof (result as Promise<Renderable>).then === "function") {
        (result as Promise<Renderable>).then(
          (content) => { if (active && current === generation) detail.value = { status: "ready", content }; },
          (error) => { console.error(error); if (active && current === generation) detail.value = { status: "error" }; }
        );
      } else {
        detail.value = { status: "ready", content: result };
      }
    } catch (error) {
      console.error(error);
      detail.value = { status: "error" };
    }
  };
  resolve(detailProps.row as DataTableRow);
  watch(() => detailProps.row, (row) => resolve(row as DataTableRow));
  onBeforeUnmount(() => { active = false; });
  return () => {
    if (detail.value.status === "loading") return h(RuntimeContent, { value: props.config.expandedRowLoadingRenderer?.(detailProps.row as DataTableRow, grid.value) ?? expandedRowLoadingContent(msg.value) });
    if (detail.value.status === "error") return h("div", { class: "grid-detail-error" }, msg.value.expandedError);
    return h(RuntimeContent, { value: detail.value.content });
  };
}});
</script>

<template>
  <div class="spark-grid grid-wrapper" :class="[themeClass, { 'spark-grid-responsive-vertical': config.responsiveMode === 'VERTICAL_RECORD' }]" :aria-label="config.ariaLabel ?? msg.gridLabel" :aria-busy="state.loading">
    <div v-if="state.error" class="arcana-grid-error" role="alert">{{ msg.loadError }}</div>
    <div class="spark-grid-body" :style="config.overflowEnabled ? { maxHeight: `${config.height ?? 560}px`, overflow: 'auto' } : undefined">
      <div class="grid-header" :class="{ 'grid-header-sticky': config.stickyHeaderEnabled }" role="row">
        <div v-if="expandable" class="grid-header-cell grid-expand-cell" :style="expanderStyle" />
        <div v-if="config.checkboxEnabled" class="grid-header-cell" :style="selectionStyle"><input type="checkbox" :checked="state.rows.some(row => row._isChecked)" :disabled="config.isCheckboxHeaderDisabled?.(grid)" :aria-label="msg.selectAll" @change="grid.toggleAll(($event.target as HTMLInputElement).checked)" /></div>
        <div v-if="config.radioButtonSelectionEnabled" class="grid-header-cell" :style="selectionStyle" />
        <div v-for="column in columns" :key="column.name" class="grid-header-cell" :class="[alignmentClass(column, grid), { 'grid-header-order': config.orderByEnabled !== false && column.orderByEnabled !== false }]" :style="columnStyle(column, grid)" role="columnheader" @click="openSortMenu($event, column)">
          <RuntimeContent :value="headerValue(column)" /><span class="arcana-sort" aria-hidden="true">{{ sortMark(column) }}</span>
        </div>
        <div v-if="config.actions" class="grid-header-cell" :style="actionStyle(grid)">{{ msg.actions }}</div>
      </div>
      <div v-if="config.searchEnabled !== false" class="grid-search-row" role="row">
        <div v-if="expandable" class="grid-search-row-cell grid-expand-cell" :style="expanderStyle" />
        <div v-if="config.checkboxEnabled" class="grid-search-row-cell" :style="selectionStyle" /><div v-if="config.radioButtonSelectionEnabled" class="grid-search-row-cell" :style="selectionStyle" />
        <div v-for="column in columns" :key="column.name" class="grid-search-row-cell" :style="columnStyle(column, grid)">
          <RuntimeContent v-if="column.searchType === 'COMPONENT'" :value="column.searchTypeRenderer?.()" />
          <FilterField v-else-if="searchable(column)" :column="column" :model-value="state.filters[column.filterName ?? column.name] ?? config.initialFilters?.[column.filterName ?? column.name]" :disabled="disabledFilter(column)" :messages="msg" :locale="gridLocale" @change="grid.applyFilter(column, $event)" />
        </div>
        <div v-if="config.actions" class="grid-search-row-cell" :style="actionStyle(grid)" />
      </div>
      <div class="grid-body" role="rowgroup">
        <div v-if="state.loading && state.rows.length === 0" class="arcana-grid-status" role="status">{{ msg.loading }}</div>
        <div v-else-if="state.rows.length === 0" class="arcana-grid-status">{{ msg.empty }}</div>
        <template v-for="row in state.rows" :key="row._uuid">
          <div class="grid-row flex" :class="{ 'grid-row-focused': row._hasFocus || focusedRow === row._uuid, 'grid-row-checked': row._isChecked || row._isRadioChecked }" role="row" @click="onRow(row)" @dblclick="config.onDoubleClickRow?.(row, grid)">
            <div v-if="expandable" class="grid-cell grid-expand-cell spark-grid-selection-cell" data-label="" :style="expanderStyle"><button type="button" class="grid-expand-toggle" :class="{ 'is-open': isExpanded(row) }" :aria-expanded="isExpanded(row)" :aria-label="isExpanded(row) ? msg.collapseRow : msg.expandRow" @click="onExpandToggle($event, row)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg></button></div>
            <div v-if="config.checkboxEnabled" class="grid-cell spark-grid-selection-cell" :style="selectionCellStyle(row)"><input type="checkbox" :checked="row._isChecked" :disabled="row._isCheckboxDisabled" :aria-label="msg.selectRow" @click.stop @change="grid.toggleRow(row, ($event.target as HTMLInputElement).checked)" /></div>
            <div v-if="config.radioButtonSelectionEnabled" class="grid-cell spark-grid-selection-cell" :style="selectionCellStyle(row)"><input type="radio" :name="state.uuid" :checked="row._isRadioChecked" :aria-label="msg.selectRow" @click.stop @change="selectRadio(row)" /></div>
            <div v-for="column in columns" :key="column.name" class="grid-cell" :class="[alignmentClass(column, grid), { 'grid-cell-focused': focusedCell === `${row._uuid}:${column.name}` }]" :data-label="column.label" :style="cellStyle(column, row)" role="cell" @click="onCell(column, row)" @dblclick="config.onDoubleClickCell?.(grid.getCellValue(column, row), column, row, grid)" @contextmenu="context($event, column, row)"><RuntimeContent :value="grid.getCellValue(column, row)" /></div>
            <div v-if="config.actions" class="grid-cell" :data-label="msg.actions" :style="actionStyle(grid)"><template v-for="(action, index) in config.actions" :key="index"><RuntimeContent v-if="action.isVisible?.(row) ?? true" :value="action.element(row)" /></template></div>
          </div>
          <div v-if="expandable && isExpanded(row)" class="grid-detail-row" role="row"><div class="grid-detail-cell" role="cell"><ExpandedRowContent :row="row" /></div></div>
        </template>
      </div>
      <div v-if="config.footerSummarizerEnabled" class="grid-summarizer" :class="{ 'grid-summarizer-sticky': config.stickyHeaderEnabled }">
        <div v-if="expandable" class="grid-summarizer-cell grid-expand-cell" :style="expanderStyle" />
        <div v-if="config.checkboxEnabled" class="grid-summarizer-cell" :style="selectionStyle" /><div v-if="config.radioButtonSelectionEnabled" class="grid-summarizer-cell" :style="selectionStyle" />
        <div v-for="column in columns" :key="column.name" class="grid-summarizer-cell" :class="alignmentClass(column, grid)" :style="{ ...columnStyle(column, grid), padding: '8px 10px' }"><RuntimeContent :value="grid.getSummarizedValue(column)?.formatted" /></div>
        <div v-if="config.actions" class="grid-summarizer-cell" :style="actionStyle(grid)" />
      </div>
    </div>
    <div v-if="config.footerVisible ?? true" class="grid-footer">
      <div class="spark-grid-pages">
        <label v-if="config.isRowsPerPageVisible ?? true" class="spark-grid__per-page">{{ msg.perPage }} <select :value="state.rowsPerPage" class="spark-grid-datatable-select" @change="grid.paginate(1, Number(($event.target as HTMLSelectElement).value))"><option v-for="size in [10,25,50,100,250,500]" :key="size" :value="size">{{ size }}</option></select></label>
        <span v-if="state.totalRows" class="spark-grid__info">{{ formatMessage(msg.showingRange, { from: beginning, to: ending, total: state.totalRows }) }}</span>
        <div class="spark-grid__pagination-group">
          <span class="spark-grid-selected-rows">{{ grid.getCheckedRows().length ? formatMessage(msg.selectedCount, { count: grid.getCheckedRows().length }) : '' }}</span>
          <ul :aria-label="msg.pagination"><li><button type="button" :disabled="state.currentPage <= 1" :aria-label="msg.previousPage" @click="grid.paginate(state.currentPage - 1, state.rowsPerPage)">‹</button></li><li v-for="page in pages" :key="page" :class="{ current: page === state.currentPage }"><button type="button" :disabled="page === state.currentPage" @click="grid.paginate(page, state.rowsPerPage)">{{ page }}</button></li><li><button type="button" :disabled="state.currentPage >= lastPage" :aria-label="msg.nextPage" @click="grid.paginate(state.currentPage + 1, state.rowsPerPage)">›</button></li></ul>
        </div>
      </div>
    </div>
    <div v-if="menu" class="arcana-context-menu" :class="themeClass" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }" role="menu" @click.stop><button v-for="(item, index) in menu.items" :key="`${item.label}-${index}`" type="button" role="menuitem" @click="item.onClick?.(); menu = null">{{ item.label }}</button></div>
    <div v-if="sortMenu" class="arcana-context-menu arcana-sort-menu" :class="themeClass" :style="{ left: `${sortMenu.x}px`, top: `${sortMenu.y}px` }" role="menu" :aria-label="msg.sortMenu" @click.stop>
      <button type="button" role="menuitem" :class="{ 'is-active': state.orderBy?.name === sortMenu.name && state.orderBy.direction === 'asc' }" @click="applySortOption('asc')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 3.5 8h3v4.5h3V8h3L8 3.5Z" /></svg>{{ msg.sortAscending }}</button>
      <button type="button" role="menuitem" :class="{ 'is-active': state.orderBy?.name === sortMenu.name && state.orderBy.direction === 'desc' }" @click="applySortOption('desc')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 12.5 8h-3V3.5h-3V8h-3L8 12.5Z" /></svg>{{ msg.sortDescending }}</button>
      <button v-if="state.orderBy?.name === sortMenu.name" type="button" role="menuitem" class="arcana-sort-menu__clear" @click="applySortOption(null)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>{{ msg.sortClear }}</button>
    </div>
  </div>
</template>
