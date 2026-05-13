import { Card, CardType } from './card';
import { debugLog } from './debug';

/**
 * Deck Class - Manages the card deck
 */
export class Deck {
  private cards: Card[] = [];
  private discardPile: Card[] = [];

  constructor(cards: Card[]) {
    this.cards = [...cards];
    this.shuffle();
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Draw N cards from the deck
   * Reshuffle discard pile if deck is empty
   */
  draw(count: number): Card[] {
    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (this.cards.length === 0) {
        // Reshuffle the discard pile
        if (this.discardPile.length === 0) {
          console.warn('No cards left in deck or discard pile!');
          break;
        }
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
      }

      drawn.push(this.cards.shift()!);
    }

    return drawn;
  }

  /**
   * Send a card to the discard pile
   */
  discard(card: Card): void {
    this.discardPile.push(card);
  }

  /**
   * Add a card to the deck (for mutations)
   */
  addCard(card: Card): void {
    this.cards.push(card);
    this.shuffle();
  }

  /**
   * Get count of specialized cards by type
   */
  getSpecializedCount(type: CardType): number {
    const allCards = [...this.cards, ...this.discardPile];
    return allCards.filter((c) => c.type === type).length;
  }

  /**
   * Get all specialized card counts
   */
  getSpecializedCounts(): { venom: number; constrict: number; molt: number } {
    return {
      venom: this.getSpecializedCount(CardType.VENOM),
      constrict: this.getSpecializedCount(CardType.CONSTRICT),
      molt: this.getSpecializedCount(CardType.MOLT),
    };
  }

  /**
   * Get remaining cards in deck
   */
  getRemainingCount(): number {
    return this.cards.length;
  }

  /**
   * Get total cards across draw and discard piles
   */
  getTotalCardCount(): number {
    return this.cards.length + this.discardPile.length;
  }

  /**
   * Get all cards currently in deck (for buffing or removing)
   */
  getDeckCards(): Card[] {
    return [...this.cards, ...this.discardPile];
  }

  /**
   * Remove a card from the deck by ID
   */
  removeCard(cardId: string): boolean {
    const activeIndex = this.cards.findIndex((c) => c.id === cardId);
    if (activeIndex !== -1) {
      this.cards.splice(activeIndex, 1);
      debugLog(`Removed card: ${cardId}`);
      return true;
    }

    const discardIndex = this.discardPile.findIndex((c) => c.id === cardId);
    if (discardIndex !== -1) {
      this.discardPile.splice(discardIndex, 1);
      debugLog(`Removed card: ${cardId}`);
      return true;
    }
    return false;
  }
}
