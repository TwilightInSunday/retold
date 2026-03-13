import { useRef, useCallback, type ReactNode } from 'react'
import { useViewport } from '../../hooks/useViewport'
import '../../styles/board.css'

interface CanvasProps {
  children?: ReactNode;
}

export function Canvas({ children }: CanvasProps) {
  const { transform, pan, zoomAt, transformCSS } = useViewport();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only pan from canvas background (not notes)
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas__world')) {
        return;
      }
      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      pan(dx, dy);
    },
    [pan],
  );

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpad
        const delta = -e.deltaY * 0.01;
        const newZoom = transform.zoom * (1 + delta);
        zoomAt(newZoom, e.clientX, e.clientY);
      } else {
        // Regular scroll → pan
        pan(-e.deltaX, -e.deltaY);
      }
    },
    [transform.zoom, pan, zoomAt],
  );

  return (
    <div
      ref={containerRef}
      className="canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      role="application"
      aria-label="Whiteboard canvas"
    >
      <div
        className="canvas__world"
        style={{ transform: transformCSS }}
      >
        {children}
      </div>
    </div>
  );
}
