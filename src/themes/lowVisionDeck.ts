import type { Suit } from '../game/types'

export interface DeckTheme {
  id: string
  label: string
  cardBg: string
  cardFg: string
  backBg: string
  suitColor: Record<Suit, string>
}

export const lowVisionDeck: DeckTheme = {
  id: 'low-vision',
  label: 'Low Vision',
  cardBg: '#ffffff',
  cardFg: '#111111',
  backBg: '#0d47a1',
  suitColor: {
    spades: '#111111',
    clubs: '#111111',
    hearts: '#b00020',
    diamonds: '#b00020',
  },
}
