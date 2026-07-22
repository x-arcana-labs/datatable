<template>
    <div class="grid-header" :class="{'grid-header-sticky': grid.config.stickyHeaderEnabled}">
        <div class="grid-header-cell" v-if="props.grid.config.checkboxEnabled" :style="GridStyler.getCheckboxColumnStyles()">
            <GridHeaderCheckbox :grid="grid"/>
        </div>

        <div class="grid-header-cell" v-if="props.grid.config.radioButtonSelectionEnabled" :style="GridStyler.getCheckboxColumnStyles()"></div>

        <div class="grid-header-cell"
             v-for="column in grid.getColumns()"
             :key="column.name + column.label"
             @click="changeOrder(column)"
             :class="{
                 'grid-header-order': props.grid.config.orderByEnabled != false && column.orderByEnabled != false,
                 ...GridStyler.getCellTextAlignment(column, grid),
             }"
             :style="GridStyler.getHeaderRowColumnStyle(column, props.grid)">

            <RuntimeRenderer :content="columnContent(column)"/>

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

        <div
            :style="GridStyler.getActionRowColumn(props.grid)"
            v-if="props.grid.config.actions"
            class="text-center grid-header-cell">
            Ações
        </div>
    </div>
</template>

<script setup lang="ts">
import RuntimeRenderer from "./RuntimeRenderer.vue"
import GridHeaderCheckbox from "./GridHeaderCheckbox.vue"
import {GridStyler} from "../utils/GridStyler"
import type {Column, GridComponent} from "../types/types"

const props = defineProps<{ grid: GridComponent }>()

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

<style scoped>

</style>