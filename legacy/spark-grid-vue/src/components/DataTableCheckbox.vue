<template>
    <div class="grid-cell spark-grid-selection-cell" data-label="Selecionar" :style="columnStyle()">
        <div class="checker">
            <span :class="{ 'checked': row._isChecked }">
                <input type="checkbox" :name="row._uuid" :disabled="row._isCheckboxDisabled"
                    @input="emits('change', $event.target.value)" class="styled" :value="row._isChecked"
                    :checked="row._isChecked" />
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { DataTableStyler } from "../utils/DataTableStyler"
import type { DataTableComponent, Row } from "../types/types"

const props = defineProps<{
    row: Row,
    grid: DataTableComponent,
}>()

const columnStyle = () => {
    const style = DataTableStyler.getCheckboxColumnStyles()

    if (props.grid.config.onBeforeCheckboxAndRadioButtonStyleMounted) {
        const newStyle = props.grid.config.onBeforeCheckboxAndRadioButtonStyleMounted(props.row, props.grid)

        return { ...style, ...newStyle }
    }

    return style
}

const emits = defineEmits(['change'])
</script>
