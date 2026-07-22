<template>
    <div class="spark-grid-datatable-header" :class="{ 'spark-grid-datatable-header-sticky': grid.config.stickyHeaderEnabled }">
        <th class="spark-grid-datatable-header-cell" v-if="props.grid.config.checkboxEnabled"
            :style="DataTableStyler.getCheckboxColumnStyles()">
            <DataTableHeaderCheckbox :grid="grid" />
        </th>

        <th class="spark-grid-datatable-header-cell" v-if="props.grid.config.radioButtonSelectionEnabled"
            :style="DataTableStyler.getCheckboxColumnStyles()"></th>

        <div class="spark-grid-datatable-header-cell" v-for="column in grid.getColumns()" :key="column.name + column.label"
            @click="changeOrder(column)" :class="{
                'spark-grid-datatable-header-order': props.grid.config.orderByEnabled != false && column.orderByEnabled != false,
                ...DataTableStyler.getCellTextAlignment(column, grid),
            }" :style="DataTableStyler.getHeaderRowColumnStyle(column, props.grid)">

            <RuntimeRenderer :content="columnContent(column)" />

            <span v-if="isAscending(column)">
                <i class="fa-solid fa-sort-up"></i>
            </span>

            <span v-else-if="isDescending(column)">
                <i class="fa-solid fa-sort-down"></i>
            </span>

            <span v-else>
                <i class="fa-solid fa-sort"></i>
            </span>
        </div>

        <div :style="DataTableStyler.getActionRowColumn(props.grid)" v-if="props.grid.config.actions"
            class="text-center spark-grid-datatable-header-cell">
            Ações
        </div>
    </div>
</template>

<script setup lang="ts">
import RuntimeRenderer from "./RuntimeRenderer.vue"
import DataTableHeaderCheckbox from "./DataTableHeaderCheckbox.vue"
import { DataTableStyler } from "../utils/DataTableStyler"
import type { Column, DataTableComponent } from "../types/types"

const props = defineProps<{ grid: DataTableComponent }>()

const isSortedBy = (column: Column) => props.grid.orderBy?.name === (column.filterName ?? column.name)
const isAscending = (column: Column) => isSortedBy(column) && props.grid.orderBy?.direction === "asc"
const isDescending = (column: Column) => isSortedBy(column) && props.grid.orderBy?.direction === "desc"
const getSortDirection = (column: Column) => isAscending(column) ? "desc" : "asc"

const changeOrder = (column: Column) => {
    if (props.grid.config.orderByEnabled != false && column.orderByEnabled != false) {
        const name = column.filterName ?? column.name

        props.grid.applyOrderBy({
            name,
            direction: getSortDirection(column)
        })
    }
}

const columnContent = (column: Column) => {
    let label = null

    if (props.grid.config.onBeforeHeaderCellMounted) {
        label = props.grid.config.onBeforeHeaderCellMounted(column, props.grid)
    }

    if (column.headerContentGetter) {
        label = column.headerContentGetter(label, props.grid)
    }

    return label ?? column.label
}
</script>

<style scoped></style>