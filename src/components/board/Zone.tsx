import type { Zone as ZoneType } from '../../api/types'

interface ZoneProps {
  zone: ZoneType
  isDropTarget?: boolean
}

export function Zone({ zone, isDropTarget = false }: ZoneProps) {
  return (
    <section
      className={`zone ${isDropTarget ? 'zone--drop-target' : ''}`}
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        borderColor: zone.color,
      }}
      data-zone-id={zone.id}
      aria-label={`Zone: ${zone.label}`}
    >
      <span className="zone__label">{zone.label}</span>
    </section>
  )
}

export function isPointInZone(x: number, y: number, zone: ZoneType): boolean {
  return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
}

export function findOverlappingZone(x: number, y: number, zones: ZoneType[]): ZoneType | null {
  for (const zone of zones) {
    if (isPointInZone(x, y, zone)) {
      return zone
    }
  }
  return null
}

export function snapToZone(
  noteX: number,
  noteY: number,
  noteWidth: number,
  zone: ZoneType,
): { x: number; y: number } {
  // Snap to zone's interior with padding
  const padding = 8
  const x = Math.max(zone.x + padding, Math.min(noteX, zone.x + zone.width - noteWidth - padding))
  const y = Math.max(zone.y + 30, Math.min(noteY, zone.y + zone.height - 120 - padding))
  return { x, y }
}
