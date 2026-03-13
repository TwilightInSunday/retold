import type { Note } from '../../api/types'

interface ColorPickerProps {
  value: Note['color'];
  onChange: (color: Note['color']) => void;
}

const COLORS: { value: Note['color']; label: string; css: string }[] = [
  { value: 'yellow', label: 'Yellow', css: 'var(--note-yellow)' },
  { value: 'pink', label: 'Pink', css: 'var(--note-pink)' },
  { value: 'blue', label: 'Blue', css: 'var(--note-blue)' },
  { value: 'green', label: 'Green', css: 'var(--note-green)' },
  { value: 'white', label: 'White', css: 'var(--note-white)' },
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Note color">
      {COLORS.map((color) => (
        <button
          key={color.value}
          className={`color-picker__swatch ${value === color.value ? 'color-picker__swatch--active' : ''}`}
          style={{ backgroundColor: color.css }}
          onClick={() => onChange(color.value)}
          role="radio"
          aria-checked={value === color.value}
          aria-label={color.label}
        />
      ))}
    </div>
  );
}
