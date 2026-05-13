import { Card, CardType } from './card';
import { Deck } from './deck';
import { GameManager } from './game-manager';
import { UIRenderer } from './ui';

/**
 * Initialize the game with simplified starter deck
 */
function initializeGame(): void {
  const root = document.getElementById('game-root');
  if (!root) {
    throw new Error('Missing #game-root container');
  }

  // Create simplified starter deck: 4 Strike, 4 Coil, 2 Hiss
  const starterDeck: Card[] = [
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

  // Create game instances
  const deck = new Deck(starterDeck);
  const gameManager = new GameManager(deck);
  const uiRenderer = new UIRenderer(gameManager, root);

  // Start the game
  uiRenderer.render();
  gameManager.startBattle();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}
