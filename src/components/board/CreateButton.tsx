import '../../styles/note.css'

interface CreateButtonProps {
  onClick: () => void
}

export function CreateButton({ onClick }: CreateButtonProps) {
  return (
    <button type="button" className="create-button" onClick={onClick} aria-label="Create new note">
      +
    </button>
  )
}
