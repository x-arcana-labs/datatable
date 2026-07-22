import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter,
  Input, OnDestroy, Output, ViewChild, inject
} from "@angular/core";
import {
  addMonths, formatYm, formatYmd,
  isBetweenYmd, monthGrid, parseYm, parseYmd, sortRange, toDisplayDate, toDisplayMonth,
  type CalendarDay
} from "../core/calendar";
import {
  arcanaMonthLabels, arcanaMonthLabelsShort, arcanaWeekdayLabels, getDefaultArcanaLocale,
  resolveArcanaMessages, type ArcanaLocale, type ArcanaMessages
} from "../core/locale";
import { placePanel } from "../core/popover";
import { arcanaThemeClassFrom } from "../core/theme";
import { ArcanaBodyPortalDirective } from "./body-portal.directive";

const PANEL_ESTIMATE = { date: { width: 252, height: 300 }, month: { width: 252, height: 210 }, range: { width: 520, height: 300 } };

/**
 * `ArcanaDatePicker` — shadcn-style date input with the hand-rolled calendar
 * popover (no external deps). Angular port of the React/Vue versions: same
 * `arcana-cal__*` classes and the same value formats (`date` → 'YYYY-MM-DD',
 * `month` → 'YYYY-MM', `range` → ['YYYY-MM-DD','YYYY-MM-DD']). All date math
 * lives in `core/calendar.ts`.
 */
@Component({
  selector: "div[arcanaDatePicker]",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArcanaBodyPortalDirective],
  host: {
    "class": "arcana-cal",
    "[class.arcana-cal--disabled]": "disabled"
  },
  template: `
    <button
      #trigger
      type="button"
      class="arcana-cal__input"
      [class.arcana-cal__input--open]="isOpen"
      [class.arcana-cal__input--has-clear]="canClear()"
      [disabled]="disabled"
      aria-haspopup="dialog"
      [attr.aria-expanded]="isOpen"
      [attr.aria-label]="ariaLabel"
      (click)="isOpen ? close() : open()"
    >
      <svg class="arcana-cal__input-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      <span class="arcana-cal__input-label" [class.arcana-cal__input-label--placeholder]="!hasValue()">{{ displayLabel() }}</span>
      @if (canClear()) {
        <span class="arcana-cal__clear" role="button" tabindex="-1" [attr.aria-label]="msg().clear" (click)="clear($event)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </span>
      }
    </button>

    @if (isOpen) {
      <div #panel arcanaBodyPortal class="arcana-cal__panel{{ mode === 'range' ? ' arcana-cal__panel--range' : '' }}{{ themeClass ? ' ' + themeClass : '' }}" [style]="panelStyle" role="dialog" [attr.aria-label]="ariaLabel" tabindex="-1" (keydown)="onPanelKeyDown($event)">
        <div class="arcana-cal__panels">
          @if (mode === "month") {
            <div class="arcana-cal__month-panel">
              <div class="arcana-cal__header">
                <button type="button" class="arcana-cal__nav" [attr.aria-label]="msg().prevYear" (click)="navigate(-12)">«</button>
                <span class="arcana-cal__title">{{ view.year }}</span>
                <button type="button" class="arcana-cal__nav" [attr.aria-label]="msg().nextYear" (click)="navigate(12)">»</button>
              </div>
              <div class="arcana-cal__months">
                @for (label of monthLabelsShort(); track label) {
                  <button type="button" [class]="monthClasses($index + 1)" (click)="pickMonth($index + 1)">{{ label }}</button>
                }
              </div>
            </div>
          } @else {
            @for (offset of panelOffsets(); track offset) {
              <div class="arcana-cal__month-panel">
                <div class="arcana-cal__header">
                  @if (mode !== "range" || offset === 0) {
                    <button type="button" class="arcana-cal__nav" [attr.aria-label]="msg().prevYear" (click)="navigate(-12)">«</button>
                    <button type="button" class="arcana-cal__nav" [attr.aria-label]="msg().prevMonth" (click)="navigate(-1)">‹</button>
                  } @else {
                    <span class="arcana-cal__nav-spacer"></span>
                  }
                  <span class="arcana-cal__title">{{ panelTitle(offset) }}</span>
                  @if (mode !== "range" || offset === 1) {
                    <button type="button" class="arcana-cal__nav" [attr.aria-label]="msg().nextMonth" (click)="navigate(1)">›</button>
                    <button type="button" class="arcana-cal__nav" [attr.aria-label]="msg().nextYear" (click)="navigate(12)">»</button>
                  } @else {
                    <span class="arcana-cal__nav-spacer"></span>
                  }
                </div>
                <div class="arcana-cal__weekdays">
                  @for (label of weekdayLabels(); track $index) {
                    <span class="arcana-cal__weekday">{{ label }}</span>
                  }
                </div>
                <div class="arcana-cal__grid">
                  @for (cell of panelCells(offset); track cell.ymd) {
                    <button
                      type="button"
                      [class]="dayClasses(cell)"
                      [attr.aria-label]="dayLabel(cell)"
                      (mouseenter)="onDayHover(cell)"
                      (click)="pickDay(cell.ymd)"
                    >{{ cell.day }}</button>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    }
  `
})
export class ArcanaDatePickerComponent implements OnDestroy {
  @Input() mode: "date" | "month" | "range" = "date";
  @Input() value: unknown;
  @Input() disabled = false;
  @Input() placeholder?: string;
  @Input() ariaLabel?: string;
  /** Resolved message table; defaults to the global default locale pack. */
  @Input() messages?: ArcanaMessages;
  /** Locale of the calendar display names (months/weekdays via Intl). */
  @Input() locale?: ArcanaLocale;
  @Output() valueChange = new EventEmitter<unknown>();

  @ViewChild("trigger") triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild("panel") panelRef?: ElementRef<HTMLDivElement>;

  msg(): ArcanaMessages {
    return this.messages ?? resolveArcanaMessages();
  }

  calLocale(): ArcanaLocale {
    return this.locale ?? getDefaultArcanaLocale();
  }

  monthLabelsShort(): readonly string[] {
    return arcanaMonthLabelsShort(this.calLocale());
  }

  weekdayLabels(): readonly string[] {
    return arcanaWeekdayLabels(this.calLocale());
  }

  isOpen = false;
  panelStyle = "";
  view = { year: 2000, month: 1 };
  pendingStart: string | null = null;
  hoverYmd: string | null = null;
  todayYmd = "";
  themeClass = "";

  private removeListeners: (() => void) | null = null;
  private readonly cdr = inject(ChangeDetectorRef);

  rangeValue(): [string, string] {
    if (this.mode !== "range") return ["", ""];
    const pair = Array.isArray(this.value) ? this.value : ["", ""];
    return [String(pair[0] ?? ""), String(pair[1] ?? "")];
  }

  singleValue(): string {
    return this.mode === "range" ? "" : String(this.value ?? "");
  }

  hasValue(): boolean {
    const range = this.rangeValue();
    return this.mode === "range" ? Boolean(range[0] || range[1]) : this.singleValue() !== "";
  }

  canClear(): boolean {
    return !this.disabled && this.hasValue();
  }

  displayLabel(): string {
    if (this.mode === "range") {
      const range = this.rangeValue();
      if (!this.hasValue()) return this.placeholder ?? this.msg().rangePlaceholder;
      return `${toDisplayDate(range[0]) || "…"} → ${toDisplayDate(range[1]) || "…"}`;
    }
    if (this.mode === "month") return toDisplayMonth(this.singleValue()) || (this.placeholder ?? this.msg().monthPlaceholder);
    return toDisplayDate(this.singleValue()) || (this.placeholder ?? this.msg().datePlaceholder);
  }

  panelOffsets(): number[] {
    return this.mode === "range" ? [0, 1] : [0];
  }

  panelTitle(offset: number): string {
    const panelMonth = addMonths(this.view.year, this.view.month, offset);
    return `${arcanaMonthLabels(this.calLocale())[panelMonth.month - 1]} ${panelMonth.year}`;
  }

  panelCells(offset: number): CalendarDay[] {
    const panelMonth = addMonths(this.view.year, this.view.month, offset);
    return monthGrid(panelMonth.year, panelMonth.month);
  }

  dayLabel(cell: CalendarDay): string {
    return toDisplayDate(cell.ymd);
  }

  onDayHover(cell: CalendarDay): void {
    if (this.mode === "range" && this.pendingStart) {
      this.hoverYmd = cell.ymd;
      this.cdr.markForCheck();
    }
  }

  private reposition(): void {
    const trigger = this.triggerRef?.nativeElement;
    const panel = this.panelRef?.nativeElement;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const estimate = PANEL_ESTIMATE[this.mode];
    const place = placePanel(rect, { width: panel.offsetWidth || estimate.width, height: panel.offsetHeight || estimate.height }, { width: window.innerWidth, height: window.innerHeight }, {});
    this.panelStyle = `position: fixed; left: ${place.left}px; top: ${place.top}px`;
    this.cdr.markForCheck();
  }

  open(): void {
    if (this.disabled || this.isOpen) return;
    const now = new Date();
    this.todayYmd = formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const anchor = this.mode === "range" ? parseYmd(this.rangeValue()[0]) : this.mode === "month" ? parseYm(this.singleValue()) : parseYmd(this.singleValue());
    this.view = anchor ? { year: anchor.year, month: anchor.month } : { year: now.getFullYear(), month: now.getMonth() + 1 };
    this.pendingStart = null;
    this.hoverYmd = null;
    const trigger = this.triggerRef?.nativeElement;
    // Portaled to <body>: repeat the theme class of the owning grid so the
    // panel resolves the same --arcana-* variables.
    this.themeClass = arcanaThemeClassFrom(trigger);
    const rect = trigger?.getBoundingClientRect();
    const estimate = PANEL_ESTIMATE[this.mode];
    if (rect) {
      const place = placePanel(rect, estimate, { width: window.innerWidth, height: window.innerHeight }, {});
      this.panelStyle = `position: fixed; left: ${place.left}px; top: ${place.top}px`;
    }
    this.isOpen = true;
    // Render synchronously so the panel exists before measuring/focusing.
    this.cdr.detectChanges();
    this.reposition();
    this.panelRef?.nativeElement?.focus({ preventScroll: true });
    this.attachListeners();
    this.cdr.markForCheck();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.pendingStart = null;
    this.hoverYmd = null;
    this.detachListeners();
    this.triggerRef?.nativeElement.focus({ preventScroll: true });
    this.cdr.markForCheck();
  }

  private attachListeners(): void {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (this.triggerRef?.nativeElement.contains(target) || this.panelRef?.nativeElement?.contains(target)) return;
      this.close();
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && this.panelRef?.nativeElement?.contains(event.target)) return;
      this.close();
    };
    const onResize = () => this.reposition();
    const onDocKeydown = (event: KeyboardEvent) => { if (event.key === "Escape") this.close(); };
    document.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onDocKeydown);
    this.removeListeners = () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onDocKeydown);
    };
  }

  private detachListeners(): void {
    this.removeListeners?.();
    this.removeListeners = null;
  }

  ngOnDestroy(): void {
    this.detachListeners();
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.valueChange.emit(this.mode === "range" ? ["", ""] : "");
  }

  pickDay(ymd: string): void {
    if (this.mode === "date") { this.valueChange.emit(ymd); this.close(); return; }
    if (!this.pendingStart) { this.pendingStart = ymd; this.hoverYmd = null; this.cdr.markForCheck(); return; }
    this.valueChange.emit(sortRange(this.pendingStart, ymd));
    this.close();
  }

  pickMonth(month: number): void {
    this.valueChange.emit(formatYm(this.view.year, month));
    this.close();
  }

  // Range highlight: while picking, preview from the anchored start to the
  // hovered day; otherwise show the committed value.
  private highlightRange(): [string, string] | null {
    if (this.mode !== "range") return null;
    if (this.pendingStart) return this.hoverYmd ? sortRange(this.pendingStart, this.hoverYmd) : [this.pendingStart, this.pendingStart];
    const range = this.rangeValue();
    return parseYmd(range[0]) && parseYmd(range[1]) ? [range[0], range[1]] : null;
  }

  navigate(deltaMonths: number): void {
    this.view = addMonths(this.view.year, this.view.month, deltaMonths);
    this.cdr.markForCheck();
  }

  onPanelKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); this.close(); }
  }

  dayClasses(cell: CalendarDay): string {
    const range = this.highlightRange();
    const inHighlight = Boolean(range && cell.inMonth && isBetweenYmd(cell.ymd, range[0], range[1]));
    const isEdge = Boolean(range && cell.inMonth && (cell.ymd === range[0] || cell.ymd === range[1]));
    const isSelected = this.mode === "date" ? cell.ymd === this.singleValue() : isEdge;
    const classes = ["arcana-cal__day"];
    if (!cell.inMonth) classes.push("arcana-cal__day--adjacent");
    if (cell.ymd === this.todayYmd) classes.push("arcana-cal__day--today");
    if (inHighlight && !isEdge) classes.push("arcana-cal__day--in-range");
    if (isSelected) classes.push("arcana-cal__day--selected");
    if (range && cell.ymd === range[0] && cell.inMonth) classes.push("arcana-cal__day--range-start");
    if (range && cell.ymd === range[1] && cell.inMonth) classes.push("arcana-cal__day--range-end");
    return classes.join(" ");
  }

  monthClasses(month: number): string {
    const selected = parseYm(this.singleValue());
    const now = parseYmd(this.todayYmd);
    const classes = ["arcana-cal__month"];
    if (selected && selected.year === this.view.year && selected.month === month) classes.push("arcana-cal__month--selected");
    if (now && now.year === this.view.year && now.month === month) classes.push("arcana-cal__month--today");
    return classes.join(" ");
  }
}
