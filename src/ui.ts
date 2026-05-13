import { GameManager, GameState, RestSiteAction } from './game-manager';
import { Card, CardType } from './card';
import { Enemy, EnemyIntent } from './enemy';
import { NodeType } from './map';

/**
 * UIRenderer Class - Handles all visual rendering
 */
export class UIRenderer {
  private gameManager: GameManager;
  private container: HTMLElement;
  private parallaxOffset: number = 0;
  private consoleMessage: string = 'The serpent waits for the first encounter.';
  private awaitingShedSelection: boolean = false;

  constructor(gameManager: GameManager, container: string | HTMLElement) {
    this.gameManager = gameManager;
    this.container = typeof container === 'string'
      ? document.getElementById(container)!
      : container;
    this.setupEventListeners();
    this.attachGlobalHandlers();
  }

  /**
   * Setup event listeners from game manager
   */
  private setupEventListeners(): void {
    this.gameManager.on('battleStarted', (data) => {
      this.awaitingShedSelection = false;
      this.consoleMessage = data.isBoss ? 'Boss encounter engaged.' : `Battle ${data.turn} begins.`;
      this.render();
    });
    this.gameManager.on('cardsDrawn', () => this.render());
    this.gameManager.on('phaseChanged', () => this.render());
    this.gameManager.on('cardPlayed', (data) => this.onCardPlayed(data));
    this.gameManager.on('snakeColorChanged', () => this.render());
    this.gameManager.on('distanceUpdated', () => this.render());
    this.gameManager.on('enemyIntentChanged', () => this.render());
    this.gameManager.on('mapProgressed', () => this.render());
    this.gameManager.on('enemyActed', (data) => {
      this.consoleMessage = data.damage > 0
        ? `Enemy hits for ${data.damage} damage.`
        : `Enemy empowers its next attack by ${data.empower}.`;
      this.render();
    });
    this.gameManager.on('rewardPhase', () => {
      this.consoleMessage = 'Choose a mutation to evolve the deck.';
      this.render();
    });
    this.gameManager.on('restPhase', () => {
      this.consoleMessage = 'Choose how the snake recovers before moving on.';
      this.render();
    });
    this.gameManager.on('restActionApplied', (data) => {
      this.awaitingShedSelection = data.action === RestSiteAction.SHED;
      this.consoleMessage = this.describeRestAction(data.action, data.healAmount);
      this.render();
    });
    this.gameManager.on('cardRemoved', (data) => {
      this.awaitingShedSelection = false;
      this.consoleMessage = data.removed ? 'A card was shed from the deck.' : 'That card could not be removed.';
      this.render();
    });
    this.gameManager.on('gameOver', () => {
      this.consoleMessage = 'The run has ended.';
      this.render();
    });
    this.gameManager.on('victory', () => {
      this.consoleMessage = 'The serpent has conquered the route.';
      this.render();
    });
    this.gameManager.on('gameReset', () => {
      this.awaitingShedSelection = false;
      this.consoleMessage = 'A new serpent awakens.';
      this.render();
    });
    this.gameManager.on('pauseChanged', (data) => {
      this.consoleMessage = data.isPaused ? 'Run paused.' : 'Run resumed.';
      this.render();
    });
  }

  private attachGlobalHandlers(): void {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.gameManager.togglePaused();
      }
    });
  }

  /**
   * Handle card played event - add visual juice
   */
  private onCardPlayed(data: { card: Card; index: number; reactiveTriggered?: boolean }): void {
    const card = data.card;
    const cardElements = document.querySelectorAll('.card');
    this.consoleMessage = `Played ${card.name}.`;

    if (cardElements.length > data.index) {
      const cardEl = cardElements[data.index] as HTMLElement;
      
      // Pulse animation
      cardEl.classList.add('card-pulse');
      if (data.reactiveTriggered === false) {
        cardEl.classList.add('card-blocked');
      }
      setTimeout(() => {
        cardEl.classList.remove('card-pulse');
        cardEl.classList.remove('card-blocked');
      }, 600);

      // Screen shake for CONSTRICT cards
      if (card.type === CardType.CONSTRICT) {
        this.screenShake();
      }
    }

    this.render();
  }

  /**
   * Screen shake effect
   */
  private screenShake(): void {
    const gameBoard = document.querySelector('.game-board') as HTMLElement;
    if (!gameBoard) return;

    gameBoard.classList.add('shake');
    setTimeout(() => gameBoard.classList.remove('shake'), 300);
  }

  /**
   * Update parallax background offset
   */
  private updateParallax(): void {
    const distance = this.gameManager.getDistanceTraveled();
    this.parallaxOffset = (distance * 2) % 800; // Wrap around
  }

  /**
   * Main render function
   */
  render(): void {
    this.updateParallax();
    this.container.innerHTML = this.generateHTML();
    this.attachEventHandlers();
  }

  /**
   * Generate HTML content
   */
  private generateHTML(): string {
    const gameState = this.gameManager.getGameState();
    if (gameState === GameState.GAME_OVER) {
      return this.generateEndScreenHTML();
    }

    const baseScreen = gameState === GameState.REWARD
      ? `${this.generateMainScreenHTML()}${this.generateRewardSelectionHTML()}`
      : gameState === GameState.REST
        ? `${this.generateMainScreenHTML()}${this.generateRestSelectionHTML()}`
        : this.generateMainScreenHTML();

    return this.gameManager.getIsPaused()
      ? `${baseScreen}${this.generatePauseOverlayHTML()}`
      : baseScreen;

  }

  private generateMainScreenHTML(): string {
    const snake = this.gameManager.getSnake();
    const turn = this.gameManager.getTurn();
    const distance = this.gameManager.getDistanceTraveled();
    const map = this.gameManager.getMap();
    const isBoss = this.gameManager.getIsBossPhase();
    const gameState = this.gameManager.getGameState();

    const enemy = this.gameManager.getEnemy();
    const hand = this.gameManager.getCurrentHand();
    const snakeVisual = snake.getVisualState();
    const snakeScale = snake.getBodyScale();
    const volume = Math.round(this.gameManager.getAudioManager().getVolume() * 100);

    return `
      <div class="game-container">
        <!-- Parallax Background -->
        <div class="parallax-background ${isBoss ? 'boss-bg' : ''}">
          <div class="parallax-layer parallax-far" style="transform: translateX(-${this.parallaxOffset * 0.3}px);"></div>
          <div class="parallax-layer parallax-mid" style="transform: translateX(-${this.parallaxOffset * 0.6}px);"></div>
        </div>

        <!-- Top Controls -->
        <div class="top-controls">
          <div class="volume-control">
            <label>🔊 Volume:</label>
            <input type="range" id="volume-slider" min="0" max="100" value="${volume}" class="volume-slider">
          </div>
          <div class="game-modes">
            <span>${isBoss ? 'Boss node' : 'Battle node'}</span>
            <button id="pause-btn" class="btn pause-btn">${this.gameManager.getIsPaused() ? 'RESUME' : 'PAUSE'}</button>
          </div>
        </div>

        <!-- Map Tracker -->
        <div class="map-tracker">
          ${this.generateMapHTML(map)}
        </div>

        <!-- Header -->
        <div class="header">
          <h1>${isBoss ? '👑 BOSS' : '🐍'} SNAKE GOD</h1>
          <div class="game-stats">
            <span>Turn: <strong>${turn}</strong></span>
            <span>Distance: <strong>${distance}m</strong></span>
            <span>Health: <strong>${snake.getHealth()}/${snake.getMaxHealth()}</strong></span>
            <span>Block: <strong>${snake.getBlock()}</strong></span>
            <span>Mutations: <strong>${this.gameManager.getMutationCount()}</strong></span>
          </div>
        </div>

        <!-- Game Board -->
        <div class="game-board ${isBoss ? 'boss-battle' : ''}">
          <!-- Snake vs Enemy Arena -->
          <div class="arena">
            <!-- Snake Side -->
            <div class="arena-side snake-side">
              <div class="snake-container">
                <div class="snake ${snakeVisual.isFanged ? 'fanged' : ''} ${snakeVisual.isArmored ? 'armored' : ''}" style="background-color: ${snake.getColorHex()}; transform: scale(${snakeScale}); ${snake.isCurrentlySlithering() ? 'animation: slither 0.6s ease-in-out infinite;' : ''}"></div>
              </div>
              <div class="snake-info">
                <p>The Snake</p>
                <span>Cycle: <strong>${this.gameManager.getCardsPlayedThisSet()}/3</strong></span>
                <p class="snake-health-display">${snake.getHealth()}/${snake.getMaxHealth()}</p>
              </div>
            </div>

            <!-- Enemy Side -->
            <div class="arena-side enemy-side">
              ${this.generateEnemyHTML(enemy)}
            </div>
          </div>

          <!-- Cards Hand -->
          <div class="hand">
            <h2>Frontline</h2>
            <div class="cards-row">
              ${this.generateCardHTML(hand)}
            </div>
          </div>

          <!-- Game Status -->
          <div class="status">
            <p><strong>Phase:</strong> ${gameState}</p>
            ${this.generatePhaseActions()}
          </div>
        </div>

        <!-- Deck Info -->
        <div class="deck-info">
          <p>Remaining Cards: <strong>${this.gameManager.getDeck().getRemainingCount()}</strong></p>
          <div class="composition">
            ${this.generateCompositionBar()}
          </div>
        </div>

        <!-- Console Log -->
        <div class="console">
          <p class="console-text" id="console-text">${this.consoleMessage}</p>
        </div>

        <!-- CRT Scanlines -->
        <div class="scanlines"></div>
      </div>
    `;
  }

  /**
   * Generate reward selection UI
   */
  private generateRewardSelectionHTML(): string {
    const mutations = this.gameManager.getAvailableMutations();
    const battleCount = this.gameManager.getBattleCount();

    const mutationCards = mutations.map((m) => `
      <div class="mutation-option" data-mutation-id="${m.id}">
        <div class="mutation-card" style="border-color: ${m.card.getTypeColor()}">
          <div class="mutation-icon">${this.getMutationIcon(m.cardType)}</div>
          <h3 class="mutation-name">${m.name}</h3>
          <p class="mutation-desc">${m.description}</p>
          <p class="mutation-power">Power: ${m.card.power}</p>
          <button class="mutation-btn" data-mutation-id="${m.id}">SELECT</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="mutation-overlay">
        <div class="mutation-selection">
          <h1>MUTATION UNLOCKED</h1>
          <p class="mutation-subtitle">Battle ${battleCount} complete. Choose your evolution.</p>
          ${this.generateDeckPreviewHTML('Current Deck')}
          <div class="mutation-options">
            ${mutationCards}
          </div>
        </div>
      </div>
    `;
  }

  private generatePauseOverlayHTML(): string {
    return `
      <div class="pause-overlay">
        <div class="pause-panel">
          <p class="pause-kicker">ESC toggles pause</p>
          <h1>PAUSED</h1>
          <p class="mutation-subtitle">Card timers, enemy actions, and slither motion are frozen.</p>
          <div class="actions pause-actions">
            <button id="resume-btn" class="btn btn-primary">RESUME</button>
            <button id="quit-btn" class="btn">QUIT</button>
          </div>
        </div>
      </div>
    `;
  }

  private generateRestSelectionHTML(): string {
    if (this.awaitingShedSelection) {
      return this.generateShedSelectionHTML();
    }

    const actions = this.gameManager.getAvailableRestSites();
    const actionCards = actions.map((action) => `
      <div class="mutation-option">
        <div class="mutation-card rest-card" style="border-color: ${this.getRestActionColor(action)}">
          <div class="mutation-icon">${this.getRestActionIcon(action)}</div>
          <h3 class="mutation-name">${action}</h3>
          <p class="mutation-desc">${this.getRestActionDescription(action)}</p>
          <button class="mutation-btn rest-btn" data-rest-action="${action}">SELECT</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="mutation-overlay">
        <div class="mutation-selection">
          <h1>SHEDDING SITE</h1>
          <p class="mutation-subtitle">Choose one recovery path before the next node.</p>
          ${this.generateDeckPreviewHTML('Current Deck')}
          <div class="mutation-options">
            ${actionCards}
          </div>
        </div>
      </div>
    `;
  }

  private generateShedSelectionHTML(): string {
    const deckCards = this.gameManager.getDeck().getDeckCards();
    const cardOptions = deckCards.map((card) => `
      <div class="mutation-option">
        <div class="mutation-card shed-card" style="border-color: ${card.getTypeColor()}">
          <div class="card-name">${card.name}</div>
          <div class="card-type">${card.type}</div>
          <div class="card-power">${card.power}</div>
          <p class="mutation-desc">${card.description}</p>
          <button class="mutation-btn shed-btn" data-card-id="${card.id}">REMOVE</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="mutation-overlay">
        <div class="mutation-selection">
          <h1>SHED A CARD</h1>
          <p class="mutation-subtitle">Choose one card to remove from the run.</p>
          ${this.generateDeckPreviewHTML('Current Deck')}
          <div class="mutation-options">
            ${cardOptions}
          </div>
        </div>
      </div>
    `;
  }

  private generateDeckPreviewHTML(title: string): string {
    const cards = this.gameManager.getDeck().getDeckCards();
    const cardList = cards
      .map((card) => `<span class="deck-chip deck-chip-${card.type.toLowerCase()}">${card.name}</span>`)
      .join('');

    return `
      <div class="deck-preview">
        <p class="deck-preview-title">${title} · ${cards.length} cards</p>
        <div class="deck-chip-list">${cardList}</div>
      </div>
    `;
  }

  /**
   * Get emoji icon for mutation type
   */
  private getMutationIcon(cardType: CardType): string {
    switch (cardType) {
      case CardType.VENOM:
        return '🐍';
      case CardType.CONSTRICT:
        return '🔗';
      case CardType.MOLT:
        return '✨';
      default:
        return '❓';
    }
  }

  /**
   * Generate end screen (victory/defeat)
   */
  private generateEndScreenHTML(): string {
    const isVictory = this.gameManager.getIsVictory();
    const snake = this.gameManager.getSnake();
    const nodeCleared = this.gameManager.getNodesClearedCount();
    const mutations = this.gameManager.getMutationCount();
    const hp = snake.getHealth();
    const score = this.gameManager.calculateFinalScore();
    const flavor = this.gameManager.getSnakeFlavor();
    const snakeColor = snake.getColorHex();
    const snakeVisual = snake.getVisualState();

    return `
      <div class="game-container">
        <div class="end-screen-overlay">
          <div class="end-screen-content">
            <h1 class="end-title ${isVictory ? 'victory' : 'defeat'}">
              ${isVictory ? '🏆 VICTORY 🏆' : '💀 DEFEAT 💀'}
            </h1>
            
            <div class="final-form-section">
              <div class="final-snake ${snakeVisual.isFanged ? 'fanged' : ''} ${snakeVisual.isArmored ? 'armored' : ''}" 
                   style="background-color: ${snakeColor};"></div>
              <p class="final-form-title">"${flavor}"</p>
            </div>

            <div class="stat-summary">
              <div class="stat-row">
                <span class="stat-label">Nodes Cleared:</span>
                <span class="stat-value">${nodeCleared}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Mutations Unlocked:</span>
                <span class="stat-value">${mutations}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">HP Remaining:</span>
                <span class="stat-value">${hp}/${snake.getMaxHealth()}</span>
              </div>
              <div class="stat-row final-score">
                <span class="stat-label">Final Score:</span>
                <span class="stat-value">${score}</span>
              </div>
            </div>

            <button class="rebirth-btn" id="rebirth-btn">🔄 REBIRTH 🔄</button>
          </div>
        </div>
        <div class="scanlines"></div>
      </div>
    `;
  }

  /**
   * Generate map tracker HTML
   */
  private generateMapHTML(map: { getNodes(): NodeType[]; getCurrentNodeIndex(): number }): string {
    const nodes = map.getNodes();
    const currentIndex = map.getCurrentNodeIndex();

    return `
      <div class="map-nodes">
        ${nodes
          .map((node: NodeType, index: number) => {
            const isActive = index === currentIndex;
            const isPassed = index < currentIndex;
            const nodeClass = `map-node ${node === NodeType.BOSS ? 'boss-node' : 'battle-node'} ${
              isActive ? 'active' : ''
            } ${isPassed ? 'passed' : ''}`;

            return `
              <div class="${nodeClass}">
                <div class="node-content">${node === NodeType.BOSS ? '👑' : '⚔️'}</div>
                ${isActive ? '<div class="node-snake">🐍</div>' : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  /**
   * Generate enemy display HTML
   */
  private generateEnemyHTML(enemy: Enemy): string {
    const healthSegments = Math.ceil(enemy.getMaxHealth() / 20); // Segmented health bar
    const filledSegments = Math.ceil((enemy.getHealth() / enemy.getMaxHealth()) * healthSegments);
    const intent = enemy.getCurrentIntent();
    const intentValue = intent === EnemyIntent.ATTACK ? `${enemy.getDamage()} DMG` : `+${enemy.getDamage()} NEXT ATK`;

    return `
      <div class="enemy-display">
        <div class="enemy-health">
          <div class="health-bar-container">
            ${Array(healthSegments)
              .fill(0)
              .map(
                (_, i) => `
              <div class="health-segment ${i < filledSegments ? 'filled' : 'empty'}"></div>
            `
              )
              .join('')}
          </div>
          <p class="health-text">${enemy.getHealth()}/${enemy.getMaxHealth()}</p>
        </div>

        <div class="enemy-sprite">👹</div>

        <div class="enemy-intent">
          <div class="intent-icon">${enemy.getIntentIcon()}</div>
          <div class="intent-value ${intent === EnemyIntent.ATTACK ? 'attack' : 'empower'}">${intentValue}</div>
        </div>

        <div class="enemy-countdown">
          <p class="countdown-text">Acts in: <strong>${enemy.getCardCountdown()}</strong></p>
        </div>
      </div>
    `;
  }

  /**
   * Generate card HTML elements
   */
  private generateCardHTML(hand: Card[]): string {
    if (hand.length === 0) {
      return '<p class="action-text">Drawing the next frontline...</p>';
    }

    return hand
      .map((card, index) => {
        const cardColor = card.getTypeColor();

        return `
          <div class="card" style="border-color: ${cardColor};" data-index="${index}">
            <div class="card-index">${index + 1}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-type">${card.type}</div>
            <div class="card-power">${card.power}</div>
            <div class="card-description">${card.description}</div>
            ${card.isReactive ? `<div class="card-hint">Reactive +${card.reactiveBonus}</div>` : ''}
          </div>
        `;
      })
      .join('');
  }

  /**
   * Generate phase-specific actions
   */
  private generatePhaseActions(): string {
    const gameState = this.gameManager.getGameState();

    if (gameState === GameState.BATTLE) {
      return '<p class="action-text">Cards resolve automatically. Watch the encounter unfold.</p>';
    }

    if (gameState === GameState.TRANSITION) {
      return '<p class="action-text">The serpent moves to the next node.</p>';
    }

    if (gameState === GameState.REWARD) {
      return '<p class="action-text">Evolution available. Pick one mutation.</p>';
    }

    if (gameState === GameState.REST) {
      return '<p class="action-text">The shedding site offers one brief recovery.</p>';
    }

    return '';
  }

  /**
   * Generate composition bar
   */
  private generateCompositionBar(): string {
    const counts = this.gameManager.getDeck().getSpecializedCounts();
    const total = Math.max(1, this.gameManager.getDeck().getTotalCardCount());
    const venomPercent = Math.round((counts.venom / total) * 100);
    const constrictPercent = Math.round((counts.constrict / total) * 100);
    const moltingPercent = Math.round((counts.molt / total) * 100);

    return `
      <div class="composition-bar">
        <div class="comp-segment venom" style="width: ${venomPercent}%;" title="Venom ${venomPercent}%"></div>
        <div class="comp-segment constrict" style="width: ${constrictPercent}%;" title="Constrict ${constrictPercent}%"></div>
        <div class="comp-segment molting" style="width: ${moltingPercent}%;" title="Molting ${moltingPercent}%"></div>
      </div>
      <div class="composition-labels">
        <span>🟢 ${venomPercent}%</span>
        <span>🔵 ${constrictPercent}%</span>
        <span>🟡 ${moltingPercent}%</span>
      </div>
    `;
  }

  /**
   * Attach event handlers to interactive elements
   */
  private attachEventHandlers(): void {
    // Volume control
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        this.gameManager.getAudioManager().setVolume(value);
      });
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.gameManager.togglePaused();
      });
    }

    // Mutation selection buttons
    document.querySelectorAll('.mutation-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mutationId = btn.getAttribute('data-mutation-id');
        if (mutationId) {
          this.gameManager.applyMutation(mutationId);
        }
      });
    });

    document.querySelectorAll('.rest-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-rest-action') as RestSiteAction | null;
        if (action) {
          this.gameManager.applyRestAction(action);
        }
      });
    });

    document.querySelectorAll('.shed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cardId = btn.getAttribute('data-card-id');
        if (cardId) {
          this.gameManager.removeCardFromDeck(cardId);
        }
      });
    });

    // Rebirth button
    const rebirthBtn = document.getElementById('rebirth-btn');
    if (rebirthBtn) {
      rebirthBtn.addEventListener('click', () => {
        this.gameManager.reset();
        this.gameManager.startBattle();
      });
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.gameManager.setPaused(false);
      });
    }

    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        this.gameManager.quitRun();
      });
    }
  }

  private describeRestAction(action: RestSiteAction, healAmount?: number): string {
    switch (action) {
      case RestSiteAction.CONSUME:
        return `Consume restores ${healAmount ?? 0} HP from missing health.`;
      case RestSiteAction.HARDEN:
        return 'Harden reinforces random cards.';
      case RestSiteAction.SHED:
        return 'Choose a card to shed from the deck. Costs 4 max HP.';
      default:
        return 'The serpent pauses at the rest site.';
    }
  }

  private getRestActionColor(action: RestSiteAction): string {
    switch (action) {
      case RestSiteAction.CONSUME:
        return '#00ff88';
      case RestSiteAction.SHED:
        return '#ffcc00';
      case RestSiteAction.HARDEN:
        return '#66ccff';
      default:
        return '#00ff00';
    }
  }

  private getRestActionIcon(action: RestSiteAction): string {
    switch (action) {
      case RestSiteAction.CONSUME:
        return '🍖';
      case RestSiteAction.SHED:
        return '🪶';
      case RestSiteAction.HARDEN:
        return '🛡️';
      default:
        return '❓';
    }
  }

  private getRestActionDescription(action: RestSiteAction): string {
    switch (action) {
      case RestSiteAction.CONSUME:
        return 'Restore 25% of missing HP.';
      case RestSiteAction.SHED:
        return 'Remove one card from the deck and lose 4 max HP.';
      case RestSiteAction.HARDEN:
        return 'Buff two random cards by +2 power.';
      default:
        return 'Pause and recover.';
    }
  }
}
