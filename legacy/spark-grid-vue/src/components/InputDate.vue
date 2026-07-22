<template>
    <div class="spark-grid-datatable-date-input" @mouseenter="hovered = true" @mouseleave="hovered = false">
        <!-- Single date input -->
        <div v-if="type === 'date'" class="spark-grid-input-wrapper">
            <input type="date" :value="formattedValue" @input="onDateInput" :disabled="disabled"
                class="spark-grid-datatable-input" :class="{ 'has-clear': showClearSingle }" />
            <span v-if="showClearSingle" class="spark-grid-input-clear" @click="clearSingle">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor"
                        d="m466.752 512-90.496-90.496a32 32 0 0 1 45.248-45.248L512 466.752l90.496-90.496a32 32 0 1 1 45.248 45.248L557.248 512l90.496 90.496a32 32 0 1 1-45.248 45.248L512 557.248l-90.496 90.496a32 32 0 0 1-45.248-45.248L466.752 512z" />
                    <path fill="currentColor"
                        d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z" />
                </svg>
            </span>
        </div>

        <!-- Month picker -->
        <div v-else-if="type === 'month'" class="spark-grid-input-wrapper">
            <input type="month" :value="formattedMonthValue" @input="onMonthInput" :disabled="disabled"
                class="spark-grid-datatable-input" :class="{ 'has-clear': showClearSingle }" />
            <span v-if="showClearSingle" class="spark-grid-input-clear" @click="clearSingle">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor"
                        d="m466.752 512-90.496-90.496a32 32 0 0 1 45.248-45.248L512 466.752l90.496-90.496a32 32 0 1 1 45.248 45.248L557.248 512l90.496 90.496a32 32 0 1 1-45.248 45.248L512 557.248l-90.496 90.496a32 32 0 0 1-45.248-45.248L466.752 512z" />
                    <path fill="currentColor"
                        d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z" />
                </svg>
            </span>
        </div>

        <!-- Date range -->
        <div v-else-if="type === 'daterange'" class="spark-grid-datatable-date-range">
            <div class="spark-grid-input-wrapper spark-grid-datatable-input-range">
                <input type="date" :value="rangeStart" @input="onRangeStartInput" :disabled="disabled"
                    class="spark-grid-datatable-input" :class="{ 'has-clear': showClearRange }"
                    placeholder="Data início" />
            </div>
            <span class="spark-grid-datatable-date-separator">-</span>
            <div class="spark-grid-input-wrapper spark-grid-datatable-input-range">
                <input type="date" :value="rangeEnd" @input="onRangeEndInput" :disabled="disabled"
                    class="spark-grid-datatable-input" :class="{ 'has-clear': showClearRange }"
                    placeholder="Data fim" />
            </div>
            <span v-if="showClearRange" class="spark-grid-input-clear spark-grid-input-clear-range" @click="clearRange">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor"
                        d="m466.752 512-90.496-90.496a32 32 0 0 1 45.248-45.248L512 466.752l90.496-90.496a32 32 0 1 1 45.248 45.248L557.248 512l90.496 90.496a32 32 0 1 1-45.248 45.248L512 557.248l-90.496 90.496a32 32 0 0 1-45.248-45.248L466.752 512z" />
                    <path fill="currentColor"
                        d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z" />
                </svg>
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const hovered = ref(false)

const props = defineProps<{
    modelValue?: string | Date | [string, string] | [Date, Date] | null
    disabled?: boolean
    type?: 'date' | 'month' | 'daterange'
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | [string, string] | null): void
    (e: 'change', value: string | [string, string] | null): void
}>()

const showClearSingle = computed(() => {
    return hovered.value && !props.disabled && props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const showClearRange = computed(() => {
    if (!hovered.value || props.disabled) return false
    if (!Array.isArray(props.modelValue)) return false
    return props.modelValue[0] || props.modelValue[1]
})

const clearSingle = () => {
    emit('update:modelValue', null)
    emit('change', null)
}

const clearRange = () => {
    emit('update:modelValue', ['', ''])
    emit('change', ['', ''])
}

// Format date value for native input
const formattedValue = computed(() => {
    if (!props.modelValue) return ''
    if (typeof props.modelValue === 'string') return props.modelValue
    if (props.modelValue instanceof Date) {
        return props.modelValue.toISOString().split('T')[0]
    }
    return ''
})

// Format month value
const formattedMonthValue = computed(() => {
    if (!props.modelValue) return ''
    if (typeof props.modelValue === 'string') {
        // Convert YYYY-MM-DD to YYYY-MM
        return props.modelValue.substring(0, 7)
    }
    if (props.modelValue instanceof Date) {
        const year = props.modelValue.getFullYear()
        const month = String(props.modelValue.getMonth() + 1).padStart(2, '0')
        return `${year}-${month}`
    }
    return ''
})

// Range values
const rangeStart = computed(() => {
    if (!props.modelValue || !Array.isArray(props.modelValue)) return ''
    const val = props.modelValue[0]
    if (!val) return ''
    if (typeof val === 'string') return val
    if (val instanceof Date) return val.toISOString().split('T')[0]
    return ''
})

const rangeEnd = computed(() => {
    if (!props.modelValue || !Array.isArray(props.modelValue)) return ''
    const val = props.modelValue[1]
    if (!val) return ''
    if (typeof val === 'string') return val
    if (val instanceof Date) return val.toISOString().split('T')[0]
    return ''
})

const onDateInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const value = target.value || null
    emit('update:modelValue', value)
    emit('change', value)
}

const onMonthInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    // Convert YYYY-MM to YYYY-MM-01 for consistency
    const value = target.value ? `${target.value}-01` : null
    emit('update:modelValue', value)
    emit('change', value)
}

const onRangeStartInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const newRange: [string, string] = [target.value || '', rangeEnd.value || '']
    emit('update:modelValue', newRange)
    emit('change', newRange)
}

const onRangeEndInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    const newRange: [string, string] = [rangeStart.value || '', target.value || '']
    emit('update:modelValue', newRange)
    emit('change', newRange)
}
</script>

<style scoped>
.spark-grid-datatable-date-input {
    width: 100%;
}

.spark-grid-input-wrapper {
    position: relative;
    width: 100%;
}

.spark-grid-datatable-input {
    width: 100%;
    padding: 5px 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 12px;
    background: white;
    transition: border-color 0.2s;
}

.spark-grid-datatable-input.has-clear {
    padding-right: 24px;
}

.spark-grid-datatable-input:hover {
    border-color: #c0c4cc;
}

.spark-grid-datatable-input:focus {
    outline: none;
    border-color: #409eff;
}

.spark-grid-datatable-input:disabled {
    background-color: #f5f7fa;
    cursor: not-allowed;
    color: #c0c4cc;
}

.spark-grid-input-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
    transition: color 0.2s;
}

.spark-grid-input-clear:hover {
    color: #909399;
}

.spark-grid-input-clear svg {
    width: 14px;
    height: 14px;
}

.spark-grid-input-clear-range {
    position: relative;
    right: auto;
    top: auto;
    transform: none;
    flex-shrink: 0;
}

.spark-grid-datatable-date-range {
    display: flex;
    align-items: center;
    gap: 8px;
}

.spark-grid-datatable-input-range {
    flex: 1;
}

.spark-grid-datatable-date-separator {
    color: #909399;
    font-size: 12px;
}

/* Mobile responsive */
@media screen and (max-width: 480px) {
    .spark-grid-datatable-input {
        min-height: 40px;
        font-size: 14px;
    }

    .spark-grid-datatable-date-range {
        flex-direction: column;
        gap: 4px;
    }

    .spark-grid-datatable-date-separator {
        display: none;
    }
}

@media (hover: none) and (pointer: coarse) {
    .spark-grid-datatable-input {
        min-height: 44px;
    }
}
</style>
