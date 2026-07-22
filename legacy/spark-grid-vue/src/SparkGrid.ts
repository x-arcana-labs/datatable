import DataTableSearchRow from "../components/DataTableSearchRow.vue"
import DataTableFooter from "../components/DataTableFooter.vue"
import DataTableHeader from "../components/DataTableHeader.vue"
import DataTableBody from "../components/DataTableBody.vue"
import DataTableContentWrapper from "../components/DataTableContentWrapper.vue"
import DataTableSummarizer from "../components/DataTableSummarizer.vue"
import DataTableMobileFilters from "../components/DataTableMobileFilters.vue"
import type { Component } from "@vue/runtime-core"
import type { Props, SparkGridConfig } from "../types"
import { DataFetcher } from "../utils/DataFetcher"
import { EventHandler } from "../utils/EventHandler"
// @ts-ignore
import { v4 as uuidV4 } from "uuid"

export default {
    emits: ['mounted'],
    props: ['config'],
    name: "SparkGrid",

    components: {
        DataTableFooter,
        DataTableSearchRow,
        DataTableSummarizer,
        DataTableContentWrapper,
        DataTableHeader,
        DataTableBody,
        DataTableMobileFilters,
    },

    data(): object {
        return {
            uuid: uuidV4(),
            orderBy: null,
            filters: {},
            loading: false,
            currentPage: 1,
            totalRows: 0,
            rows: [],
            focusedCell: null,
            rowsPerPage: 10,
        }
    },

    methods: {
        fetch: DataFetcher.fetch,
        refresh: EventHandler.refresh,
        setRows: EventHandler.setRows,
        clearRows: EventHandler.clearRows,
        addRow: EventHandler.addRow,
        removeRow: EventHandler.removeRow,
        getRows: EventHandler.getRows,
        updateRow: EventHandler.updateRow,
        upsert: EventHandler.upsert,
        getCheckedRows: EventHandler.getCheckedRows,
        clearCheckedRows: EventHandler.clearCheckedRows,
        isEmpty: EventHandler.isEmpty,
        isNotEmpty: EventHandler.isNotEmpty,
        getColumns: EventHandler.getColumns,
        setFilter: EventHandler.setFilter,
        setFilters: EventHandler.setFilters,
        getFilters: EventHandler.getFilters,
        applyFilter: EventHandler.applyFilter,
        applyOrderBy: EventHandler.applyOrderBy,
        paginate: EventHandler.paginate,
        getSummarizedValue: EventHandler.getSummarizedValue,
        getSelectedRadioRow: EventHandler.getSelectedRadioRow,
        setSelectedRadioRow: EventHandler.setSelectedRadioRow,
        clearRadioRowSelection: EventHandler.clearRadioRowSelection,
    },

    computed: {
        grid(): Component<Props> {
            return this
        }
    },

    mounted() {
        this.$emit('mounted', this)

        const config: SparkGridConfig = this.config

        if (config.sendRequestOnMounted !== false) {
            this.refresh()
        }

        this.rowsPerPage = config.rowsPerPage ?? this.rowsPerPage
    }
} as Component<Props>
