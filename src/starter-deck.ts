import { Card, CardType } from './card';

export function createStarterDeck(): Card[] {
  return [
    new Card('strike1', 'Strike', CardType.STRIKE, 6, 'Deal 6 damage.'),
    new Card('strike2', 'Strike', CardType.STRIKE, 6, 'Deal 6 damage.'),
    new Card('strike3', 'Strike', CardType.STRIKE, 6, 'Deal 6 damage.'),
    new Card('strike4', 'Strike', CardType.STRIKE, 6, 'Deal 6 damage.'),
    new Card('coil1', 'Coil', CardType.COIL, 6, 'Gain 6 block.'),
    new Card('coil2', 'Coil', CardType.COIL, 6, 'Gain 6 block.'),
    new Card('coil3', 'Coil', CardType.COIL, 6, 'Gain 6 block.'),
    new Card('coil4', 'Coil', CardType.COIL, 6, 'Gain 6 block.'),
    new Card('hiss1', 'Hiss', CardType.HISS, 0, 'Draw 1 card.'),
    new Card('hiss2', 'Hiss', CardType.HISS, 0, 'Draw 1 card.'),
  ];
}
