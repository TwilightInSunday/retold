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

const emptyNotes = new Map()

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    boardId: 'b1',
    text: '',
    status: 'draft',
    color: 'yellow',
    x: 0, y: 0, width: 160, rotation: 0,
    createdAt: '', updatedAt: '', deletedAt: null,
    ...overrides,
  }
}

describe('StatusBar', () => {
  it('shows online status', () => {
    render(<StatusBar syncStatus="idle" notes={emptyNotes} />)
    expect(screen.getByText('Online — synced')).toBeInTheDocument()
  })

  it('shows offline status', () => {
    render(<StatusBar syncStatus="offline" notes={emptyNotes} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows syncing status', () => {
    render(<StatusBar syncStatus="syncing" notes={emptyNotes} />)
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('shows zero counts when empty', () => {
    render(<StatusBar syncStatus="idle" notes={emptyNotes} boardId="b1" />)
    expect(screen.getByText('0 draft')).toBeInTheDocument()
    expect(screen.getByText('0 todo')).toBeInTheDocument()
    expect(screen.getByText('0 in-progress')).toBeInTheDocument()
    expect(screen.getByText('0 done')).toBeInTheDocument()
  })

  it('counts notes per status for the current board', () => {
    const notes = new Map()
    const n1 = makeNote({ status: 'draft', boardId: 'b1' })
    const n2 = makeNote({ status: 'todo', boardId: 'b1' })
    const n3 = makeNote({ status: 'todo', boardId: 'b1' })
    const n4 = makeNote({ status: 'done', boardId: 'b2' })
    notes.set(n1.id, n1)
    notes.set(n2.id, n2)
    notes.set(n3.id, n3)
    notes.set(n4.id, n4)
    render(<StatusBar syncStatus="idle" notes={notes} boardId="b1" />)
    expect(screen.getByText('1 draft')).toBeInTheDocument()
    expect(screen.getByText('2 todo')).toBeInTheDocument()
    expect(screen.getByText('0 done')).toBeInTheDocument()
  })

  it('excludes soft-deleted notes from counts', () => {
    const notes = new Map()
    const n1 = makeNote({ status: 'draft', boardId: 'b1' })
    const n2 = makeNote({ status: 'draft', boardId: 'b1', deletedAt: '2026-01-01' })
    notes.set(n1.id, n1)
    notes.set(n2.id, n2)
    render(<StatusBar syncStatus="idle" notes={notes} boardId="b1" />)
    expect(screen.getByText('1 draft')).toBeInTheDocument()
  })

  it('has status role', () => {
    render(<StatusBar syncStatus="idle" notes={emptyNotes} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
