<template>
    <div class="multi-select" ref="containerRef">
        <div class="multi-select-trigger" @click="toggleDropdown">
            <div class="multi-select-tags">
                <span v-if="selectedItems.length === 0" class="multi-select-placeholder">
                    {{ placeholder }}
                </span>
                <span 
                    v-for="item in selectedItems" 
                    :key="item.value" 
                    class="multi-select-tag"
                >
                    {{ item.label }}
                    <button 
                        type="button" 
                        class="multi-select-tag-remove" 
                        @click.stop="removeItem(item.value)"
                    >
                        ×
                    </button>
                </span>
            </div>
            <button 
                v-if="selectedItems.length > 0 && clearable" 
                type="button" 
                class="multi-select-clear" 
                @click.stop="clearAll"
            >
                ×
            </button>
            <span class="multi-select-arrow">▼</span>
        </div>
        <div v-show="isOpen" class="multi-select-dropdown">
            <div 
                v-for="option in options" 
                :key="option.value" 
                class="multi-select-option"
                :class="{ 'selected': isSelected(option.value) }"
                @click="toggleOption(option)"
            >
                <input 
                    type="checkbox" 
                    :checked="isSelected(option.value)" 
                    @click.stop
                    @change="toggleOption(option)"
                />
                <span>{{ option.label }}</span>
            </div>
            <div v-if="options.length === 0" class="multi-select-empty">
                Nenhuma opção disponível
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Option {
    value: string | number
    label: string
}

const props = withDefaults(defineProps<{
    modelValue: (string | number)[]
    options: Option[]
    placeholder?: string
    clearable?: boolean
    disabled?: boolean
}>(), {
    modelValue: () => [],
    options: () => [],
    placeholder: 'Selecione...',
    clearable: true,
    disabled: false
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: (string | number)[]): void
    (e: 'change', value: (string | number)[]): void
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const selectedItems = computed(() => {
    return props.options.filter(opt => props.modelValue?.includes(opt.value))
})

const isSelected = (value: string | number) => {
    return props.modelValue?.includes(value)
}

const toggleDropdown = () => {
    if (!props.disabled) {
        isOpen.value = !isOpen.value
    }
}

const toggleOption = (option: Option) => {
    if (props.disabled) return
    
    const newValue = [...(props.modelValue || [])]
    const index = newValue.indexOf(option.value)
    
    if (index > -1) {
        newValue.splice(index, 1)
    } else {
        newValue.push(option.value)
    }
    
    emit('update:modelValue', newValue)
    emit('change', newValue)
}

const removeItem = (value: string | number) => {
    const newValue = props.modelValue.filter(v => v !== value)
    emit('update:modelValue', newValue)
    emit('change', newValue)
}

const clearAll = () => {
    emit('update:modelValue', [])
    emit('change', [])
}

const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.multi-select {
    position: relative;
    width: 100%;
    font-size: 12px;
}

.multi-select-trigger {
    display: flex;
    align-items: center;
    min-height: 32px;
    padding: 4px 8px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    gap: 4px;
}

.multi-select-trigger:hover {
    border-color: #c0c4cc;
}

.multi-select-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
}

.multi-select-placeholder {
    color: #a8abb2;
}

.multi-select-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    background: #f0f2f5;
    border-radius: 3px;
    font-size: 11px;
    gap: 4px;
}

.multi-select-tag-remove {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    font-size: 14px;
    line-height: 1;
    color: #909399;
}

.multi-select-tag-remove:hover {
    color: #606266;
}

.multi-select-clear {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0 4px;
    font-size: 14px;
    color: #909399;
}

.multi-select-clear:hover {
    color: #606266;
}

.multi-select-arrow {
    font-size: 10px;
    color: #909399;
    margin-left: 4px;
}

.multi-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    margin-top: 4px;
}

.multi-select-option {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    gap: 8px;
}

.multi-select-option:hover {
    background: #f5f7fa;
}

.multi-select-option.selected {
    background: #f0f7ff;
}

.multi-select-option input[type="checkbox"] {
    margin: 0;
}

.multi-select-empty {
    padding: 12px;
    text-align: center;
    color: #909399;
}

/* Touch-friendly and mobile responsive */
@media screen and (max-width: 480px) {
    .multi-select-trigger {
        min-height: 40px;
        padding: 6px 10px;
    }

    .multi-select-tag {
        font-size: 12px;
        padding: 4px 8px;
    }

    .multi-select-tag-remove {
        font-size: 16px;
        padding: 2px;
    }

    .multi-select-option {
        padding: 12px 14px;
        font-size: 14px;
    }

    .multi-select-dropdown {
        max-height: 250px;
    }

    .multi-select-option input[type="checkbox"] {
        width: 18px;
        height: 18px;
    }
}

@media (hover: none) and (pointer: coarse) {
    .multi-select-trigger {
        min-height: 44px;
    }

    .multi-select-option {
        min-height: 44px;
    }

    .multi-select-tag-remove {
        min-width: 24px;
        min-height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
</style>
