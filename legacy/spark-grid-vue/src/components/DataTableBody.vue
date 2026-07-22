<template>
    <div class="grid-body">
        <div class="empty-grid-placeholder" v-show="rows.length == 0">
            Nenhum registro encontrado.
        </div>

        <DataTableRow v-for="row in rows" :row="row" :grid="grid" :key="row._uuid" />
    </div>
</template>

<script setup lang="ts">
import DataTableRow from "./DataTableRow.vue"
import type { DataTableComponent } from "../types/types"
import { computed } from "vue"

const props = defineProps<{
    grid: DataTableComponent
}>()

const rows = computed(() => props.grid.getRows())
</script>

<style scoped>
.empty-grid-placeholder {
    width: 100%;
    padding: 50px 0;
    font-size: 13px;
    text-align: center;
    border-top: 1px solid #ddd;
    background: #fdfdfd;
}
</style>