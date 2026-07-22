<template>
    <div class="spark-grid grid-wrapper" :class="wrapperClasses">
        <div class="spark-grid-body" :style="styles" :class="classes">
            <slot name="main"></slot>
        </div>

        <slot name="footer"></slot>
    </div>
</template>

<script setup lang="ts">
import type { DataTableComponent } from "../types/types"
import { ResponsiveMode } from "../values/column"
import { computed, ref, onMounted, onUnmounted } from "vue"

const props = defineProps<{ grid: DataTableComponent }>()

const MOBILE_BREAKPOINT = 768
const isMobile = ref(false)

const checkMobile = () => {
    isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT
}

onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
})

const responsiveMode = computed(() => {
    return props.grid.config.responsiveMode ?? ResponsiveMode.HORIZONTAL_OVERFLOW
})

const wrapperClasses = computed(() => {
    const cls: string[] = []

    if (responsiveMode.value === ResponsiveMode.VERTICAL_RECORD) {
        cls.push('spark-grid-responsive-vertical')
    }

    return cls
})

const classes = computed(() => {
    let classes = []

    if (props.grid.config.stickyHeaderEnabled) {
        classes.push("grid-sticky-header")
    }

    return classes.join(" ")
})

const styles = computed(() => {
    let styles: any = {
        background: '#fafafa'
    }

    if (props.grid.config.overflowEnabled) {
        const maxHeight = props.grid.config.height ?? (window.innerHeight - 100)

        styles['overflow-x'] = 'auto'
        styles['max-height'] = `${maxHeight}px`
        styles['min-height'] = `${maxHeight}px`

        if (props.grid.config.stickyHeaderEnabled) {
            styles['position'] = 'relative'
        }
    } else if (responsiveMode.value === ResponsiveMode.HORIZONTAL_OVERFLOW && isMobile.value) {
        styles['overflow-x'] = 'auto'
    }

    return styles
})
</script>

<style></style>