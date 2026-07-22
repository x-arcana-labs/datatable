<template>
    <div class="has-feedback has-feedback-left">
        <ElInput v-if="!type" v-model="filterValue" @keyup.enter="search" @change="search" :disabled="disabled"
            clearable size="small" />

        <ElDatePicker :disabled="disabled" v-model="filterValue" @change="search()" v-if="isDate" :type="dateType"
            size="small" clearable value-format="YYYY-MM-DD" format="DD/MM/YYYY"
            start-placeholder="Data início" end-placeholder="Data fim" />

        <ElSelect v-if="isType(DataTableSearchType.BOOLEAN)" v-model="filterValue" :disabled="disabled"
            @change="search()" clearable size="small" placeholder="">
            <ElOption label="Não" value="0" />
            <ElOption label="Sim" value="1" />
        </ElSelect>

        <ElSelect v-if="isType(DataTableSearchType.LIST)" v-model="filterValue" :disabled="disabled"
            @change="search()" multiple clearable size="small" collapse-tags placeholder="Selecione...">
            <ElOption v-for="item in filterListValues" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>

        <div v-if="showSearchIcon" class="form-control-feedback">
            <i class="icon-search4 text-size-base"></i>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { DataTableSearchType } from "../values/column"
import { SearchConfigListValue, DataTableSearchTypeDefinition } from "@/types";
import { EventEmitter } from "../utils/EventEmitter";
import { ElInput, ElDatePicker, ElSelect, ElOption } from "element-plus";
import "element-plus/es/components/input/style/css";
import "element-plus/es/components/date-picker/style/css";
import "element-plus/es/components/select/style/css";
import "element-plus/es/components/option/style/css";

const filterValue = ref<any>(null)
const filterListValues = ref<SearchConfigListValue[]>([])

const emits = defineEmits(['change'])

const props = defineProps<{
    type?: DataTableSearchTypeDefinition,
    emitsEvents?: boolean,
    disabled?: boolean,
    searchConfig?: () => SearchConfigListValue[] | Promise<SearchConfigListValue[]>,
    uuid?: string,
    name?: string,
    modelValue?: any
}>()

watch(filterValue, (newValue: any) => {
    filterValue.value = typeof newValue === 'number' && !isNaN(newValue) ? parseInt(newValue.toString()) : newValue
})

watch(() => props.modelValue, (newValue: any) => {
    filterValue.value = props.modelValue
})

const showSearchIcon = computed(() => {
    switch (props.type) {
        case DataTableSearchType.BOOLEAN:
        case DataTableSearchType.LIST:
        case DataTableSearchType.REMOTE:
        case DataTableSearchType.DATE:
        case DataTableSearchType.DATE_RANGE:
        case DataTableSearchType.DATE_MONTH:
        case DataTableSearchType.COMPONENT:
            return false
        default:
            return true
    }
})

const isDate = computed(() => isType(DataTableSearchType.DATE) || isType(DataTableSearchType.DATE_RANGE) || isType(DataTableSearchType.DATE_MONTH))

const dateType = computed(() => {
    switch (props.type) {
        case DataTableSearchType.DATE_RANGE:
            return "daterange"
        case DataTableSearchType.DATE_MONTH:
            return "month"
        default:
            return "date"
    }
})

const isType = (type: DataTableSearchTypeDefinition) => props.type === type

const search = () => {
    let value = filterValue.value

    if (isType(DataTableSearchType.DATE_RANGE) && !value) {
        value = []
    }

    emits('change', value)
}

const loadSearchConfig = async () => {
    if (props.searchConfig) {
        let promise: any = props.searchConfig();

        if (promise && typeof promise.then === 'function' && promise[Symbol.toStringTag] === 'Promise') {
            filterListValues.value = await promise
        } else {
            filterListValues.value = promise
        }
    }
}

const onGridFilterChanged = (data: any) => {
    if (data.name === props.name) {
        filterValue.value = data.value
    }
}

onMounted(() => {
    filterValue.value = props.modelValue
    loadSearchConfig()

    if (props.emitsEvents) {
        EventEmitter.on("grid-filter", onGridFilterChanged)
    }
})

onUnmounted(() => {
    if (props.emitsEvents) {
        EventEmitter.off("grid-filter", onGridFilterChanged)
    }
})

</script>