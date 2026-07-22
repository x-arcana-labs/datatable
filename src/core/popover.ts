/**
 * Shared placement math for the arcana filter popovers (select and calendar).
 *
 * Panels are rendered in a portal on <body> with `position: fixed`, so the
 * placement is computed from the trigger's `getBoundingClientRect()`. Keeping
 * the math here guarantees the React and Vue adapters position identically.
 */

export interface AnchorRect {
  left: number;
  top: number;
  bottom: number;
  width: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface PanelPlacement {
  left: number;
  top: number;
  width?: number;
  maxHeight?: number;
  flipUp: boolean;
}

export interface PlacePanelOptions {
  /** Match the trigger width (selects). When false the panel keeps its natural width (calendars). */
  matchWidth?: boolean;
  /** Cap for the panel height; also produces a `maxHeight` clamped to the available space. */
  maxHeight?: number;
  /** Gap between trigger and panel. Defaults to 4. */
  gap?: number;
}

const EDGE = 8;

export function placePanel(anchor: AnchorRect, panel: PanelSize, viewport: ViewportSize, options: PlacePanelOptions = {}): PanelPlacement {
  const gap = options.gap ?? 4;
  const width = options.matchWidth ? anchor.width : panel.width;
  const left = Math.max(EDGE, Math.min(anchor.left, viewport.width - width - EDGE));

  const spaceBelow = viewport.height - anchor.bottom;
  const spaceAbove = anchor.top;
  const flipUp = spaceBelow < panel.height + EDGE * 2 && spaceAbove > spaceBelow;

  const placement: PanelPlacement = {
    left,
    top: flipUp ? Math.max(EDGE, anchor.top - panel.height - gap) : anchor.bottom + gap,
    flipUp
  };

  if (options.matchWidth) placement.width = width;
  if (options.maxHeight != null) {
    placement.maxHeight = Math.max(64, Math.min(options.maxHeight, (flipUp ? spaceAbove : spaceBelow) - EDGE * 2));
  }
  return placement;
}
