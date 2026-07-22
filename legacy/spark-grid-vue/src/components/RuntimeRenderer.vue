<script lang="ts">
import type {Component} from "@vue/runtime-core"
import {h} from 'vue'

export default {
    props: ['content'],
    inheritAttrs: false,

    render() {
        let content = this.content

        if (typeof content == "function") {
            content = content()
        }

        if (typeof content == "string" || typeof content == "number") {
            return h('div', {
                style: "flex: 1",
                innerHTML: content
            })
        }

        return content
    }
} as Component
</script>