import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('CSS Design Tokens', () => {
  const tokens = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf-8')

  it('defines retro palette variables', () => {
    expect(tokens).toContain('--retro-black')
    expect(tokens).toContain('--retro-cream')
  })

  it('defines note color variables', () => {
    expect(tokens).toContain('--note-yellow')
    expect(tokens).toContain('--note-pink')
    expect(tokens).toContain('--note-blue')
    expect(tokens).toContain('--note-green')
  })

  it('defines typography variables', () => {
    expect(tokens).toContain('--font-mono')
    expect(tokens).toContain('--font-sans')
  })

  it('defines z-index layers', () => {
    expect(tokens).toContain('--z-note')
    expect(tokens).toContain('--z-toolbar')
  })
})
