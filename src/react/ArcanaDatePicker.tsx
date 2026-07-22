import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/**
 * `ArcanaDatePicker` — shadcn-style date input with a hand-rolled calendar
 * popover mimicking the Element Plus date picker UX (no external deps).
 *
 * Modes and emitted value formats (the grid controller filters by these):
 * - `date`  → `'YYYY-MM-DD'` (clear → `''`)
 * - `month` → `'YYYY-MM'` 12-month 4×3 panel (clear → `''`)
 * - `range` → `['YYYY-MM-DD', 'YYYY-MM-DD']` double-month panel with hover
 *   preview; first click anchors the start, second click applies (clear → `['','']`)
 *
 * All date math lives in `core/calendar.ts`; classes are `arcana-cal__*` and
 * shared verbatim with the Vue adapter.
 */
export interface ArcanaDatePickerProps {
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
}

const PANEL_ESTIMATE = { date: { width: 252, height: 300 }, month: { width: 252, height: 210 }, range: { width: 520, height: 300 } };

export function ArcanaDatePicker({ mode, value, onChange, disabled = false, placeholder, ariaLabel, messages, locale }: ArcanaDatePickerProps) {
  const msgs = messages ?? resolveArcanaMessages();
  const calLocale = locale ?? getDefaultArcanaLocale();
  const monthLabels = arcanaMonthLabels(calLocale);
  const monthLabelsShort = arcanaMonthLabelsShort(calLocale);
  const weekdayLabels = arcanaWeekdayLabels(calLocale);
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [view, setView] = useState({ year: 2000, month: 1 });
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverYmd, setHoverYmd] = useState<string | null>(null);
  const [todayYmd, setTodayYmd] = useState("");
  const [themeClass, setThemeClass] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const rangeValue = useMemo<[string, string]>(() => {
    if (mode !== "range") return ["", ""];
    const pair = Array.isArray(value) ? value : ["", ""];
    return [String(pair[0] ?? ""), String(pair[1] ?? "")];
  }, [mode, value]);
  const singleValue = mode === "range" ? "" : String(value ?? "");

  const hasValue = mode === "range" ? Boolean(rangeValue[0] || rangeValue[1]) : singleValue !== "";
  const canClear = !disabled && hasValue;

  const displayLabel = useMemo(() => {
    if (mode === "range") {
      if (!hasValue) return placeholder ?? msgs.rangePlaceholder;
      return `${toDisplayDate(rangeValue[0]) || "…"} → ${toDisplayDate(rangeValue[1]) || "…"}`;
    }
    if (mode === "month") return toDisplayMonth(singleValue) || (placeholder ?? msgs.monthPlaceholder);
    return toDisplayDate(singleValue) || (placeholder ?? msgs.datePlaceholder);
  }, [mode, hasValue, placeholder, rangeValue, singleValue, msgs]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const estimate = PANEL_ESTIMATE[mode];
    const place = placePanel(rect, { width: panel.offsetWidth || estimate.width, height: panel.offsetHeight || estimate.height }, { width: window.innerWidth, height: window.innerHeight }, {});
    setPanelStyle({ position: "fixed", left: place.left, top: place.top });
  }, [mode]);

  const open = () => {
    if (disabled || isOpen) return;
    const now = new Date();
    const today = formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    setTodayYmd(today);
    const anchor = mode === "range" ? parseYmd(rangeValue[0]) : mode === "month" ? parseYm(singleValue) : parseYmd(singleValue);
    setView(anchor ? { year: anchor.year, month: anchor.month } : { year: now.getFullYear(), month: now.getMonth() + 1 });
    setPendingStart(null);
    setHoverYmd(null);
    // Portaled to <body>: repeat the theme class of the owning grid so the
    // panel resolves the same --arcana-* variables.
    setThemeClass(arcanaThemeClassFrom(triggerRef.current));
    const rect = triggerRef.current?.getBoundingClientRect();
    const estimate = PANEL_ESTIMATE[mode];
    if (rect) {
      const place = placePanel(rect, estimate, { width: window.innerWidth, height: window.innerHeight }, {});
      setPanelStyle({ position: "fixed", left: place.left, top: place.top });
    }
    setIsOpen(true);
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setPendingStart(null);
    setHoverYmd(null);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => { if (isOpen) reposition(); }, [isOpen, reposition]);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus({ preventScroll: true });
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
  }, [isOpen, close, reposition]);

  const clear = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    onChange(mode === "range" ? ["", ""] : "");
  };

  const pickDay = (ymd: string) => {
    if (mode === "date") { onChange(ymd); close(); return; }
    if (!pendingStart) { setPendingStart(ymd); setHoverYmd(null); return; }
    onChange(sortRange(pendingStart, ymd));
    close();
  };

  const pickMonth = (month: number) => {
    onChange(formatYm(view.year, month));
    close();
  };

  // Range highlight: while picking, preview from the anchored start to the
  // hovered day; otherwise show the committed value.
  const highlightRange = useMemo<[string, string] | null>(() => {
    if (mode !== "range") return null;
    if (pendingStart) return hoverYmd ? sortRange(pendingStart, hoverYmd) : [pendingStart, pendingStart];
    return parseYmd(rangeValue[0]) && parseYmd(rangeValue[1]) ? [rangeValue[0], rangeValue[1]] : null;
  }, [mode, pendingStart, hoverYmd, rangeValue]);

  const navigate = (deltaMonths: number) => setView((current) => addMonths(current.year, current.month, deltaMonths));

  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); }
  };

  const navButton = (label: string, aria: string, delta: number) => (
    <button type="button" className="arcana-cal__nav" aria-label={aria} onClick={() => navigate(delta)}>{label}</button>
  );

  const renderDaysPanel = (offset: number) => {
    const panelMonth = addMonths(view.year, view.month, offset);
    const cells = monthGrid(panelMonth.year, panelMonth.month);
    const isRange = mode === "range";
    return (
      <div className="arcana-cal__month-panel" key={offset}>
        <div className="arcana-cal__header">
          {(!isRange || offset === 0) ? <>{navButton("«", msgs.prevYear, -12)}{navButton("‹", msgs.prevMonth, -1)}</> : <span className="arcana-cal__nav-spacer" />}
          <span className="arcana-cal__title">{monthLabels[panelMonth.month - 1]} {panelMonth.year}</span>
          {(!isRange || offset === 1) ? <>{navButton("›", msgs.nextMonth, 1)}{navButton("»", msgs.nextYear, 12)}</> : <span className="arcana-cal__nav-spacer" />}
        </div>
        <div className="arcana-cal__weekdays">
          {weekdayLabels.map((label, index) => <span key={index} className="arcana-cal__weekday">{label}</span>)}
        </div>
        <div className="arcana-cal__grid">
          {cells.map((cell) => {
            const inHighlight = Boolean(highlightRange && cell.inMonth && isBetweenYmd(cell.ymd, highlightRange[0], highlightRange[1]));
            const isEdge = Boolean(highlightRange && cell.inMonth && (cell.ymd === highlightRange[0] || cell.ymd === highlightRange[1]));
            const isSelected = mode === "date" ? cell.ymd === singleValue : isEdge;
            const classes = ["arcana-cal__day"];
            if (!cell.inMonth) classes.push("arcana-cal__day--adjacent");
            if (cell.ymd === todayYmd) classes.push("arcana-cal__day--today");
            if (inHighlight && !isEdge) classes.push("arcana-cal__day--in-range");
            if (isSelected) classes.push("arcana-cal__day--selected");
            if (highlightRange && cell.ymd === highlightRange[0] && cell.inMonth) classes.push("arcana-cal__day--range-start");
            if (highlightRange && cell.ymd === highlightRange[1] && cell.inMonth) classes.push("arcana-cal__day--range-end");
            return (
              <button
                key={cell.ymd}
                type="button"
                className={classes.join(" ")}
                aria-label={toDisplayDate(cell.ymd)}
                onMouseEnter={isRange && pendingStart ? () => setHoverYmd(cell.ymd) : undefined}
                onClick={() => pickDay(cell.ymd)}
              >{cell.day}</button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthsPanel = () => {
    const selected = parseYm(singleValue);
    const now = parseYmd(todayYmd);
    return (
      <div className="arcana-cal__month-panel">
        <div className="arcana-cal__header">
          {navButton("«", msgs.prevYear, -12)}
          <span className="arcana-cal__title">{view.year}</span>
          {navButton("»", msgs.nextYear, 12)}
        </div>
        <div className="arcana-cal__months">
          {monthLabelsShort.map((label, index) => {
            const month = index + 1;
            const classes = ["arcana-cal__month"];
            if (selected && selected.year === view.year && selected.month === month) classes.push("arcana-cal__month--selected");
            if (now && now.year === view.year && now.month === month) classes.push("arcana-cal__month--today");
            return <button key={label} type="button" className={classes.join(" ")} onClick={() => pickMonth(month)}>{label}</button>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`arcana-cal${disabled ? " arcana-cal--disabled" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`arcana-cal__input${isOpen ? " arcana-cal__input--open" : ""}${canClear ? " arcana-cal__input--has-clear" : ""}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => (isOpen ? close() : open())}
      >
        <svg className="arcana-cal__input-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <span className={`arcana-cal__input-label${hasValue ? "" : " arcana-cal__input-label--placeholder"}`}>{displayLabel}</span>
        {canClear ? (
          <span className="arcana-cal__clear" role="button" tabIndex={-1} aria-label={msgs.clear} onClick={clear}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </span>
        ) : null}
      </button>

      {isOpen ? createPortal(
        <div ref={panelRef} className={`arcana-cal__panel${mode === "range" ? " arcana-cal__panel--range" : ""}${themeClass ? ` ${themeClass}` : ""}`} style={panelStyle} role="dialog" aria-label={ariaLabel} tabIndex={-1} onKeyDown={onPanelKeyDown}>
          <div className="arcana-cal__panels">
            {mode === "month" ? renderMonthsPanel() : mode === "range" ? <>{renderDaysPanel(0)}{renderDaysPanel(1)}</> : renderDaysPanel(0)}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
