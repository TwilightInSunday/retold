import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Note as NoteType } from '../api/types'
import { CreateButton } from '../components/board/CreateButton'
import { Note } from '../components/board/Note'
import { NoteEditor } from '../components/board/NoteEditor'

const baseNote: NoteType = {
  id: 'n1',
  boardId: 'b1',
  text: 'Test note',
  status: 'todo',
  color: 'yellow',
  x: 100,
  y: 200,
  width: 160,
  rotation: 2,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
}

describe('Note', () => {
  it('renders note text', () => {
    render(<Note note={baseNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Test note')).toBeInTheDocument()
  })

  it('renders note status badge', () => {
    render(<Note note={baseNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('todo')).toBeInTheDocument()
  })

  it('has article role', () => {
    render(<Note note={baseNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<Note note={baseNote} onUpdate={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete note'))
    expect(onDelete).toHaveBeenCalledWith('n1')
  })

  it('enters edit mode on double click', () => {
    render(<Note note={baseNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.doubleClick(screen.getByRole('article'))
    expect(screen.getByLabelText('Edit note text')).toBeInTheDocument()
  })
})

describe('NoteEditor', () => {
  it('renders with initial text', () => {
    render(<NoteEditor initialText="Hello" onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
  })

  it('calls onSave on Enter', () => {
    const onSave = vi.fn()
    render(<NoteEditor initialText="" onSave={onSave} onCancel={vi.fn()} />)
    const textarea = screen.getByLabelText('Edit note text')
    fireEvent.change(textarea, { target: { value: 'New text' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('New text')
  })

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn()
    render(<NoteEditor initialText="" onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.keyDown(screen.getByLabelText('Edit note text'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('CreateButton', () => {
  it('renders with proper aria label', () => {
    render(<CreateButton onClick={vi.fn()} />)
    expect(screen.getByLabelText('Create new note')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<CreateButton onClick={onClick} />)
    fireEvent.click(screen.getByLabelText('Create new note'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
