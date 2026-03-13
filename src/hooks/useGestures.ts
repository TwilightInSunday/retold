import { useRef, useCallback } from 'react'

export interface GestureConfig {
  onPan: (dx: number, dy: number) => void;
  onZoom: (scale: number, cx: number, cy: number) => void;
  onTapNote: (noteId: string) => void;
  onLongPress: (noteId: string, x: number, y: number) => void;
  onDrag: (noteId: string, x: number, y: number) => void;
  onDrop: (noteId: string, x: number, y: number) => void;
  onDoubleTap: (x: number, y: number) => void;
}

// Detection thresholds
export const LONG_PRESS_MS = 400;
export const DOUBLE_TAP_MS = 300;
export const DRAG_THRESHOLD_PX = 8;
export const PINCH_THRESHOLD = 0.01;

export type GestureState = 'idle' | 'waiting_for_gesture' | 'dragging' | 'panning';

export interface GestureContext {
  state: GestureState;
  startX: number;
  startY: number;
  noteId: string | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  lastTapTime: number;
  moved: boolean;
}

export function createGestureContext(): GestureContext {
  return {
    state: 'idle',
    startX: 0,
    startY: 0,
    noteId: null,
    longPressTimer: null,
    lastTapTime: 0,
    moved: false,
  };
}

export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function detectGestureTransition(
  ctx: GestureContext,
  eventType: 'down' | 'move' | 'up',
  x: number,
  y: number,
  isOnNote: boolean,
  noteId: string | null,
): { newState: GestureState; action?: string } {
  switch (ctx.state) {
    case 'idle': {
      if (eventType === 'down') {
        if (isOnNote && noteId) {
          return { newState: 'waiting_for_gesture' };
        }
        return { newState: 'panning' };
      }
      return { newState: 'idle' };
    }

    case 'waiting_for_gesture': {
      if (eventType === 'move') {
        const dist = getDistance(ctx.startX, ctx.startY, x, y);
        if (dist > DRAG_THRESHOLD_PX) {
          return { newState: 'dragging', action: 'drag_start' };
        }
        return { newState: 'waiting_for_gesture' };
      }
      if (eventType === 'up') {
        const now = Date.now();
        const timeSinceLastTap = now - ctx.lastTapTime;
        if (timeSinceLastTap < DOUBLE_TAP_MS) {
          return { newState: 'idle', action: 'double_tap' };
        }
        return { newState: 'idle', action: 'tap' };
      }
      return { newState: 'waiting_for_gesture' };
    }

    case 'dragging': {
      if (eventType === 'move') {
        return { newState: 'dragging', action: 'drag' };
      }
      if (eventType === 'up') {
        return { newState: 'idle', action: 'drop' };
      }
      return { newState: 'dragging' };
    }

    case 'panning': {
      if (eventType === 'move') {
        return { newState: 'panning', action: 'pan' };
      }
      if (eventType === 'up') {
        return { newState: 'idle' };
      }
      return { newState: 'panning' };
    }
  }
}

export function useGestures(config: GestureConfig) {
  const ctx = useRef<GestureContext>(createGestureContext());

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, noteId: string | null) => {
      const isOnNote = noteId !== null;
      const { newState } = detectGestureTransition(
        ctx.current, 'down', e.clientX, e.clientY, isOnNote, noteId,
      );

      ctx.current.state = newState;
      ctx.current.startX = e.clientX;
      ctx.current.startY = e.clientY;
      ctx.current.noteId = noteId;
      ctx.current.moved = false;

      if (ctx.current.longPressTimer) {
        clearTimeout(ctx.current.longPressTimer);
      }

      if (newState === 'waiting_for_gesture' && noteId) {
        ctx.current.longPressTimer = setTimeout(() => {
          if (!ctx.current.moved && ctx.current.state === 'waiting_for_gesture') {
            ctx.current.state = 'dragging';
            config.onLongPress(noteId, e.clientX, e.clientY);
          }
        }, LONG_PRESS_MS);
      }
    },
    [config],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { newState, action } = detectGestureTransition(
        ctx.current, 'move', e.clientX, e.clientY,
        ctx.current.noteId !== null, ctx.current.noteId,
      );

      if (action === 'drag_start') {
        ctx.current.moved = true;
        if (ctx.current.longPressTimer) {
          clearTimeout(ctx.current.longPressTimer);
        }
      }

      ctx.current.state = newState;

      if (action === 'pan' || (action === undefined && newState === 'panning')) {
        const dx = e.clientX - ctx.current.startX;
        const dy = e.clientY - ctx.current.startY;
        ctx.current.startX = e.clientX;
        ctx.current.startY = e.clientY;
        config.onPan(dx, dy);
      }

      if ((action === 'drag' || action === 'drag_start') && ctx.current.noteId) {
        config.onDrag(ctx.current.noteId, e.clientX, e.clientY);
      }
    },
    [config],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (ctx.current.longPressTimer) {
        clearTimeout(ctx.current.longPressTimer);
      }

      const { newState, action } = detectGestureTransition(
        ctx.current, 'up', e.clientX, e.clientY,
        ctx.current.noteId !== null, ctx.current.noteId,
      );

      if (action === 'tap' && ctx.current.noteId) {
        config.onTapNote(ctx.current.noteId);
        ctx.current.lastTapTime = Date.now();
      }

      if (action === 'double_tap') {
        config.onDoubleTap(e.clientX, e.clientY);
        ctx.current.lastTapTime = 0;
      }

      if (action === 'drop' && ctx.current.noteId) {
        config.onDrop(ctx.current.noteId, e.clientX, e.clientY);
      }

      ctx.current.state = newState;
      ctx.current.noteId = null;
    },
    [config],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
