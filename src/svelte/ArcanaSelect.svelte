<script lang="ts">
  /**
   * `ArcanaSelect` — shadcn-style select used by the grid filter row.
   *
   * Svelte 5 port of the React/Vue implementations: same `arcana-select__*`
   * classes, same popover placement math (`core/popover.ts`) and the same
   * behavior (portal on <body>, auto-flip, multiple mode stays open, clear
   * emits "" / [], keyboard navigation, closes on outside click/Esc/scroll).
   */
  import { formatMessage, resolveArcanaMessages, type ArcanaMessages } from "../core/locale";
  import { placePanel } from "../core/popover";
  import { arcanaThemeClassFrom } from "../core/theme";
  import type { SearchOption } from "../core/types";
  import { portal } from "./portal";

  let {
    value,
    options = [],
    onChange,
    multiple = false,
    disabled = false,
    clearable = true,
    searchable = false,
    placeholder,
    searchPlaceholder,
    ariaLabel,
    messages
  }: {
    value: unknown;
    options?: SearchOption[];
    onChange: (value: unknown) => void;
    multiple?: boolean;
    disabled?: boolean;
    clearable?: boolean;
    searchable?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    ariaLabel?: string;
    /** Resolved message table; defaults to the global default locale pack. */
    messages?: ArcanaMessages;
  } = $props();

  const msg = $derived(messages ?? resolveArcanaMessages());
  const placeholderText = $derived(placeholder ?? msg.selectPlaceholder);
  const searchPlaceholderText = $derived(searchPlaceholder ?? msg.searchPlaceholder);

  let isOpen = $state(false);
  let highlighted = $state(-1);
  let panelStyle = $state("");
  let searchTerm = $state("");
  let themeClass = $state("");
  let trigger: HTMLButtonElement | null = $state(null);
  let panel: HTMLDivElement | null = $state(null);
  let search: HTMLInputElement | null = $state(null);

  const selectedValues = $derived(multiple && Array.isArray(value) ? value.map(String) : []);
  const hasValue = $derived(multiple ? selectedValues.length > 0 : value != null && value !== "");
  const canClear = $derived(clearable && !disabled && hasValue);

  const isSelected = (option: SearchOption) => multiple
    ? selectedValues.includes(String(option.value))
    : hasValue && String(value) === String(option.value);

  const filtered = $derived.by(() => {
    if (!searchable) return options;
    const needle = searchTerm.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  });

  const displayLabel = $derived.by(() => {
    if (!hasValue) return placeholderText;
    if (multiple) {
      const labels = options.filter((option) => selectedValues.includes(String(option.value))).map((option) => option.label);
      if (labels.length === 0) return formatMessage(msg.selectedCountFallback, { count: selectedValues.length });
      return labels.length === 1 ? labels[0] : formatMessage(msg.selectedItems, { count: labels.length });
    }
    return options.find((option) => String(option.value) === String(value))?.label ?? String(value);
  });

  function reposition() {
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const place = placePanel(rect, { width: rect.width, height: panel.offsetHeight || 240 }, { width: window.innerWidth, height: window.innerHeight }, { matchWidth: true, maxHeight: 280 });
    panelStyle = `position: fixed; left: ${place.left}px; top: ${place.top}px; width: ${place.width}px; max-height: ${place.maxHeight}px`;
  }

  function open() {
    if (disabled || isOpen) return;
    // Pre-place with the trigger rect BEFORE the panel mounts so the first
    // measurement happens at the final width (labels wrap correctly and the
    // auto-flip is computed from the real height).
    const rect = trigger?.getBoundingClientRect();
    if (rect) panelStyle = `position: fixed; left: ${rect.left}px; width: ${rect.width}px; top: ${rect.bottom + 4}px; max-height: 280px`;
    // Portaled to <body>: repeat the theme class of the owning grid so the
    // panel resolves the same --arcana-* variables.
    themeClass = arcanaThemeClassFrom(trigger);
    searchTerm = "";
    isOpen = true;
  }

  function close() {
    isOpen = false;
    searchTerm = "";
    trigger?.focus({ preventScroll: true });
  }

  const toggle = () => { isOpen ? close() : open(); };

  $effect(() => {
    if (!isOpen) return;
    reposition();
    const current = filtered.findIndex(isSelected);
    highlighted = current >= 0 ? current : filtered.length ? 0 : -1;
    (searchable ? search : panel)?.focus({ preventScroll: true });
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
    document.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  });

  $effect(() => {
    filtered.length;
    if (isOpen) reposition();
  });

  function selectOption(option: SearchOption) {
    if (multiple) {
      const next = selectedValues.includes(String(option.value))
        ? selectedValues.filter((item) => item !== String(option.value))
        : [...selectedValues, String(option.value)];
      onChange(next);
      return; // stays open in multiple mode
    }
    onChange(option.value);
    close();
  }

  function clear(event: MouseEvent) {
    event.stopPropagation();
    if (disabled) return;
    onChange(multiple ? [] : "");
  }

  function moveHighlight(delta: 1 | -1) {
    const length = filtered.length;
    if (!length) return;
    highlighted = ((highlighted < 0 ? (delta > 0 ? -1 : 0) : highlighted) + delta + length) % length;
    requestAnimationFrame(() => {
      panel?.querySelector(".arcana-select__item.is-highlighted")?.scrollIntoView({ block: "nearest" });
    });
  }

  function onTriggerKeyDown(event: KeyboardEvent) {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      open();
    }
  }

  function onPanelKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); moveHighlight(1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); moveHighlight(-1); return; }
    if (event.key === "Enter" || (event.key === " " && !searchable)) {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) selectOption(option);
      return;
    }
    if (event.key === "Home" && !searchable) { event.preventDefault(); highlighted = filtered.length ? 0 : -1; return; }
    if (event.key === "End" && !searchable) { event.preventDefault(); highlighted = filtered.length - 1; }
  }
</script>

<div class={`arcana-select${disabled ? " arcana-select--disabled" : ""}`}>
  <button
    bind:this={trigger}
    type="button"
    class={`arcana-select__trigger${isOpen ? " arcana-select__trigger--open" : ""}${canClear ? " arcana-select__trigger--has-clear" : ""}`}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-label={ariaLabel}
    onclick={toggle}
    onkeydown={onTriggerKeyDown}
  >
    <span class={`arcana-select__label${hasValue ? "" : " arcana-select__label--placeholder"}`}>{displayLabel}</span>
    {#if canClear}
      <span class="arcana-select__clear" role="button" tabindex="-1" aria-label={msg.clear} onclick={clear}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </span>
    {/if}
    <svg class={`arcana-select__caret${isOpen ? " is-open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
  </button>

  {#if isOpen}
    <div use:portal bind:this={panel} class={`arcana-select__panel ${themeClass}`.trim()} style={panelStyle} role="listbox" aria-multiselectable={multiple || undefined} tabindex="-1" onkeydown={onPanelKeyDown}>
      {#if searchable}
        <div class="arcana-select__search">
          <svg class="arcana-select__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input bind:this={search} type="search" class="arcana-select__search-input" placeholder={searchPlaceholderText} value={searchTerm} autocomplete="off" spellcheck="false" oninput={(event) => { searchTerm = (event.currentTarget as HTMLInputElement).value; }} />
        </div>
      {/if}
      <ul class="arcana-select__list">
        {#each filtered as option, index (String(option.value))}
          <li
            class={`arcana-select__item${isSelected(option) ? " is-selected" : ""}${highlighted === index ? " is-highlighted" : ""}`}
            role="option"
            aria-selected={isSelected(option)}
            onmouseenter={() => { highlighted = index; }}
            onclick={() => selectOption(option)}
          >
            <span class="arcana-select__item-label">{option.label}</span>
            {#if isSelected(option)}
              <svg class="arcana-select__item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            {/if}
          </li>
        {/each}
        {#if !filtered.length}
          <li class="arcana-select__empty">{searchTerm.trim() ? msg.noResults : msg.noOptions}</li>
        {/if}
      </ul>
    </div>
  {/if}
</div>
