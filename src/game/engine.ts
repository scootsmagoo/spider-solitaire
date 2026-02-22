import type { Card, GameState, MoveStep, SpiderMode, Suit } from './types'

const SUITS_BY_MODE: Record<SpiderMode, Suit[]> = {
  1: ['spades'],
  2: ['spades', 'hearts'],
  4: ['spades', 'hearts', 'clubs', 'diamonds'],
}

const MODE_SUIT_COPIES: Record<SpiderMode, number> = {
  1: 8,
  2: 4,
  4: 2,
}

function createDeck(mode: SpiderMode): Card[] {
  const suits = SUITS_BY_MODE[mode]
  const copies = MODE_SUIT_COPIES[mode]
  const cards: Card[] = []

  let index = 0
  for (const suit of suits) {
    for (let deckCopy = 0; deckCopy < copies; deckCopy += 1) {
      for (let rank = 1; rank <= 13; rank += 1) {
        cards.push({
          id: `${suit}-${rank}-${deckCopy}-${index}`,
          rank,
          suit,
          faceUp: false,
        })
        index += 1
      }
    }
  }

  return cards
}

function shuffle(cards: Card[], random: () => number): Card[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

function dealInitialColumns(deck: Card[]): Card[][] {
  const columns = Array.from({ length: 10 }, () => [] as Card[])
  for (let column = 0; column < 10; column += 1) {
    const count = column < 4 ? 6 : 5
    for (let i = 0; i < count; i += 1) {
      const card = deck.shift()
      if (!card) {
        throw new Error('Deck underflow while dealing columns')
      }
      columns[column].push(card)
    }
    columns[column][columns[column].length - 1].faceUp = true
  }
  return columns
}

function dealStock(deck: Card[]): Card[][] {
  const stock: Card[][] = []
  while (deck.length > 0) {
    stock.push(deck.splice(0, 10))
  }
  return stock
}

export function createGame(mode: SpiderMode, random: () => number = Math.random): GameState {
  const deck = shuffle(createDeck(mode), random)
  const columns = dealInitialColumns(deck)
  const stock = dealStock(deck)

  return {
    mode,
    columns,
    stock,
    completedRuns: 0,
    moves: 0,
    startedAt: Date.now(),
    wonAt: null,
  }
}

export function cardLabel(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

export function isMovableSequence(column: Card[], cardIndex: number): boolean {
  if (cardIndex < 0 || cardIndex >= column.length) {
    return false
  }

  for (let i = cardIndex; i < column.length - 1; i += 1) {
    const current = column[i]
    const next = column[i + 1]
    if (!current.faceUp || !next.faceUp) return false
    if (current.rank !== next.rank + 1) return false
    if (current.suit !== next.suit) return false
  }

  return column[cardIndex].faceUp
}

function canPlaceOnTarget(movingCard: Card, targetColumn: Card[]): boolean {
  if (targetColumn.length === 0) return true
  const targetTop = targetColumn[targetColumn.length - 1]
  return targetTop.faceUp && targetTop.rank === movingCard.rank + 1
}

export function canMove(state: GameState, step: MoveStep): boolean {
  const source = state.columns[step.fromColumn]
  const target = state.columns[step.toColumn]

  if (!source || !target) return false
  if (step.fromColumn === step.toColumn) return false
  if (!isMovableSequence(source, step.cardIndex)) return false

  return canPlaceOnTarget(source[step.cardIndex], target)
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    columns: state.columns.map((column) => column.map((card) => ({ ...card }))),
    stock: state.stock.map((pile) => pile.map((card) => ({ ...card }))),
  }
}

function exposeTopCardIfNeeded(column: Card[]): void {
  if (column.length > 0 && !column[column.length - 1].faceUp) {
    column[column.length - 1].faceUp = true
  }
}

function removeCompletedRuns(state: GameState): void {
  for (const column of state.columns) {
    if (column.length < 13) continue

    const run = column.slice(column.length - 13)
    if (!run.every((card) => card.faceUp)) continue
    const suit = run[0].suit
    let complete = true
    for (let i = 0; i < run.length; i += 1) {
      if (run[i].rank !== 13 - i || run[i].suit !== suit) {
        complete = false
        break
      }
    }

    if (complete) {
      column.splice(column.length - 13, 13)
      state.completedRuns += 1
      exposeTopCardIfNeeded(column)
      if (state.completedRuns === 8 && state.wonAt === null) {
        state.wonAt = Date.now()
      }
    }
  }
}

export function applyMove(state: GameState, step: MoveStep): GameState {
  if (!canMove(state, step)) {
    return state
  }

  const next = cloneState(state)
  const source = next.columns[step.fromColumn]
  const target = next.columns[step.toColumn]
  const moving = source.splice(step.cardIndex)
  target.push(...moving)
  exposeTopCardIfNeeded(source)
  removeCompletedRuns(next)
  next.moves += 1
  return next
}

export function canDealFromStock(state: GameState): boolean {
  if (state.stock.length === 0) return false
  return state.columns.every((column) => column.length > 0)
}

export function dealFromStock(state: GameState): GameState {
  if (!canDealFromStock(state)) return state
  const next = cloneState(state)
  const pile = next.stock.shift()
  if (!pile || pile.length !== 10) return state

  for (let column = 0; column < 10; column += 1) {
    const card = pile[column]
    card.faceUp = true
    next.columns[column].push(card)
  }

  removeCompletedRuns(next)
  next.moves += 1
  return next
}
