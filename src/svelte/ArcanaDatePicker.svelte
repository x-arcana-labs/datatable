<script lang="ts">
  /**
   * `ArcanaDatePicker` — shadcn-style date input with a hand-rolled calendar
   * popover (no external deps). Svelte 5 port of the React/Vue versions:
   * same `arcana-cal__*` classes, same value formats
   * (`date` → 'YYYY-MM-DD', `month` → 'YYYY-MM', `range` → ['YYYY-MM-DD','YYYY-MM-DD']).
   * All date math lives in `core/calendar.ts`.
   */
  import {
    addMonths, formatYm, formatYmd,
    isBetweenYmd, monthGrid, parseYm, parseYmd, sortRange, toDisplayDate, toDisplayMonth
  } from "../core/calendar";
  import {
    arcanaMonthLabels, arcanaMonthLabelsShort, arcanaWeekdayLabels, getDefaultArcanaLocale,
    resolveArcanaMessages, type ArcanaLocale, type ArcanaMessages
  } from "../core/locale";
  import { placePanel } from "../core/popover";
  import { arcanaThemeClassFrom } from "../core/theme";
  import { portal } from "./portal";

  let { mode, value, onChange, disabled = false, placeholder, ariaLabel, messages, locale }: {
    mode: "date" | "month" | "range";
    value: unknown;
    onChange: (value: unknown) => void;
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    /** Resolved message table; defaults to the global default locale pack. */
    messages?: ArcanaMessages;
    /** Locale of the calendar display names (months/weekdays via Intl). */
    locale?: ArcanaLocale;
  } = $props();

  const msg = $derived(messages ?? resolveArcanaMessages());
  const calLocale = $derived(locale ?? getDefaultArcanaLocale());
  const monthLabels = $derived(arcanaMonthLabels(calLocale));
  const monthLabelsShort = $derived(arcanaMonthLabelsShort(calLocale));
  const weekdayLabels = $derived(arcanaWeekdayLabels(calLocale));

  const PANEL_ESTIMATE = { date: { width: 252, height: 300 }, month: { width: 252, height: 210 }, range: { width: 520, height: 300 } };

  let isOpen = $state(false);
  let panelStyle = $state("");
  let view = $state({ year: 2000, month: 1 });
  let pendingStart = $state<string | null>(null);
  let hoverYmd = $state<string | null>(null);
  let todayYmd = $state("");
  let themeClass = $state("");
  let trigger: HTMLButtonElement | null = $state(null);
  let panel: HTMLDivElement | null = $state(null);

  const rangeValue = $derived.by<[string, string]>(() => {
    if (mode !== "range") return ["", ""];
    const pair = Array.isArray(value) ? value : ["", ""];
    return [String(pair[0] ?? ""), String(pair[1] ?? "")];
  });
  const singleValue = $derived(mode === "range" ? "" : String(value ?? ""));

  const hasValue = $derived(mode === "range" ? Boolean(rangeValue[0] || rangeValue[1]) : singleValue !== "");
  const canClear = $derived(!disabled && hasValue);

  const displayLabel = $derived.by(() => {
    if (mode === "range") {
      if (!hasValue) return placeholder ?? msg.rangePlaceholder;
      return `${toDisplayDate(rangeValue[0]) || "…"} → ${toDisplayDate(rangeValue[1]) || "…"}`;
    }
    if (mode === "month") return toDisplayMonth(singleValue) || (placeholder ?? msg.monthPlaceholder);
    return toDisplayDate(singleValue) || (placeholder ?? msg.datePlaceholder);
  });

  function reposition() {
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const estimate = PANEL_ESTIMATE[mode];
    const place = placePanel(rect, { width: panel.offsetWidth || estimate.width, height: panel.offsetHeight || estimate.height }, { width: window.innerWidth, height: window.innerHeight }, {});
    panelStyle = `position: fixed; left: ${place.left}px; top: ${place.top}px`;
  }

  function open() {
    if (disabled || isOpen) return;
    const now = new Date();
    todayYmd = formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const anchor = mode === "range" ? parseYmd(rangeValue[0]) : mode === "month" ? parseYm(singleValue) : parseYmd(singleValue);
    view = anchor ? { year: anchor.year, month: anchor.month } : { year: now.getFullYear(), month: now.getMonth() + 1 };
    pendingStart = null;
    hoverYmd = null;
    // Portaled to <body>: repeat the theme class of the owning grid so the
    // panel resolves the same --arcana-* variables.
    themeClass = arcanaThemeClassFrom(trigger);
    const rect = trigger?.getBoundingClientRect();
    const estimate = PANEL_ESTIMATE[mode];
    if (rect) {
      const place = placePanel(rect, estimate, { width: window.innerWidth, height: window.innerHeight }, {});
      panelStyle = `position: fixed; left: ${place.left}px; top: ${place.top}px`;
    }
    isOpen = true;
  }

  function close() {
    isOpen = false;
    pendingStart = null;
    hoverYmd = null;
    trigger?.focus({ preventScroll: true });
  }

  $effect(() => {
    if (!isOpen) return;
    reposition();
    panel?.focus({ preventScroll: true });
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as globalThis.Node;
      if (trigger?.contains(target) || panel?.contains(target)) return;
      close();
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof globalThis.Node && panel?.contains(event.target)) return;
      close();
    };
    const onResize = () => reposition();
    const onDocKeydown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onDocKeydown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onDocKeydown);
    };
  });

  function clear(event: MouseEvent) {
    event.stopPropagation();
    if (disabled) return;
    onChange(mode === "range" ? ["", ""] : "");
  }

  function pickDay(ymd: string) {
    if (mode === "date") { onChange(ymd); close(); return; }
    if (!pendingStart) { pendingStart = ymd; hoverYmd = null; return; }
    onChange(sortRange(pendingStart, ymd));
    close();
  }

  function pickMonth(month: number) {
    onChange(formatYm(view.year, month));
    close();
  }

  // Range highlight: while picking, preview from the anchored start to the
  // hovered day; otherwise show the committed value.
  const highlightRange = $derived.by<[string, string] | null>(() => {
    if (mode !== "range") return null;
    if (pendingStart) return hoverYmd ? sortRange(pendingStart, hoverYmd) : [pendingStart, pendingStart];
    return parseYmd(rangeValue[0]) && parseYmd(rangeValue[1]) ? [rangeValue[0], rangeValue[1]] : null;
  });

  function navigate(deltaMonths: number) {
    view = addMonths(view.year, view.month, deltaMonths);
  }

  function onPanelKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); }
  }

  function dayClasses(cell: { ymd: string; inMonth: boolean }): string {
    const range = highlightRange;
    const inHighlight = Boolean(range && cell.inMonth && isBetweenYmd(cell.ymd, range[0], range[1]));
    const isEdge = Boolean(range && cell.inMonth && (cell.ymd === range[0] || cell.ymd === range[1]));
    const isSelected = mode === "date" ? cell.ymd === singleValue : isEdge;
    const classes = ["arcana-cal__day"];
    if (!cell.inMonth) classes.push("arcana-cal__day--adjacent");
    if (cell.ymd === todayYmd) classes.push("arcana-cal__day--today");
    if (inHighlight && !isEdge) classes.push("arcana-cal__day--in-range");
    if (isSelected) classes.push("arcana-cal__day--selected");
    if (range && cell.ymd === range[0] && cell.inMonth) classes.push("arcana-cal__day--range-start");
    if (range && cell.ymd === range[1] && cell.inMonth) classes.push("arcana-cal__day--range-end");
    return classes.join(" ");
  }

  function monthClasses(month: number): string {
    const selected = parseYm(singleValue);
    const now = parseYmd(todayYmd);
    const classes = ["arcana-cal__month"];
    if (selected && selected.year === view.year && selected.month === month) classes.push("arcana-cal__month--selected");
    if (now && now.year === view.year && now.month === month) classes.push("arcana-cal__month--today");
    return classes.join(" ");
  }
</script>

{#snippet daysPanel(offset: number)}
  {@const panelMonth = addMonths(view.year, view.month, offset)}
  {@const cells = monthGrid(panelMonth.year, panelMonth.month)}
  {@const isRange = mode === "range"}
  <div class="arcana-cal__month-panel">
    <div class="arcana-cal__header">
      {#if !isRange || offset === 0}
        <button type="button" class="arcana-cal__nav" aria-label={msg.prevYear} onclick={() => navigate(-12)}>«</button>
        <button type="button" class="arcana-cal__nav" aria-label={msg.prevMonth} onclick={() => navigate(-1)}>‹</button>
      {:else}
        <span class="arcana-cal__nav-spacer"></span>
      {/if}
      <span class="arcana-cal__title">{monthLabels[panelMonth.month - 1]} {panelMonth.year}</span>
      {#if !isRange || offset === 1}
        <button type="button" class="arcana-cal__nav" aria-label={msg.nextMonth} onclick={() => navigate(1)}>›</button>
        <button type="button" class="arcana-cal__nav" aria-label={msg.nextYear} onclick={() => navigate(12)}>»</button>
      {:else}
        <span class="arcana-cal__nav-spacer"></span>
      {/if}
    </div>
    <div class="arcana-cal__weekdays">
      {#each weekdayLabels as label, index (index)}
        <span class="arcana-cal__weekday">{label}</span>
      {/each}
    </div>
    <div class="arcana-cal__grid">
      {#each cells as cell (cell.ymd)}
        <button
          type="button"
          class={dayClasses(cell)}
          aria-label={toDisplayDate(cell.ymd)}
          onmouseenter={isRange && pendingStart ? () => { hoverYmd = cell.ymd; } : undefined}
          onclick={() => pickDay(cell.ymd)}
        >{cell.day}</button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet monthsPanel()}
  <div class="arcana-cal__month-panel">
    <div class="arcana-cal__header">
      <button type="button" class="arcana-cal__nav" aria-label={msg.prevYear} onclick={() => navigate(-12)}>«</button>
      <span class="arcana-cal__title">{view.year}</span>
      <button type="button" class="arcana-cal__nav" aria-label={msg.nextYear} onclick={() => navigate(12)}>»</button>
    </div>
    <div class="arcana-cal__months">
      {#each monthLabelsShort as label, index (label)}
        <button type="button" class={monthClasses(index + 1)} onclick={() => pickMonth(index + 1)}>{label}</button>
      {/each}
    </div>
  </div>
{/snippet}

<div class={`arcana-cal${disabled ? " arcana-cal--disabled" : ""}`}>
  <button
    bind:this={trigger}
    type="button"
    class={`arcana-cal__input${isOpen ? " arcana-cal__input--open" : ""}${canClear ? " arcana-cal__input--has-clear" : ""}`}
    {disabled}
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    aria-label={ariaLabel}
    onclick={() => (isOpen ? close() : open())}
  >
    <svg class="arcana-cal__input-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    <span class={`arcana-cal__input-label${hasValue ? "" : " arcana-cal__input-label--placeholder"}`}>{displayLabel}</span>
    {#if canClear}
      <span class="arcana-cal__clear" role="button" tabindex="-1" aria-label={msg.clear} onclick={clear}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </span>
    {/if}
  </button>

  {#if isOpen}
    <div use:portal bind:this={panel} class={`arcana-cal__panel${mode === "range" ? " arcana-cal__panel--range" : ""}${themeClass ? ` ${themeClass}` : ""}`} style={panelStyle} role="dialog" aria-label={ariaLabel} tabindex="-1" onkeydown={onPanelKeyDown}>
      <div class="arcana-cal__panels">
        {#if mode === "month"}
          {@render monthsPanel()}
        {:else if mode === "range"}
          {@render daysPanel(0)}
          {@render daysPanel(1)}
        {:else}
          {@render daysPanel(0)}
        {/if}
      </div>
    </div>
  {/if}
</div>
