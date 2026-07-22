<script lang="ts">
  /**
   * Renders a `Renderable` exactly like the React/Vue `Content` helpers:
   * - function → invoked (lazily) and the result rendered;
   * - string → rendered as HTML inside a `<span>`;
   * - number/boolean → rendered as text inside a `<span>`;
   * - DOM `Node` → appended as-is (the Svelte-friendly escape hatch for
   *   "component" content: build the node imperatively and return it);
   * - `null`/`undefined` → nothing.
   */
  import type { Renderable } from "../core/types";

  let { value }: { value: Renderable } = $props();

  const resolved = $derived(typeof value === "function" ? (value as () => Renderable)() : value);

  function mountNode(host: HTMLElement, node: Node) {
    host.appendChild(node);
    return {
      update(next: Node) {
        host.replaceChildren(next);
      },
      destroy() {
        host.replaceChildren();
      }
    };
  }
</script>

{#if resolved == null}{:else if typeof resolved === "string"}<span>{@html resolved}</span>{:else if typeof resolved === "number" || typeof resolved === "boolean"}<span>{String(resolved)}</span>{:else if typeof Node !== "undefined" && resolved instanceof Node}<span use:mountNode={resolved}></span>{:else}<span>{String(resolved)}</span>{/if}
