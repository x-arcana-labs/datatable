import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMessage, resolveArcanaMessages, type ArcanaMessages } from "../core/locale";
import { placePanel } from "../core/popover";
import { arcanaThemeClassFrom } from "../core/theme";
import type { SearchOption } from "../core/types";

/**
 * `ArcanaSelect` — shadcn-style select used by the grid filter row.
 *
 * A faithful port of the erp-web `ShadcnSelect` (zinc palette), sharing the
 * `arcana-select__*` classes and the popover placement math with the Vue
 * adapter so both frameworks look and behave identically.
 *
 * - Panel is rendered in a portal on <body> (`position: fixed` from the
 *   trigger rect, auto-flip when there is no space below) so it escapes any
 *   `overflow: hidden` ancestor.
 * - Single mode emits `option.value` and closes; multiple mode toggles string
 *   values, stays open, and shows "N selecionados" on the trigger.
 * - Clear (hover ×) emits `""` (single) or `[]` (multiple).
 * - Keyboard: ↓/↑ navigate, Enter/Space select, Esc/Tab close, Home/End jump.
 * - Closes on outside click, Esc and scrolling outside the panel.
 */
export interface ArcanaSelectProps {
  value: unknown;
  options: SearchOption[];
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
}

export function ArcanaSelect({
  value, options, onChange, multiple = false, disabled = false, clearable = true,
  searchable = false, placeholder, searchPlaceholder, ariaLabel, messages
}: ArcanaSelectProps) {
  const msgs = messages ?? resolveArcanaMessages();
  const placeholderText = placeholder ?? msgs.selectPlaceholder;
  const searchPlaceholderText = searchPlaceholder ?? msgs.searchPlaceholder;
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [themeClass, setThemeClass] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selectedValues = useMemo(() => multiple && Array.isArray(value) ? value.map(String) : [], [multiple, value]);
  const hasValue = multiple ? selectedValues.length > 0 : value != null && value !== "";
  const canClear = clearable && !disabled && hasValue;

  const isSelected = useCallback((option: SearchOption) => multiple
    ? selectedValues.includes(String(option.value))
    : hasValue && String(value) === String(option.value), [multiple, selectedValues, hasValue, value]);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const needle = searchTerm.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, searchable, searchTerm]);

  const displayLabel = useMemo(() => {
    if (!hasValue) return placeholderText;
    if (multiple) {
      const labels = options.filter((option) => selectedValues.includes(String(option.value))).map((option) => option.label);
      if (labels.length === 0) return formatMessage(msgs.selectedCountFallback, { count: selectedValues.length });
      return labels.length === 1 ? labels[0] : formatMessage(msgs.selectedItems, { count: labels.length });
    }
    return options.find((option) => String(option.value) === String(value))?.label ?? String(value);
  }, [hasValue, placeholderText, multiple, options, selectedValues, value, msgs]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const place = placePanel(rect, { width: rect.width, height: panel.offsetHeight || 240 }, { width: window.innerWidth, height: window.innerHeight }, { matchWidth: true, maxHeight: 280 });
    setPanelStyle({ position: "fixed", left: place.left, top: place.top, width: place.width, maxHeight: place.maxHeight });
  }, []);

  const open = () => {
    if (disabled || isOpen) return;
    // Pre-place with the trigger rect BEFORE the panel mounts so the first
    // measurement happens at the final width (labels wrap correctly and the
    // auto-flip is computed from the real height).
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPanelStyle({ position: "fixed", left: rect.left, width: rect.width, top: rect.bottom + 4, maxHeight: 280 });
    // Portaled to <body>: repeat the theme class of the owning grid so the
    // panel resolves the same --arcana-* variables.
    setThemeClass(arcanaThemeClassFrom(triggerRef.current));
    setSearchTerm("");
    setIsOpen(true);
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const toggle = () => { isOpen ? close() : open(); };

  useLayoutEffect(() => {
    if (!isOpen) return;
    reposition();
    const current = filtered.findIndex(isSelected);
    setHighlighted(current >= 0 ? current : filtered.length ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useLayoutEffect(() => { if (isOpen) reposition(); }, [isOpen, filtered.length, reposition]);

  useEffect(() => {
    if (!isOpen) return;
    (searchable ? searchRef.current : panelRef.current)?.focus({ preventScroll: true });
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
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
  }, [isOpen, searchable, close, reposition]);

  const selectOption = (option: SearchOption) => {
    if (multiple) {
      const next = selectedValues.includes(String(option.value))
        ? selectedValues.filter((item) => item !== String(option.value))
        : [...selectedValues, String(option.value)];
      onChange(next);
      return; // stays open in multiple mode
    }
    onChange(option.value);
    close();
  };

  const clear = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    onChange(multiple ? [] : "");
  };

  const moveHighlight = (delta: 1 | -1) => {
    const length = filtered.length;
    if (!length) return;
    setHighlighted((current) => {
      const next = ((current < 0 ? (delta > 0 ? -1 : 0) : current) + delta + length) % length;
      requestAnimationFrame(() => {
        panelRef.current?.querySelector(".arcana-select__item.is-highlighted")?.scrollIntoView({ block: "nearest" });
      });
      return next;
    });
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      open();
    }
  };

  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); moveHighlight(1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); moveHighlight(-1); return; }
    if (event.key === "Enter" || (event.key === " " && !searchable)) {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) selectOption(option);
      return;
    }
    if (event.key === "Home" && !searchable) { event.preventDefault(); setHighlighted(filtered.length ? 0 : -1); return; }
    if (event.key === "End" && !searchable) { event.preventDefault(); setHighlighted(filtered.length - 1); }
  };

  return (
    <div className={`arcana-select${disabled ? " arcana-select--disabled" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`arcana-select__trigger${isOpen ? " arcana-select__trigger--open" : ""}${canClear ? " arcana-select__trigger--has-clear" : ""}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`arcana-select__label${hasValue ? "" : " arcana-select__label--placeholder"}`}>{displayLabel}</span>
        {canClear ? (
          <span className="arcana-select__clear" role="button" tabIndex={-1} aria-label={msgs.clear} onClick={clear}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </span>
        ) : null}
        <svg className={`arcana-select__caret${isOpen ? " is-open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {isOpen ? createPortal(
        <div ref={panelRef} className={`arcana-select__panel ${themeClass}`.trim()} style={panelStyle} role="listbox" aria-multiselectable={multiple || undefined} tabIndex={-1} onKeyDown={onPanelKeyDown}>
          {searchable ? (
            <div className="arcana-select__search">
              <svg className="arcana-select__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input ref={searchRef} type="search" className="arcana-select__search-input" placeholder={searchPlaceholderText} value={searchTerm} autoComplete="off" spellCheck={false} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
          ) : null}
          <ul className="arcana-select__list">
            {filtered.map((option, index) => (
              <li
                key={String(option.value)}
                className={`arcana-select__item${isSelected(option) ? " is-selected" : ""}${highlighted === index ? " is-highlighted" : ""}`}
                role="option"
                aria-selected={isSelected(option)}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => selectOption(option)}
              >
                <span className="arcana-select__item-label">{option.label}</span>
                {isSelected(option) ? (
                  <svg className="arcana-select__item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                ) : null}
              </li>
            ))}
            {!filtered.length ? <li className="arcana-select__empty">{searchTerm.trim() ? msgs.noResults : msgs.noOptions}</li> : null}
          </ul>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
