export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'

export type SpiderMode = 1 | 2 | 4

export interface Card {
  id: string
  rank: number
  suit: Suit
  faceUp: boolean
}

export interface GameState {
  mode: SpiderMode
  columns: Card[][]
  stock: Card[][]
  completedRuns: number
  moves: number
  startedAt: number
  wonAt: number | null
}

export interface MoveStep {
  fromColumn: number
  cardIndex: number
  toColumn: number
}

export interface HintMove {
  fromColumn: number
  cardIndex: number
  toColumn: number
  reason: string
}
