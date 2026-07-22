import { describe, expect, it } from "vitest";
import {
  addMonths, daysInMonth, dayOfWeek, formatYm, formatYmd, isBetweenYmd, isLeapYear,
  monthGrid, parseYm, parseYmd, sortRange, toDisplayDate, toDisplayMonth
} from "../src/core/calendar";

describe("calendar core", () => {
  it("detects leap years including century rules", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
  });

  it("computes days in month with leap February", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("formats and strictly parses YYYY-MM-DD", () => {
    expect(formatYmd(2026, 1, 5)).toBe("2026-01-05");
    expect(parseYmd("2026-07-22")).toEqual({ year: 2026, month: 7, day: 22 });
    expect(parseYmd("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseYmd("2026-02-29")).toBeNull();
    expect(parseYmd("2026-13-01")).toBeNull();
    expect(parseYmd("2026-00-10")).toBeNull();
    expect(parseYmd("2026-1-5")).toBeNull();
    expect(parseYmd("")).toBeNull();
    expect(parseYmd(null)).toBeNull();
  });

  it("formats and parses YYYY-MM (tolerating a full date)", () => {
    expect(formatYm(2026, 3)).toBe("2026-03");
    expect(parseYm("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(parseYm("2026-03-15")).toEqual({ year: 2026, month: 3 });
    expect(parseYm("2026-13")).toBeNull();
    expect(parseYm("2026")).toBeNull();
    expect(parseYm("")).toBeNull();
  });

  it("navigates months across year boundaries", () => {
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 5, 12)).toEqual({ year: 2027, month: 5 });
    expect(addMonths(2026, 5, -12)).toEqual({ year: 2025, month: 5 });
    expect(addMonths(2026, 7, 0)).toEqual({ year: 2026, month: 7 });
  });

  it("builds a 6x7 grid aligned to Sunday with adjacent days flagged", () => {
    // July 1st 2026 is a Wednesday → grid starts on Sunday June 28th.
    expect(dayOfWeek(2026, 7, 1)).toBe(3);
    const grid = monthGrid(2026, 7);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toMatchObject({ ymd: "2026-06-28", inMonth: false });
    expect(grid[3]).toMatchObject({ ymd: "2026-07-01", inMonth: true });
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31);
    expect(grid[41]).toMatchObject({ ymd: "2026-08-08", inMonth: false });
  });

  it("starts exactly on day 1 when the month begins on a Sunday", () => {
    // February 1st 2026 is a Sunday.
    const grid = monthGrid(2026, 2);
    expect(grid[0]).toMatchObject({ ymd: "2026-02-01", inMonth: true });
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(28);
    expect(grid[28]).toMatchObject({ ymd: "2026-03-01", inMonth: false });
  });

  it("keeps 29 in-month cells for a leap February", () => {
    const grid = monthGrid(2024, 2);
    expect(grid).toHaveLength(42);
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(29);
    expect(grid.some((cell) => cell.ymd === "2024-02-29")).toBe(true);
  });

  it("converts canonical values to pt-BR display strings", () => {
    expect(toDisplayDate("2026-01-05")).toBe("05/01/2026");
    expect(toDisplayDate("")).toBe("");
    expect(toDisplayDate("invalid")).toBe("");
    expect(toDisplayMonth("2026-01")).toBe("01/2026");
    expect(toDisplayMonth("")).toBe("");
  });

  it("orders ranges and checks inclusive membership", () => {
    expect(sortRange("2026-05-10", "2026-05-01")).toEqual(["2026-05-01", "2026-05-10"]);
    expect(sortRange("2026-05-01", "2026-05-01")).toEqual(["2026-05-01", "2026-05-01"]);
    expect(isBetweenYmd("2026-05-05", "2026-05-01", "2026-05-10")).toBe(true);
    expect(isBetweenYmd("2026-05-01", "2026-05-01", "2026-05-10")).toBe(true);
    expect(isBetweenYmd("2026-05-11", "2026-05-01", "2026-05-10")).toBe(false);
  });
});
