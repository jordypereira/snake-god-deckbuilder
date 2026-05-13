import { Card, CardType } from './card';
import { Deck } from './deck';
import { Snake } from './snake';
import { Enemy, EnemyIntent } from './enemy';
import { Map } from './map';
import { AudioManager } from './audio-manager';
import { debugLog } from './debug';
import { createStarterDeck } from './starter-deck';

/**
 * Game State Enum - Loop Hero style progression
 */
export enum GameState {
  BATTLE = 'BATTLE',           // Snake auto-plays cards
  REWARD = 'REWARD',           // Choose mutation
  REST = 'REST',               // Choose shedding site (CONSUME/SHED/HARDEN)
  TRANSITION = 'TRANSITION',   // Moving to next zone
  READY = 'READY',             // Waiting for player to start next fight
  GAME_OVER = 'GAME_OVER',     // Victory/Defeat
}

/**
 * Rest Site Option - Post-reward choices
 */
export enum RestSiteAction {
  CONSUME = 'CONSUME',    // Heal 30% max HP
  SHED = 'SHED',          // Remove 1 card from deck
  HARDEN = 'HARDEN',      // Buff 2 random cards (+2 power each)
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

interface GameEventMap {
  battleStarted: { turn: number; isBoss: boolean };
  cardsDrawn: { cards: Card[] };
  phaseChanged: { phase: GameState };
  cardPlayed: { card: Card; index: number; reactiveTriggered?: boolean };
  snakeColorChanged: { color: string };
  distanceUpdated: { distance: number };
  enemyIntentChanged: { enemy: Enemy };
  mapProgressed: { map: Map };
  enemyActed: { intent: EnemyIntent; damage: number; empower: number };
  rewardPhase: { mutations: MutationOption[]; goldReward: number; totalGold: number };
  restPhase: { sites: RestSiteAction[] };
  readyToFight: {};
  restActionApplied: { action: RestSiteAction; healAmount?: number; buffs?: Card[] };
  cardRemoved: { cardId: string; removed: boolean; maxHealth: number };
  gameOver: { victory: boolean; quit?: boolean };
  victory: { distanceTraveled: number; turn: number };
  gameReset: {};
  pauseChanged: { isPaused: boolean };
}

type MutationCardType = CardType.VENOM | CardType.CONSTRICT | CardType.MOLT;

interface MutationDefinition {
  id: string;
  name: string;
  power: number;
  description: string;
  reactive: boolean;
  bonus: number;
}

const PLAYER_MAX_HEALTH = 40;
const ENEMY_MAX_HEALTH = 34;
const CARD_PLAY_DELAY_MS = 250;
const BATTLE_START_DELAY_MS = 300;
const TRANSITION_DELAY_MS = 1200;
const REST_ACTION_DELAY_MS = 700;
const SHED_MAX_HP_COST = 4;
const GOLD_REWARD_MIN = 12;
const GOLD_REWARD_MAX = 22;

/**
 * GameManager Class - Loop Hero auto-battler logic
 */
export class GameManager {
  private snake: Snake;
  private enemy: Enemy;
  private deck: Deck;
  private map: Map;
  private audioManager: AudioManager;
  private currentHand: Card[] = [];
  private gameState: GameState = GameState.BATTLE;
  private distanceTraveled: number = 0;
  private turn: number = 0;
  private isBossPhase: boolean = false;
  private eventCallbacks: Partial<{
    [K in keyof GameEventMap]: Array<(data: GameEventMap[K]) => void>;
  }> = {};
  private availableMutations: MutationOption[] = [];
  private availableRestSites: RestSiteAction[] = [RestSiteAction.CONSUME, RestSiteAction.SHED, RestSiteAction.HARDEN];
  private battleCount: number = 0;
  private gold: number = 0;
  private lastGoldReward: number = 0;
  private autoPlayInProgress: boolean = false;
  private isPaused: boolean = false;
  private cardsPlayedThisSet: number = 0;

  constructor(deck: Deck) {
    this.snake = new Snake(PLAYER_MAX_HEALTH);
    this.enemy = new Enemy(ENEMY_MAX_HEALTH);
    this.map = new Map();
    this.deck = deck;
    this.audioManager = new AudioManager();
    this.audioManager.resume();
    this.setupEncounter();
    this.calculateSnakeColor();
  }

  startRun(): void {
    this.autoPlayInProgress = false;
    this.currentHand = [];
    this.cardsPlayedThisSet = 0;
    this.isPaused = false;
    this.snake.clearBlock();
    this.snake.stopSlithering();
    this.triggerRewardPhase();
  }

  /**
   * Start a new battle
   */
  startBattle(): void {
    this.turn++;
    debugLog(`=== BATTLE ${this.turn} ===`);
    this.gameState = GameState.BATTLE;
    this.autoPlayInProgress = false;
    this.currentHand = [];
    this.snake.clearBlock();
    this.cardsPlayedThisSet = 0;
    
    this.isBossPhase = this.map.getIsBossBattle();
    if (this.isBossPhase) {
      this.audioManager.setPhase('ACTION'); // Boss uses action phase
      debugLog('BOSS ENCOUNTER!');
    } else {
      this.audioManager.setPhase('ACTION');
    }
    
    this.enemy.randomizeIntent();
    this.drawCards();
    if (!this.isPaused) {
      this.snake.startSlithering();
    }
    
    this.emit('battleStarted', { turn: this.turn, isBoss: this.isBossPhase });
    this.emit('enemyIntentChanged', { enemy: this.enemy });
    this.emit('mapProgressed', { map: this.map });

    void this.beginBattleSequence();
  }

  private async beginBattleSequence(): Promise<void> {
    await this.delay(BATTLE_START_DELAY_MS);
    if (this.gameState !== GameState.BATTLE || this.autoPlayInProgress) {
      return;
    }
    await this.autoPlayCards();
  }

  /**
   * Create the next encounter based on the current map node
   */
  private setupEncounter(): void {
    this.isBossPhase = this.map.getIsBossBattle();
    this.enemy = new Enemy(ENEMY_MAX_HEALTH, this.map.getCurrentNodeIndex());

    if (this.isBossPhase) {
      debugLog('Boss encounter initialized');
    }
  }

  /**
   * Draw 3 cards from the deck
   */
  private drawCards(count: number = 3, append: boolean = false): Card[] {
    const drawnCards = this.deck.draw(count);
    this.currentHand = append ? [...this.currentHand, ...drawnCards] : drawnCards;
    debugLog(`Drew cards: ${drawnCards.map((c) => c.name).join(', ')}`);
    this.emit('cardsDrawn', { cards: this.currentHand });
    return drawnCards;
  }

  /**
   * Update snake color based on deck composition
   */
  private calculateSnakeColor(): void {
    const counts = this.deck.getSpecializedCounts();
    const specializedTotal = counts.venom + counts.constrict + counts.molt;
    this.snake.morphBySpecializations(
      counts.venom,
      counts.constrict,
      counts.molt,
      specializedTotal
    );
    debugLog(`Snake color updated: ${this.snake.getColorHex()}`);
    this.emit('snakeColorChanged', { color: this.snake.getColorHex() });
  }

  /**
   * Auto-play cards with queue-based pacing so draw effects and pause state stay coherent
   */
  private async autoPlayCards(): Promise<void> {
    if (this.autoPlayInProgress || this.gameState !== GameState.BATTLE) return;
    this.autoPlayInProgress = true;

    debugLog('Auto-playing cards...');

    while (this.currentHand.length > 0) {
      if (this.gameState !== GameState.BATTLE) {
        this.autoPlayInProgress = false;
        return;
      }

      const card = this.currentHand[0];
      
      // Check if enemy is already defeated
      if (!this.enemy.isAlive()) {
        debugLog('Enemy defeated during card sequence!');
        this.snake.stopSlithering();
        await this.delay(CARD_PLAY_DELAY_MS);
        this.triggerRewardPhase();
        this.autoPlayInProgress = false;
        return;
      }

      // Play card
      this.playCard(card, 0);
      this.emit('cardPlayed', { card, index: 0 });

      this.currentHand.shift();
      this.emit('cardsDrawn', { cards: this.currentHand });

      this.resolvePostCardState();

      if (this.gameState !== GameState.BATTLE || !this.snake.isAlive() || !this.enemy.isAlive()) {
        this.autoPlayInProgress = false;
        this.resolveBattle();
        return;
      }

      await this.delay(CARD_PLAY_DELAY_MS);
    }

    this.snake.stopSlithering();
    this.autoPlayInProgress = false;

    // After all cards played, check battle outcome
    await this.delay(500);
    this.resolveBattle();
  }

  private resolvePostCardState(): void {
    this.cardsPlayedThisSet++;

    if (this.cardsPlayedThisSet >= 3) {
      this.cardsPlayedThisSet = 0;
      this.snake.clearBlock();
    }

    if (this.enemy.getCardCountdown() <= 0) {
      this.resolveEnemyTurn();
    }
  }

  /**
   * Resolve the enemy's turn after the hand finishes
   */
  private resolveEnemyTurn(): void {
    if (this.enemy.getCardCountdown() > 0 || !this.enemy.isAlive()) {
      return;
    }

    const resolvedIntent = this.enemy.resolveIntent();
    const intent = resolvedIntent.intent;
    const damage = resolvedIntent.damage;

    if (damage > 0) {
      debugLog(`Enemy attacks for ${damage} damage!`);
      this.snake.takeDamage(damage);
    } else {
      debugLog(`Enemy empowers its next strike by ${resolvedIntent.empower}!`);
    }

    this.enemy.randomizeIntent();
    this.emit('enemyActed', { intent, damage, empower: resolvedIntent.empower });
    this.emit('enemyIntentChanged', { enemy: this.enemy });
  }

  /**
   * Play a single card with reactive bonus check
   */
  private playCard(card: Card, index: number): void {
    debugLog(`Playing card [${index + 1}]: ${card.name} (${card.type}) - Power: ${card.power}`);
    this.audioManager.playCrunch();

    if (this.cardsPlayedThisSet === 0) {
      this.snake.clearBlock();
    }

    let damage = 0;
    let healing = 0;
    let reactiveTriggered = false;

    // Check for reactive bonus
    const enemyIsAttacking = this.enemy.getCurrentIntent() === EnemyIntent.ATTACK;
    if (card.isReactive && enemyIsAttacking) {
      reactiveTriggered = true;
      debugLog(`  ⚡ REACTIVE BONUS TRIGGERED! Enemy is attacking!`);
    }

    // Apply card effect based on type
    switch (card.type) {
      case CardType.STRIKE:
      case CardType.VENOM:
        damage = card.power;
        if (reactiveTriggered) damage += card.reactiveBonus;
        debugLog(`  → ${card.name} deals ${damage} damage!`);
        this.enemy.takeDamage(damage);
        break;

      case CardType.COIL:
      case CardType.CONSTRICT:
        healing = card.power;
        if (reactiveTriggered) healing += card.reactiveBonus;
        debugLog(`  → ${card.name} grants ${healing} block!`);
        this.snake.gainBlock(healing);
        break;

      case CardType.HISS:
      case CardType.MOLT:
        debugLog(`  → ${card.name} draws 1 card!`);
        this.drawCards(1, true);
        if (reactiveTriggered) {
          debugLog(`  → Bonus effect: +${card.reactiveBonus}`);
        }
        break;
    }

    this.enemy.decrementCountdown();
    this.deck.discard(card);
  }

  /**
   * Resolve battle outcome after all cards played
   */
  private resolveBattle(): void {
    if (!this.snake.isAlive()) {
      this.gameState = GameState.GAME_OVER;
      debugLog('Snake defeated! GAME OVER!');
      this.audioManager.setPhase('PLANNING');
      this.audioManager.playDeathDirge();
      this.emit('gameOver', { victory: false });
    } else if (!this.enemy.isAlive()) {
      // Enemy defeated
      if (this.isBossPhase) {
        // Boss defeated - victory!
        this.gameState = GameState.GAME_OVER;
        debugLog('Boss Defeated! Victory!');
        this.audioManager.setPhase('PLANNING');
        this.audioManager.playVictoryFanfare();
        this.emit('victory', { distanceTraveled: this.distanceTraveled, turn: this.turn });
      } else {
        // Regular enemy defeated - move to reward phase
        this.battleCount++;
        this.triggerRewardPhase(true);
      }
    } else {
      // Battle continues - start new turn
      this.startBattle();
    }
  }

  /**
   * Trigger reward phase (mutation selection)
   */
  private triggerRewardPhase(fromCombat: boolean = false): void {
    this.gameState = GameState.REWARD;
    this.currentHand = [];
    this.cardsPlayedThisSet = 0;
    this.snake.stopSlithering();

    if (fromCombat) {
      this.lastGoldReward = GOLD_REWARD_MIN + Math.floor(Math.random() * (GOLD_REWARD_MAX - GOLD_REWARD_MIN + 1));
      this.gold += this.lastGoldReward;
    } else {
      this.lastGoldReward = 0;
    }

    this.audioManager.setPhase('PLANNING');
    this.generateMutationOptions();
    debugLog('Showing mutation choices...');
    this.emit('rewardPhase', {
      mutations: this.availableMutations,
      goldReward: this.lastGoldReward,
      totalGold: this.gold,
    });
  }

  /**
   * Generate 3 random mutation options from any archetype
   */
  private generateMutationOptions(): void {
    const mutations: MutationOption[] = [];
    const mutationTypes: MutationCardType[] = [CardType.VENOM, CardType.CONSTRICT, CardType.MOLT];

    // Shuffle mutation types to pick 3 different ones
    const shuffled = [...mutationTypes].sort(() => Math.random() - 0.5);

    const mutationDefinitions: Record<MutationCardType, MutationDefinition[]> = {
      [CardType.VENOM]: [
        { id: 'venom1', name: 'Viper Fangs', power: 12, description: '+2 Toxic damage', reactive: true, bonus: 3 },
        { id: 'venom2', name: 'Venom Sac', power: 14, description: '+3 Poison strike', reactive: false, bonus: 0 },
        { id: 'venom3', name: "Serpent's Kiss", power: 11, description: 'Venomous attack', reactive: true, bonus: 2 },
      ],
      [CardType.CONSTRICT]: [
        { id: 'constrict1', name: 'Iron Coils', power: 10, description: 'Strengthen defense', reactive: true, bonus: 2 },
        { id: 'constrict2', name: 'Boa Wrap', power: 12, description: 'Enhanced protection', reactive: false, bonus: 0 },
        { id: 'constrict3', name: "Python's Grip", power: 11, description: 'Bind tightly', reactive: true, bonus: 1 },
      ],
      [CardType.MOLT]: [
        { id: 'molt1', name: 'Shed Skin', power: 8, description: 'Renewed form', reactive: false, bonus: 0 },
        { id: 'molt2', name: 'Regeneration', power: 9, description: 'Adaptive growth', reactive: true, bonus: 4 },
        { id: 'molt3', name: 'Evolution', power: 10, description: 'Transform', reactive: false, bonus: 0 },
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
        chosen.description,
        chosen.reactive,
        chosen.bonus
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
   * Apply a mutation and move to rest phase
   */
  applyMutation(mutationId: string): void {
    const mutation = this.availableMutations.find((m) => m.id === mutationId);
    if (!mutation) {
      console.warn(`Mutation ${mutationId} not found`);
      return;
    }

    debugLog(`Applying mutation: ${mutation.name}`);
    this.deck.addCard(mutation.card);
    this.calculateSnakeColor();
    this.availableMutations = [];

    // Skip rest site before the very first battle
    if (this.battleCount === 0) {
      this.startBattle();
      return;
    }

    this.triggerRestPhase();
  }

  /**
   * Trigger rest phase (shedding site options)
   */
  private triggerRestPhase(): void {
    this.gameState = GameState.REST;
    this.audioManager.setPhase('PLANNING');
    debugLog('Showing rest site options...');
    this.emit('restPhase', { sites: this.availableRestSites });
  }

  /**
   * Apply rest site action
   */
  applyRestAction(action: RestSiteAction): void {
    debugLog(`Applying rest action: ${action}`);

    switch (action) {
      case RestSiteAction.CONSUME:
        const healAmount = Math.max(1, Math.floor(this.snake.getMissingHealth() * 0.25));
        this.snake.heal(healAmount);
        debugLog(`Healed ${healAmount} HP`);
        this.emit('restActionApplied', { action, healAmount });
        break;

      case RestSiteAction.SHED:
        debugLog('Shedding (card removal) - UI will handle deck selection');
        this.emit('restActionApplied', { action });
        return; // Wait for UI to select card

      case RestSiteAction.HARDEN:
        const buffs = this.buffRandomCards(2, 2);
        debugLog(`Buffed ${buffs.length} cards`);
        this.emit('restActionApplied', { action, buffs });
        break;
    }

    // Move to transition phase
      void this.queueTransition(REST_ACTION_DELAY_MS);
  }

  /**
   * Remove a card from the deck (SHED action callback)
   */
  removeCardFromDeck(cardId: string): void {
    debugLog(`Removing card: ${cardId}`);
    const removed = this.deck.removeCard(cardId);
    if (removed) {
      this.snake.reduceMaxHealth(SHED_MAX_HP_COST);
      this.calculateSnakeColor();
    }
    this.emit('cardRemoved', { cardId, removed, maxHealth: this.snake.getMaxHealth() });

    if (!removed) {
      return;
    }
    
    // Move to transition phase
    void this.queueTransition(REST_ACTION_DELAY_MS);
  }

  private async queueTransition(delayMs: number): Promise<void> {
    await this.delay(delayMs);
    if (this.gameState !== GameState.GAME_OVER) {
      await this.triggerTransition();
    }
  }

  /**
   * Buff 2 random cards in the deck
   */
  private buffRandomCards(count: number, buffAmount: number): Card[] {
    const deckCards = [...this.deck.getDeckCards()]; // Assuming Deck has this method
    const shuffled = deckCards.sort(() => Math.random() - 0.5);
    const buffed: Card[] = [];

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      shuffled[i].power += buffAmount;
      buffed.push(shuffled[i]);
    }

    return buffed;
  }

  /**
   * Transition phase between battles
   */
  private async triggerTransition(): Promise<void> {
    this.gameState = GameState.TRANSITION;
    debugLog('Transitioning to next zone...');
    this.emit('phaseChanged', { phase: GameState.TRANSITION });

    // Increase distance traveled
    this.distanceTraveled += 10;
    this.emit('distanceUpdated', { distance: this.distanceTraveled });

    // Wait for transition animation
    await this.delay(TRANSITION_DELAY_MS);

    if (this.gameState !== GameState.TRANSITION) {
      return;
    }

    // Progress to next node
    this.map.progressNode();
    this.setupEncounter();

    // Wait for player to confirm
    this.gameState = GameState.READY;
    this.emit('readyToFight', {});
  }

  confirmStartBattle(): void {
    if (this.gameState !== GameState.READY) return;
    this.startBattle();
  }

  /**
   * Helper: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let remaining = ms;

      const step = () => {
        if (remaining <= 0) {
          resolve();
          return;
        }

        if (this.isPaused) {
          setTimeout(step, 30);
          return;
        }

        const chunk = Math.min(remaining, 30);
        remaining -= chunk;
        setTimeout(step, chunk);
      };

      step();
    });
  }

  /**
   * Event emission system
   */
  on<K extends keyof GameEventMap>(event: K, callback: (data: GameEventMap[K]) => void): void {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }

    this.eventCallbacks[event]!.push(callback);
  }

  private emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void {
    const callbacks = this.eventCallbacks[event];
    if (!callbacks) {
      return;
    }

    callbacks.forEach((callback) => callback(data));
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

  getCardsPlayedThisSet(): number {
    return this.cardsPlayedThisSet;
  }

  getDeck(): Deck {
    return this.deck;
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  getAvailableMutations(): MutationOption[] {
    return [...this.availableMutations];
  }

  getBattleCount(): number {
    return this.battleCount;
  }

  getGold(): number {
    return this.gold;
  }

  getLastGoldReward(): number {
    return this.lastGoldReward;
  }

  getAvailableRestSites(): RestSiteAction[] {
    return [...this.availableRestSites];
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  togglePaused(): void {
    this.setPaused(!this.isPaused);
  }

  setPaused(paused: boolean): void {
    if (this.isPaused === paused || this.gameState === GameState.GAME_OVER) {
      return;
    }

    this.isPaused = paused;

    if (paused) {
      this.snake.stopSlithering();
    } else if (this.gameState === GameState.BATTLE) {
      this.snake.startSlithering();
    }

    this.emit('pauseChanged', { isPaused: this.isPaused });
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
   * Get snake flavor text based on dominant mutations
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
   * Check if current outcome is victory
   */
  getIsVictory(): boolean {
    return this.isBossPhase && !this.enemy.isAlive();
  }

  quitRun(): void {
    this.isPaused = false;
    this.snake.stopSlithering();
    this.gameState = GameState.GAME_OVER;
    this.audioManager.setPhase('PLANNING');
    this.emit('pauseChanged', { isPaused: false });
    this.emit('gameOver', { victory: false, quit: true });
  }

  /**
   * Reset the game to initial state
   */
  reset(): void {
    debugLog('Game Reset - Rebirth!');
    this.snake = new Snake(PLAYER_MAX_HEALTH);
    this.enemy = new Enemy(ENEMY_MAX_HEALTH);
    this.map = new Map();
    this.currentHand = [];
    this.gameState = GameState.BATTLE;
    this.distanceTraveled = 0;
    this.turn = 0;
    this.isBossPhase = false;
    this.battleCount = 0;
    this.gold = 0;
    this.lastGoldReward = 0;
    this.availableMutations = [];
    this.isPaused = false;

    // Reset deck to starter configuration
    this.deck = new Deck(createStarterDeck());
    this.setupEncounter();
    this.calculateSnakeColor();
    this.emit('gameReset', {});
  }
}
