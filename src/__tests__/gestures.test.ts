import { describe, expect, it } from 'vitest'
import {
  createGestureContext,
  DOUBLE_TAP_MS,
  DRAG_THRESHOLD_PX,
  detectGestureTransition,
  type GestureContext,
  getDistance,
} from '../hooks/useGestures'

function makeCtx(overrides: Partial<GestureContext> = {}): GestureContext {
  return { ...createGestureContext(), ...overrides }
}

describe('getDistance', () => {
  it('computes euclidean distance', () => {
    expect(getDistance(0, 0, 3, 4)).toBe(5)
  })

  it('returns 0 for same point', () => {
    expect(getDistance(5, 5, 5, 5)).toBe(0)
  })
})

describe('Gesture State Machine', () => {
  describe('idle state', () => {
    it('transitions to waiting_for_gesture on note pointerdown', () => {
      const ctx = makeCtx({ state: 'idle' })
      const { newState } = detectGestureTransition(ctx, 'down', 100, 100, true, 'n1')
      expect(newState).toBe('waiting_for_gesture')
    })

    it('transitions to panning on canvas pointerdown', () => {
      const ctx = makeCtx({ state: 'idle' })
      const { newState } = detectGestureTransition(ctx, 'down', 100, 100, false, null)
      expect(newState).toBe('panning')
    })
  })

  describe('waiting_for_gesture state', () => {
    it('stays waiting if move below threshold', () => {
      const ctx = makeCtx({ state: 'waiting_for_gesture', startX: 100, startY: 100, noteId: 'n1' })
      const { newState } = detectGestureTransition(ctx, 'move', 102, 102, true, 'n1')
      expect(newState).toBe('waiting_for_gesture')
    })

    it('transitions to dragging if move exceeds threshold', () => {
      const ctx = makeCtx({ state: 'waiting_for_gesture', startX: 100, startY: 100, noteId: 'n1' })
      const { newState, action } = detectGestureTransition(
        ctx,
        'move',
        100 + DRAG_THRESHOLD_PX + 1,
        100,
        true,
        'n1',
      )
      expect(newState).toBe('dragging')
      expect(action).toBe('drag_start')
    })

    it('transitions to idle with tap on pointerup', () => {
      const ctx = makeCtx({ state: 'waiting_for_gesture', noteId: 'n1', lastTapTime: 0 })
      const { newState, action } = detectGestureTransition(ctx, 'up', 100, 100, true, 'n1')
      expect(newState).toBe('idle')
      expect(action).toBe('tap')
    })

    it('detects double tap', () => {
      const ctx = makeCtx({
        state: 'waiting_for_gesture',
        noteId: 'n1',
        lastTapTime: Date.now() - DOUBLE_TAP_MS / 2,
      })
      const { newState, action } = detectGestureTransition(ctx, 'up', 100, 100, true, 'n1')
      expect(newState).toBe('idle')
      expect(action).toBe('double_tap')
    })
  })

  describe('dragging state', () => {
    it('continues dragging on move', () => {
      const ctx = makeCtx({ state: 'dragging', noteId: 'n1' })
      const { newState, action } = detectGestureTransition(ctx, 'move', 150, 150, true, 'n1')
      expect(newState).toBe('dragging')
      expect(action).toBe('drag')
    })

    it('drops on pointerup', () => {
      const ctx = makeCtx({ state: 'dragging', noteId: 'n1' })
      const { newState, action } = detectGestureTransition(ctx, 'up', 150, 150, true, 'n1')
      expect(newState).toBe('idle')
      expect(action).toBe('drop')
    })
  })

  describe('panning state', () => {
    it('continues panning on move', () => {
      const ctx = makeCtx({ state: 'panning' })
      const { newState, action } = detectGestureTransition(ctx, 'move', 150, 150, false, null)
      expect(newState).toBe('panning')
      expect(action).toBe('pan')
    })

    it('returns to idle on pointerup', () => {
      const ctx = makeCtx({ state: 'panning' })
      const { newState } = detectGestureTransition(ctx, 'up', 150, 150, false, null)
      expect(newState).toBe('idle')
    })
  })
})
