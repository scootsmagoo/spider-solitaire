import { canMove } from './engine'
import type { GameState, HintMove } from './types'

export function findHints(state: GameState): HintMove[] {
  const hints: HintMove[] = []

  for (let fromColumn = 0; fromColumn < state.columns.length; fromColumn += 1) {
    const source = state.columns[fromColumn]
    for (let cardIndex = 0; cardIndex < source.length; cardIndex += 1) {
      if (!source[cardIndex].faceUp) continue
      for (let toColumn = 0; toColumn < state.columns.length; toColumn += 1) {
        if (fromColumn === toColumn) continue
        if (
          canMove(state, {
            fromColumn,
            cardIndex,
            toColumn,
          })
        ) {
          hints.push({
            fromColumn,
            cardIndex,
            toColumn,
            reason: 'Legal move',
          })
        }
      }
    }
  }

  return hints
}

export function bestHint(state: GameState): HintMove | null {
  const hints = findHints(state)
  if (hints.length === 0) return null
  return hints.sort((a, b) => a.cardIndex - b.cardIndex)[0]
}

/**
 * Scores a single destination for a card being moved: same-suit targets are
 * strongly preferred, and empty columns are used only as a last resort.
 */
function scoreDestination(state: GameState, fromColumn: number, cardIndex: number, toColumn: number): number {
  const moving = state.columns[fromColumn][cardIndex]
  const target = state.columns[toColumn]
  if (target.length === 0) return 0
  const top = target[target.length - 1]
  return top.suit === moving.suit ? 10 : 2
}

/** Where a single click on this card should send it, or null if it can't move anywhere. */
export function bestDestination(state: GameState, fromColumn: number, cardIndex: number): number | null {
  let best: number | null = null
  let bestScore = -1
  for (let toColumn = 0; toColumn < state.columns.length; toColumn += 1) {
    if (toColumn === fromColumn) continue
    if (!canMove(state, { fromColumn, cardIndex, toColumn })) continue
    const score = scoreDestination(state, fromColumn, cardIndex, toColumn)
    if (score > bestScore) {
      best = toColumn
      bestScore = score
    }
  }
  return best
}
