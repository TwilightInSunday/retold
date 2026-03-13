import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Canvas } from '../components/board/Canvas'

describe('Canvas', () => {
  it('renders with application role', () => {
    render(<Canvas />)
    expect(screen.getByRole('application')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <Canvas>
        <div data-testid="child">Hello</div>
      </Canvas>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('has proper aria label', () => {
    render(<Canvas />)
    expect(screen.getByLabelText('Whiteboard canvas')).toBeInTheDocument()
  })
})
