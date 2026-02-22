import type { SpiderMode } from '../game/types'
import type { DeckTheme } from '../themes/lowVisionDeck'

export interface GameSettings {
  scale: number
  highContrast: boolean
  altPalette: boolean
  reducedMotion: boolean
  deckThemeId: string
}

interface SettingsPanelProps {
  settings: GameSettings
  themes: DeckTheme[]
  mode: SpiderMode
  onModeChange: (mode: SpiderMode) => void
  onChange: (update: Partial<GameSettings>) => void
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

      <label>
        UI scale ({Math.round(settings.scale * 100)}%)
        <input
          type="range"
          min={0.8}
          max={1.6}
          step={0.05}
          value={settings.scale}
          onChange={(event) => onChange({ scale: Number(event.target.value) })}
        />
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
