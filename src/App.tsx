import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { applyMove, canDealFromStock, canMove, cardLabel, createGame, dealFromStock, isMovableSequence } from './game/engine'
import { bestDestination, bestHint } from './game/hints'
import type { CardRef, GameState, SpiderMode, Suit } from './game/types'
import { getStorage, isElectronRuntime } from './platform/electron'
import { Board, type BoardFeedback } from './ui/Board'
import { type GameSettings, SettingsPanel } from './ui/SettingsPanel'
import { deckThemes, suitSymbol } from './themes/deckThemes'

interface Stats {
  wins: number
  losses: number
  bestTimeSeconds: number | null
}

const SETTINGS_KEY = 'simple-spider-settings'
const GAME_KEY = 'simple-spider-game'
const STATS_KEY = 'simple-spider-stats'
const MODE_KEY = 'simple-spider-mode'

const ERROR_FEEDBACK_MS = 4000

const defaultSettings: GameSettings = {
  scale: 1,
  highContrast: false,
  altPalette: false,
  reducedMotion: false,
  autoMove: true,
  deckThemeId: 'low-vision',
}

const defaultStats: Stats = {
  wins: 0,
  losses: 0,
  bestTimeSeconds: null,
}

function normalizeSavedGame(saved: GameState | null, mode: SpiderMode): GameState {
  if (!saved) return createGame(mode)
  // Games saved before the tableau was dealt fully face up still have hidden cards; turn them over.
  const columns = saved.columns.map((column) => column.map((card) => (card.faceUp ? card : { ...card, faceUp: true })))
  if (!Array.isArray(saved.completedBooks)) {
    const fallbackSuit: Suit = 'spades'
    return {
      ...saved,
      columns,
      completedBooks: Array.from({ length: saved.completedRuns }, () => fallbackSuit),
    }
  }
  return { ...saved, columns }
}

function describeCard(game: GameState, ref: CardRef): string {
  const card = game.columns[ref.column][ref.cardIndex]
  const runLength = game.columns[ref.column].length - ref.cardIndex
  const name = `${cardLabel(card.rank)}${suitSymbol(card.suit)}`
  return runLength > 1 ? `the ${name} run` : `the ${name}`
}

function describeTarget(game: GameState, column: number): string {
  const target = game.columns[column]
  if (target.length === 0) return `empty column ${column + 1}`
  const top = target[target.length - 1]
  return `the ${cardLabel(top.rank)}${suitSymbol(top.suit)} in column ${column + 1}`
}

function App() {
  const storage = getStorage()
  const [mode, setMode] = useState<SpiderMode>(() => storage.get<SpiderMode>(MODE_KEY, 1))
  const [settings, setSettings] = useState<GameSettings>(() => ({
    ...defaultSettings,
    ...storage.get<Partial<GameSettings>>(SETTINGS_KEY, {}),
  }))
  const [stats, setStats] = useState<Stats>(() => storage.get<Stats>(STATS_KEY, defaultStats))
  const [game, setGame] = useState<GameState>(() => normalizeSavedGame(storage.get<GameState | null>(GAME_KEY, null), mode))
  const [history, setHistory] = useState<GameState[]>([])
  const [future, setFuture] = useState<GameState[]>([])
  const [selected, setSelected] = useState<CardRef | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [feedback, setFeedback] = useState<BoardFeedback | null>(null)
  const [tick, setTick] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  function closeMenu(): void {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

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

  // Error feedback fades on its own; hints and win messages stay until the next move.
  useEffect(() => {
    if (feedback?.kind !== 'error') return
    const timer = window.setTimeout(() => setFeedback(null), ERROR_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [feedback])

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

  function say(kind: BoardFeedback['kind'], message: string, card?: CardRef): void {
    setFeedback({ kind, message, card, nonce: Date.now() })
  }

  function startNewGame(nextMode: SpiderMode, countLoss: boolean): void {
    if (countLoss && game.wonAt === null) {
      setStats((prev) => ({ ...prev, losses: prev.losses + 1 }))
    }
    setMode(nextMode)
    setGame(createGame(nextMode))
    setHistory([])
    setFuture([])
    setSelected(null)
    setHintVisible(false)
    setFeedback(null)
  }

  function commit(next: GameState): void {
    if (next === game) return
    setHistory((prev) => [...prev, game])
    setFuture([])
    setGame(next)
    setSelected(null)
    setHintVisible(false)
    setFeedback(null)
    handleWinTransition(game, next)
  }

  function handleWinTransition(previous: GameState, next: GameState): void {
    if (previous.wonAt !== null || next.wonAt === null) return
    const elapsedSeconds = Math.floor((next.wonAt - next.startedAt) / 1000)
    setStats((prev) => ({
      wins: prev.wins + 1,
      losses: prev.losses,
      bestTimeSeconds: prev.bestTimeSeconds === null ? elapsedSeconds : Math.min(prev.bestTimeSeconds, elapsedSeconds),
    }))
    say('win', 'You won! Start a new game whenever you are ready.')
  }

  function moveCards(from: CardRef, toColumn: number): void {
    const step = { fromColumn: from.column, cardIndex: from.cardIndex, toColumn }
    if (!canMove(game, step)) {
      const moving = game.columns[from.column][from.cardIndex]
      const reason = !isMovableSequence(game.columns[from.column], from.cardIndex)
        ? "those cards aren't a same-suit run going down."
        : `it needs a ${cardLabel(moving.rank + 1)} to land on, and column ${toColumn + 1} has ${describeTarget(game, toColumn).replace(/ in column \d+$/, '')} on top.`
      say('error', `Can't move ${describeCard(game, from)} there — ${reason}`, from)
      return
    }
    commit(applyMove(game, step))
  }

  /** Sends the card to its best destination; returns false if it has nowhere to go. */
  function autoMove(ref: CardRef): boolean {
    const destination = bestDestination(game, ref.column, ref.cardIndex)
    if (destination === null) return false
    moveCards(ref, destination)
    return true
  }

  function handleCardClick(ref: CardRef): void {
    const column = game.columns[ref.column]
    const movable = isMovableSequence(column, ref.cardIndex)

    if (selected) {
      if (selected.column === ref.column && selected.cardIndex === ref.cardIndex) {
        setSelected(null)
        return
      }
      if (canMove(game, { fromColumn: selected.column, cardIndex: selected.cardIndex, toColumn: ref.column })) {
        moveCards(selected, ref.column)
        return
      }
      if (movable) {
        setSelected(ref)
        return
      }
      moveCards(selected, ref.column)
      return
    }

    if (!movable) {
      say('error', `${describeCard(game, ref)} can't be picked up — the cards under it aren't a same-suit run.`, ref)
      return
    }
    if (settings.autoMove) {
      if (autoMove(ref)) return
      say('error', `There's nowhere to move ${describeCard(game, ref)} right now.`, ref)
      return
    }
    setSelected(ref)
  }

  function handleCardDoubleClick(ref: CardRef): void {
    if (settings.autoMove) return // the first click already moved it
    if (!isMovableSequence(game.columns[ref.column], ref.cardIndex)) return
    if (!autoMove(ref)) say('error', `There's nowhere to move ${describeCard(game, ref)} right now.`, ref)
  }

  function handleColumnClick(column: number): void {
    if (!selected) return
    moveCards(selected, column)
  }

  function dealStock(): void {
    if (game.stock.length === 0) {
      say('error', 'There are no deals left.')
      return
    }
    if (!canDealFromStock(game)) {
      const empty = game.columns.findIndex((column) => column.length === 0)
      say('error', `Fill empty column ${empty + 1} before dealing — every column needs at least one card.`)
      return
    }
    commit(dealFromStock(game))
  }

  function undo(): void {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setHistory((items) => items.slice(0, -1))
    setFuture((items) => [game, ...items])
    setGame(previous)
    setSelected(null)
    setHintVisible(false)
    setFeedback(null)
  }

  function redo(): void {
    if (future.length === 0) return
    const [next, ...rest] = future
    setFuture(rest)
    setHistory((items) => [...items, game])
    setGame(next)
    setSelected(null)
    setHintVisible(false)
    setFeedback(null)
  }

  function showHint(): void {
    setSelected(null)
    if (!hint) {
      if (game.stock.length > 0) say('hint', 'No moves left on the board — deal a new row from the stock.')
      else say('hint', 'No moves left and no deals left. Try Undo, or start a new game.')
      return
    }
    setHintVisible(true)
    const from = { column: hint.fromColumn, cardIndex: hint.cardIndex }
    say('hint', `Move ${describeCard(game, from)} from column ${hint.fromColumn + 1} onto ${describeTarget(game, hint.toColumn)}.`)
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (menuOpen) {
        if (event.key === 'Escape') closeMenu()
        return
      }
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      const modifier = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (modifier && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((modifier && key === 'z' && event.shiftKey) || (modifier && key === 'y')) {
        event.preventDefault()
        redo()
      } else if (!modifier && key === 'h') {
        showHint()
      } else if (!modifier && key === 'd') {
        dealStock()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <main
      className={`app-shell ${settings.highContrast ? 'high-contrast' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`}
    >
      <div className="app-content">
        {/* The size setting enlarges the toolbar and menu; the cards already fill the screen. */}
        <header className="toolbar" style={{ fontSize: `${settings.scale}rem` }}>
          <h1 className="visually-hidden">Simple Spider Solitaire</h1>
          <div className="controls">
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
          </div>
          {/* Hints, invalid-move reasons and the win message. */}
          <p className={`message ${feedback ? feedback.kind : ''}`} role="status" aria-live="polite">
            {feedback && <span>{feedback.message}</span>}
          </p>
          <div className="meta">
            <span>Time: {elapsed}s</span>
            <span>Moves: {game.moves}</span>
          </div>
          <button
            type="button"
            className="menu-button"
            ref={menuButtonRef}
            aria-expanded={menuOpen}
            aria-controls="side-menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰ Menu
          </button>
        </header>

        <Board
          game={game}
          theme={shownTheme}
          hint={hintVisible ? hint : null}
          selected={selected}
          feedback={feedback}
          onCardClick={handleCardClick}
          onCardDoubleClick={handleCardDoubleClick}
          onColumnClick={handleColumnClick}
          onDrop={moveCards}
          onDealStock={dealStock}
          onEscape={() => setSelected(null)}
        />
      </div>

      {/* Settings, stats and keys live in a panel that slides over the board, so the cards get the full width. */}
      {menuOpen && (
        <>
          <div className="menu-backdrop" onClick={closeMenu} aria-hidden="true" />
          <aside id="side-menu" className="side-menu" aria-label="Menu" style={{ fontSize: `${settings.scale}rem` }}>
            <div className="side-menu-header">
              <h2>Menu</h2>
              <button type="button" onClick={closeMenu} autoFocus>
                ✕ Close
              </button>
            </div>
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
              <p>Running in {isElectronRuntime() ? 'the desktop app' : 'the browser'}</p>
            </section>
            <section className="keys-panel">
              <h2>Keys</h2>
              <p>Arrows move, Enter picks up / drops, Esc cancels</p>
              <p>H hint · D deal · Ctrl+Z undo · Ctrl+Y redo</p>
            </section>
          </aside>
        </>
      )}
    </main>
  )
}

export default App
