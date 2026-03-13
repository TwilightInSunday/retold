import { describe, it, expect } from 'vitest'
import { screenToWorld, worldToScreen, getTransformCSS, type ViewportTransform } from '../hooks/useViewport'

describe('Viewport transform math', () => {
  const identity: ViewportTransform = { panX: 0, panY: 0, zoom: 1 };
  const panned: ViewportTransform = { panX: 100, panY: 50, zoom: 1 };
  const zoomed: ViewportTransform = { panX: 0, panY: 0, zoom: 2 };
  const both: ViewportTransform = { panX: 100, panY: 50, zoom: 2 };

  describe('screenToWorld', () => {
    it('identity transform', () => {
      const { x, y } = screenToWorld(200, 300, identity);
      expect(x).toBe(200);
      expect(y).toBe(300);
    })

    it('panned transform', () => {
      const { x, y } = screenToWorld(200, 300, panned);
      expect(x).toBe(100);
      expect(y).toBe(250);
    })

    it('zoomed transform', () => {
      const { x, y } = screenToWorld(200, 300, zoomed);
      expect(x).toBe(100);
      expect(y).toBe(150);
    })

    it('combined pan and zoom', () => {
      const { x, y } = screenToWorld(300, 250, both);
      expect(x).toBe(100);
      expect(y).toBe(100);
    })
  })

  describe('worldToScreen', () => {
    it('identity transform', () => {
      const { x, y } = worldToScreen(200, 300, identity);
      expect(x).toBe(200);
      expect(y).toBe(300);
    })

    it('is inverse of screenToWorld', () => {
      const sx = 300, sy = 250;
      const world = screenToWorld(sx, sy, both);
      const screen = worldToScreen(world.x, world.y, both);
      expect(screen.x).toBeCloseTo(sx);
      expect(screen.y).toBeCloseTo(sy);
    })
  })

  describe('getTransformCSS', () => {
    it('produces correct CSS', () => {
      const css = getTransformCSS(both);
      expect(css).toBe('translate(100px, 50px) scale(2)');
    })
  })
})
