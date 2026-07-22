import { describe, expect, it, vi } from "vitest";
import { createDataTable } from "../src";

type Person = { id: number; name: string; amount: number; _uuid?: string };

describe("DataTableController", () => {
  it("loads, filters and paginates through one framework-neutral API", async () => {
    const datasource = vi.fn(async () => ({ rows: [{ id: 1, name: "Ada", amount: 12 }], total: 21, page: 2 }));
    const grid = createDataTable<Person>({ columns: [{ name: "name", label: "Nome" }], datasource, rowsPerPage: 10 });
    grid.setFilter("person.name", "Ada");
    await grid.paginate(2, 10);
    expect(datasource).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada", page: 2, limit: 10 }));
    expect(grid.getRows()[0]).toMatchObject({ id: 1, name: "Ada" });
    expect(grid.totalRows).toBe(21);
  });

  it("keeps selection and summarization behavior", () => {
    const checked = vi.fn();
    const grid = createDataTable<Person>({ columns: [{ name: "amount", label: "Valor", type: "NUMBER" }], checkboxEnabled: true, onRowChecked: checked });
    grid.setRows([{ id: 1, name: "Ada", amount: 12 }, { id: 2, name: "Linus", amount: 8 }]);
    grid.toggleRow(grid.rows[0], true);
    expect(grid.getCheckedRows()).toHaveLength(1);
    expect(grid.getSummarizedValue(grid.getColumns()[0])).toEqual({ raw: 20, formatted: 20 });
    expect(checked).toHaveBeenCalledOnce();
  });

  it("runs pagination, rows-per-page, sorting and filtering locally in dataset mode", async () => {
    const remoteProvider = vi.fn();
    const dataset = [
      { id: 1, name: "Zelda", amount: 40 },
      { id: 2, name: "Ada", amount: 10 },
      { id: 3, name: "Grace", amount: 30 },
      { id: 4, name: "Alan", amount: 20 },
      { id: 5, name: "Linus", amount: 50 }
    ];
    const grid = createDataTable<Person>({
      dataset,
      datasource: remoteProvider,
      rowsPerPage: 2,
      columns: [
        { name: "name", label: "Nome" },
        { name: "amount", label: "Valor", type: "NUMBER" }
      ]
    });

    expect(grid.mode).toBe("dataset");
    expect(grid.datasetSize).toBe(5);
    expect(grid.totalRows).toBe(5);
    expect(grid.getRows().map((row) => row.id)).toEqual([1, 2]);

    await grid.paginate(2, 2);
    expect(grid.getRows().map((row) => row.id)).toEqual([3, 4]);

    await grid.paginate(1, 3);
    expect(grid.getRows().map((row) => row.id)).toEqual([1, 2, 3]);

    await grid.applyOrderBy({ name: "amount", direction: "asc" });
    expect(grid.currentPage).toBe(1);
    expect(grid.getRows().map((row) => row.amount)).toEqual([10, 20, 30]);

    await grid.applyFilter(grid.getColumns()[0], "a");
    expect(grid.totalRows).toBe(4);
    expect(grid.getRows().map((row) => row.name)).toEqual(["Ada", "Alan", "Grace"]);
    expect(remoteProvider).not.toHaveBeenCalled();
  });

  it("applies typed filters against the complete local dataset", async () => {
    type LocalRecord = Person & { status: string; active: boolean; issuedAt: string };
    const grid = createDataTable<LocalRecord>({
      mode: "dataset",
      dataset: [
        { id: 1, name: "Ada", amount: 10, status: "paid", active: true, issuedAt: "2026-01-10" },
        { id: 2, name: "Grace", amount: 20, status: "pending", active: false, issuedAt: "2026-02-15" },
        { id: 3, name: "Alan", amount: 30, status: "paid", active: true, issuedAt: "2026-03-20" }
      ],
      columns: [
        { name: "status", label: "Status", searchType: "LIST" },
        { name: "active", label: "Ativo", searchType: "BOOLEAN" },
        { name: "issuedAt", label: "Emissão", searchType: "DATE_RANGE" }
      ]
    });

    await grid.applyFilter(grid.getColumns()[0], ["paid"]);
    expect(grid.getRows().map((row) => row.id)).toEqual([1, 3]);
    await grid.setFilter("status", "");

    await grid.applyFilter(grid.getColumns()[1], "1");
    expect(grid.getRows().map((row) => row.id)).toEqual([1, 3]);
    await grid.setFilter("active", "");

    await grid.applyFilter(grid.getColumns()[2], ["2026-02-01", "2026-02-28"]);
    expect(grid.getRows().map((row) => row.id)).toEqual([2]);
  });

  it("keeps local selection and mutations across dataset pages", async () => {
    const grid = createDataTable<Person>({
      mode: "dataset",
      dataset: [
        { id: 1, name: "Ada", amount: 10 },
        { id: 2, name: "Grace", amount: 20 },
        { id: 3, name: "Alan", amount: 30 }
      ],
      rowsPerPage: 1,
      checkboxEnabled: true,
      columns: [{ name: "name", label: "Nome" }]
    });

    const selectedUuid = grid.getRows()[0]._uuid!;
    grid.toggleRow(grid.getRows()[0], true);
    await grid.paginate(2, 1);
    expect(grid.getCheckedRows().map((row) => row.id)).toEqual([1]);

    grid.updateRow(selectedUuid, { name: "Ada Lovelace" });
    grid.removeRow(grid.getRows()[0]._uuid!);
    grid.addRow({ id: 4, name: "Margaret", amount: 40 });
    expect(grid.getDataset().map((row) => row.name)).toEqual(["Ada Lovelace", "Alan", "Margaret"]);

    grid.setDataset([{ id: 9, name: "Nova", amount: 90 }]);
    expect(grid.getRows()).toHaveLength(1);
    expect(grid.totalRows).toBe(1);
  });

  it("requests a fresh remote block for every grid operation", async () => {
    const datasource = vi.fn(async (params: Record<string, unknown>) => ({
      rows: [{ id: Number(params.page), name: "Remote", amount: 1 }],
      total: 50,
      page: Number(params.page)
    }));
    const grid = createDataTable<Person>({
      mode: "remote",
      datasource,
      columns: [{ name: "name", label: "Nome" }, { name: "amount", label: "Valor" }]
    });

    await grid.refresh();
    await grid.setFilter("name", "Remote");
    await grid.setFilters({ name: "Ada" });
    await grid.applyOrderBy({ name: "amount", direction: "desc" });
    await grid.applyFilter(grid.getColumns()[0], "Ada");
    await grid.paginate(3, 25);

    expect(datasource).toHaveBeenCalledTimes(6);
    expect(datasource).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: "Remote" }));
    expect(datasource).toHaveBeenNthCalledWith(3, expect.objectContaining({ name: "Ada" }));
    expect(datasource).toHaveBeenNthCalledWith(4, expect.objectContaining({ "order_by[field]": "amount", "order_by[direction]": "desc" }));
    expect(datasource).toHaveBeenNthCalledWith(5, expect.objectContaining({ name: "Ada" }));
    expect(datasource).toHaveBeenNthCalledWith(6, expect.objectContaining({ page: 3, limit: 25 }));
    expect(grid.currentPage).toBe(3);
  });

  it("expands and collapses rows programmatically, collapsing everything on page changes", async () => {
    const expanded = vi.fn();
    const collapsed = vi.fn();
    const grid = createDataTable<Person>({
      mode: "dataset",
      dataset: [
        { id: 1, name: "Ada", amount: 10 },
        { id: 2, name: "Grace", amount: 20 },
        { id: 3, name: "Alan", amount: 30 }
      ],
      rowsPerPage: 2,
      columns: [{ name: "name", label: "Nome" }],
      expandableRowsEnabled: true,
      expandedRowRenderer: (row) => `Detalhes de ${row.name}`,
      onRowExpanded: expanded,
      onRowCollapsed: collapsed
    });

    const [first, second] = grid.getRows();
    grid.expandRow(first._uuid!);
    grid.expandRow(second._uuid!);
    grid.expandRow(second._uuid!); // idempotente
    expect(grid.getSnapshot().expandedRowUuids).toEqual([first._uuid, second._uuid]);
    expect(grid.getExpandedRows().map((row) => row.id)).toEqual([1, 2]);
    expect(expanded).toHaveBeenCalledTimes(2);

    grid.collapseRow(second._uuid!);
    expect(grid.getExpandedRows().map((row) => row.id)).toEqual([1]);
    expect(collapsed).toHaveBeenCalledOnce();

    await grid.paginate(2, 2);
    expect(grid.getSnapshot().expandedRowUuids).toEqual([]);
    expect(grid.getExpandedRows()).toEqual([]);

    await grid.paginate(1, 2);
    grid.expandRow(grid.getRows()[0]._uuid!);
    grid.setDataset([{ id: 9, name: "Nova", amount: 90 }]);
    expect(grid.getSnapshot().expandedRowUuids).toEqual([]);
  });
});
