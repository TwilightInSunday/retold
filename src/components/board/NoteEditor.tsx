import { useState, useRef, useEffect } from 'react'

interface NoteEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function NoteEditor({ initialText, onSave, onCancel }: NoteEditorProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className="note-editor note-editor--bottom-sheet"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(text)}
      aria-label="Edit note text"
      rows={4}
    />
  );
}
