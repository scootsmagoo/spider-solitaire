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
