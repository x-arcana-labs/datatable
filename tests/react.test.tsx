import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DataTableApi } from "../src";
import { ArcanaDataTable } from "../src/react";

describe("React adapter", () => {
  it("renders rows and exposes the imperative grid API", () => {
    const checked = vi.fn();
    const selectionStyle = vi.fn(() => ({ background: "#e2f4ed" }));
    const ref = createRef<DataTableApi>();
    const { container } = render(<ArcanaDataTable ref={ref} config={{ sendRequestOnMounted: false, searchEnabled: false, checkboxEnabled: true, rowFocusEnabled: true, cellFocusEnabled: true, columns: [{ name: "name", label: "Nome" }], datasource: () => [{ id: 1, name: "Ada" }], onRowChecked: checked, onBeforeCheckboxAndRadioButtonStyleMounted: selectionStyle }} />);
    act(() => { ref.current?.setRows([{ id: 1, name: "Ada" }]); });
    expect(screen.getByText("Ada")).toBeTruthy();
    fireEvent.click(screen.getByText("Ada"));
    expect(container.querySelector(".grid-body .grid-row")?.classList.contains("grid-row-focused")).toBe(true);
    expect(screen.getByText("Ada").closest(".grid-cell")?.classList.contains("grid-cell-focused")).toBe(true);
    expect(selectionStyle).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Selecionar linha"));
    expect(checked).toHaveBeenCalledOnce();
  });

  it("renders the expander chevron and toggles a sync detail area", () => {
    const ref = createRef<DataTableApi>();
    render(<ArcanaDataTable ref={ref} config={{
      mode: "dataset", dataset: [{ id: 1, name: "Ada" }], searchEnabled: false,
      columns: [{ name: "name", label: "Nome" }],
      expandableRowsEnabled: true,
      expandedRowRenderer: (row) => <div>Detalhes de {String(row.name)}</div>
    }} />);
    const toggle = screen.getByLabelText("Expandir detalhes");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByText("Detalhes de Ada")).toBeTruthy();
    expect(screen.getByLabelText("Recolher detalhes").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByLabelText("Recolher detalhes"));
    expect(screen.queryByText("Detalhes de Ada")).toBeNull();
    act(() => { ref.current?.expandRow(ref.current.getRows()[0]._uuid!); });
    expect(screen.getByText("Detalhes de Ada")).toBeTruthy();
    expect(ref.current?.getExpandedRows()).toHaveLength(1);
    act(() => { ref.current?.collapseRow(ref.current.getRows()[0]._uuid!); });
    expect(screen.queryByText("Detalhes de Ada")).toBeNull();
  });

  it("shows the built-in loading state until the async renderer resolves", async () => {
    let resolveDetail!: (value: unknown) => void;
    render(<ArcanaDataTable config={{
      mode: "dataset", dataset: [{ id: 1, name: "Ada" }], searchEnabled: false,
      columns: [{ name: "name", label: "Nome" }],
      expandableRowsEnabled: true,
      expandedRowRenderer: () => new Promise((resolve) => { resolveDetail = resolve; })
    }} />);
    fireEvent.click(screen.getByLabelText("Expandir detalhes"));
    expect(screen.getByText("Carregando detalhes…")).toBeTruthy();
    await act(async () => { resolveDetail("<strong>Conteúdo async</strong>"); });
    expect(screen.getByText("Conteúdo async")).toBeTruthy();
    expect(screen.queryByText("Carregando detalhes…")).toBeNull();
  });

  it("localizes the built-in strings with locale: 'en' and opens an English sort menu", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Person ${index + 1}` }));
    const { container } = render(<ArcanaDataTable config={{
      mode: "dataset", dataset: rows, rowsPerPage: 5, locale: "en",
      checkboxEnabled: true, actions: [{ element: () => "<button>Go</button>" }],
      columns: [{ name: "name", label: "Name" }]
    }} />);
    expect(screen.getByText("Showing 1 to 5 of 12")).toBeTruthy();
    expect(container.querySelector(".spark-grid__per-page")?.textContent).toContain("Per page:");
    expect(screen.getByText("Actions")).toBeTruthy();
    expect(screen.getByLabelText("Select all")).toBeTruthy();
    expect(screen.getByLabelText("Pagination")).toBeTruthy();
    expect(screen.getByLabelText("Previous page")).toBeTruthy();
    expect(screen.getByLabelText("Filter Name")).toBeTruthy();
    fireEvent.click(container.querySelector(".grid-header-cell.grid-header-order")!);
    const sortMenu = container.querySelector(".arcana-sort-menu")!;
    expect(sortMenu.getAttribute("aria-label")).toBe("Sorting");
    const labels = Array.from(sortMenu.querySelectorAll("button")).map((button) => button.textContent?.trim());
    expect(labels).toEqual(["Ascending", "Descending"]);
  });

  it("lets messages override any single string on top of a locale pack", () => {
    render(<ArcanaDataTable config={{
      mode: "dataset", dataset: [], searchEnabled: false, locale: "en",
      messages: { empty: "Nothing to see here", showingRange: "✦ {from}-{to}/{total}" },
      columns: [{ name: "name", label: "Name" }]
    }} />);
    expect(screen.getByText("Nothing to see here")).toBeTruthy();
    // messages.empty wins over the locale pack; without it the pack string is shown
    render(<ArcanaDataTable config={{
      mode: "dataset", dataset: [], searchEnabled: false, locale: "en",
      columns: [{ name: "name", label: "Name" }]
    }} />);
    expect(screen.getByText("No records found.")).toBeTruthy();
  });
});
