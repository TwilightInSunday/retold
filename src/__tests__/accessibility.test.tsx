import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Note } from '../components/board/Note'
import { Canvas } from '../components/board/Canvas'
import { TitleBar } from '../components/shell/TitleBar'
import { Toolbar } from '../components/shell/Toolbar'
import { StatusBar } from '../components/shell/StatusBar'
import { ColorPicker } from '../components/shared/ColorPicker'
import { Checkbox } from '../components/shared/Checkbox'
import type { Note as NoteType } from '../api/types'

const testNote: NoteType = {
  id: 'n1',
  boardId: 'b1',
  text: 'Accessible note',
  status: 'todo',
  color: 'yellow',
  x: 0, y: 0,
  width: 160,
  rotation: 0,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
}

describe('Accessibility', () => {
  describe('Note keyboard navigation', () => {
    it('Enter key opens editor', () => {
      render(<Note note={testNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
      const note = screen.getByRole('article')
      fireEvent.keyDown(note, { key: 'Enter' })
      expect(screen.getByLabelText('Edit note text')).toBeInTheDocument()
    })

    it('Delete key deletes note', () => {
      const onDelete = vi.fn()
      render(<Note note={testNote} onUpdate={vi.fn()} onDelete={onDelete} />)
      const note = screen.getByRole('article')
      fireEvent.keyDown(note, { key: 'Delete' })
      expect(onDelete).toHaveBeenCalledWith('n1')
    })

    it('note is focusable with tabIndex', () => {
      render(<Note note={testNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
      const note = screen.getByRole('article')
      expect(note).toHaveAttribute('tabindex', '0')
    })

    it('note has aria-roledescription', () => {
      render(<Note note={testNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
      const note = screen.getByRole('article')
      expect(note).toHaveAttribute('aria-roledescription', 'draggable note')
    })

    it('note aria-label includes status and color', () => {
      render(<Note note={testNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
      const note = screen.getByRole('article')
      expect(note.getAttribute('aria-label')).toContain('todo')
      expect(note.getAttribute('aria-label')).toContain('yellow')
    })
  })

  describe('ARIA labels on interactive elements', () => {
    it('Canvas has application role and label', () => {
      render(<Canvas />)
      expect(screen.getByRole('application')).toHaveAttribute('aria-label', 'Whiteboard canvas')
    })

    it('TitleBar has banner role', () => {
      render(<TitleBar />)
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('Toolbar has toolbar role with label', () => {
      render(<Toolbar />)
      expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'Board tools')
    })

    it('StatusBar has status role with aria-live', () => {
      render(<StatusBar syncStatus="idle" notes={new Map()} />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('ColorPicker has radiogroup role', () => {
      render(<ColorPicker value="yellow" onChange={vi.fn()} />)
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Note color')
      // Each swatch has radio role
      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(5)
      radios.forEach((radio) => {
        expect(radio).toHaveAttribute('aria-label')
        expect(radio).toHaveAttribute('aria-checked')
      })
    })

    it('Checkbox has proper aria-label', () => {
      render(<Checkbox checked={false} onChange={vi.fn()} label="Done" />)
      expect(screen.getByLabelText('Done')).toBeInTheDocument()
    })
  })

  describe('Focus management', () => {
    it('NoteEditor gets focus when opened', () => {
      render(<Note note={testNote} onUpdate={vi.fn()} onDelete={vi.fn()} />)
      fireEvent.doubleClick(screen.getByRole('article'))
      const textarea = screen.getByLabelText('Edit note text')
      expect(document.activeElement).toBe(textarea)
    })

    it('Escape in editor returns focus to note', () => {
      const onUpdate = vi.fn()
      render(<Note note={testNote} onUpdate={onUpdate} onDelete={vi.fn()} />)
      fireEvent.doubleClick(screen.getByRole('article'))
      const textarea = screen.getByLabelText('Edit note text')
      fireEvent.keyDown(textarea, { key: 'Escape' })
      // After cancel, note ref should be focused
      expect(document.activeElement).toBe(screen.getByRole('article'))
    })
  })
})
