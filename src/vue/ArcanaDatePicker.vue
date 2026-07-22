<script setup lang="ts">
/**
 * `ArcanaDatePicker` — shadcn-style date input with a hand-rolled calendar
 * popover mimicking the Element Plus date picker UX (Vue).
 *
 * Mirror of the React adapter: same `arcana-cal__*` classes, same
 * `core/calendar.ts` math and the same emitted value formats:
 * `date` → 'YYYY-MM-DD' | `month` → 'YYYY-MM' | `range` → ['YYYY-MM-DD','YYYY-MM-DD'].
 */
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import {
  addMonths, formatYm, formatYmd,
  isBetweenYmd, monthGrid, parseYm, parseYmd, sortRange, toDisplayDate, toDisplayMonth
} from "../core/calendar";
import type { CalendarDay } from "../core/calendar";
import {
  arcanaMonthLabels, arcanaMonthLabelsShort, arcanaWeekdayLabels, getDefaultArcanaLocale,
  resolveArcanaMessages, type ArcanaLocale, type ArcanaMessages
} from "../core/locale";
import { placePanel } from "../core/popover";
import { arcanaThemeClassFrom } from "../core/theme";

const props = withDefaults(defineProps<{
  mode: "date" | "month" | "range";
  value: unknown;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  /** Resolved message table; defaults to the global default locale pack. */
  messages?: ArcanaMessages;
  /** Locale of the calendar display names (months/weekdays via Intl). */
  locale?: ArcanaLocale;
}>(), {
  disabled: false,
  placeholder: undefined,
  ariaLabel: undefined,
  messages: undefined,
  locale: undefined
});

const msg = computed(() => props.messages ?? resolveArcanaMessages());
const calLocale = computed(() => props.locale ?? getDefaultArcanaLocale());
const monthLabels = computed(() => arcanaMonthLabels(calLocale.value));
const monthLabelsShort = computed(() => arcanaMonthLabelsShort(calLocale.value));
const weekdayLabels = computed(() => arcanaWeekdayLabels(calLocale.value));

const emit = defineEmits<{ change: [value: unknown] }>();

const PANEL_ESTIMATE = { date: { width: 252, height: 300 }, month: { width: 252, height: 210 }, range: { width: 520, height: 300 } } as const;

const isOpen = ref(false);
const panelStyle = ref<Record<string, string>>({});
const view = ref({ year: 2000, month: 1 });
const pendingStart = ref<string | null>(null);
const hoverYmd = ref<string | null>(null);
const todayYmd = ref("");
const themeClass = ref("");
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDivElement | null>(null);

const rangeValue = computed<[string, string]>(() => {
  if (props.mode !== "range") return ["", ""];
  const pair = Array.isArray(props.value) ? props.value : ["", ""];
  return [String(pair[0] ?? ""), String(pair[1] ?? "")];
});
const singleValue = computed(() => props.mode === "range" ? "" : String(props.value ?? ""));

const hasValue = computed(() => props.mode === "range" ? Boolean(rangeValue.value[0] || rangeValue.value[1]) : singleValue.value !== "");
const canClear = computed(() => !props.disabled && hasValue.value);

const displayLabel = computed(() => {
  if (props.mode === "range") {
    if (!hasValue.value) return props.placeholder ?? msg.value.rangePlaceholder;
    return `${toDisplayDate(rangeValue.value[0]) || "…"} → ${toDisplayDate(rangeValue.value[1]) || "…"}`;
  }
  if (props.mode === "month") return toDisplayMonth(singleValue.value) || (props.placeholder ?? msg.value.monthPlaceholder);
  return toDisplayDate(singleValue.value) || (props.placeholder ?? msg.value.datePlaceholder);
});

const reposition = () => {
  const trigger = triggerRef.value;
  const panel = panelRef.value;
  if (!trigger || !panel) return;
  const rect = trigger.getBoundingClientRect();
  const estimate = PANEL_ESTIMATE[props.mode];
  const place = placePanel(rect, { width: panel.offsetWidth || estimate.width, height: panel.offsetHeight || estimate.height }, { width: window.innerWidth, height: window.innerHeight }, {});
  panelStyle.value = { position: "fixed", left: `${place.left}px`, top: `${place.top}px` };
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

const onDocKeydown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
const attach = () => {
  document.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onDocKeydown);
};
const detach = () => {
  document.removeEventListener("mousedown", onMouseDown, true);
  window.removeEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onResize);
  document.removeEventListener("keydown", onDocKeydown);
};

const open = async () => {
  if (props.disabled || isOpen.value) return;
  const now = new Date();
  todayYmd.value = formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const anchor = props.mode === "range" ? parseYmd(rangeValue.value[0]) : props.mode === "month" ? parseYm(singleValue.value) : parseYmd(singleValue.value);
  view.value = anchor ? { year: anchor.year, month: anchor.month } : { year: now.getFullYear(), month: now.getMonth() + 1 };
  pendingStart.value = null;
  hoverYmd.value = null;
  // Teleported to <body>: repeat the theme class of the owning grid so the
  // panel resolves the same --arcana-* variables.
  themeClass.value = arcanaThemeClassFrom(triggerRef.value);
  const rect = triggerRef.value?.getBoundingClientRect();
  if (rect) {
    const place = placePanel(rect, PANEL_ESTIMATE[props.mode], { width: window.innerWidth, height: window.innerHeight }, {});
    panelStyle.value = { position: "fixed", left: `${place.left}px`, top: `${place.top}px` };
  }
  isOpen.value = true;
  await nextTick();
  reposition();
  attach();
  panelRef.value?.focus({ preventScroll: true });
};

const close = () => {
  if (!isOpen.value) return;
  isOpen.value = false;
  pendingStart.value = null;
  hoverYmd.value = null;
  detach();
  triggerRef.value?.focus({ preventScroll: true });
};

const toggle = () => { isOpen.value ? close() : void open(); };

const clear = () => {
  if (props.disabled) return;
  emit("change", props.mode === "range" ? ["", ""] : "");
};

const pickDay = (ymd: string) => {
  if (props.mode === "date") { emit("change", ymd); close(); return; }
  if (!pendingStart.value) { pendingStart.value = ymd; hoverYmd.value = null; return; }
  emit("change", sortRange(pendingStart.value, ymd));
  close();
};

const pickMonth = (month: number) => {
  emit("change", formatYm(view.value.year, month));
  close();
};

// Range highlight: while picking, preview from the anchored start to the
// hovered day; otherwise show the committed value.
const highlightRange = computed<[string, string] | null>(() => {
  if (props.mode !== "range") return null;
  if (pendingStart.value) return hoverYmd.value ? sortRange(pendingStart.value, hoverYmd.value) : [pendingStart.value, pendingStart.value];
  return parseYmd(rangeValue.value[0]) && parseYmd(rangeValue.value[1]) ? [rangeValue.value[0], rangeValue.value[1]] : null;
});

const navigate = (deltaMonths: number) => { view.value = addMonths(view.value.year, view.value.month, deltaMonths); };

const panelMonth = (offset: number) => addMonths(view.value.year, view.value.month, offset);
const panelTitle = (offset: number) => {
  const month = panelMonth(offset);
  return `${monthLabels.value[month.month - 1]} ${month.year}`;
};
const panelCells = (offset: number): CalendarDay[] => {
  const month = panelMonth(offset);
  return monthGrid(month.year, month.month);
};

const dayClasses = (cell: CalendarDay) => {
  const range = highlightRange.value;
  const inHighlight = Boolean(range && cell.inMonth && isBetweenYmd(cell.ymd, range[0], range[1]));
  const isEdge = Boolean(range && cell.inMonth && (cell.ymd === range[0] || cell.ymd === range[1]));
  const isSelected = props.mode === "date" ? cell.ymd === singleValue.value : isEdge;
  return {
    "arcana-cal__day--adjacent": !cell.inMonth,
    "arcana-cal__day--today": cell.ymd === todayYmd.value,
    "arcana-cal__day--in-range": inHighlight && !isEdge,
    "arcana-cal__day--selected": isSelected,
    "arcana-cal__day--range-start": Boolean(range && cell.ymd === range[0] && cell.inMonth),
    "arcana-cal__day--range-end": Boolean(range && cell.ymd === range[1] && cell.inMonth)
  };
};

const monthClasses = (month: number) => {
  const selected = parseYm(singleValue.value);
  const now = parseYmd(todayYmd.value);
  return {
    "arcana-cal__month--selected": Boolean(selected && selected.year === view.value.year && selected.month === month),
    "arcana-cal__month--today": Boolean(now && now.year === view.value.year && now.month === month)
  };
};

const onDayHover = (cell: CalendarDay) => {
  if (props.mode === "range" && pendingStart.value) hoverYmd.value = cell.ymd;
};

const onPanelKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); }
};

const dayPanels = computed(() => props.mode === "range" ? [0, 1] : props.mode === "date" ? [0] : []);

onBeforeUnmount(detach);
</script>

<template>
  <div class="arcana-cal" :class="{ 'arcana-cal--disabled': disabled }">
    <button
      ref="triggerRef"
      type="button"
      class="arcana-cal__input"
      :class="{ 'arcana-cal__input--open': isOpen, 'arcana-cal__input--has-clear': canClear }"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <svg class="arcana-cal__input-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      <span class="arcana-cal__input-label" :class="{ 'arcana-cal__input-label--placeholder': !hasValue }">{{ displayLabel }}</span>
      <span v-if="canClear" class="arcana-cal__clear" role="button" tabindex="-1" :aria-label="msg.clear" @click.stop="clear">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="arcana-cal__panel"
        :class="[{ 'arcana-cal__panel--range': mode === 'range' }, themeClass]"
        :style="panelStyle"
        role="dialog"
        :aria-label="ariaLabel"
        tabindex="-1"
        @keydown="onPanelKeydown"
      >
        <div class="arcana-cal__panels">
          <template v-if="mode === 'month'">
            <div class="arcana-cal__month-panel">
              <div class="arcana-cal__header">
                <button type="button" class="arcana-cal__nav" :aria-label="msg.prevYear" @click="navigate(-12)">«</button>
                <span class="arcana-cal__title">{{ view.year }}</span>
                <button type="button" class="arcana-cal__nav" :aria-label="msg.nextYear" @click="navigate(12)">»</button>
              </div>
              <div class="arcana-cal__months">
                <button
                  v-for="(label, index) in monthLabelsShort"
                  :key="label"
                  type="button"
                  class="arcana-cal__month"
                  :class="monthClasses(index + 1)"
                  @click="pickMonth(index + 1)"
                >{{ label }}</button>
              </div>
            </div>
          </template>
          <template v-else>
            <div v-for="offset in dayPanels" :key="offset" class="arcana-cal__month-panel">
              <div class="arcana-cal__header">
                <template v-if="mode !== 'range' || offset === 0">
                  <button type="button" class="arcana-cal__nav" :aria-label="msg.prevYear" @click="navigate(-12)">«</button>
                  <button type="button" class="arcana-cal__nav" :aria-label="msg.prevMonth" @click="navigate(-1)">‹</button>
                </template>
                <span v-else class="arcana-cal__nav-spacer" />
                <span class="arcana-cal__title">{{ panelTitle(offset) }}</span>
                <template v-if="mode !== 'range' || offset === 1">
                  <button type="button" class="arcana-cal__nav" :aria-label="msg.nextMonth" @click="navigate(1)">›</button>
                  <button type="button" class="arcana-cal__nav" :aria-label="msg.nextYear" @click="navigate(12)">»</button>
                </template>
                <span v-else class="arcana-cal__nav-spacer" />
              </div>
              <div class="arcana-cal__weekdays">
                <span v-for="(label, index) in weekdayLabels" :key="index" class="arcana-cal__weekday">{{ label }}</span>
              </div>
              <div class="arcana-cal__grid">
                <button
                  v-for="cell in panelCells(offset)"
                  :key="cell.ymd"
                  type="button"
                  class="arcana-cal__day"
                  :class="dayClasses(cell)"
                  :aria-label="toDisplayDate(cell.ymd)"
                  @mouseenter="onDayHover(cell)"
                  @click="pickDay(cell.ymd)"
                >{{ cell.day }}</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
