import { useCallback } from 'react'
import { useBoardStore } from '../store/board'

export interface ViewportTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  transform: ViewportTransform,
): { x: number; y: number } {
  return {
    x: (screenX - transform.panX) / transform.zoom,
    y: (screenY - transform.panY) / transform.zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  transform: ViewportTransform,
): { x: number; y: number } {
  return {
    x: worldX * transform.zoom + transform.panX,
    y: worldY * transform.zoom + transform.panY,
  };
}

export function getTransformCSS(transform: ViewportTransform): string {
  return `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`;
}

export function useViewport() {
  const panX = useBoardStore((s) => s.panX);
  const panY = useBoardStore((s) => s.panY);
  const zoom = useBoardStore((s) => s.zoom);
  const setPan = useBoardStore((s) => s.setPan);
  const setZoom = useBoardStore((s) => s.setZoom);
  const resetViewport = useBoardStore((s) => s.resetViewport);

  const transform: ViewportTransform = { panX, panY, zoom };

  const pan = useCallback(
    (dx: number, dy: number) => {
      setPan(panX + dx, panY + dy);
    },
    [panX, panY, setPan],
  );

  const zoomAt = useCallback(
    (newZoom: number, cx: number, cy: number) => {
      // Zoom towards the point (cx, cy) on screen
      const clampedZoom = Math.max(0.25, Math.min(4, newZoom));
      const ratio = clampedZoom / zoom;
      const newPanX = cx - ratio * (cx - panX);
      const newPanY = cy - ratio * (cy - panY);
      setPan(newPanX, newPanY);
      setZoom(clampedZoom);
    },
    [panX, panY, zoom, setPan, setZoom],
  );

  return {
    transform,
    pan,
    zoomAt,
    resetViewport,
    screenToWorld: (sx: number, sy: number) => screenToWorld(sx, sy, transform),
    worldToScreen: (wx: number, wy: number) => worldToScreen(wx, wy, transform),
    transformCSS: getTransformCSS(transform),
  };
}
