<template>
    <div class="grid-cell spark-grid-selection-cell" data-label="Selecionar" :style="columnStyle()">
        <div class="choice">
            <span :class="{ 'checked': row._isRadioChecked }">
                <input type="radio" :id="row._uuid" :name="grid.uuid" :disabled="disabled" @input="emits('selected')"
                    class="styled" :value="row._uuid" :checked="row._isRadioChecked" />
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { DataTableStyler } from "../utils/DataTableStyler"
import type { Row, DataTableComponent } from "../types/types"

const props = defineProps<{
    row: Row,
    grid: DataTableComponent
    disabled?: boolean
}>()

const columnStyle = () => {
    const style = DataTableStyler.getCheckboxColumnStyles()

    if (props.grid.config.onBeforeCheckboxAndRadioButtonStyleMounted) {
        const newStyle = props.grid.config.onBeforeCheckboxAndRadioButtonStyleMounted(props.row, props.grid)

        return { ...style, ...newStyle }
    }

    return style
}

const emits = defineEmits(['selected'])
</script>
