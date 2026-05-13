import { Deck } from './deck';
import { GameManager } from './game-manager';
import { createStarterDeck } from './starter-deck';
import { UIRenderer } from './ui';

/**
 * Initialize the game with simplified starter deck
 */
function initializeGame(): void {
  const root = document.getElementById('game-root');
  if (!root) {
    throw new Error('Missing #game-root container');
  }

  // Create game instances
  const deck = new Deck(createStarterDeck());
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
