/**
 * Svelte action that moves the node to `<body>`, mirroring the React
 * `createPortal(..., document.body)` / Vue `<Teleport to="body">` behavior of
 * the other adapters so the filter panels escape any `overflow: hidden`
 * ancestor. The node is removed when the block is destroyed.
 */
export function portal(node: HTMLElement): { destroy(): void } {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    }
  };
}
