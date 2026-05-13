import { Card, CardType } from './card';
import { Deck } from './deck';
import { Snake } from './snake';
import { Enemy, EnemyIntent } from './enemy';
import { Map, NodeType } from './map';
import { AudioManager } from './audio-manager';

/**
 * Game State Enum
 */
export enum GameState {
  PLANNING = 'PLANNING',
  ACTION = 'ACTION',
  TRANSITION = 'TRANSITION',
  MUTATION_SELECTION = 'MUTATION_SELECTION',
  GAME_OVER = 'GAME_OVER',
}

/**
 * Mutation Option interface
 */
export interface MutationOption {
  id: string;
  name: string;
  cardType: CardType;
  card: Card;
  description: string;
}

/**
 * GameManager Class - Handles game state and logic
 */
export class GameManager {
  private snake: Snake;
  private enemy: Enemy;
  private deck: Deck;
  private map: Map;
  private audioManager: AudioManager;
  private currentHand: Card[] = [];
  private gameState: GameState = GameState.PLANNING;
  private distanceTraveled: number = 0;
  private turn: number = 0;
  private isBossPhase: boolean = false;
  private autoplayEnabled: boolean = false;
  private skipReorderingEnabled: boolean = false;
  private eventCallbacks: { [key: string]: (data: any) => void } = {};
  private availableMutations: MutationOption[] = [];
  private battleCount: number = 0;

  constructor(deck: Deck) {
    this.snake = new Snake();
    this.enemy = new Enemy(100);
    this.map = new Map();
    this.deck = deck;
    this.audioManager = new AudioManager();
    this.audioManager.resume(); // Required for browser autoplay policies
    this.enemy.randomizeIntent(); // Start with randomized intent
    this.setupBossEncounter();
  }

  /**
   * Initialize a new turn
   */
  startTurn(): void {
    this.turn++;
    console.log(`=== TURN ${this.turn} ===`);
    this.gameState = GameState.PLANNING;
    
    // Check for boss encounter
    this.isBossPhase = this.map.getIsBossBattle();
    if (this.isBossPhase) {
      this.audioManager.setPhase('BOSS');
      console.log('BOSS ENCOUNTER!');
    } else {
      this.audioManager.setPhase('PLANNING');
    }
    
    this.snake.resetPrescience();
    this.enemy.randomizeIntent(); // New enemy intent each turn
    this.drawCards();
    this.updateSnakeColor();
    this.emit('turnStarted', { turn: this.turn });
    this.emit('enemyIntentChanged', { enemy: this.enemy });
    this.emit('mapProgressed', { map: this.map });

    // Auto-execute if autoplay is enabled
    if (this.autoplayEnabled) {
      console.log('Autoplay enabled - auto-executing cards');
      setTimeout(() => this.executePlanning(), 1000);
    }
  }

  /**
   * Setup boss encounter if applicable
   */
  private setupBossEncounter(): void {
    if (this.map.getIsBossBattle()) {
      this.isBossPhase = true;
      this.enemy = new Enemy(300); // 3x health for boss
      this.enemy.randomizeIntent();
      console.log('Boss encounter initialized with 300 HP');
    }
  }

  /**
   * Draw 3 cards from the deck
   */
  private drawCards(): void {
    this.currentHand = this.deck.draw(3);
    console.log(`Drew cards: ${this.currentHand.map((c) => c.name).join(', ')}`);
    this.emit('cardsDrawn', { cards: this.currentHand });
  }

  /**
   * Update snake color based on deck composition
   */
  private updateSnakeColor(): void {
    const counts = this.deck.getSpecializedCounts();
    this.snake.morphBySpecializations(counts.venom, counts.constrict, counts.molt);
    console.log(`Snake color updated: ${this.snake.getColorHex()}`);
    this.emit('snakeColorChanged', { color: this.snake.getColorHex() });
  }

  /**
   * Swap two cards in the current hand (Prescience ability)
   */
  swapCards(indexA: number, indexB: number): boolean {
    if (this.gameState !== GameState.PLANNING) {
      console.warn('Can only reorder cards during PLANNING phase');
      return false;
    }

    if (!this.snake.usePrescience()) {
      console.warn('No prescience left!');
      return false;
    }

    if (indexA < 0 || indexB < 0 || indexA >= 3 || indexB >= 3) {
      console.warn('Invalid card indices');
      return false;
    }

    [this.currentHand[indexA], this.currentHand[indexB]] = [
      this.currentHand[indexB],
      this.currentHand[indexA],
    ];

    console.log(
      `Swapped cards: ${this.currentHand[indexA].name} <-> ${this.currentHand[indexB].name}`
    );
    
    // Play blip sound for reordering
    this.audioManager.playBlip();
    
    this.emit('cardsSwapped', {
      indexA,
      indexB,
      hand: this.currentHand,
      prescience: this.snake.getPrescience(),
    });

    return true;
  }

  /**
   * Transition to ACTION phase
   */
  async executePlanning(): Promise<void> {
    console.log('Entering ACTION phase...');
    this.gameState = GameState.ACTION;
    this.audioManager.setPhase('ACTION');
    this.emit('phaseChanged', { phase: GameState.ACTION });

    // Play each card with 0.5s delay
    for (let i = 0; i < this.currentHand.length; i++) {
      const card = this.currentHand[i];
      await this.delay(500);
      this.playCard(card, i);

      // Check if enemy died
      if (!this.enemy.isAlive()) {
        console.log('Enemy defeated!');
        await this.delay(1000);
        break;
      }
    }

    // Transition to next turn
    await this.transitionTurn();
  }

  /**
   * Play a single card
   */
  private playCard(card: Card, index: number): void {
    console.log(
      `Playing card [${index + 1}]: ${card.name} (${card.type}) - Power: ${card.power}`
    );

    this.audioManager.playCrunch();

    // Apply card effect based on simplified types
    switch (card.type) {
      // Starter cards
      case CardType.STRIKE:
        console.log(`  → ${card.name} deals ${card.power} damage!`);
        this.enemy.takeDamage(card.power);
        break;

      case CardType.COIL:
        console.log(`  → ${card.name} blocks and heals ${card.power} HP!`);
        this.snake.heal(card.power);
        break;

      case CardType.HISS:
        console.log(`  → ${card.name} grants special ability! (Power: ${card.power})`);
        // Could add special effects here later
        break;

      // Mutation cards - enhanced versions
      case CardType.VENOM:
        console.log(`  → ${card.name} deals ${card.power} toxic damage!`);
        this.enemy.takeDamage(card.power);
        break;

      case CardType.CONSTRICT:
        console.log(`  → ${card.name} coils tightly, healing ${card.power} HP!`);
        this.snake.heal(card.power);
        break;

      case CardType.MOLT:
        console.log(`  → ${card.name} sheds armor! (Power: ${card.power})`);
        // Could add special effects here later
        break;
    }

    this.enemy.decrementCountdown();
    this.deck.discard(card);
    this.emit('cardPlayed', { card, index, conditionMet });
  }

  /**
   * Check if card condition is met
   */
  /**
   * Transition phase between turns
   */
  private async transitionTurn(): Promise<void> {
    this.gameState = GameState.TRANSITION;
    this.audioManager.setPhase('TRANSITION');
    this.emit('phaseChanged', { phase: GameState.TRANSITION });

    // Increase distance traveled
    this.distanceTraveled += 10;
    console.log(`Distance Traveled: ${this.distanceTraveled}m`);
    this.emit('distanceUpdated', { distance: this.distanceTraveled });

    // Wait for snake to walk to next node
    await this.delay(1500);

    if (!this.snake.isAlive()) {
      this.gameState = GameState.GAME_OVER;
      console.log('Game Over!');
      this.audioManager.playDeathDirge();
      this.emit('gameOver', { distanceTraveled: this.distanceTraveled });
    } else if (!this.enemy.isAlive()) {
      // Enemy defeated
      if (this.isBossPhase) {
        // Boss defeated - victory!
        this.gameState = GameState.GAME_OVER;
        console.log('Boss Defeated! Victory!');
        this.audioManager.playVictoryFanfare();
        this.emit('victory', { distanceTraveled: this.distanceTraveled, turn: this.turn, isBoss: true });
      } else {
        // Regular enemy defeated - show mutation selection
        this.battleCount++;
        this.generateMutationOptions();
        this.gameState = GameState.MUTATION_SELECTION;
        console.log('Showing mutation choices...');
        this.emit('mutationSelection', { mutations: this.availableMutations });
      }
    } else {
      this.startTurn();
    }
  }

  /**
   * Generate 3 random mutation options from any archetype
   */
  private generateMutationOptions(): void {
    const mutations: MutationOption[] = [];
    const mutationTypes = [CardType.VENOM, CardType.CONSTRICT, CardType.MOLT];

    // Shuffle mutation types to pick 3 different ones
    const shuffled = [...mutationTypes].sort(() => Math.random() - 0.5);

    const mutationDefinitions = {
      [CardType.VENOM]: [
        { id: 'venom1', name: 'Viper Fangs', power: 12, description: '+2 Toxic damage' },
        { id: 'venom2', name: 'Venom Sac', power: 14, description: '+3 Poison strike' },
        { id: 'venom3', name: 'Serpent\'s Kiss', power: 11, description: 'Venomous attack' },
      ],
      [CardType.CONSTRICT]: [
        { id: 'constrict1', name: 'Iron Coils', power: 10, description: 'Strengthen defense' },
        { id: 'constrict2', name: 'Boa Wrap', power: 12, description: 'Enhanced protection' },
        { id: 'constrict3', name: 'Python\'s Grip', power: 11, description: 'Bind tightly' },
      ],
      [CardType.MOLT]: [
        { id: 'molt1', name: 'Shed Skin', power: 8, description: 'Renewed form' },
        { id: 'molt2', name: 'Regeneration', power: 9, description: 'Adaptive growth' },
        { id: 'molt3', name: 'Evolution', power: 10, description: 'Transform' },
      ],
    };

    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      const type = shuffled[i];
      const options = mutationDefinitions[type];
      const chosen = options[Math.floor(Math.random() * options.length)];
      
      const card = new Card(
        chosen.id,
        chosen.name,
        type,
        chosen.power,
        chosen.description
      );

      mutations.push({
        id: chosen.id,
        name: chosen.name,
        cardType: type,
        card,
        description: chosen.description,
      });
    }

    this.availableMutations = mutations;
  }

  /**
   * Apply a mutation and continue to next battle
   */
  applyMutation(mutationId: string): void {
    const mutation = this.availableMutations.find((m) => m.id === mutationId);
    if (!mutation) {
      console.warn(`Mutation ${mutationId} not found`);
      return;
    }

    console.log(`Applying mutation: ${mutation.name}`);
    this.deck.addCard(mutation.card);
    this.availableMutations = [];

    // Progress to next node and start new turn
    this.map.progressNode();
    this.turn = 0;
    this.setupBossEncounter();
    this.startTurn();
  }

  /**
   * Helper: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Event emission system
   */
  on(event: string, callback: (data: any) => void): void {
    this.eventCallbacks[event] = callback;
  }

  private emit(event: string, data: any): void {
    const callback = this.eventCallbacks[event];
    if (callback) {
      callback(data);
    }
  }

  // ===== Getters =====
  getGameState(): GameState {
    return this.gameState;
  }

  getCurrentHand(): Card[] {
    return this.currentHand;
  }

  getSnake(): Snake {
    return this.snake;
  }

  getEnemy(): Enemy {
    return this.enemy;
  }

  getMap(): Map {
    return this.map;
  }

  getIsBossPhase(): boolean {
    return this.isBossPhase;
  }

  getDistanceTraveled(): number {
    return this.distanceTraveled;
  }

  getTurn(): number {
    return this.turn;
  }

  getDeck(): Deck {
    return this.deck;
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  getAutoplayEnabled(): boolean {
    return this.autoplayEnabled;
  }

  setAutoplayEnabled(enabled: boolean): void {
    this.autoplayEnabled = enabled;
    console.log(`Autoplay: ${enabled ? 'ON' : 'OFF'}`);
  }

  getSkipReorderingEnabled(): boolean {
    return this.skipReorderingEnabled;
  }

  setSkipReorderingEnabled(enabled: boolean): void {
    this.skipReorderingEnabled = enabled;
    console.log(`Skip Reordering: ${enabled ? 'ON' : 'OFF'}`);
  }

  getAvailableMutations(): MutationOption[] {
    return [...this.availableMutations];
  }

  getBattleCount(): number {
    return this.battleCount;
  }

  /**
   * Get number of nodes cleared (battles won)
   */
  getNodesClearedCount(): number {
    return this.map.getCurrentNodeIndex();
  }

  /**
   * Get count of mutations (specialized cards in deck)
   */
  getMutationCount(): number {
    const counts = this.deck.getSpecializedCounts();
    return counts.venom + counts.constrict + counts.molt;
  }

  /**
   * Calculate final score based on performance
   */
  calculateFinalScore(): number {
    const nodes = this.getNodesClearedCount();
    const mutations = this.getMutationCount();
    const hp = this.snake.getHealth();
    return nodes * 100 + mutations * 50 + hp * 2;
  }

  /**
   * Get snake flavor text based on dominant color/mutations
   */
  getSnakeFlavor(): string {
    const counts = this.deck.getSpecializedCounts();
    
    if (counts.venom > counts.constrict && counts.venom > counts.molt) {
      return 'The Toxic Tyrant';
    } else if (counts.constrict > counts.venom && counts.constrict > counts.molt) {
      return 'The Great Constrictor';
    } else if (counts.molt > counts.venom && counts.molt > counts.constrict) {
      return 'The Immortal Shedder';
    } else {
      return 'The Primordial Hybrid';
    }
  }

  /**
   * Reset the game to initial state
   */
  reset(): void {
    console.log('Game Reset - Rebirth!');
    this.snake = new Snake();
    this.enemy = new Enemy(100);
    this.map = new Map();
    this.currentHand = [];
    this.gameState = GameState.PLANNING;
    this.distanceTraveled = 0;
    this.turn = 0;
    this.isBossPhase = false;
    this.battleCount = 0;
    this.availableMutations = [];

    // Reset deck to starter configuration
    const starterCards: Card[] = [
      new Card('strike1', 'Quick Jab', CardType.STRIKE, 5, 'Fast attack'),
      new Card('strike2', 'Power Slash', CardType.STRIKE, 8, 'Strong blow'),
      new Card('strike3', 'Lunge', CardType.STRIKE, 6, 'Direct strike'),
      new Card('strike4', 'Smash', CardType.STRIKE, 9, 'Heavy attack'),
      new Card('coil1', 'Defend', CardType.COIL, 5, 'Basic protection'),
      new Card('coil2', 'Shield Coil', CardType.COIL, 7, 'Strong defense'),
      new Card('coil3', 'Wrap', CardType.COIL, 6, 'Protective embrace'),
      new Card('coil4', 'Fortress', CardType.COIL, 8, 'Maximum protection'),
      new Card('hiss1', 'Taunt', CardType.HISS, 0, 'Draw attention'),
      new Card('hiss2', 'Distract', CardType.HISS, 0, 'Dodge next attack'),
    ];

    this.deck = new Deck(starterCards);
    this.setupBossEncounter();
    this.emit('gameReset', {});
  }

  /**
   * Check if current outcome is victory
   */
  getIsVictory(): boolean {
    return this.isBossPhase && !this.enemy.isAlive();
  }
}
