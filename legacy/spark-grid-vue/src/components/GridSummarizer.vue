<template>
    <div class="flex grid-summarizer" :class="{'grid-summarizer-sticky': grid.config.stickyHeaderEnabled}">
        <div class="grid-summarizer-cell" v-if="props.grid.config.checkboxEnabled" :style="GridStyler.getCheckboxColumnStyles()"></div>
        <div class="grid-summarizer-cell" v-if="props.grid.config.radioButtonSelectionEnabled" :style="GridStyler.getCheckboxColumnStyles()"></div>

        <div class="grid-summarizer-cell"
             v-for="column in grid.getColumns()"
             :key="`${column.name + column.label}_summarizer`"
             :class="GridStyler.getCellTextAlignment(column, grid)"
             :style="GridStyler.getBodyRowColumnStyle(column, props.grid)">

            <RuntimeRenderer :content="getSummarizedValue(column)"/>
        </div>

        <div v-if="props.grid.config.actions"
             :style="GridStyler.getActionRowColumn(props.grid)"
             class="grid-summarizer-cell">
        </div>
    </div>
</template>

<script setup lang="ts">
import type {Column, GridComponent} from "../types/types"
import {GridStyler} from "../utils/GridStyler"
import RuntimeRenderer from "../components/RuntimeRenderer.vue"

const props = defineProps<{ grid: GridComponent }>()

const getSummarizedValue = (column: Column) => props.grid.getSummarizedValue(column)?.formatted
</script>