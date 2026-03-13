import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('PWA', () => {
  it('manifest.json exists and is valid JSON', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(__dirname, '../../public/manifest.json'), 'utf-8')
    )
    expect(manifest.name).toBe('RETRO.DO')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons).toHaveLength(2)
  })

  it('manifest has required PWA fields', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(__dirname, '../../public/manifest.json'), 'utf-8')
    )
    expect(manifest).toHaveProperty('name')
    expect(manifest).toHaveProperty('short_name')
    expect(manifest).toHaveProperty('start_url')
    expect(manifest).toHaveProperty('display')
    expect(manifest).toHaveProperty('background_color')
    expect(manifest).toHaveProperty('theme_color')
    expect(manifest).toHaveProperty('icons')
  })

  it('index.html links to manifest', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('manifest.json')
  })

  it('vite config includes PWA plugin', () => {
    const config = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf-8')
    expect(config).toContain('VitePWA')
  })
})
