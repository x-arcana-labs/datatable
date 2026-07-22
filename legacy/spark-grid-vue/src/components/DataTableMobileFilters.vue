<template>
    <div class="spark-grid-datatable-mobile-filters" v-if="isEnabled">
        <button type="button" class="spark-grid-datatable-mobile-filter-trigger" @click="open">
            <span class="spark-grid-datatable-mobile-filter-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
            </span>
            <span class="spark-grid-datatable-mobile-filter-label">Filtros</span>
        </button>

        <div v-if="isOpen" class="spark-grid-datatable-mobile-filter-backdrop" @click.self="close">
            <div class="spark-grid-datatable-mobile-filter-dialog" role="dialog" aria-modal="true">
                <div class="spark-grid-datatable-mobile-filter-header">
                    <div class="spark-grid-datatable-mobile-filter-title">Filtros</div>
                    <button type="button" class="spark-grid-datatable-mobile-filter-close" @click="close" aria-label="Fechar">
                        ✕
                    </button>
                </div>

                <div class="spark-grid-datatable-mobile-filter-body">
                    <div
                        v-for="column in searchableColumns"
                        :key="column.name"
                        class="spark-grid-datatable-mobile-filter-field"
                    >
                        <label class="spark-grid-datatable-mobile-filter-field-label">{{ column.label }}</label>
                        <DataTableSearchField
                            :type="column.searchType"
                            :search-config="column.searchConfig"
                            :name="column.filterName ?? column.name"
                            :disabled="isDisabled(column)"
                            :uuid="grid.uuid"
                            @change="value => onFilterChanged(column, value)"
                        />
                    </div>
                </div>

                <div class="spark-grid-datatable-mobile-filter-footer">
                    <button type="button" class="spark-grid-datatable-mobile-filter-apply" @click="close">Fechar</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import DataTableSearchField from "./DataTableSearchField.vue"
import type { Column, DataTableComponent } from "../types/types"

const props = defineProps<{ grid: DataTableComponent }>()

const isOpen = ref(false)

const searchableColumns = computed(() => {
    return props.grid
        .getColumns()
        .filter((column: Column) => column.searchEnabled ?? true)
})

const isEnabled = computed(() => {
    return props.grid.config.searchEnabled !== false && searchableColumns.value.length > 0
})

const onFilterChanged = (column: Column, value: any) => props.grid.applyFilter(column, value)

const isDisabled = (column: Column) => {
    if (props.grid.config.disableFilterWhenPresentOnInitialFilters && props.grid.config.initialFilters) {
        return Boolean(props.grid.config.initialFilters[column.filterName ?? column.name])
    }

    return false
}

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        close()
    }
}

const open = () => {
    isOpen.value = true
}

const close = () => {
    isOpen.value = false
}

watch(isOpen, (value) => {
    if (value) {
        document.addEventListener("keydown", onKeydown)
        document.body.classList.add("spark-grid-datatable-mobile-filter-open")
    } else {
        document.removeEventListener("keydown", onKeydown)
        document.body.classList.remove("spark-grid-datatable-mobile-filter-open")
    }
})

onUnmounted(() => {
    document.removeEventListener("keydown", onKeydown)
    document.body.classList.remove("spark-grid-datatable-mobile-filter-open")
})
</script>
