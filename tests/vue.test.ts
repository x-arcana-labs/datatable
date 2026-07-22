import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ArcanaDataTable } from "../src/vue";

describe("Vue adapter", () => {
  it("renders rows and preserves the exposed SparkGrid methods", async () => {
    const checked = vi.fn();
    const selectionStyle = vi.fn(() => ({ background: "#e2f4ed" }));
    const wrapper = mount(ArcanaDataTable, { props: { config: { sendRequestOnMounted: false, checkboxEnabled: true, rowFocusEnabled: true, cellFocusEnabled: true, columns: [{ name: "name", label: "Nome" }], onRowChecked: checked, onBeforeCheckboxAndRadioButtonStyleMounted: selectionStyle } } });
    wrapper.vm.setRows([{ id: 1, name: "Ada" }]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Ada");
    await wrapper.find('.grid-cell:not(.spark-grid-selection-cell)').trigger("click");
    expect(wrapper.find(".grid-body .grid-row").classes()).toContain("grid-row-focused");
    expect(wrapper.find('.grid-cell:not(.spark-grid-selection-cell)').classes()).toContain("grid-cell-focused");
    expect(selectionStyle).toHaveBeenCalled();
    await wrapper.find('input[aria-label="Selecionar linha"]').setValue(true);
    expect(checked).toHaveBeenCalledOnce();
  });

  it("renders the expander chevron and toggles a sync detail area", async () => {
    const wrapper = mount(ArcanaDataTable, { props: { config: {
      mode: "dataset", dataset: [{ id: 1, name: "Ada" }], searchEnabled: false,
      columns: [{ name: "name", label: "Nome" }],
      expandableRowsEnabled: true,
      expandedRowRenderer: (row) => `<em>Detalhes de ${row.name}</em>`
    } } });
    await wrapper.vm.$nextTick();
    const toggle = wrapper.find('button[aria-label="Expandir detalhes"]');
    expect(toggle.exists()).toBe(true);
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(wrapper.find(".grid-detail-cell").text()).toContain("Detalhes de Ada");
    expect(wrapper.find('button[aria-label="Recolher detalhes"]').attributes("aria-expanded")).toBe("true");
    await wrapper.find('button[aria-label="Recolher detalhes"]').trigger("click");
    expect(wrapper.find(".grid-detail-row").exists()).toBe(false);
    wrapper.vm.expandRow(wrapper.vm.getRows()[0]._uuid!);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".grid-detail-cell").text()).toContain("Detalhes de Ada");
    expect(wrapper.vm.getExpandedRows()).toHaveLength(1);
    wrapper.vm.collapseRow(wrapper.vm.getRows()[0]._uuid!);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".grid-detail-row").exists()).toBe(false);
  });

  it("shows the built-in loading state until the async renderer resolves", async () => {
    let resolveDetail!: (value: unknown) => void;
    const wrapper = mount(ArcanaDataTable, { props: { config: {
      mode: "dataset", dataset: [{ id: 1, name: "Ada" }], searchEnabled: false,
      columns: [{ name: "name", label: "Nome" }],
      expandableRowsEnabled: true,
      expandedRowRenderer: () => new Promise((resolve) => { resolveDetail = resolve; })
    } } });
    await wrapper.vm.$nextTick();
    await wrapper.find('button[aria-label="Expandir detalhes"]').trigger("click");
    expect(wrapper.find(".grid-detail-loading").exists()).toBe(true);
    expect(wrapper.find(".grid-detail-cell").text()).toContain("Carregando detalhes…");
    resolveDetail("<strong>Conteúdo async</strong>");
    await new Promise((resolve) => setTimeout(resolve));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".grid-detail-cell").text()).toContain("Conteúdo async");
    expect(wrapper.find(".grid-detail-loading").exists()).toBe(false);
  });

  it("localizes the built-in strings with locale: 'en' and honors messages overrides", async () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, name: `Person ${index + 1}` }));
    const wrapper = mount(ArcanaDataTable, { props: { config: {
      mode: "dataset", dataset: rows, rowsPerPage: 5, locale: "en", checkboxEnabled: true,
      actions: [{ element: () => "<button>Go</button>" }],
      columns: [{ name: "name", label: "Name" }]
    } } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spark-grid__info").text()).toBe("Showing 1 to 5 of 7");
    expect(wrapper.find(".spark-grid__per-page").text()).toContain("Per page:");
    expect(wrapper.find(".grid-header").text()).toContain("Actions");
    expect(wrapper.find('input[aria-label="Select all"]').exists()).toBe(true);
    expect(wrapper.find('input[aria-label="Filter Name"]').exists()).toBe(true);
    await wrapper.find(".grid-header-cell.grid-header-order").trigger("click");
    const sortMenu = wrapper.find(".arcana-sort-menu");
    expect(sortMenu.attributes("aria-label")).toBe("Sorting");
    expect(sortMenu.text()).toContain("Ascending");
    expect(sortMenu.text()).toContain("Descending");

    const custom = mount(ArcanaDataTable, { props: { config: {
      mode: "dataset", dataset: [], searchEnabled: false, locale: "en",
      messages: { empty: "Nothing to see here" },
      columns: [{ name: "name", label: "Name" }]
    } } });
    await custom.vm.$nextTick();
    expect(custom.find(".arcana-grid-status").text()).toBe("Nothing to see here");
  });
});
