import { useState } from 'react'

interface ToolbarProps {
  onNewNote?: () => void;
  onResetView?: () => void;
}

export function Toolbar({ onNewNote, onResetView }: ToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="toolbar" role="toolbar" aria-label="Board tools">
      <button
        className="toolbar__hamburger"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className="toolbar__hamburger-line" />
        <span className="toolbar__hamburger-line" />
        <span className="toolbar__hamburger-line" />
      </button>
      <div className={`toolbar__actions ${menuOpen ? 'toolbar__actions--open' : ''}`}>
        <button
          className="toolbar__btn"
          onClick={onNewNote}
          aria-label="New note"
        >
          + Note
        </button>
        <button
          className="toolbar__btn"
          onClick={onResetView}
          aria-label="Reset view"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}
