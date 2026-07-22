/**
 * Pure date helpers backing the arcana calendar filter controls.
 *
 * Everything here is deterministic (no Date.now / new Date() without args) so
 * the grid building, parsing and formatting can be unit tested. Components are
 * responsible for providing "today" at runtime.
 *
 * Conventions:
 * - Months are 1-based (1 = January) everywhere in this module.
 * - Canonical wire formats: `YYYY-MM-DD` (date) and `YYYY-MM` (month).
 * - Weeks start on Sunday, mirroring the Element Plus pt-BR date picker.
 */

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
  /** Canonical `YYYY-MM-DD` value for the cell. */
  ymd: string;
  /** False for leading/trailing days that belong to adjacent months. */
  inMonth: boolean;
}

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

export const MONTH_LABELS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
] as const;

const pad2 = (value: number): string => String(value).padStart(2, "0");

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

export function formatYm(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}`;
}

/** Strict `YYYY-MM-DD` parser. Returns null for anything invalid (e.g. 2026-02-30). */
export function parseYmd(value: unknown): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Parses `YYYY-MM` (also tolerates a full `YYYY-MM-DD`, truncating the day). */
export function parseYm(value: unknown): { year: number; month: number } | null {
  const raw = String(value ?? "");
  const match = /^(\d{4})-(\d{2})/.exec(raw);
  if (!match || !/^\d{4}-\d{2}(-\d{2})?$/.test(raw)) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** Month arithmetic that carries over years; `delta` may be negative. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/** Day of week (0 = Sunday) for a calendar date, via UTC to stay TZ-independent. */
export function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Builds the 6×7 (42 cells) grid for a month, Sunday-first, padding the first
 * and last weeks with the adjacent months' days (marked `inMonth: false`).
 * When day 1 falls on a Sunday the grid starts exactly on day 1.
 */
export function monthGrid(year: number, month: number): CalendarDay[] {
  const lead = dayOfWeek(year, month, 1);
  const cells: CalendarDay[] = [];
  for (let index = 0; index < 42; index++) {
    const date = new Date(Date.UTC(year, month - 1, 1 - lead + index));
    const cellYear = date.getUTCFullYear();
    const cellMonth = date.getUTCMonth() + 1;
    const cellDay = date.getUTCDate();
    cells.push({
      year: cellYear,
      month: cellMonth,
      day: cellDay,
      ymd: formatYmd(cellYear, cellMonth, cellDay),
      inMonth: cellYear === year && cellMonth === month
    });
  }
  return cells;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY` for display; empty/invalid input yields "". */
export function toDisplayDate(ymd: unknown): string {
  const parsed = parseYmd(ymd);
  return parsed ? `${pad2(parsed.day)}/${pad2(parsed.month)}/${parsed.year}` : "";
}

/** `YYYY-MM` → `MM/YYYY` for display; empty/invalid input yields "". */
export function toDisplayMonth(ym: unknown): string {
  const parsed = parseYm(ym);
  return parsed ? `${pad2(parsed.month)}/${parsed.year}` : "";
}

/** Lexicographic compare works for canonical `YYYY-MM-DD` strings. */
export function compareYmd(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Inclusive range check over canonical `YYYY-MM-DD` strings. */
export function isBetweenYmd(ymd: string, start: string, end: string): boolean {
  return compareYmd(ymd, start) >= 0 && compareYmd(ymd, end) <= 0;
}

/** Orders a pair of `YYYY-MM-DD` strings ascending (range clicks can be inverted). */
export function sortRange(a: string, b: string): [string, string] {
  return compareYmd(a, b) <= 0 ? [a, b] : [b, a];
}
