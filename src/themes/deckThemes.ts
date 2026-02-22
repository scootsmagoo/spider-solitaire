import type { Suit } from '../game/types'
import { lowVisionDeck, type DeckTheme } from './lowVisionDeck'

const classicTextDeck: DeckTheme = {
  id: 'classic-text',
  label: 'Classic Text',
  cardBg: '#faf8f2',
  cardFg: '#1f2937',
  backBg: '#1e3a8a',
  suitColor: {
    spades: '#111827',
    clubs: '#111827',
    hearts: '#991b1b',
    diamonds: '#991b1b',
  },
}

const darkContrastDeck: DeckTheme = {
  id: 'dark-contrast',
  label: 'Dark Contrast',
  cardBg: '#111827',
  cardFg: '#f9fafb',
  backBg: '#7c3aed',
  suitColor: {
    spades: '#f3f4f6',
    clubs: '#f3f4f6',
    hearts: '#fca5a5',
    diamonds: '#fca5a5',
  },
}

export const deckThemes: DeckTheme[] = [lowVisionDeck, classicTextDeck, darkContrastDeck]

export function suitSymbol(suit: Suit): string {
  if (suit === 'spades') return '♠'
  if (suit === 'hearts') return '♥'
  if (suit === 'clubs') return '♣'
  return '♦'
}
