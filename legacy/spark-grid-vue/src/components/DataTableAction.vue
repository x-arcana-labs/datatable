<template>
    <div class="grid-cell" data-label="Ações" :style="DataTableStyler.getActionRowColumn(grid)">
        <template v-for="(action, i) in grid.config.actions">
            <RuntimeRenderer v-if="isVisible(action)" :key="`${row._uuid}:_actions`" :content="action.element(row)" />
        </template>
    </div>
</template>

<script lang="ts" setup>
import { Action, DataTableComponent, Row } from "../types";
import { DataTableStyler } from "../utils/DataTableStyler";
import RuntimeRenderer from "./RuntimeRenderer.vue"

const props = defineProps<{ row: Row, grid: DataTableComponent }>()

const isVisible = function (action: Action): boolean {
    if (action.isVisible) {
        return action.isVisible(props.row)
    }

    return true
}
</script>
