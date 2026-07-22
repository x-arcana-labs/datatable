<template>
    <div class="grid-row grid-search-row">
        <div class="grid-search-row-cell" v-if="props.grid.config.checkboxEnabled"
            :style="GridStyler.getCheckboxColumnStyles()"></div>
        <div class="grid-search-row-cell" v-if="props.grid.config.radioButtonSelectionEnabled"
            :style="GridStyler.getCheckboxColumnStyles()"></div>

        <div class="grid-search-row-cell" v-for="column in columns" :key="column.name"
            :style="GridStyler.getSearchRowColumnStyle(column, props.grid)">
            <DataTableSearchField v-if="column.searchEnabled ?? true" :type="column.searchType"
                :search-config="column.searchConfig" :name="column.filterName ?? column.name"
                :disabled="isDisabled(column)" :uuid="grid.uuid" :emits-events="true"
                @change="value => onFilterChanged(column, value)" />
        </div>

        <div :style="GridStyler.getActionRowColumn(props.grid)" v-if="props.grid.config.actions"
            class="grid-search-row-cell"></div>
    </div>
</template>

<script setup lang="ts">
import type { GridComponent, Column } from "../types/types"
import DataTableSearchField from "./DataTableSearchField.vue"
import { computed } from "vue"
import { GridStyler } from "../utils/GridStyler"

const props = defineProps<{ grid: GridComponent }>()

const columns = computed(() => props.grid.getColumns())

const onFilterChanged = (column: Column, value: any) => props.grid.applyFilter(column, value)

const isDisabled = (column: Column) => {
    if (props.grid.config.disableFilterWhenPresentOnInitialFilters && props.grid.config.initialFilters) {
        return Boolean(props.grid.config.initialFilters[column.filterName ?? column.name])
    }

    return false
}
</script>