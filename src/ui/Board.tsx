import { cardLabel } from '../game/engine'
import type { GameState } from '../game/types'
import type { DeckTheme } from '../themes/lowVisionDeck'
import { suitSymbol } from '../themes/deckThemes'

interface BoardProps {
  game: GameState
  theme: DeckTheme
  highlight?: { fromColumn: number; cardIndex: number; toColumn: number } | null
  onMove: (fromColumn: number, cardIndex: number, toColumn: number) => void
  onDealStock: () => void
}

export function Board({ game, theme, highlight, onMove, onDealStock }: BoardProps) {
  return (
    <section className="board" aria-label="Spider Solitaire board">
      <header className="board-header">
        <div>Completed Runs: {game.completedRuns} / 8</div>
        <button type="button" disabled={game.stock.length === 0} onClick={onDealStock}>
          Deal Stock ({game.stock.length})
        </button>
      </header>

      <div className="columns">
        {game.columns.map((column, columnIndex) => (
          <div
            key={`column-${columnIndex}`}
            className={`column ${highlight?.toColumn === columnIndex ? 'hint-target' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const payload = event.dataTransfer.getData('text/plain')
              const [fromColumnRaw, cardIndexRaw] = payload.split(':')
              onMove(Number(fromColumnRaw), Number(cardIndexRaw), columnIndex)
            }}
          >
            {column.map((card, cardIndex) => {
              const isHintSource = highlight?.fromColumn === columnIndex && highlight.cardIndex === cardIndex
              if (!card.faceUp) {
                return <div key={card.id} className="card card-back" style={{ background: theme.backBg }} />
              }
              return (
                <div
                  key={card.id}
                  className={`card ${isHintSource ? 'hint-source' : ''}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', `${columnIndex}:${cardIndex}`)
                  }}
                  style={{ background: theme.cardBg, color: theme.cardFg }}
                >
                  <div className="rank" style={{ color: theme.suitColor[card.suit] }}>
                    {cardLabel(card.rank)}
                  </div>
                  <div className="suit" style={{ color: theme.suitColor[card.suit] }}>
                    {suitSymbol(card.suit)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
