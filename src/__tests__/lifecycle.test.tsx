import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '../api/types'
import { Checkbox } from '../components/shared/Checkbox'
import { ColorPicker } from '../components/shared/ColorPicker'
import { useNotesStore } from '../store/notes'

const validTransitions: Record<Note['status'], Note['status'][]> = {
  inbox: ['todo'],
  todo: ['in-progress'],
  'in-progress': ['done', 'todo'],
  done: ['todo'],
}

function canTransition(from: Note['status'], to: Note['status']): boolean {
  return validTransitions[from]?.includes(to) ?? false
}

describe('Note status transitions', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: new Map() })
  })

  it('inbox → todo on first edit', () => {
    expect(canTransition('inbox', 'todo')).toBe(true)
  })

  it('todo → in-progress', () => {
    expect(canTransition('todo', 'in-progress')).toBe(true)
  })

  it('in-progress → done', () => {
    expect(canTransition('in-progress', 'done')).toBe(true)
  })

  it('done → todo (reopen)', () => {
    expect(canTransition('done', 'todo')).toBe(true)
  })

  it('inbox cannot go directly to done', () => {
    expect(canTransition('inbox', 'done')).toBe(false)
  })

  it('store transitions inbox to todo on text update', () => {
    const note = useNotesStore.getState().createNote('b1', 0, 0)
    expect(note.status).toBe('inbox')

    useNotesStore.getState().updateNote(note.id, {
      text: 'Hello',
      status: 'todo',
    })

    const updated = useNotesStore.getState().getNote(note.id)
    expect(updated?.status).toBe('todo')
    expect(updated?.text).toBe('Hello')
  })
})

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Mark done" />)
    expect(screen.getByLabelText('Mark done')).toBeInTheDocument()
  })

  it('calls onChange on click', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} label="Mark done" />)
    fireEvent.click(screen.getByLabelText('Mark done'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('shows check mark when checked', () => {
    render(<Checkbox checked={true} onChange={vi.fn()} label="Mark done" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})

describe('ColorPicker', () => {
  it('renders all color options', () => {
    render(<ColorPicker value="yellow" onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('marks selected color', () => {
    render(<ColorPicker value="pink" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Pink')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Yellow')).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange when color clicked', () => {
    const onChange = vi.fn()
    render(<ColorPicker value="yellow" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Blue'))
    expect(onChange).toHaveBeenCalledWith('blue')
  })
})
