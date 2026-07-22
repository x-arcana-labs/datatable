/**
 * Ambient module declaration so `vue-tsc --noEmit` (which does not understand
 * `.svelte` single-file components) can typecheck `src/svelte.ts`. The public
 * types are pinned explicitly in `src/svelte.ts`.
 */
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component<Record<string, any>, Record<string, any>>;
  export default component;
}
