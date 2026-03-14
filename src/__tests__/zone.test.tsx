import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Zone as ZoneType } from '../api/types'
import { findOverlappingZone, isPointInZone, snapToZone, Zone } from '../components/board/Zone'

const testZone: ZoneType = {
  id: 'z1',
  label: 'To Do',
  x: 0,
  y: 0,
  width: 300,
  height: 400,
  color: '#888',
}

describe('Zone component', () => {
  it('renders with label', () => {
    render(<Zone zone={testZone} />)
    expect(screen.getByText('To Do')).toBeInTheDocument()
  })

  it('has region role', () => {
    render(<Zone zone={testZone} />)
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it('has proper aria label', () => {
    render(<Zone zone={testZone} />)
    expect(screen.getByLabelText('Zone: To Do')).toBeInTheDocument()
  })

  it('applies drop target class', () => {
    const { container } = render(<Zone zone={testZone} isDropTarget />)
    expect(container.querySelector('.zone--drop-target')).not.toBeNull()
  })
})

describe('isPointInZone', () => {
  it('returns true for point inside zone', () => {
    expect(isPointInZone(150, 200, testZone)).toBe(true)
  })

  it('returns false for point outside zone', () => {
    expect(isPointInZone(400, 200, testZone)).toBe(false)
  })

  it('returns true for point on edge', () => {
    expect(isPointInZone(0, 0, testZone)).toBe(true)
    expect(isPointInZone(300, 400, testZone)).toBe(true)
  })
})

describe('findOverlappingZone', () => {
  const zones: ZoneType[] = [
    testZone,
    { id: 'z2', label: 'Done', x: 350, y: 0, width: 300, height: 400, color: '#0f0' },
  ]

  it('finds the correct zone', () => {
    const zone = findOverlappingZone(150, 200, zones)
    expect(zone?.id).toBe('z1')
  })

  it('finds second zone', () => {
    const zone = findOverlappingZone(400, 200, zones)
    expect(zone?.id).toBe('z2')
  })

  it('returns null when not in any zone', () => {
    const zone = findOverlappingZone(320, 200, zones)
    expect(zone).toBeNull()
  })
})

describe('snapToZone', () => {
  it('keeps note inside zone bounds', () => {
    const { x, y } = snapToZone(-50, -50, 160, testZone)
    expect(x).toBeGreaterThanOrEqual(testZone.x)
    expect(y).toBeGreaterThanOrEqual(testZone.y)
  })

  it('does not push note past right edge', () => {
    const { x } = snapToZone(500, 100, 160, testZone)
    expect(x + 160).toBeLessThanOrEqual(testZone.x + testZone.width)
  })
})
