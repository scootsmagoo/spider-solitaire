import { useEffect, useRef, useState } from 'react'
import type { SpiderMode } from '../game/types'
import type { DeckTheme } from '../themes/lowVisionDeck'

export interface GameSettings {
  scale: number
  highContrast: boolean
  altPalette: boolean
  reducedMotion: boolean
  /** Clicking a card sends it straight to its best spot instead of selecting it first. */
  autoMove: boolean
  deckThemeId: string
}

interface SettingsPanelProps {
  settings: GameSettings
  themes: DeckTheme[]
  mode: SpiderMode
  onModeChange: (mode: SpiderMode) => void
  onChange: (update: Partial<GameSettings>) => void
}

/**
 * The whole app, this slider included, is transform-scaled, so rescaling mid-drag moves the
 * thumb out from under the pointer and the value jumps around. The drag is tracked here and
 * only applied by the native change event, which fires on release (and on each click or
 * arrow key, so those still apply at once).
 */
function ScaleSlider({ value, onCommit }: { value: number; onCommit: (scale: number) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? value

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const commit = () => {
      onCommit(Number(input.value))
      setDraft(null)
    }
    input.addEventListener('change', commit)
    return () => input.removeEventListener('change', commit)
  }, [onCommit])

  return (
    <label>
      UI scale ({Math.round(shown * 100)}%)
      <input
        ref={inputRef}
        type="range"
        min={0.8}
        max={1.6}
        step={0.05}
        value={shown}
        onChange={(event) => setDraft(Number(event.target.value))}
      />
    </label>
  )
}

export function SettingsPanel({ settings, themes, mode, onModeChange, onChange }: SettingsPanelProps) {
  return (
    <section className="settings-panel" aria-label="Game settings">
      <h2>Settings</h2>
      <label>
        Difficulty
        <select
          value={mode}
          onChange={(event) => {
            onModeChange(Number(event.target.value) as SpiderMode)
          }}
        >
          <option value={1}>1 Suit</option>
          <option value={2}>2 Suits</option>
          <option value={4}>4 Suits</option>
        </select>
      </label>

      <label>
        Deck theme
        <select value={settings.deckThemeId} onChange={(event) => onChange({ deckThemeId: event.target.value })}>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.label}
            </option>
          ))}
        </select>
      </label>

      <ScaleSlider value={settings.scale} onCommit={(scale) => onChange({ scale })} />

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.autoMove}
          onChange={(event) => onChange({ autoMove: event.target.checked })}
        />
        Click a card to move it automatically
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.highContrast}
          onChange={(event) => onChange({ highContrast: event.target.checked })}
        />
        High contrast mode
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.altPalette}
          onChange={(event) => onChange({ altPalette: event.target.checked })}
        />
        Alternative suit palette
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(event) => onChange({ reducedMotion: event.target.checked })}
        />
        Reduced motion
      </label>
    </section>
  )
}
