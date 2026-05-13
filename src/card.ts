/**
 * Card Type Enum - Simplified for MVP
 */
export enum CardType {
  // Starter Cards
  STRIKE = 'STRIKE',      // Damage
  COIL = 'COIL',          // Block
  HISS = 'HISS',          // Utility

  // Mutation Cards (Specialized)
  VENOM = 'VENOM',        // Enhanced damage
  CONSTRICT = 'CONSTRICT', // Enhanced block
  MOLT = 'MOLT',          // Enhanced utility
}

/**
 * Card Class - Simple card representation with reactive support
 */
export class Card {
  id: string;
  name: string;
  type: CardType;
  power: number;
  description: string;
  isReactive: boolean; // Bonus triggered by enemy intent
  reactiveBonus: number; // Extra effect if reactive triggers

  constructor(
    id: string,
    name: string,
    type: CardType,
    power: number,
    description: string,
    isReactive: boolean = false,
    reactiveBonus: number = 0
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.power = power;
    this.description = description;
    this.isReactive = isReactive;
    this.reactiveBonus = reactiveBonus;
  }

  /**
   * Get the color associated with this card's type
   */
  getTypeColor(): string {
    switch (this.type) {
      case CardType.STRIKE:
        return '#FF6B6B'; // Red - Damage
      case CardType.COIL:
        return '#4ECDC4'; // Teal - Block
      case CardType.HISS:
        return '#FFE66D'; // Yellow - Utility
      case CardType.VENOM:
        return '#00FF00'; // Bright Green - Enhanced Damage
      case CardType.CONSTRICT:
        return '#0099FF'; // Bright Blue - Enhanced Block
      case CardType.MOLT:
        return '#BB86FC'; // Purple - Enhanced Utility
      default:
        return '#FFFFFF'; // White fallback
    }
  }
}
