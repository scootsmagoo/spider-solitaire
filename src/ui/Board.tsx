import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { canMove, cardLabel, isMovableSequence } from '../game/engine'
import type { Card, CardRef, GameState, HintMove } from '../game/types'
import type { DeckTheme } from '../themes/lowVisionDeck'
import { suitSymbol } from '../themes/deckThemes'

export interface BoardFeedback {
  kind: 'info' | 'error' | 'hint' | 'win'
  message: string
  /** Card to shake, for invalid-move feedback. */
  card?: CardRef
  /** Changes every time feedback is set so the shake animation re-triggers. */
  nonce: number
}

interface BoardProps {
  game: GameState
  theme: DeckTheme
  hint: HintMove | null
  selected: CardRef | null
  feedback: BoardFeedback | null
  onCardClick: (ref: CardRef) => void
  onCardDoubleClick: (ref: CardRef) => void
  onColumnClick: (column: number) => void
  onDrop: (from: CardRef, toColumn: number) => void
  onDealStock: () => void
  onEscape: () => void
}

interface DragTracking {
  from: CardRef
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  /** Effective CSS scale of the board (the app shell may be transform-scaled). */
  scale: number
  active: boolean
  lastX: number
  lastY: number
}

interface DragRender {
  from: CardRef
  width: number
  scale: number
}

const DRAG_THRESHOLD_PX = 6
const TOTAL_BOOKS = 8

function sameRef(a: CardRef | null | undefined, b: CardRef): boolean {
  return Boolean(a && a.column === b.column && a.cardIndex === b.cardIndex)
}

/** Deepest card index in a column that can still be picked up as a run. */
function deepestMovable(column: Card[]): number {
  let index = column.length - 1
  while (index > 0 && isMovableSequence(column, index - 1)) index -= 1
  return index
}

function rankClass(rank: number): string {
  if (rank === 10) return 'rank rank-ten'
  if (rank === 12) return 'rank rank-wide rank-queen'
  if (rank === 1 || rank === 13) return 'rank rank-wide'
  return 'rank'
}

function CardFace({ card, theme, className }: { card: Card; theme: DeckTheme; className?: string }) {
  return (
    <div className={`card ${className ?? ''}`} style={{ background: theme.cardBg, color: theme.cardFg }}>
      <div className={rankClass(card.rank)} style={{ color: theme.suitColor[card.suit] }}>
        {cardLabel(card.rank)}
      </div>
      <div className="corner-suit" style={{ color: theme.suitColor[card.suit] }} aria-hidden="true">
        {suitSymbol(card.suit)}
      </div>
      <div className="suit" style={{ color: theme.suitColor[card.suit] }}>
        {suitSymbol(card.suit)}
      </div>
    </div>
  )
}

export function Board({
  game,
  theme,
  hint,
  selected,
  feedback,
  onCardClick,
  onCardDoubleClick,
  onColumnClick,
  onDrop,
  onDealStock,
  onEscape,
}: BoardProps) {
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const layerRef = useRef<HTMLDivElement | null>(null)
  const tracking = useRef<DragTracking | null>(null)
  const [drag, setDrag] = useState<DragRender | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [cursor, setCursor] = useState<CardRef>({ column: 0, cardIndex: 0 })
  const [keyboardActive, setKeyboardActive] = useState(false)

  function positionLayer(clientX: number, clientY: number): void {
    const track = tracking.current
    const layer = layerRef.current
    if (!track || !layer) return
    layer.style.transform = `translate(${clientX - track.offsetX}px, ${clientY - track.offsetY}px) scale(${track.scale})`
  }

  // The drag layer mounts one render after the drag starts; place it where the pointer already is.
  useLayoutEffect(() => {
    const track = tracking.current
    if (!drag || !track) return
    positionLayer(track.lastX, track.lastY)
  }, [drag])

  function columnAtPoint(clientX: number): number | null {
    const index = columnRefs.current.findIndex((element) => {
      const rect = element?.getBoundingClientRect()
      return Boolean(rect && clientX >= rect.left && clientX <= rect.right)
    })
    return index === -1 ? null : index
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>, ref: CardRef): void {
    setKeyboardActive(false)
    if (event.button !== 0) return
    if (!isMovableSequence(game.columns[ref.column], ref.cardIndex)) return
    const rect = event.currentTarget.getBoundingClientRect()
    const width = event.currentTarget.offsetWidth
    tracking.current = {
      from: ref,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width,
      scale: width > 0 ? rect.width / width : 1,
      active: false,
      lastX: event.clientX,
      lastY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const track = tracking.current
    if (!track || track.pointerId !== event.pointerId) return
    track.lastX = event.clientX
    track.lastY = event.clientY
    if (!track.active) {
      const distance = Math.hypot(event.clientX - track.startX, event.clientY - track.startY)
      if (distance < DRAG_THRESHOLD_PX) return
      track.active = true
      setDrag({ from: track.from, width: track.width, scale: track.scale })
    }
    positionLayer(event.clientX, event.clientY)
    const target = columnAtPoint(event.clientX)
    setDropTarget((current) => (current === target ? current : target))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    const track = tracking.current
    if (!track || track.pointerId !== event.pointerId) return
    tracking.current = null
    if (track.active) {
      const target = columnAtPoint(event.clientX)
      setDrag(null)
      setDropTarget(null)
      if (target !== null && target !== track.from.column) onDrop(track.from, target)
      return
    }
    onCardClick(track.from)
  }

  function handlePointerCancel(): void {
    tracking.current = null
    setDrag(null)
    setDropTarget(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    const columns = game.columns
    const column = columns[cursor.column]
    let handled = true

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const delta = event.key === 'ArrowLeft' ? -1 : 1
        const nextColumn = (cursor.column + delta + columns.length) % columns.length
        setCursor({ column: nextColumn, cardIndex: Math.max(0, columns[nextColumn].length - 1) })
        break
      }
      case 'ArrowUp':
        if (column.length > 0) {
          setCursor({ column: cursor.column, cardIndex: Math.max(deepestMovable(column), cursor.cardIndex - 1) })
        }
        break
      case 'ArrowDown':
        if (column.length > 0) {
          setCursor({ column: cursor.column, cardIndex: Math.min(column.length - 1, cursor.cardIndex + 1) })
        }
        break
      case 'Enter':
      case ' ':
        if (column.length === 0) onColumnClick(cursor.column)
        else onCardClick({ column: cursor.column, cardIndex: Math.min(cursor.cardIndex, column.length - 1) })
        break
      case 'Escape':
        onEscape()
        break
      default:
        handled = false
    }

    if (handled) {
      event.preventDefault()
      setKeyboardActive(true)
    }
  }

  const dragCards = drag ? game.columns[drag.from.column].slice(drag.from.cardIndex) : []
  const dropLegal =
    drag && dropTarget !== null && canMove(game, { fromColumn: drag.from.column, cardIndex: drag.from.cardIndex, toColumn: dropTarget })

  return (
    <section
      className={`board ${drag ? 'is-dragging' : ''}`}
      aria-label="Spider Solitaire board"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={() => setKeyboardActive(false)}
    >
      <header className="board-header">
        <button
          type="button"
          className={`stock-pile ${game.stock.length === 0 ? 'empty' : ''}`}
          onClick={onDealStock}
          aria-label={game.stock.length === 0 ? 'No deals left' : `Deal a row of cards, ${game.stock.length} deals left`}
        >
          <span className="stock-cards" aria-hidden="true">
            {Array.from({ length: game.stock.length }, (_, index) => (
              <span key={index} className="stock-card" style={{ background: theme.backBg, left: index * 5 }} />
            ))}
          </span>
          <span className="stock-label">{game.stock.length === 0 ? 'No deals left' : `Deal (${game.stock.length} left)`}</span>
        </button>

        <div className="complete-books-track" aria-label="Complete books">
          {Array.from({ length: TOTAL_BOOKS }, (_, index) => {
            const suit = game.completedBooks[index]
            const complete = Boolean(suit)
            return (
              <div
                key={`book-${index}`}
                className={`book-slot ${complete ? 'complete' : ''}`}
                aria-label={complete ? `Book ${index + 1} complete` : `Book ${index + 1} pending`}
              >
                {suit ? `K–A ${suitSymbol(suit)}` : ''}
              </div>
            )
          })}
        </div>
      </header>

      <p className={`board-banner ${feedback ? feedback.kind : ''}`} role="status" aria-live="polite">
        {feedback?.message ?? ''}
      </p>

      <div className="columns">
        {game.columns.map((column, columnIndex) => {
          const isHintTarget = hint?.toColumn === columnIndex
          const isDropTarget = dropTarget === columnIndex && drag?.from.column !== columnIndex
          const isCursorColumn = keyboardActive && cursor.column === columnIndex
          return (
            <div
              key={`column-${columnIndex}`}
              ref={(element) => {
                columnRefs.current[columnIndex] = element
              }}
              className={[
                'column',
                isHintTarget ? 'hint-target' : '',
                isDropTarget ? (dropLegal ? 'drop-legal' : 'drop-illegal') : '',
                isCursorColumn && column.length === 0 ? 'cursor' : '',
              ].join(' ')}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('.card-slot')) return
                onColumnClick(columnIndex)
              }}
            >
              <div className="column-number" aria-hidden="true">
                {columnIndex + 1}
              </div>
              {column.map((card, cardIndex) => {
                const ref = { column: columnIndex, cardIndex }
                if (!card.faceUp) {
                  return (
                    <div key={card.id} className="card-slot">
                      <div className="card card-back" style={{ background: theme.backBg }} />
                    </div>
                  )
                }
                const isSelected = selected && selected.column === columnIndex && cardIndex >= selected.cardIndex
                const isHintSource = hint && hint.fromColumn === columnIndex && cardIndex >= hint.cardIndex
                const isDragged = drag && drag.from.column === columnIndex && cardIndex >= drag.from.cardIndex
                const isShaking = feedback?.card && sameRef(feedback.card, ref)
                const isCursor = isCursorColumn && Math.min(cursor.cardIndex, column.length - 1) === cardIndex
                return (
                  <div
                    key={isShaking ? `${card.id}-${feedback.nonce}` : card.id}
                    className={[
                      'card-slot',
                      isSelected ? 'selected' : '',
                      isHintSource ? 'hint-source' : '',
                      isDragged ? 'dragging' : '',
                      isShaking ? 'shake' : '',
                      isCursor ? 'cursor' : '',
                      isMovableSequence(column, cardIndex) ? 'movable' : '',
                    ].join(' ')}
                    onPointerDown={(event) => handlePointerDown(event, ref)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onDoubleClick={() => onCardDoubleClick(ref)}
                  >
                    <CardFace card={card} theme={theme} />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {drag &&
        // Portaled to <body>: a transformed ancestor would otherwise re-anchor position: fixed.
        createPortal(
          <div className="drag-layer" ref={layerRef} style={{ width: drag.width }} aria-hidden="true">
            {dragCards.map((card) => (
              <div key={card.id} className="card-slot">
                <CardFace card={card} theme={theme} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </section>
  )
}
