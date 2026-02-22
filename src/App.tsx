import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { applyMove, canDealFromStock, canMove, createGame, dealFromStock } from './game/engine'
import { bestHint } from './game/hints'
import type { GameState, SpiderMode } from './game/types'
import { getStorage, isElectronRuntime } from './platform/electron'
import { Board } from './ui/Board'
import { type GameSettings, SettingsPanel } from './ui/SettingsPanel'
import { deckThemes } from './themes/deckThemes'

interface Stats {
  wins: number
  losses: number
  bestTimeSeconds: number | null
}

const SETTINGS_KEY = 'simple-spider-settings'
const GAME_KEY = 'simple-spider-game'
const STATS_KEY = 'simple-spider-stats'
const MODE_KEY = 'simple-spider-mode'

const defaultSettings: GameSettings = {
  scale: 1,
  highContrast: false,
  altPalette: false,
  reducedMotion: false,
  deckThemeId: 'low-vision',
}

const defaultStats: Stats = {
  wins: 0,
  losses: 0,
  bestTimeSeconds: null,
}

function App() {
  const storage = getStorage()
  const [mode, setMode] = useState<SpiderMode>(() => storage.get<SpiderMode>(MODE_KEY, 1))
  const [settings, setSettings] = useState<GameSettings>(() => storage.get<GameSettings>(SETTINGS_KEY, defaultSettings))
  const [stats, setStats] = useState<Stats>(() => storage.get<Stats>(STATS_KEY, defaultStats))
  const [game, setGame] = useState<GameState>(() => storage.get<GameState | null>(GAME_KEY, null) ?? createGame(mode))
  const [history, setHistory] = useState<GameState[]>([])
  const [future, setFuture] = useState<GameState[]>([])
  const [hintMessage, setHintMessage] = useState<string>('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (game.wonAt !== null) return
    const syncTick = () => setTick(Math.floor((Date.now() - game.startedAt) / 1000))
    syncTick()
    const timer = window.setInterval(syncTick, 1000)
    return () => window.clearInterval(timer)
  }, [game.startedAt, game.wonAt])

  useEffect(() => {
    storage.set(MODE_KEY, mode)
  }, [mode, storage])

  useEffect(() => {
    storage.set(SETTINGS_KEY, settings)
  }, [settings, storage])

  useEffect(() => {
    storage.set(STATS_KEY, stats)
  }, [stats, storage])

  useEffect(() => {
    storage.set(GAME_KEY, game)
  }, [game, storage])

  const activeTheme = useMemo(
    () => deckThemes.find((theme) => theme.id === settings.deckThemeId) ?? deckThemes[0],
    [settings.deckThemeId],
  )

  const shownTheme = useMemo(() => {
    if (!settings.altPalette) return activeTheme
    return {
      ...activeTheme,
      suitColor: {
        spades: '#000000',
        clubs: '#000000',
        hearts: '#c1121f',
        diamonds: '#c1121f',
      },
    }
  }, [activeTheme, settings.altPalette])

  const hint = useMemo(() => bestHint(game), [game])
  const elapsed = game.wonAt === null ? tick : Math.floor((game.wonAt - game.startedAt) / 1000)

  function startNewGame(nextMode: SpiderMode, countLoss: boolean): void {
    if (countLoss && game.wonAt === null) {
      setStats((prev) => ({ ...prev, losses: prev.losses + 1 }))
    }
    setMode(nextMode)
    setGame(createGame(nextMode))
    setHistory([])
    setFuture([])
    setHintMessage('')
  }

  function pushSnapshot(previous: GameState): void {
    setHistory((prev) => [...prev, previous])
    setFuture([])
  }

  function handleWinTransition(previous: GameState, next: GameState): void {
    if (previous.wonAt !== null || next.wonAt === null) return
    const elapsedSeconds = Math.floor((next.wonAt - next.startedAt) / 1000)
    setStats((prev) => ({
      wins: prev.wins + 1,
      losses: prev.losses,
      bestTimeSeconds: prev.bestTimeSeconds === null ? elapsedSeconds : Math.min(prev.bestTimeSeconds, elapsedSeconds),
    }))
    setHintMessage('You won! Start a new game whenever you are ready.')
  }

  function moveCards(fromColumn: number, cardIndex: number, toColumn: number): void {
    const step = { fromColumn, cardIndex, toColumn }
    if (!canMove(game, step)) {
      setHintMessage(
        'Invalid move: move a same-suit descending stack onto a card that is one rank higher, or onto an empty column.',
      )
      return
    }

    const next = applyMove(game, step)
    if (next !== game) {
      pushSnapshot(game)
      setGame(next)
      setHintMessage('')
      handleWinTransition(game, next)
    }
  }

  function dealStock(): void {
    if (!canDealFromStock(game)) {
      setHintMessage('All columns must have at least one card before dealing from stock.')
      return
    }
    const next = dealFromStock(game)
    if (next !== game) {
      pushSnapshot(game)
      setGame(next)
      setHintMessage('')
      handleWinTransition(game, next)
    }
  }

  function undo(): void {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setHistory((items) => items.slice(0, -1))
    setFuture((items) => [game, ...items])
    setGame(previous)
  }

  function redo(): void {
    if (future.length === 0) return
    const [next, ...rest] = future
    setFuture(rest)
    setHistory((items) => [...items, game])
    setGame(next)
  }

  function showHint(): void {
    if (!hint) {
      setHintMessage('No legal moves found.')
      return
    }
    setHintMessage(`Hint: move from column ${hint.fromColumn + 1} to column ${hint.toColumn + 1}.`)
  }

  return (
    <main
      className={`app-shell ${settings.highContrast ? 'high-contrast' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`}
      style={{ transform: `scale(${settings.scale})`, transformOrigin: 'top center' }}
    >
      <header className="top-bar">
        <h1>Simple Spider Solitaire</h1>
        <div className="meta">
          <span>{isElectronRuntime() ? 'Desktop' : 'Browser'} mode</span>
          <span>Time: {elapsed}s</span>
          <span>Moves: {game.moves}</span>
        </div>
      </header>

      <section className="controls">
        <button type="button" onClick={() => startNewGame(mode, true)}>
          New Game
        </button>
        <button type="button" onClick={() => startNewGame(mode, false)}>
          Restart
        </button>
        <button type="button" onClick={undo} disabled={history.length === 0}>
          Undo
        </button>
        <button type="button" onClick={redo} disabled={future.length === 0}>
          Redo
        </button>
        <button type="button" onClick={showHint}>
          Hint
        </button>
      </section>

      <div className="layout">
        <Board game={game} theme={shownTheme} highlight={hint} onMove={moveCards} onDealStock={dealStock} />
        <aside>
          <SettingsPanel
            settings={settings}
            themes={deckThemes}
            mode={mode}
            onModeChange={(nextMode) => startNewGame(nextMode, true)}
            onChange={(update) => setSettings((prev) => ({ ...prev, ...update }))}
          />
          <section className="stats-panel">
            <h2>Stats</h2>
            <p>Wins: {stats.wins}</p>
            <p>Losses: {stats.losses}</p>
            <p>Best Time: {stats.bestTimeSeconds === null ? 'N/A' : `${stats.bestTimeSeconds}s`}</p>
          </section>
          <p className="hint-message">{hintMessage}</p>
        </aside>
      </div>
    </main>
  )
}

export default App
