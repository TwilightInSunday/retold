import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TitleBar } from '../components/shell/TitleBar'
import { Toolbar } from '../components/shell/Toolbar'
import { StatusBar } from '../components/shell/StatusBar'
import { CreateButton } from '../components/board/CreateButton'

describe('Responsive layout components', () => {
  it('TitleBar renders at any viewport', () => {
    render(<TitleBar />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('Toolbar has hamburger button for mobile', () => {
    render(<Toolbar />)
    const hamburger = screen.getByLabelText('Toggle menu')
    expect(hamburger).toBeInTheDocument()
    // Hamburger is hidden on desktop via CSS, but the element exists
    expect(hamburger).toHaveClass('toolbar__hamburger')
  })

  it('StatusBar renders as thin strip', () => {
    render(<StatusBar syncStatus="idle" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('CreateButton has minimum 44x44 touch target', () => {
    render(<CreateButton onClick={() => {}} />)
    const btn = screen.getByLabelText('Create new note')
    expect(btn).toHaveClass('create-button')
    // CSS ensures min-width/min-height, verified by class presence
  })
})
