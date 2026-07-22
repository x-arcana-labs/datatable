<template>
    <div class="spark-grid-input-wrapper" @mouseenter="hovered = true" @mouseleave="hovered = false">
        <input type="text" :value="modelValue" @input="onInput" @keyup.enter="$emit('keyup.enter', $event)"
            @change="$emit('change', $event)" :disabled="disabled" :placeholder="placeholder"
            class="spark-grid-datatable-input" :class="{ 'has-clear': showClear }" />

        <span v-if="showClear" class="spark-grid-input-clear" @click="clear">
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor"
                    d="m466.752 512-90.496-90.496a32 32 0 0 1 45.248-45.248L512 466.752l90.496-90.496a32 32 0 1 1 45.248 45.248L557.248 512l90.496 90.496a32 32 0 1 1-45.248 45.248L512 557.248l-90.496 90.496a32 32 0 0 1-45.248-45.248L466.752 512z" />
                <path fill="currentColor"
                    d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z" />
            </svg>
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const hovered = ref(false)

const props = defineProps<{
    modelValue?: string | number
    disabled?: boolean
    placeholder?: string
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'keyup.enter', event: KeyboardEvent): void
    (e: 'change', event: Event): void
}>()

const showClear = computed(() => {
    return hovered.value && !props.disabled && props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.value)
}

const clear = () => {
    emit('update:modelValue', '')
    emit('change', new Event('change'))
}
</script>

<style scoped>
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

/* Mobile responsive */
@media screen and (max-width: 480px) {
    .spark-grid-datatable-input {
        min-height: 40px;
        font-size: 14px;
    }
}

@media (hover: none) and (pointer: coarse) {
    .spark-grid-datatable-input {
        min-height: 44px;
    }
}
</style>
