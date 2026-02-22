import { describe, expect, it } from 'vitest'
import { applyMove, canDealFromStock, canMove, createGame, dealFromStock, isMovableSequence } from './engine'
import type { GameState } from './types'

function constantRandom(): number {
  return 0.12345
}

describe('spider engine', () => {
  it('creates valid game shape', () => {
    const game = createGame(4, constantRandom)
    expect(game.columns).toHaveLength(10)
    expect(game.stock).toHaveLength(5)
    expect(game.columns[0]).toHaveLength(6)
    expect(game.columns[4]).toHaveLength(5)
    expect(game.columns.every((column) => column[column.length - 1].faceUp)).toBe(true)
  })

  it('only moves valid same-suit sequences', () => {
    const game: GameState = {
      ...createGame(1, constantRandom),
      columns: [
        [
          { id: 'a', rank: 9, suit: 'spades', faceUp: true },
          { id: 'b', rank: 8, suit: 'spades', faceUp: true },
        ],
        [{ id: 'c', rank: 10, suit: 'spades', faceUp: true }],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      stock: [],
      completedRuns: 0,
      moves: 0,
      startedAt: 0,
      wonAt: null,
    }

    expect(isMovableSequence(game.columns[0], 0)).toBe(true)
    expect(canMove(game, { fromColumn: 0, cardIndex: 0, toColumn: 1 })).toBe(true)
    const moved = applyMove(game, { fromColumn: 0, cardIndex: 0, toColumn: 1 })
    expect(moved.columns[1]).toHaveLength(3)
    expect(moved.moves).toBe(1)
  })

  it('deals stock only when no column is empty', () => {
    const game = createGame(2, constantRandom)
    expect(canDealFromStock(game)).toBe(true)

    const withEmpty = {
      ...game,
      columns: [[], ...game.columns.slice(1)],
    }
    expect(canDealFromStock(withEmpty)).toBe(false)
  })

  it('deals one card to each column from stock', () => {
    const game = createGame(1, constantRandom)
    const next = dealFromStock(game)
    expect(next.columns[0].length).toBe(game.columns[0].length + 1)
    expect(next.stock.length).toBe(game.stock.length - 1)
  })
})
