<script setup lang="ts">
/**
 * `ArcanaSelect` — shadcn-style select used by the grid filter row (Vue).
 *
 * Mirror of the React adapter: same `arcana-select__*` classes, same popover
 * placement math (`core/popover.ts`), same value semantics. See the React
 * component for the full behavior notes.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { formatMessage, resolveArcanaMessages, type ArcanaMessages } from "../core/locale";
import { placePanel } from "../core/popover";
import { arcanaThemeClassFrom } from "../core/theme";
import type { SearchOption } from "../core/types";

const props = withDefaults(defineProps<{
  value: unknown;
  options: SearchOption[];
  multiple?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  /** Resolved message table; defaults to the global default locale pack. */
  messages?: ArcanaMessages;
}>(), {
  multiple: false,
  disabled: false,
  clearable: true,
  searchable: false,
  placeholder: undefined,
  searchPlaceholder: undefined,
  ariaLabel: undefined,
  messages: undefined
});

const msg = computed(() => props.messages ?? resolveArcanaMessages());
const placeholderText = computed(() => props.placeholder ?? msg.value.selectPlaceholder);
const searchPlaceholderText = computed(() => props.searchPlaceholder ?? msg.value.searchPlaceholder);

const emit = defineEmits<{ change: [value: unknown] }>();

const isOpen = ref(false);
const highlighted = ref(-1);
const panelStyle = ref<Record<string, string>>({});
const searchTerm = ref("");
const themeClass = ref("");
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDivElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);

const selectedValues = computed(() => props.multiple && Array.isArray(props.value) ? props.value.map(String) : []);
const hasValue = computed(() => props.multiple ? selectedValues.value.length > 0 : props.value != null && props.value !== "");
const canClear = computed(() => props.clearable && !props.disabled && hasValue.value);

const isSelected = (option: SearchOption): boolean => props.multiple
  ? selectedValues.value.includes(String(option.value))
  : hasValue.value && String(props.value) === String(option.value);

const filtered = computed(() => {
  if (!props.searchable) return props.options;
  const needle = searchTerm.value.trim().toLowerCase();
  return needle ? props.options.filter((option) => option.label.toLowerCase().includes(needle)) : props.options;
});

const displayLabel = computed(() => {
  if (!hasValue.value) return placeholderText.value;
  if (props.multiple) {
    const labels = props.options.filter((option) => selectedValues.value.includes(String(option.value))).map((option) => option.label);
    if (labels.length === 0) return formatMessage(msg.value.selectedCountFallback, { count: selectedValues.value.length });
    return labels.length === 1 ? labels[0] : formatMessage(msg.value.selectedItems, { count: labels.length });
  }
  return props.options.find((option) => String(option.value) === String(props.value))?.label ?? String(props.value);
});

const reposition = () => {
  const trigger = triggerRef.value;
  const panel = panelRef.value;
  if (!trigger || !panel) return;
  const rect = trigger.getBoundingClientRect();
  const place = placePanel(rect, { width: rect.width, height: panel.offsetHeight || 240 }, { width: window.innerWidth, height: window.innerHeight }, { matchWidth: true, maxHeight: 280 });
  panelStyle.value = { position: "fixed", left: `${place.left}px`, top: `${place.top}px`, width: `${place.width}px`, maxHeight: `${place.maxHeight}px` };
};

const onMouseDown = (event: MouseEvent) => {
  const target = event.target as Node;
  if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) return;
  close();
};
const onScroll = (event: Event) => {
  if (event.target instanceof Node && panelRef.value?.contains(event.target)) return;
  close();
};
const onResize = () => reposition();

const attach = () => {
  document.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);
};
const detach = () => {
  document.removeEventListener("mousedown", onMouseDown, true);
  window.removeEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onResize);
};

const open = async () => {
  if (props.disabled || isOpen.value) return;
  // Pre-place with the trigger rect BEFORE the panel mounts so the first
  // measurement happens at the final width (auto-flip uses the real height).
  const rect = triggerRef.value?.getBoundingClientRect();
  if (rect) panelStyle.value = { position: "fixed", left: `${rect.left}px`, width: `${rect.width}px`, top: `${rect.bottom + 4}px`, maxHeight: "280px" };
  // Teleported to <body>: repeat the theme class of the owning grid so the
  // panel resolves the same --arcana-* variables.
  themeClass.value = arcanaThemeClassFrom(triggerRef.value);
  searchTerm.value = "";
  isOpen.value = true;
  const current = filtered.value.findIndex(isSelected);
  highlighted.value = current >= 0 ? current : filtered.value.length ? 0 : -1;
  await nextTick();
  reposition();
  attach();
  (props.searchable ? searchRef.value : panelRef.value)?.focus({ preventScroll: true });
};

const close = () => {
  if (!isOpen.value) return;
  isOpen.value = false;
  searchTerm.value = "";
  detach();
  triggerRef.value?.focus({ preventScroll: true });
};

const toggle = () => { isOpen.value ? close() : void open(); };

watch(searchTerm, () => {
  highlighted.value = filtered.value.length ? 0 : -1;
  void nextTick(() => reposition());
});

const selectOption = (option: SearchOption) => {
  if (props.multiple) {
    const next = selectedValues.value.includes(String(option.value))
      ? selectedValues.value.filter((item) => item !== String(option.value))
      : [...selectedValues.value, String(option.value)];
    emit("change", next);
    return; // stays open in multiple mode
  }
  emit("change", option.value);
  close();
};

const clear = () => {
  if (props.disabled) return;
  emit("change", props.multiple ? [] : "");
};

const moveHighlight = (delta: 1 | -1) => {
  const length = filtered.value.length;
  if (!length) return;
  const current = highlighted.value < 0 ? (delta > 0 ? -1 : 0) : highlighted.value;
  highlighted.value = (current + delta + length) % length;
  void nextTick(() => {
    panelRef.value?.querySelector(".arcana-select__item.is-highlighted")?.scrollIntoView({ block: "nearest" });
  });
};

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return;
  if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
    event.preventDefault();
    void open();
  }
};

const onPanelKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); return; }
  if (event.key === "ArrowDown") { event.preventDefault(); moveHighlight(1); return; }
  if (event.key === "ArrowUp") { event.preventDefault(); moveHighlight(-1); return; }
  if (event.key === "Enter" || (event.key === " " && !props.searchable)) {
    event.preventDefault();
    const option = filtered.value[highlighted.value];
    if (option) selectOption(option);
    return;
  }
  if (event.key === "Home" && !props.searchable) { event.preventDefault(); highlighted.value = filtered.value.length ? 0 : -1; return; }
  if (event.key === "End" && !props.searchable) { event.preventDefault(); highlighted.value = filtered.value.length - 1; }
};

onBeforeUnmount(detach);
</script>

<template>
  <div class="arcana-select" :class="{ 'arcana-select--disabled': disabled }">
    <button
      ref="triggerRef"
      type="button"
      class="arcana-select__trigger"
      :class="{ 'arcana-select__trigger--open': isOpen, 'arcana-select__trigger--has-clear': canClear }"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="arcana-select__label" :class="{ 'arcana-select__label--placeholder': !hasValue }">{{ displayLabel }}</span>
      <span v-if="canClear" class="arcana-select__clear" role="button" tabindex="-1" :aria-label="msg.clear" @click.stop="clear">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </span>
      <svg class="arcana-select__caret" :class="{ 'is-open': isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="arcana-select__panel"
        :class="themeClass"
        :style="panelStyle"
        role="listbox"
        :aria-multiselectable="multiple || undefined"
        tabindex="-1"
        @keydown="onPanelKeydown"
      >
        <div v-if="searchable" class="arcana-select__search">
          <svg class="arcana-select__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input ref="searchRef" v-model="searchTerm" type="search" class="arcana-select__search-input" :placeholder="searchPlaceholderText" autocomplete="off" spellcheck="false" />
        </div>
        <ul class="arcana-select__list">
          <li
            v-for="(option, index) in filtered"
            :key="String(option.value)"
            class="arcana-select__item"
            :class="{ 'is-selected': isSelected(option), 'is-highlighted': highlighted === index }"
            role="option"
            :aria-selected="isSelected(option)"
            @mouseenter="highlighted = index"
            @click="selectOption(option)"
          >
            <span class="arcana-select__item-label">{{ option.label }}</span>
            <svg v-if="isSelected(option)" class="arcana-select__item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
          </li>
          <li v-if="!filtered.length" class="arcana-select__empty">{{ searchTerm.trim() ? msg.noResults : msg.noOptions }}</li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
