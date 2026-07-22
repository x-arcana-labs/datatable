<template>
    <div class="flex grid-summarizer" :class="{ 'grid-summarizer-sticky': grid.config.stickyHeaderEnabled }">
        <div class="spark-grid-datatable-summarizer-cell" v-if="props.grid.config.checkboxEnabled" data-label=""
            :style="DataTableStyler.getCheckboxColumnStyles()"></div>
        <div class="spark-grid-datatable-summarizer-cell" v-if="props.grid.config.radioButtonSelectionEnabled" data-label=""
            :style="DataTableStyler.getCheckboxColumnStyles()"></div>

        <div class="spark-grid-datatable-summarizer-cell" v-for="column in grid.getColumns()"
            :key="`${column.name + column.label}_summarizer`"
            :data-label="column.label"
            :class="DataTableStyler.getCellTextAlignment(column, grid)"
            :style="DataTableStyler.getBodyRowColumnStyle(column, props.grid)">

            <RuntimeRenderer :content="getSummarizedValue(column)" />
        </div>

        <div v-if="props.grid.config.actions" :style="DataTableStyler.getActionRowColumn(props.grid)"
            data-label="Ações"
            class="grid-summarizer-cell">
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Column, DataTableComponent } from "../types/types"
import { DataTableStyler } from "../utils/DataTableStyler"
import RuntimeRenderer from "../components/RuntimeRenderer.vue"

const props = defineProps<{ grid: DataTableComponent }>()

const getSummarizedValue = (column: Column) => props.grid.getSummarizedValue(column)?.formatted
</script>
