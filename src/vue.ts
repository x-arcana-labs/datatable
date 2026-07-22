import type { App, Plugin } from "vue";
import { configureDataTable } from "./core/config";
import type { ArcanaDataTableOptions } from "./core/types";
import ArcanaDataTableComponent from "./vue/ArcanaDataTable.vue";

export const ArcanaDataTable = ArcanaDataTableComponent;
export const SparkGrid = ArcanaDataTableComponent;

export const ArcanaDataTablePlugin: Plugin = {
  install(app: App, options: ArcanaDataTableOptions = {}) {
    configureDataTable(options);
    app.component("ArcanaDataTable", ArcanaDataTableComponent);
    app.component("SparkGrid", ArcanaDataTableComponent);
  }
};

export default ArcanaDataTablePlugin;
export * from "./index";

