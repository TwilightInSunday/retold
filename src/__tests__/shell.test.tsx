import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TitleBar } from '../components/shell/TitleBar'
import { Toolbar } from '../components/shell/Toolbar'
import { StatusBar } from '../components/shell/StatusBar'

describe('TitleBar', () => {
  it('renders default title', () => {
    render(<TitleBar />)
    expect(screen.getByText('RETRO.DO')).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<TitleBar title="My Board" />)
    expect(screen.getByText('My Board')).toBeInTheDocument()
  })

  it('has banner role', () => {
    render(<TitleBar />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})

describe('Toolbar', () => {
  it('renders toolbar role', () => {
    render(<Toolbar />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
  })

  it('calls onNewNote when clicked', () => {
    const onNewNote = vi.fn()
    render(<Toolbar onNewNote={onNewNote} />)
    fireEvent.click(screen.getByLabelText('New note'))
    expect(onNewNote).toHaveBeenCalledOnce()
  })

  it('calls onResetView when clicked', () => {
    const onResetView = vi.fn()
    render(<Toolbar onResetView={onResetView} />)
    fireEvent.click(screen.getByLabelText('Reset view'))
    expect(onResetView).toHaveBeenCalledOnce()
  })

  it('toggles hamburger menu', () => {
    render(<Toolbar />)
    const hamburger = screen.getByLabelText('Toggle menu')
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(hamburger)
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('StatusBar', () => {
  it('shows online status', () => {
    render(<StatusBar syncStatus="idle" />)
    expect(screen.getByText('Online — synced')).toBeInTheDocument()
  })

  it('shows offline status', () => {
    render(<StatusBar syncStatus="offline" />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows syncing status', () => {
    render(<StatusBar syncStatus="syncing" />)
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('shows note count', () => {
    render(<StatusBar syncStatus="idle" noteCount={5} />)
    expect(screen.getByText('5 notes')).toBeInTheDocument()
  })

  it('shows singular note', () => {
    render(<StatusBar syncStatus="idle" noteCount={1} />)
    expect(screen.getByText('1 note')).toBeInTheDocument()
  })

  it('has status role', () => {
    render(<StatusBar syncStatus="idle" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
