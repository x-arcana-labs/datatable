<template>
    <DataTableSearchField v-bind="$attrs" />
</template>

<script setup lang="ts">
import DataTableSearchField from "./DataTableSearchField.vue"

defineOptions({ inheritAttrs: false })
</script>
