import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter,
  Input, OnDestroy, Output, ViewChild, inject
} from "@angular/core";
import { formatMessage, resolveArcanaMessages, type ArcanaMessages } from "../core/locale";
import { placePanel } from "../core/popover";
import { arcanaThemeClassFrom } from "../core/theme";
import type { SearchOption } from "../core/types";
import { ArcanaBodyPortalDirective } from "./body-portal.directive";

/**
 * `ArcanaSelect` — shadcn-style select used by the grid filter row.
 *
 * Angular port of the React/Vue implementations: same `arcana-select__*`
 * classes, same popover placement math (`core/popover.ts`) and the same
 * behavior (panel portaled to <body>, auto-flip, multiple mode stays open,
 * clear emits "" / [], keyboard navigation, closes on outside click/Esc and
 * scrolling outside the panel).
 *
 * Attribute selector on a `div` so the rendered DOM matches the other
 * adapters (`<div class="arcana-select">…`).
 */
@Component({
  selector: "div[arcanaSelect]",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArcanaBodyPortalDirective],
  host: {
    "class": "arcana-select",
    "[class.arcana-select--disabled]": "disabled"
  },
  template: `
    <button
      #trigger
      type="button"
      class="arcana-select__trigger"
      [class.arcana-select__trigger--open]="isOpen"
      [class.arcana-select__trigger--has-clear]="canClear()"
      [disabled]="disabled"
      aria-haspopup="listbox"
      [attr.aria-expanded]="isOpen"
      [attr.aria-label]="ariaLabel"
      (click)="toggle()"
      (keydown)="onTriggerKeyDown($event)"
    >
      <span class="arcana-select__label" [class.arcana-select__label--placeholder]="!hasValue()">{{ displayLabel() }}</span>
      @if (canClear()) {
        <span class="arcana-select__clear" role="button" tabindex="-1" [attr.aria-label]="msg().clear" (click)="clear($event)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </span>
      }
      <svg class="arcana-select__caret" [class.is-open]="isOpen" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
    </button>

    @if (isOpen) {
      <div #panel arcanaBodyPortal class="arcana-select__panel {{ themeClass }}" [style]="panelStyle" role="listbox" [attr.aria-multiselectable]="multiple || null" tabindex="-1" (keydown)="onPanelKeyDown($event)">
        @if (searchable) {
          <div class="arcana-select__search">
            <svg class="arcana-select__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input #search type="search" class="arcana-select__search-input" [placeholder]="searchPlaceholderText()" [value]="searchTerm" autocomplete="off" spellcheck="false" (input)="onSearchInput($event)" />
          </div>
        }
        <ul class="arcana-select__list">
          @for (option of filtered(); track $index) {
            <li
              class="arcana-select__item"
              [class.is-selected]="isSelected(option)"
              [class.is-highlighted]="highlighted === $index"
              role="option"
              [attr.aria-selected]="isSelected(option)"
              (mouseenter)="highlighted = $index"
              (click)="selectOption(option)"
            >
              <span class="arcana-select__item-label">{{ option.label }}</span>
              @if (isSelected(option)) {
                <svg class="arcana-select__item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              }
            </li>
          }
          @if (!filtered().length) {
            <li class="arcana-select__empty">{{ searchTerm.trim() ? msg().noResults : msg().noOptions }}</li>
          }
        </ul>
      </div>
    }
  `
})
export class ArcanaSelectComponent implements OnDestroy {
  @Input() value: unknown;
  @Input() options: SearchOption[] = [];
  @Input() multiple = false;
  @Input() disabled = false;
  @Input() clearable = true;
  @Input() searchable = false;
  @Input() placeholder?: string;
  @Input() searchPlaceholder?: string;
  @Input() ariaLabel?: string;
  /** Resolved message table; defaults to the global default locale pack. */
  @Input() messages?: ArcanaMessages;
  @Output() valueChange = new EventEmitter<unknown>();

  msg(): ArcanaMessages {
    return this.messages ?? resolveArcanaMessages();
  }

  placeholderText(): string {
    return this.placeholder ?? this.msg().selectPlaceholder;
  }

  searchPlaceholderText(): string {
    return this.searchPlaceholder ?? this.msg().searchPlaceholder;
  }

  @ViewChild("trigger") triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild("panel") panelRef?: ElementRef<HTMLDivElement>;
  @ViewChild("search") searchRef?: ElementRef<HTMLInputElement>;

  isOpen = false;
  highlighted = -1;
  panelStyle = "";
  searchTerm = "";
  themeClass = "";

  private removeListeners: (() => void) | null = null;
  private readonly cdr = inject(ChangeDetectorRef);

  selectedValues(): string[] {
    return this.multiple && Array.isArray(this.value) ? this.value.map(String) : [];
  }

  hasValue(): boolean {
    return this.multiple ? this.selectedValues().length > 0 : this.value != null && this.value !== "";
  }

  canClear(): boolean {
    return this.clearable && !this.disabled && this.hasValue();
  }

  isSelected(option: SearchOption): boolean {
    return this.multiple
      ? this.selectedValues().includes(String(option.value))
      : this.hasValue() && String(this.value) === String(option.value);
  }

  filtered(): SearchOption[] {
    if (!this.searchable) return this.options;
    const needle = this.searchTerm.trim().toLowerCase();
    return needle ? this.options.filter((option) => option.label.toLowerCase().includes(needle)) : this.options;
  }

  displayLabel(): string {
    if (!this.hasValue()) return this.placeholderText();
    if (this.multiple) {
      const selected = this.selectedValues();
      const labels = this.options.filter((option) => selected.includes(String(option.value))).map((option) => option.label);
      if (labels.length === 0) return formatMessage(this.msg().selectedCountFallback, { count: selected.length });
      return labels.length === 1 ? labels[0] : formatMessage(this.msg().selectedItems, { count: labels.length });
    }
    return this.options.find((option) => String(option.value) === String(this.value))?.label ?? String(this.value);
  }

  private reposition(): void {
    const trigger = this.triggerRef?.nativeElement;
    const panel = this.panelRef?.nativeElement;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const place = placePanel(rect, { width: rect.width, height: panel.offsetHeight || 240 }, { width: window.innerWidth, height: window.innerHeight }, { matchWidth: true, maxHeight: 280 });
    this.panelStyle = `position: fixed; left: ${place.left}px; top: ${place.top}px; width: ${place.width}px; max-height: ${place.maxHeight}px`;
    this.cdr.markForCheck();
  }

  open(): void {
    if (this.disabled || this.isOpen) return;
    const trigger = this.triggerRef?.nativeElement;
    // Pre-place with the trigger rect BEFORE the panel mounts so the first
    // measurement happens at the final width.
    const rect = trigger?.getBoundingClientRect();
    if (rect) this.panelStyle = `position: fixed; left: ${rect.left}px; width: ${rect.width}px; top: ${rect.bottom + 4}px; max-height: 280px`;
    // Portaled to <body>: repeat the theme class of the owning grid so the
    // panel resolves the same --arcana-* variables.
    this.themeClass = arcanaThemeClassFrom(trigger);
    this.searchTerm = "";
    this.isOpen = true;
    // Render synchronously so the panel exists before measuring/focusing.
    this.cdr.detectChanges();
    this.reposition();
    const current = this.filtered().findIndex((option) => this.isSelected(option));
    this.highlighted = current >= 0 ? current : this.filtered().length ? 0 : -1;
    (this.searchable ? this.searchRef?.nativeElement : this.panelRef?.nativeElement)?.focus({ preventScroll: true });
    this.attachListeners();
    this.cdr.markForCheck();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.searchTerm = "";
    this.detachListeners();
    this.triggerRef?.nativeElement.focus({ preventScroll: true });
    this.cdr.markForCheck();
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
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
    document.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    this.removeListeners = () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }

  private detachListeners(): void {
    this.removeListeners?.();
    this.removeListeners = null;
  }

  ngOnDestroy(): void {
    this.detachListeners();
  }

  onSearchInput(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.reposition();
  }

  selectOption(option: SearchOption): void {
    if (this.multiple) {
      const selected = this.selectedValues();
      const next = selected.includes(String(option.value))
        ? selected.filter((item) => item !== String(option.value))
        : [...selected, String(option.value)];
      this.valueChange.emit(next);
      return; // stays open in multiple mode
    }
    this.valueChange.emit(option.value);
    this.close();
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.valueChange.emit(this.multiple ? [] : "");
  }

  private moveHighlight(delta: 1 | -1): void {
    const length = this.filtered().length;
    if (!length) return;
    this.highlighted = ((this.highlighted < 0 ? (delta > 0 ? -1 : 0) : this.highlighted) + delta + length) % length;
    requestAnimationFrame(() => {
      this.panelRef?.nativeElement?.querySelector(".arcana-select__item.is-highlighted")?.scrollIntoView({ block: "nearest" });
    });
    this.cdr.markForCheck();
  }

  onTriggerKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      this.open();
    }
  }

  onPanelKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); this.close(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); this.moveHighlight(1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); this.moveHighlight(-1); return; }
    if (event.key === "Enter" || (event.key === " " && !this.searchable)) {
      event.preventDefault();
      const option = this.filtered()[this.highlighted];
      if (option) this.selectOption(option);
      return;
    }
    if (event.key === "Home" && !this.searchable) { event.preventDefault(); this.highlighted = this.filtered().length ? 0 : -1; return; }
    if (event.key === "End" && !this.searchable) { event.preventDefault(); this.highlighted = this.filtered().length - 1; }
  }
}
