<template>
    <div class="grid-footer">
        <div class="spark-grid-pages">
            <div v-show="isRowsPerPageVisible" class="spark-grid__per-page">
                <span class="spark-grid__page-details">Por página:</span>
                <select :value="grid.rowsPerPage"
                    @change="(e) => rowsPerPageChanged(Number((e.target as HTMLSelectElement).value))"
                    class="spark-grid-datatable-select">
                    <option :value="10">10</option>
                    <option :value="25">25</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                    <option :value="150">150</option>
                    <option :value="200">200</option>
                    <option :value="250">250</option>
                    <option :value="500">500</option>
                    <option :value="1000">1000</option>
                    <option :value="2500">2500</option>
                </select>
            </div>

            <span v-show="grid.totalRows > 0" class="spark-grid__info">
                <span class="spark-grid__info-full">Exibindo {{ beginningRows() }} a {{ endingRows() }} de {{ grid.totalRows }} registro(s)</span>
                <span class="spark-grid__info-compact">{{ beginningRows() }}-{{ endingRows() }}/{{ grid.totalRows }}</span>
            </span>

            <span class="spark-grid-selected-rows">
                <span v-if="selectedRowsLength > 0 && grid.config.checkboxEnabled">{{ selectedRowsLength }} registro(s)
                    selecionado(s)</span>
            </span>

            <ul>
                <li>
                    <button @click="paginate(grid.currentPage - 1)" type="button" :disabled="!hasPreviousPage()">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                </li>
                <li :class="{ 'current': i === grid.currentPage }" :key="i" v-for="i in pagination()">
                    <button :disabled="i === grid.currentPage" @click="paginate(i)" type="button">{{ i }}</button>
                </li>
                <li>
                    <button @click="paginate(grid.currentPage + 1)" :disabled="!hasNextPage()" type="button">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DataTableComponent } from "../types"
import { computed } from "vue"

const props = defineProps<{ grid: DataTableComponent }>()

const beginningRows = () => {
    return (props.grid.currentPage * props.grid.rowsPerPage) - props.grid.rowsPerPage + 1
}

const endingRows = () => {
    const end = props.grid.currentPage * props.grid.rowsPerPage
    return end > props.grid.totalRows ? props.grid.totalRows : end
}

const pagination = () => {
    const page = props.grid.currentPage
    let pages = [page]
    let right = pagesRight()
    let left = pagesLeft()

    for (let i = page + 1; i <= right; i++) pages.push(i)
    for (let i = page - 1; i >= left; i--) pages.unshift(i)

    return pages
}

const pagesLeft = () => {
    const iteration = props.grid.currentPage - 2
    return iteration >= 1 ? iteration : 1
}

const pagesRight = () => {
    const iteration = props.grid.currentPage + 2
    return iteration > totalPages() ? totalPages() : iteration
}

const totalPages = () => {
    if (props.grid.totalRows <= 0) {
        return 0;
    }

    return Math.ceil(props.grid.totalRows / props.grid.rowsPerPage)
}
const hasPreviousPage = () => props.grid.currentPage > 1
const hasNextPage = () => props.grid.currentPage < totalPages()

const paginate = (page: number) => props.grid.paginate(page, props.grid.rowsPerPage)
const rowsPerPageChanged = (rowsPerPage: number) => props.grid.paginate(1, rowsPerPage)

const isRowsPerPageVisible = computed(() => props.grid.config.isRowsPerPageVisible ?? true)

const selectedRowsLength = computed(() => props.grid.getCheckedRows().length)
</script>

<style scoped>
.spark-grid-pages {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.spark-grid__per-page {
    display: flex;
    align-items: center;
    gap: 6px;
}

.spark-grid__page-details {
    display: inline-block;
}

.spark-grid__info-compact {
    display: none;
}

.spark-grid__select {
    width: 80px;
    display: inline-block;
}

.spark-grid-icon-arrow-left:before {
    content: "\f053";
}

.spark-grid-selected-rows {
    margin-left: 25px;
    flex: 1;
    text-align: center;
    color: royalblue;
    font-weight: bold;
}

/* Mobile/Tablet responsive — single line footer */
@media screen and (max-width: 768px) {
    .spark-grid-pages {
        justify-content: center;
        flex-wrap: nowrap;
        gap: 6px;
        width: 100%;
        font-size: 11px;
    }

    .spark-grid__page-details {
        display: none;
    }

    .spark-grid__info-full {
        display: none;
    }

    .spark-grid__info-compact {
        display: inline;
        white-space: nowrap;
    }

    .spark-grid__per-page {
        gap: 0;
    }

    .spark-grid__select {
        width: auto;
        min-width: 45px;
    }

    .spark-grid-selected-rows {
        margin: 0;
        flex: 0;
    }
}
</style>