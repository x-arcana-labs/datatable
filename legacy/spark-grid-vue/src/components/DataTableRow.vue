<template>
    <div :class="rowClasses"
         class="grid-row flex"
         @click="onClickRow"
         @dblclick="onDoubleClickRow">

        <div v-if="hasRowAction" class="spark-grid-datatable-row-action-bar">
            <button
                type="button"
                class="spark-grid-datatable-row-action"
                @click.stop="onRowAction"
                aria-label="Visualizar registro"
            >
                <span class="spark-grid-datatable-row-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M10 5h9v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M19 5 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M5 9v10h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </span>
            </button>
        </div>

        <DataTableCheckbox
            :key="row._uuid"
            v-if="props.grid.config.checkboxEnabled"
            :row="row"
            :grid="props.grid"
            @change="onRowChecked"
        />

        <DataTableRadioButton
            :key="row._uuid"
            :grid="props.grid"
            v-if="props.grid.config.radioButtonSelectionEnabled"
            :row="row"
            @selected="onRadioChecked"
        />

        <div
            class="grid-cell"
            :class="DataTableStyler.getCellTextAlignment(column, grid)"
            :id="column._uuid"
            v-for="column in columns"
            :data-label="column.label"
            :style="columnStyle(column)"
            @click="onClickCell"
            @contextmenu.prevent="onContextMenu($event, column)"
        >
            <RuntimeRenderer
                :key="`${row._uuid}:${column._uuid}`"
                :content="valueGetter(column)"
            />
        </div>

        <DataTableAction :grid="props.grid" :row="row" v-if="props.grid.config.actions"/>
    </div>
</template>

<script setup lang="ts">
import DataTableCheckbox from "./DataTableCheckbox.vue"
import RuntimeRenderer from "./RuntimeRenderer.vue"
import DataTableAction from "./DataTableAction.vue"
import type {Column, GridComponent, Row} from "../types/types"
import { DataTableStyler } from "../utils/DataTableStyler"
import {computed, onUnmounted} from "vue"
import {CellValueGetter} from "../utils/CellValueGetter"
import ContextMenu from "@imengyu/vue3-context-menu"
import DataTableRadioButton from "./DataTableRadioButton.vue";
import {EventEmitter} from "../utils/EventEmitter";

const props = defineProps<{ row: Row, grid: GridComponent }>()

const columnStyle = (column: Column) => {
    let style = DataTableStyler.getBodyRowColumnStyle(column, props.grid)

    if (props.grid.config.onBeforeCellStyleMounted) {
        const newStyle = props.grid.config.onBeforeCellStyleMounted(valueGetter(column), column, props.row, props.grid)

        style = {...style, ...newStyle}
    }

    if (column.onBeforeColumnStyleMounted) {
        const newStyle = column.onBeforeColumnStyleMounted(valueGetter(column), props.row, props.grid)

        style = {...style, ...newStyle}
    }

    return style
}

const columns = computed(() => props.grid.getColumns())

const rowClasses = computed(() => {
    return {
        'grid-row-focused': props.row._hasFocus,
        'grid-row-checked': props.row._isChecked || props.row._isRadioChecked,
    }
})

const onClickCell = ($event: any) => {
    let target: any = $event.target

    if (!target.classList.contains("grid-cell")) {
        for (let i = 0; i < 5; i++) {
            if (target.parentNode) {
                target = target.parentNode

                if (target.classList.contains("grid-cell")) {
                    break
                }
            }
        }

        if (!target.classList.contains("grid-cell")) {
            return
        }
    }

    if (props.grid.focusedCell?.id == target.id) {
        return
    }

    if (props.grid.config.cellFocusEnabled ?? true) {
        target.classList.add("grid-cell-focused")
        props.grid.focusedCell?.classList?.remove("grid-cell-focused")
        props.grid.focusedCell = target
    }
}

const onClickRow = () => {
    props.grid.config.onClickRow && props.grid.config.onClickRow(props.row, props.grid)
    EventEmitter.emit(props.grid, "row-focused", {row: props.row})
}

const onDoubleClickRow = () => props.grid.config.onDoubleClickRow && props.grid.config.onDoubleClickRow(props.row, props.grid)

const hasRowAction = computed(() => Boolean(props.grid.config.onDoubleClickRow || props.grid.config.onClickRow))

const onRowAction = () => {
    if (props.grid.config.onDoubleClickRow) {
        onDoubleClickRow()
        return
    }

    onClickRow()
}

const onContextMenu = ($event: any, column: Column) => {
    onClickRow()
    onClickCell($event)

    if (props.grid.config.onContextMenu) {
        const value = valueGetter(column)

        const items: any = props.grid.config.onContextMenu(value, column, props.row, props.grid)

        if (items && items.length > 0) {
            ContextMenu.showContextMenu({
                x: $event.x,
                y: $event.y,
                items: items
            })
        }
    }
}

const valueGetter = (column: Column) => CellValueGetter.get(column, props.row, props.grid)

const onRowChecked = (value: any) => {
    value == "false"
        ? props.grid.config.onRowChecked && props.grid.config.onRowChecked(props.row, 'checkbox')
        : props.grid.config.onRowUnchecked && props.grid.config.onRowUnchecked(props.row, 'checkbox')

    props.row._isChecked = !props.row._isChecked
}

const onRadioChecked = () => {
    props.grid.setSelectedRadioRow(props.row)
}

function onRowFocused(event: any) {
    if (props.grid.config.rowFocusEnabled) {
        if (props.row._hasFocus && event.row._uuid != props.row._uuid) {
            props.row._hasFocus = false
        }

        if (event.row._uuid == props.row._uuid) {
            props.row._hasFocus = true
        }
    }
}

EventEmitter.on("row-focused", onRowFocused)

onUnmounted(() => {
    EventEmitter.off("row-focused", onRowFocused)
})
</script>
