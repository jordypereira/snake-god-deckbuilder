// src/card.ts
var Card = class {
  // Extra effect if reactive triggers
  constructor(id, name, type, power, description, isReactive = false, reactiveBonus = 0) {
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
  getTypeColor() {
    switch (this.type) {
      case "STRIKE" /* STRIKE */:
        return "#FF6B6B";
      case "COIL" /* COIL */:
        return "#4ECDC4";
      case "HISS" /* HISS */:
        return "#FFE66D";
      case "VENOM" /* VENOM */:
        return "#00FF00";
      case "CONSTRICT" /* CONSTRICT */:
        return "#0099FF";
      case "MOLT" /* MOLT */:
        return "#BB86FC";
      default:
        return "#FFFFFF";
    }
  }
};

// src/deck.ts
var Deck = class {
  constructor(cards) {
    this.cards = [];
    this.discardPile = [];
    this.cards = [...cards];
    this.shuffle();
  }
  /**
   * Fisher-Yates shuffle algorithm
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  /**
   * Draw N cards from the deck
   * Reshuffle discard pile if deck is empty
   */
  draw(count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.cards.length === 0) {
        if (this.discardPile.length === 0) {
          console.warn("No cards left in deck or discard pile!");
          break;
        }
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
      }
      drawn.push(this.cards.shift());
    }
    return drawn;
  }
  /**
   * Send a card to the discard pile
   */
  discard(card) {
    this.discardPile.push(card);
  }
  /**
   * Add a card to the deck (for mutations)
   */
  addCard(card) {
    this.cards.push(card);
    this.shuffle();
  }
  /**
   * Get count of specialized cards by type
   */
  getSpecializedCount(type) {
    const allCards = [...this.cards, ...this.discardPile];
    return allCards.filter((c) => c.type === type).length;
  }
  /**
   * Get all specialized card counts
   */
  getSpecializedCounts() {
    return {
      venom: this.getSpecializedCount("VENOM" /* VENOM */),
      constrict: this.getSpecializedCount("CONSTRICT" /* CONSTRICT */),
      molt: this.getSpecializedCount("MOLT" /* MOLT */)
    };
  }
  /**
   * Get remaining cards in deck
   */
  getRemainingCount() {
    return this.cards.length;
  }
  /**
   * Get total cards across draw and discard piles
   */
  getTotalCardCount() {
    return this.cards.length + this.discardPile.length;
  }
  /**
   * Get all cards currently in deck (for buffing or removing)
   */
  getDeckCards() {
    return [...this.cards, ...this.discardPile];
  }
  /**
   * Remove a card from the deck by ID
   */
  removeCard(cardId) {
    const activeIndex = this.cards.findIndex((c) => c.id === cardId);
    if (activeIndex !== -1) {
      this.cards.splice(activeIndex, 1);
      console.log(`Removed card: ${cardId}`);
      return true;
    }
    const discardIndex = this.discardPile.findIndex((c) => c.id === cardId);
    if (discardIndex !== -1) {
      this.discardPile.splice(discardIndex, 1);
      console.log(`Removed card: ${cardId}`);
      return true;
    }
    return false;
  }
};

// src/snake.ts
var Snake = class {
  // Vertical sine wave animation flag
  constructor(maxHealth = 40) {
    this.baseColor = { r: 128, g: 128, b: 128 };
    this.block = 0;
    this.visualState = { isFanged: false, isArmored: false };
    this.isSlithering = false;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.currentColor = { ...this.baseColor };
  }
  /**
   * Update snake appearance based on specialized card counts
   * Fanged: Venom > 3
   * Armored: Constrict > 3
   * Color morphs from green (venom), blue (constrict), to purple (molt)
   */
  morphBySpecializations(venomCount, constrictCount, moltCount, totalDeckCount) {
    this.visualState.isFanged = venomCount > 3;
    this.visualState.isArmored = constrictCount > 3;
    if (totalDeckCount <= 0) {
      this.currentColor = { ...this.baseColor };
      return;
    }
    const venomRatio = venomCount / totalDeckCount;
    const constrictRatio = constrictCount / totalDeckCount;
    const moltRatio = moltCount / totalDeckCount;
    const mutationWeight = Math.min(1, venomRatio + constrictRatio + moltRatio);
    const mutationColor = {
      r: Math.round(venomRatio * 0 + constrictRatio * 50 + moltRatio * 187),
      g: Math.round(venomRatio * 255 + constrictRatio * 150 + moltRatio * 134),
      b: Math.round(venomRatio * 100 + constrictRatio * 255 + moltRatio * 252)
    };
    this.currentColor = {
      r: Math.round(this.baseColor.r + (mutationColor.r - this.baseColor.r) * mutationWeight),
      g: Math.round(this.baseColor.g + (mutationColor.g - this.baseColor.g) * mutationWeight),
      b: Math.round(this.baseColor.b + (mutationColor.b - this.baseColor.b) * mutationWeight)
    };
    console.log(`Snake morphed: Fanged=${this.visualState.isFanged}, Armored=${this.visualState.isArmored}`);
  }
  /**
   * Get current color as hex string
   */
  getColorHex() {
    const toHex = (n) => {
      const hex = n.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(this.currentColor.r)}${toHex(this.currentColor.g)}${toHex(this.currentColor.b)}`;
  }
  /**
   * Get current color as RGB tuple for display
   */
  getColorRGB() {
    return { ...this.currentColor };
  }
  /**
   * Take damage
   */
  takeDamage(amount) {
    const absorbed = Math.min(this.block, amount);
    this.block -= absorbed;
    this.health = Math.max(0, this.health - (amount - absorbed));
  }
  /**
   * Heal
   */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
  /**
   * Get health
   */
  getHealth() {
    return this.health;
  }
  /**
   * Get max health
   */
  getMaxHealth() {
    return this.maxHealth;
  }
  getMissingHealth() {
    return this.maxHealth - this.health;
  }
  gainBlock(amount) {
    this.block += Math.max(0, amount);
  }
  clearBlock() {
    this.block = 0;
  }
  getBlock() {
    return this.block;
  }
  reduceMaxHealth(amount) {
    this.maxHealth = Math.max(8, this.maxHealth - Math.max(0, amount));
    this.health = Math.min(this.health, this.maxHealth);
  }
  getBodyScale() {
    return Math.max(0.6, this.maxHealth / 40);
  }
  /**
   * Get prescience (reorder actions)
   */
  getPrescience() {
    return 0;
  }
  /**
   * Use prescience
   */
  usePrescience() {
    return false;
  }
  /**
   * Reset prescience for the turn
   */
  resetPrescience() {
  }
  /**
   * Start slithering animation (vertical sine wave)
   */
  startSlithering() {
    this.isSlithering = true;
  }
  /**
   * Stop slithering animation
   */
  stopSlithering() {
    this.isSlithering = false;
  }
  /**
   * Get slithering state
   */
  isCurrentlySlithering() {
    return this.isSlithering;
  }
  /**
   * Check if alive
   */
  isAlive() {
    return this.health > 0;
  }
  /**
   * Get visual state
   */
  getVisualState() {
    return { ...this.visualState };
  }
};

// src/enemy.ts
var EnemyIntent = /* @__PURE__ */ ((EnemyIntent2) => {
  EnemyIntent2["ATTACK"] = "ATTACK";
  EnemyIntent2["EMPOWER"] = "EMPOWER";
  return EnemyIntent2;
})(EnemyIntent || {});
var Enemy = class {
  constructor(maxHealth = 40, damageScaling = 0) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.cardCountdown = 2;
    this.intent = "ATTACK" /* ATTACK */;
    this.damage = 0;
    this.damageScaling = damageScaling;
    this.pendingEmpower = 0;
  }
  /**
   * Randomize enemy intent for the next action window
   */
  randomizeIntent() {
    const intents = Object.values(EnemyIntent);
    this.intent = intents[Math.floor(Math.random() * intents.length)];
    if (this.intent === "ATTACK" /* ATTACK */) {
      this.damage = 8 + Math.floor(Math.random() * 3) + this.damageScaling + this.pendingEmpower;
    } else {
      this.damage = 4;
    }
    this.cardCountdown = 2;
    console.log(
      `Enemy Intent: ${this.intent}${this.intent === "ATTACK" /* ATTACK */ ? ` (${this.damage} dmg)` : ` (+${this.damage} next attack)`}, Countdown: ${this.cardCountdown}`
    );
  }
  resolveIntent() {
    if (this.intent === "ATTACK" /* ATTACK */) {
      const damage = this.damage;
      this.pendingEmpower = 0;
      return { intent: "ATTACK" /* ATTACK */, damage, empower: 0 };
    }
    this.pendingEmpower += this.damage;
    return { intent: "EMPOWER" /* EMPOWER */, damage: 0, empower: this.damage };
  }
  /**
   * Take damage
   */
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    console.log(`Enemy took ${amount} damage! Health: ${this.health}/${this.maxHealth}`);
  }
  /**
   * Decrement card countdown
   */
  decrementCountdown() {
    this.cardCountdown--;
  }
  /**
   * Get current intent
   */
  getIntent() {
    return this.intent;
  }
  /**
   * Get current intent (alias)
   */
  getCurrentIntent() {
    return this.intent;
  }
  /**
   * Get damage value (only relevant for ATTACK intent)
   */
  getDamage() {
    return this.damage;
  }
  /**
   * Get card countdown
   */
  getCardCountdown() {
    return this.cardCountdown;
  }
  /**
   * Get health
   */
  getHealth() {
    return this.health;
  }
  /**
   * Get max health
   */
  getMaxHealth() {
    return this.maxHealth;
  }
  /**
   * Get health percentage
   */
  getHealthPercent() {
    return this.health / this.maxHealth * 100;
  }
  /**
   * Check if alive
   */
  isAlive() {
    return this.health > 0;
  }
  /**
   * Reset for new battle
   */
  reset() {
    this.health = this.maxHealth;
    this.cardCountdown = 2;
    this.pendingEmpower = 0;
    this.randomizeIntent();
  }
  setDamageScaling(value) {
    this.damageScaling = value;
  }
  getPendingEmpower() {
    return this.pendingEmpower;
  }
  /**
   * Get intent icon emoji
   */
  getIntentIcon() {
    switch (this.intent) {
      case "ATTACK" /* ATTACK */:
        return "\u2694\uFE0F";
      case "EMPOWER" /* EMPOWER */:
        return "\u{1F525}";
      default:
        return "\u2753";
    }
  }
};

// src/map.ts
var Map = class {
  constructor() {
    this.nodes = [];
    this.currentNodeIndex = 0;
    this.totalBattles = 0;
    this.isBossBattle = false;
    this.nodes = [
      "BATTLE" /* BATTLE */,
      "BATTLE" /* BATTLE */,
      "BATTLE" /* BATTLE */,
      "BATTLE" /* BATTLE */,
      "BATTLE" /* BATTLE */,
      "BOSS" /* BOSS */
    ];
    this.currentNodeIndex = 0;
    this.updateIsBossBattle();
  }
  /**
   * Check if current node is a boss battle
   */
  updateIsBossBattle() {
    this.isBossBattle = this.nodes[this.currentNodeIndex] === "BOSS" /* BOSS */;
  }
  /**
   * Progress to next node
   */
  progressNode() {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
    this.totalBattles++;
    this.updateIsBossBattle();
    console.log(`Progressed to Node ${this.currentNodeIndex + 1}. Total battles: ${this.totalBattles}`);
  }
  /**
   * Get current node type
   */
  getCurrentNodeType() {
    return this.nodes[this.currentNodeIndex];
  }
  /**
   * Check if current battle is boss
   */
  getIsBossBattle() {
    return this.isBossBattle;
  }
  /**
   * Get current node index
   */
  getCurrentNodeIndex() {
    return this.currentNodeIndex;
  }
  /**
   * Get all nodes
   */
  getNodes() {
    return this.nodes;
  }
  /**
   * Get total battles completed
   */
  getTotalBattles() {
    return this.totalBattles;
  }
  /**
   * Reset map for new run
   */
  reset() {
    this.currentNodeIndex = 0;
    this.totalBattles = 0;
    this.updateIsBossBattle();
  }
};

// src/audio-manager.ts
var AudioManager = class {
  constructor() {
    this.currentPhaseSources = [];
    this.currentPhaseNodes = [];
    this.phaseMusicToken = 0;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.15;
    this.masterGain.connect(this.audioContext.destination);
  }
  /**
   * Stop all current phase music
   */
  stopPhaseMusic() {
    this.phaseMusicToken++;
    this.currentPhaseSources.forEach((source) => {
      try {
        source.stop();
      } catch {
      }
      source.disconnect();
    });
    this.currentPhaseNodes.forEach((node) => node.disconnect());
    this.currentPhaseSources = [];
    this.currentPhaseNodes = [];
  }
  /**
   * Set the current game phase and play corresponding music
   */
  setPhase(phase) {
    this.stopPhaseMusic();
    switch (phase) {
      case "PLANNING":
      case "REST":
        this.playPlanningPhase();
        break;
      case "ACTION":
        this.playActionPhase();
        break;
      case "TRANSITION":
        this.playTransitionPhase();
        break;
      default:
        break;
    }
  }
  /**
   * PLANNING: Slow rhythmic pulse (BPM 80)
   * Triangle wave at 110 Hz (A2)
   */
  playPlanningPhase() {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = "triangle";
    osc.frequency.value = 110;
    const pulseRate = 1.33;
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    lfo.frequency.value = pulseRate;
    lfoGain.gain.value = 0.4;
    lfo.connect(gain.gain);
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    lfo.start();
    this.currentPhaseSources.push(osc, lfo);
    this.currentPhaseNodes.push(gain, lfoGain);
  }
  /**
   * ACTION: Fast melodic sequence (BPM 140)
   * Square wave in Phrygian scale
   */
  playActionPhase() {
    const phrygianFrequencies = [164.81, 174.61, 196, 220, 246.94, 261.63, 293.66];
    let noteIndex = 0;
    const bpm = 140;
    const beatDuration = 60 / bpm;
    const noteDuration = beatDuration * 0.8;
    const phaseToken = this.phaseMusicToken;
    const playNote = () => {
      if (phaseToken !== this.phaseMusicToken)
        return;
      const freq = phrygianFrequencies[noteIndex % phrygianFrequencies.length];
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + noteDuration
      );
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + noteDuration);
      noteIndex++;
      setTimeout(playNote, beatDuration * 1e3);
    };
    playNote();
  }
  /**
   * TRANSITION: Fading white noise ambient
   */
  playTransitionPhase() {
    const bufferSize = this.audioContext.sampleRate * 2;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.audioContext.currentTime);
    source.stop(this.audioContext.currentTime + 2.5);
    this.currentPhaseSources.push(source);
    this.currentPhaseNodes.push(gain);
  }
  /**
   * SFX: Blip sound for card reordering
   */
  playBlip() {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      400,
      this.audioContext.currentTime + 0.1
    );
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.1);
  }
  /**
   * SFX: Crunch sound for card execution
   */
  playCrunch() {
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.audioContext.currentTime);
  }
  /**
   * BOSS MUSIC: Dark, fast chromatic progression with lowpass filter
   */
  playBossMusic() {
    const chromaFrequencies = [130.81, 139, 146.83, 155.56, 164.81, 174.61];
    let noteIndex = 0;
    const bpm = 160;
    const beatDuration = 60 / bpm;
    const noteDuration = beatDuration * 0.7;
    const phaseToken = this.phaseMusicToken;
    const lowpassFilter = this.audioContext.createBiquadFilter();
    lowpassFilter.type = "lowpass";
    lowpassFilter.frequency.setValueAtTime(5e3, this.audioContext.currentTime);
    lowpassFilter.frequency.exponentialRampToValueAtTime(8e3, this.audioContext.currentTime + 3);
    lowpassFilter.Q.value = 5;
    lowpassFilter.connect(this.masterGain);
    this.currentPhaseNodes.push(lowpassFilter);
    const playBossNote = () => {
      if (phaseToken !== this.phaseMusicToken)
        return;
      const freq = chromaFrequencies[noteIndex % chromaFrequencies.length];
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.02, this.audioContext.currentTime + noteDuration);
      osc.connect(gain);
      gain.connect(lowpassFilter);
      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + noteDuration);
      noteIndex++;
      setTimeout(playBossNote, beatDuration * 1e3);
    };
    playBossNote();
  }
  /**
   * Set master volume (0-1)
   */
  setVolume(value) {
    this.masterGain.gain.value = Math.max(0, Math.min(1, value)) * 0.15;
  }
  /**
   * Get current volume (0-1)
   */
  getVolume() {
    return Math.min(1, this.masterGain.gain.value / 0.15);
  }
  /**
   * Mute/unmute
   */
  setMuted(muted) {
    if (muted) {
      this.masterGain.gain.value = 0;
    } else {
      this.masterGain.gain.value = 0.15;
    }
  }
  /**
   * Resume audio context if suspended (required by browsers)
   */
  resume() {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }
  /**
   * Victory Fanfare: High-pitched upward arpeggio
   */
  playVictoryFanfare() {
    const frequencies = [523.25, 659.25, 783.99, 1046.5];
    const noteDuration = 0.15;
    const delay = 0.1;
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, this.audioContext.currentTime + noteDuration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + noteDuration);
      }, index * delay * 1e3);
    });
  }
  /**
   * Death Dirge: Low-pitched descending square wave
   */
  playDeathDirge() {
    const frequencies = [261.63, 196, 146.83, 110];
    const noteDuration = 0.25;
    const delay = 0.15;
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.02, this.audioContext.currentTime + noteDuration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + noteDuration);
      }, index * delay * 1e3);
    });
  }
};

// src/game-manager.ts
var PLAYER_MAX_HEALTH = 40;
var ENEMY_MAX_HEALTH = 40;
var CARD_PLAY_DELAY_MS = 250;
var BATTLE_START_DELAY_MS = 300;
var TRANSITION_DELAY_MS = 1200;
var REST_ACTION_DELAY_MS = 700;
var SHED_MAX_HP_COST = 4;
function createStarterDeck() {
  return [
    new Card("strike1", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("strike2", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("strike3", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("strike4", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("coil1", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("coil2", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("coil3", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("coil4", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("hiss1", "Hiss", "HISS" /* HISS */, 0, "Draw 1 card."),
    new Card("hiss2", "Hiss", "HISS" /* HISS */, 0, "Draw 1 card.")
  ];
}
var GameManager = class {
  constructor(deck) {
    this.currentHand = [];
    this.gameState = "BATTLE" /* BATTLE */;
    this.distanceTraveled = 0;
    this.turn = 0;
    this.isBossPhase = false;
    this.eventCallbacks = {};
    this.availableMutations = [];
    this.availableRestSites = ["CONSUME" /* CONSUME */, "SHED" /* SHED */, "HARDEN" /* HARDEN */];
    this.battleCount = 0;
    this.autoPlayInProgress = false;
    this.isPaused = false;
    this.cardsPlayedThisSet = 0;
    this.snake = new Snake(PLAYER_MAX_HEALTH);
    this.enemy = new Enemy(ENEMY_MAX_HEALTH);
    this.map = new Map();
    this.deck = deck;
    this.audioManager = new AudioManager();
    this.audioManager.resume();
    this.setupEncounter();
    this.calculateSnakeColor();
  }
  /**
   * Start a new battle
   */
  startBattle() {
    this.turn++;
    console.log(`=== BATTLE ${this.turn} ===`);
    this.gameState = "BATTLE" /* BATTLE */;
    this.autoPlayInProgress = false;
    this.currentHand = [];
    this.snake.clearBlock();
    this.cardsPlayedThisSet = 0;
    this.isBossPhase = this.map.getIsBossBattle();
    if (this.isBossPhase) {
      this.audioManager.setPhase("ACTION");
      console.log("BOSS ENCOUNTER!");
    } else {
      this.audioManager.setPhase("ACTION");
    }
    this.enemy.randomizeIntent();
    this.drawCards();
    if (!this.isPaused) {
      this.snake.startSlithering();
    }
    this.emit("battleStarted", { turn: this.turn, isBoss: this.isBossPhase });
    this.emit("enemyIntentChanged", { enemy: this.enemy });
    this.emit("mapProgressed", { map: this.map });
    void this.beginBattleSequence();
  }
  async beginBattleSequence() {
    await this.delay(BATTLE_START_DELAY_MS);
    if (this.gameState !== "BATTLE" /* BATTLE */ || this.autoPlayInProgress) {
      return;
    }
    await this.autoPlayCards();
  }
  /**
   * Create the next encounter based on the current map node
   */
  setupEncounter() {
    this.isBossPhase = this.map.getIsBossBattle();
    this.enemy = new Enemy(ENEMY_MAX_HEALTH, this.map.getCurrentNodeIndex() * 2);
    if (this.isBossPhase) {
      console.log("Boss encounter initialized");
    }
  }
  /**
   * Draw 3 cards from the deck
   */
  drawCards(count = 3, append = false) {
    const drawnCards = this.deck.draw(count);
    this.currentHand = append ? [...this.currentHand, ...drawnCards] : drawnCards;
    console.log(`Drew cards: ${drawnCards.map((c) => c.name).join(", ")}`);
    this.emit("cardsDrawn", { cards: this.currentHand });
    return drawnCards;
  }
  /**
   * Update snake color based on deck composition
   */
  calculateSnakeColor() {
    const counts = this.deck.getSpecializedCounts();
    this.snake.morphBySpecializations(
      counts.venom,
      counts.constrict,
      counts.molt,
      this.deck.getTotalCardCount()
    );
    console.log(`Snake color updated: ${this.snake.getColorHex()}`);
    this.emit("snakeColorChanged", { color: this.snake.getColorHex() });
  }
  /**
   * Auto-play cards with queue-based pacing so draw effects and pause state stay coherent
   */
  async autoPlayCards() {
    if (this.autoPlayInProgress || this.gameState !== "BATTLE" /* BATTLE */)
      return;
    this.autoPlayInProgress = true;
    console.log("Auto-playing cards...");
    while (this.currentHand.length > 0) {
      if (this.gameState !== "BATTLE" /* BATTLE */) {
        this.autoPlayInProgress = false;
        return;
      }
      const card = this.currentHand[0];
      if (!this.enemy.isAlive()) {
        console.log("Enemy defeated during card sequence!");
        this.snake.stopSlithering();
        await this.delay(CARD_PLAY_DELAY_MS);
        this.triggerRewardPhase();
        this.autoPlayInProgress = false;
        return;
      }
      this.playCard(card, 0);
      this.emit("cardPlayed", { card, index: 0 });
      this.currentHand.shift();
      this.emit("cardsDrawn", { cards: this.currentHand });
      this.resolvePostCardState();
      if (this.gameState !== "BATTLE" /* BATTLE */ || !this.snake.isAlive() || !this.enemy.isAlive()) {
        this.autoPlayInProgress = false;
        this.resolveBattle();
        return;
      }
      await this.delay(CARD_PLAY_DELAY_MS);
    }
    this.snake.stopSlithering();
    this.autoPlayInProgress = false;
    await this.delay(500);
    this.resolveBattle();
  }
  resolvePostCardState() {
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
  resolveEnemyTurn() {
    if (this.enemy.getCardCountdown() > 0 || !this.enemy.isAlive()) {
      return;
    }
    const resolvedIntent = this.enemy.resolveIntent();
    const intent = resolvedIntent.intent;
    const damage = resolvedIntent.damage;
    if (damage > 0) {
      console.log(`Enemy attacks for ${damage} damage!`);
      this.snake.takeDamage(damage);
    } else {
      console.log(`Enemy empowers its next strike by ${resolvedIntent.empower}!`);
    }
    this.enemy.randomizeIntent();
    this.emit("enemyActed", { intent, damage, empower: resolvedIntent.empower });
    this.emit("enemyIntentChanged", { enemy: this.enemy });
  }
  /**
   * Play a single card with reactive bonus check
   */
  playCard(card, index) {
    console.log(`Playing card [${index + 1}]: ${card.name} (${card.type}) - Power: ${card.power}`);
    this.audioManager.playCrunch();
    if (this.cardsPlayedThisSet === 0) {
      this.snake.clearBlock();
    }
    let damage = 0;
    let healing = 0;
    let reactiveTriggered = false;
    const enemyIsAttacking = this.enemy.getCurrentIntent() === "ATTACK" /* ATTACK */;
    if (card.isReactive && enemyIsAttacking) {
      reactiveTriggered = true;
      console.log(`  \u26A1 REACTIVE BONUS TRIGGERED! Enemy is attacking!`);
    }
    switch (card.type) {
      case "STRIKE" /* STRIKE */:
      case "VENOM" /* VENOM */:
        damage = card.power;
        if (reactiveTriggered)
          damage += card.reactiveBonus;
        console.log(`  \u2192 ${card.name} deals ${damage} damage!`);
        this.enemy.takeDamage(damage);
        break;
      case "COIL" /* COIL */:
      case "CONSTRICT" /* CONSTRICT */:
        healing = card.power;
        if (reactiveTriggered)
          healing += card.reactiveBonus;
        console.log(`  \u2192 ${card.name} grants ${healing} block!`);
        this.snake.gainBlock(healing);
        break;
      case "HISS" /* HISS */:
      case "MOLT" /* MOLT */:
        console.log(`  \u2192 ${card.name} draws 1 card!`);
        this.drawCards(1, true);
        if (reactiveTriggered) {
          console.log(`  \u2192 Bonus effect: +${card.reactiveBonus}`);
        }
        break;
    }
    this.enemy.decrementCountdown();
    this.deck.discard(card);
  }
  /**
   * Resolve battle outcome after all cards played
   */
  resolveBattle() {
    if (!this.snake.isAlive()) {
      this.gameState = "GAME_OVER" /* GAME_OVER */;
      console.log("Snake defeated! GAME OVER!");
      this.audioManager.setPhase("PLANNING");
      this.audioManager.playDeathDirge();
      this.emit("gameOver", { victory: false });
    } else if (!this.enemy.isAlive()) {
      if (this.isBossPhase) {
        this.gameState = "GAME_OVER" /* GAME_OVER */;
        console.log("Boss Defeated! Victory!");
        this.audioManager.setPhase("PLANNING");
        this.audioManager.playVictoryFanfare();
        this.emit("victory", { distanceTraveled: this.distanceTraveled, turn: this.turn });
      } else {
        this.battleCount++;
        this.triggerRewardPhase();
      }
    } else {
      this.startBattle();
    }
  }
  /**
   * Trigger reward phase (mutation selection)
   */
  triggerRewardPhase() {
    this.gameState = "REWARD" /* REWARD */;
    this.audioManager.setPhase("PLANNING");
    this.generateMutationOptions();
    console.log("Showing mutation choices...");
    this.emit("rewardPhase", { mutations: this.availableMutations });
  }
  /**
   * Generate 3 random mutation options from any archetype
   */
  generateMutationOptions() {
    const mutations = [];
    const mutationTypes = ["VENOM" /* VENOM */, "CONSTRICT" /* CONSTRICT */, "MOLT" /* MOLT */];
    const shuffled = [...mutationTypes].sort(() => Math.random() - 0.5);
    const mutationDefinitions = {
      ["VENOM" /* VENOM */]: [
        { id: "venom1", name: "Viper Fangs", power: 12, description: "+2 Toxic damage", reactive: true, bonus: 3 },
        { id: "venom2", name: "Venom Sac", power: 14, description: "+3 Poison strike", reactive: false, bonus: 0 },
        { id: "venom3", name: "Serpent's Kiss", power: 11, description: "Venomous attack", reactive: true, bonus: 2 }
      ],
      ["CONSTRICT" /* CONSTRICT */]: [
        { id: "constrict1", name: "Iron Coils", power: 10, description: "Strengthen defense", reactive: true, bonus: 2 },
        { id: "constrict2", name: "Boa Wrap", power: 12, description: "Enhanced protection", reactive: false, bonus: 0 },
        { id: "constrict3", name: "Python's Grip", power: 11, description: "Bind tightly", reactive: true, bonus: 1 }
      ],
      ["MOLT" /* MOLT */]: [
        { id: "molt1", name: "Shed Skin", power: 8, description: "Renewed form", reactive: false, bonus: 0 },
        { id: "molt2", name: "Regeneration", power: 9, description: "Adaptive growth", reactive: true, bonus: 4 },
        { id: "molt3", name: "Evolution", power: 10, description: "Transform", reactive: false, bonus: 0 }
      ]
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
        description: chosen.description
      });
    }
    this.availableMutations = mutations;
  }
  /**
   * Apply a mutation and move to rest phase
   */
  applyMutation(mutationId) {
    const mutation = this.availableMutations.find((m) => m.id === mutationId);
    if (!mutation) {
      console.warn(`Mutation ${mutationId} not found`);
      return;
    }
    console.log(`Applying mutation: ${mutation.name}`);
    this.deck.addCard(mutation.card);
    this.calculateSnakeColor();
    this.availableMutations = [];
    this.triggerRestPhase();
  }
  /**
   * Trigger rest phase (shedding site options)
   */
  triggerRestPhase() {
    this.gameState = "REST" /* REST */;
    this.audioManager.setPhase("PLANNING");
    console.log("Showing rest site options...");
    this.emit("restPhase", { sites: this.availableRestSites });
  }
  /**
   * Apply rest site action
   */
  applyRestAction(action) {
    console.log(`Applying rest action: ${action}`);
    switch (action) {
      case "CONSUME" /* CONSUME */:
        const healAmount = Math.max(1, Math.floor(this.snake.getMissingHealth() * 0.25));
        this.snake.heal(healAmount);
        console.log(`Healed ${healAmount} HP`);
        this.emit("restActionApplied", { action, healAmount });
        break;
      case "SHED" /* SHED */:
        console.log("Shedding (card removal) - UI will handle deck selection");
        this.emit("restActionApplied", { action });
        return;
      case "HARDEN" /* HARDEN */:
        const buffs = this.buffRandomCards(2, 2);
        console.log(`Buffed ${buffs.length} cards`);
        this.emit("restActionApplied", { action, buffs });
        break;
    }
    void this.queueTransition(REST_ACTION_DELAY_MS);
  }
  /**
   * Remove a card from the deck (SHED action callback)
   */
  removeCardFromDeck(cardId) {
    console.log(`Removing card: ${cardId}`);
    const removed = this.deck.removeCard(cardId);
    if (removed) {
      this.snake.reduceMaxHealth(SHED_MAX_HP_COST);
      this.calculateSnakeColor();
    }
    this.emit("cardRemoved", { cardId, removed, maxHealth: this.snake.getMaxHealth() });
    if (!removed) {
      return;
    }
    void this.queueTransition(REST_ACTION_DELAY_MS);
  }
  async queueTransition(delayMs) {
    await this.delay(delayMs);
    if (this.gameState !== "GAME_OVER" /* GAME_OVER */) {
      await this.triggerTransition();
    }
  }
  /**
   * Buff 2 random cards in the deck
   */
  buffRandomCards(count, buffAmount) {
    const deckCards = [...this.deck.getDeckCards()];
    const shuffled = deckCards.sort(() => Math.random() - 0.5);
    const buffed = [];
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      shuffled[i].power += buffAmount;
      buffed.push(shuffled[i]);
    }
    return buffed;
  }
  /**
   * Transition phase between battles
   */
  async triggerTransition() {
    this.gameState = "TRANSITION" /* TRANSITION */;
    console.log("Transitioning to next zone...");
    this.emit("phaseChanged", { phase: "TRANSITION" /* TRANSITION */ });
    this.distanceTraveled += 10;
    this.emit("distanceUpdated", { distance: this.distanceTraveled });
    await this.delay(TRANSITION_DELAY_MS);
    if (this.gameState !== "TRANSITION" /* TRANSITION */) {
      return;
    }
    this.map.progressNode();
    this.setupEncounter();
    this.startBattle();
  }
  /**
   * Helper: delay function
   */
  delay(ms) {
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
  on(event, callback) {
    this.eventCallbacks[event] = callback;
  }
  emit(event, data) {
    const callback = this.eventCallbacks[event];
    if (callback) {
      callback(data);
    }
  }
  // ===== Getters =====
  getGameState() {
    return this.gameState;
  }
  getCurrentHand() {
    return this.currentHand;
  }
  getSnake() {
    return this.snake;
  }
  getEnemy() {
    return this.enemy;
  }
  getMap() {
    return this.map;
  }
  getIsBossPhase() {
    return this.isBossPhase;
  }
  getDistanceTraveled() {
    return this.distanceTraveled;
  }
  getTurn() {
    return this.turn;
  }
  getCardsPlayedThisSet() {
    return this.cardsPlayedThisSet;
  }
  getDeck() {
    return this.deck;
  }
  getAudioManager() {
    return this.audioManager;
  }
  getAvailableMutations() {
    return [...this.availableMutations];
  }
  getBattleCount() {
    return this.battleCount;
  }
  getAvailableRestSites() {
    return [...this.availableRestSites];
  }
  getIsPaused() {
    return this.isPaused;
  }
  togglePaused() {
    this.setPaused(!this.isPaused);
  }
  setPaused(paused) {
    if (this.isPaused === paused || this.gameState === "GAME_OVER" /* GAME_OVER */) {
      return;
    }
    this.isPaused = paused;
    if (paused) {
      this.snake.stopSlithering();
    } else if (this.gameState === "BATTLE" /* BATTLE */) {
      this.snake.startSlithering();
    }
    this.emit("pauseChanged", { isPaused: this.isPaused });
  }
  /**
   * Get number of nodes cleared (battles won)
   */
  getNodesClearedCount() {
    return this.map.getCurrentNodeIndex();
  }
  /**
   * Get count of mutations (specialized cards in deck)
   */
  getMutationCount() {
    const counts = this.deck.getSpecializedCounts();
    return counts.venom + counts.constrict + counts.molt;
  }
  /**
   * Calculate final score based on performance
   */
  calculateFinalScore() {
    const nodes = this.getNodesClearedCount();
    const mutations = this.getMutationCount();
    const hp = this.snake.getHealth();
    return nodes * 100 + mutations * 50 + hp * 2;
  }
  /**
   * Get snake flavor text based on dominant mutations
   */
  getSnakeFlavor() {
    const counts = this.deck.getSpecializedCounts();
    if (counts.venom > counts.constrict && counts.venom > counts.molt) {
      return "The Toxic Tyrant";
    } else if (counts.constrict > counts.venom && counts.constrict > counts.molt) {
      return "The Great Constrictor";
    } else if (counts.molt > counts.venom && counts.molt > counts.constrict) {
      return "The Immortal Shedder";
    } else {
      return "The Primordial Hybrid";
    }
  }
  /**
   * Check if current outcome is victory
   */
  getIsVictory() {
    return this.isBossPhase && !this.enemy.isAlive();
  }
  quitRun() {
    this.isPaused = false;
    this.snake.stopSlithering();
    this.gameState = "GAME_OVER" /* GAME_OVER */;
    this.audioManager.setPhase("PLANNING");
    this.emit("pauseChanged", { isPaused: false });
    this.emit("gameOver", { victory: false, quit: true });
  }
  /**
   * Reset the game to initial state
   */
  reset() {
    console.log("Game Reset - Rebirth!");
    this.snake = new Snake(PLAYER_MAX_HEALTH);
    this.enemy = new Enemy(ENEMY_MAX_HEALTH);
    this.map = new Map();
    this.currentHand = [];
    this.gameState = "BATTLE" /* BATTLE */;
    this.distanceTraveled = 0;
    this.turn = 0;
    this.isBossPhase = false;
    this.battleCount = 0;
    this.availableMutations = [];
    this.isPaused = false;
    this.deck = new Deck(createStarterDeck());
    this.setupEncounter();
    this.calculateSnakeColor();
    this.emit("gameReset", {});
  }
};

// src/ui.ts
var UIRenderer = class {
  constructor(gameManager, container) {
    this.parallaxOffset = 0;
    this.consoleMessage = "The serpent waits for the first encounter.";
    this.awaitingShedSelection = false;
    this.gameManager = gameManager;
    this.container = typeof container === "string" ? document.getElementById(container) : container;
    this.setupEventListeners();
    this.attachGlobalHandlers();
  }
  /**
   * Setup event listeners from game manager
   */
  setupEventListeners() {
    this.gameManager.on("battleStarted", (data) => {
      this.awaitingShedSelection = false;
      this.consoleMessage = data.isBoss ? "Boss encounter engaged." : `Battle ${data.turn} begins.`;
      this.render();
    });
    this.gameManager.on("cardsDrawn", () => this.render());
    this.gameManager.on("phaseChanged", () => this.render());
    this.gameManager.on("cardPlayed", (data) => this.onCardPlayed(data));
    this.gameManager.on("snakeColorChanged", () => this.render());
    this.gameManager.on("distanceUpdated", () => this.render());
    this.gameManager.on("enemyIntentChanged", () => this.render());
    this.gameManager.on("mapProgressed", () => this.render());
    this.gameManager.on("enemyActed", (data) => {
      this.consoleMessage = data.damage > 0 ? `Enemy hits for ${data.damage} damage.` : `Enemy empowers its next attack by ${data.empower}.`;
      this.render();
    });
    this.gameManager.on("rewardPhase", () => {
      this.consoleMessage = "Choose a mutation to evolve the deck.";
      this.render();
    });
    this.gameManager.on("restPhase", () => {
      this.consoleMessage = "Choose how the snake recovers before moving on.";
      this.render();
    });
    this.gameManager.on("restActionApplied", (data) => {
      this.awaitingShedSelection = data.action === "SHED" /* SHED */;
      this.consoleMessage = this.describeRestAction(data.action, data.healAmount);
      this.render();
    });
    this.gameManager.on("cardRemoved", (data) => {
      this.awaitingShedSelection = false;
      this.consoleMessage = data.removed ? "A card was shed from the deck." : "That card could not be removed.";
      this.render();
    });
    this.gameManager.on("gameOver", () => {
      this.consoleMessage = "The run has ended.";
      this.render();
    });
    this.gameManager.on("victory", () => {
      this.consoleMessage = "The serpent has conquered the route.";
      this.render();
    });
    this.gameManager.on("gameReset", () => {
      this.awaitingShedSelection = false;
      this.consoleMessage = "A new serpent awakens.";
      this.render();
    });
    this.gameManager.on("pauseChanged", (data) => {
      this.consoleMessage = data.isPaused ? "Run paused." : "Run resumed.";
      this.render();
    });
  }
  attachGlobalHandlers() {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.gameManager.togglePaused();
      }
    });
  }
  /**
   * Handle card played event - add visual juice
   */
  onCardPlayed(data) {
    const card = data.card;
    const cardElements = document.querySelectorAll(".card");
    this.consoleMessage = `Played ${card.name}.`;
    if (cardElements.length > data.index) {
      const cardEl = cardElements[data.index];
      cardEl.classList.add("card-pulse");
      if (data.reactiveTriggered === false) {
        cardEl.classList.add("card-blocked");
      }
      setTimeout(() => {
        cardEl.classList.remove("card-pulse");
        cardEl.classList.remove("card-blocked");
      }, 600);
      if (card.type === "CONSTRICT" /* CONSTRICT */) {
        this.screenShake();
      }
    }
    this.render();
  }
  /**
   * Screen shake effect
   */
  screenShake() {
    const gameBoard = document.querySelector(".game-board");
    if (!gameBoard)
      return;
    gameBoard.classList.add("shake");
    setTimeout(() => gameBoard.classList.remove("shake"), 300);
  }
  /**
   * Update parallax background offset
   */
  updateParallax() {
    const distance = this.gameManager.getDistanceTraveled();
    this.parallaxOffset = distance * 2 % 800;
  }
  /**
   * Main render function
   */
  render() {
    this.updateParallax();
    this.container.innerHTML = this.generateHTML();
    this.attachEventHandlers();
  }
  /**
   * Generate HTML content
   */
  generateHTML() {
    const gameState = this.gameManager.getGameState();
    if (gameState === "GAME_OVER" /* GAME_OVER */) {
      return this.generateEndScreenHTML();
    }
    const baseScreen = gameState === "REWARD" /* REWARD */ ? `${this.generateMainScreenHTML()}${this.generateRewardSelectionHTML()}` : gameState === "REST" /* REST */ ? `${this.generateMainScreenHTML()}${this.generateRestSelectionHTML()}` : this.generateMainScreenHTML();
    return this.gameManager.getIsPaused() ? `${baseScreen}${this.generatePauseOverlayHTML()}` : baseScreen;
  }
  generateMainScreenHTML() {
    const snake = this.gameManager.getSnake();
    const turn = this.gameManager.getTurn();
    const distance = this.gameManager.getDistanceTraveled();
    const map = this.gameManager.getMap();
    const isBoss = this.gameManager.getIsBossPhase();
    const gameState = this.gameManager.getGameState();
    const enemy = this.gameManager.getEnemy();
    const hand = this.gameManager.getCurrentHand();
    const snakeVisual = snake.getVisualState();
    const volume = Math.round(this.gameManager.getAudioManager().getVolume() * 100);
    return `
      <div class="game-container">
        <!-- Parallax Background -->
        <div class="parallax-background ${isBoss ? "boss-bg" : ""}">
          <div class="parallax-layer parallax-far" style="transform: translateX(-${this.parallaxOffset * 0.3}px);"></div>
          <div class="parallax-layer parallax-mid" style="transform: translateX(-${this.parallaxOffset * 0.6}px);"></div>
        </div>

        <!-- Top Controls -->
        <div class="top-controls">
          <div class="volume-control">
            <label>\u{1F50A} Volume:</label>
            <input type="range" id="volume-slider" min="0" max="100" value="${volume}" class="volume-slider">
          const snakeScale = snake.getBodyScale();
          </div>
          <div class="game-modes">
            <span>${isBoss ? "Boss node" : "Battle node"}</span>
            <button id="pause-btn" class="btn pause-btn">${this.gameManager.getIsPaused() ? "RESUME" : "PAUSE"}</button>
          </div>
        </div>

        <!-- Map Tracker -->
        <div class="map-tracker">
          ${this.generateMapHTML(map)}
        </div>

        <!-- Header -->
        <div class="header">
          <h1>${isBoss ? "\u{1F451} BOSS" : "\u{1F40D}"} SNAKE GOD</h1>
          <div class="game-stats">
            <span>Turn: <strong>${turn}</strong></span>
            <span>Distance: <strong>${distance}m</strong></span>
            <span>Health: <strong>${snake.getHealth()}/${snake.getMaxHealth()}</strong></span>
            <span>Block: <strong>${snake.getBlock()}</strong></span>
            <span>Mutations: <strong>${this.gameManager.getMutationCount()}</strong></span>
          </div>
        </div>

        <!-- Game Board -->
        <div class="game-board ${isBoss ? "boss-battle" : ""}">
          <!-- Snake vs Enemy Arena -->
          <div class="arena">
            <!-- Snake Side -->
            <div class="arena-side snake-side">
              <div class="snake-container">
                <div class="snake ${snakeVisual.isFanged ? "fanged" : ""} ${snakeVisual.isArmored ? "armored" : ""}" style="background-color: ${snake.getColorHex()}; ${snake.isCurrentlySlithering() ? "animation: slither 0.6s ease-in-out infinite;" : ""}"></div>
              </div>
              <div class="snake-info">
                <p>The Snake</p>
                  <span>Beat: <strong>${this.gameManager.getCardsPlayedThisSet()}/2</strong></span>
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
  generateRewardSelectionHTML() {
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
    `).join("");
    return `
      <div class="mutation-overlay">
        <div class="mutation-selection">
          <h1>MUTATION UNLOCKED</h1>
          <p class="mutation-subtitle">Battle ${battleCount} complete. Choose your evolution.</p>
          ${this.generateDeckPreviewHTML("Current Deck")}
          <div class="mutation-options">
            ${mutationCards}
          </div>
        </div>
      </div>
    `;
  }
  generatePauseOverlayHTML() {
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
  generateRestSelectionHTML() {
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
    `).join("");
    return `
      <div class="mutation-overlay">
        <div class="mutation-selection">
          <h1>SHEDDING SITE</h1>
          <p class="mutation-subtitle">Choose one recovery path before the next node.</p>
          ${this.generateDeckPreviewHTML("Current Deck")}
          <div class="mutation-options">
            ${actionCards}
          </div>
        </div>
      </div>
    `;
  }
  generateShedSelectionHTML() {
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
    `).join("");
    return `
      <div class="mutation-overlay">
        <div class="mutation-selection">
          <h1>SHED A CARD</h1>
          <p class="mutation-subtitle">Choose one card to remove from the run.</p>
          ${this.generateDeckPreviewHTML("Current Deck")}
          <div class="mutation-options">
            ${cardOptions}
          </div>
        </div>
      </div>
    `;
  }
  generateDeckPreviewHTML(title) {
    const cards = this.gameManager.getDeck().getDeckCards();
    const cardList = cards.map((card) => `<span class="deck-chip deck-chip-${card.type.toLowerCase()}">${card.name}</span>`).join("");
    return `
      <div class="deck-preview">
        <p class="deck-preview-title">${title} \xB7 ${cards.length} cards</p>
        <div class="deck-chip-list">${cardList}</div>
      </div>
    `;
  }
  /**
   * Get emoji icon for mutation type
   */
  getMutationIcon(cardType) {
    switch (cardType) {
      case "VENOM" /* VENOM */:
        return "\u{1F40D}";
      case "CONSTRICT" /* CONSTRICT */:
        return "\u{1F517}";
      case "MOLT" /* MOLT */:
        return "\u2728";
      default:
        return "\u2753";
    }
  }
  /**
   * Generate end screen (victory/defeat)
   */
  generateEndScreenHTML() {
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
            <h1 class="end-title ${isVictory ? "victory" : "defeat"}">
              ${isVictory ? "\u{1F3C6} VICTORY \u{1F3C6}" : "\u{1F480} DEFEAT \u{1F480}"}
            </h1>
            
            <div class="final-form-section">
              <div class="final-snake ${snakeVisual.isFanged ? "fanged" : ""} ${snakeVisual.isArmored ? "armored" : ""}" 
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

            <button class="rebirth-btn" id="rebirth-btn">\u{1F504} REBIRTH \u{1F504}</button>
          </div>
        </div>
        <div class="scanlines"></div>
      </div>
    `;
  }
  /**
   * Generate map tracker HTML
   */
  generateMapHTML(map) {
    const nodes = map.getNodes();
    const currentIndex = map.getCurrentNodeIndex();
    return `
      <div class="map-nodes">
        ${nodes.map((node, index) => {
      const isActive = index === currentIndex;
      const isPassed = index < currentIndex;
      const nodeClass = `map-node ${node === "BOSS" /* BOSS */ ? "boss-node" : "battle-node"} ${isActive ? "active" : ""} ${isPassed ? "passed" : ""}`;
      return `
              <div class="${nodeClass}">
                <div class="node-content">${node === "BOSS" /* BOSS */ ? "\u{1F451}" : "\u2694\uFE0F"}</div>
                ${isActive ? '<div class="node-snake">\u{1F40D}</div>' : ""}
              </div>
            `;
    }).join("")}
      </div>
    `;
  }
  /**
   * Generate enemy display HTML
   */
  generateEnemyHTML(enemy) {
    const healthSegments = Math.ceil(enemy.getMaxHealth() / 20);
    const filledSegments = Math.ceil(enemy.getHealth() / enemy.getMaxHealth() * healthSegments);
    const intent = enemy.getCurrentIntent();
    const intentValue = intent === "ATTACK" /* ATTACK */ ? `${enemy.getDamage()} DMG` : `+${enemy.getDamage()} NEXT ATK`;
    return `
      <div class="enemy-display">
        <div class="enemy-health">
          <div class="health-bar-container">
            ${Array(healthSegments).fill(0).map(
      (_, i) => `
              <div class="health-segment ${i < filledSegments ? "filled" : "empty"}"></div>
            `
    ).join("")}
          </div>
          <p class="health-text">${enemy.getHealth()}/${enemy.getMaxHealth()}</p>
        </div>

        <div class="enemy-sprite">\u{1F479}</div>

        <div class="enemy-intent">
          <div class="intent-icon">${enemy.getIntentIcon()}</div>
          <div class="intent-value ${intent === "ATTACK" /* ATTACK */ ? "attack" : "empower"}">${intentValue}</div>
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
  generateCardHTML(hand) {
    if (hand.length === 0) {
      return '<p class="action-text">Drawing the next frontline...</p>';
    }
    return hand.map((card, index) => {
      const cardColor = card.getTypeColor();
      return `
          <div class="card" style="border-color: ${cardColor};" data-index="${index}">
            <div class="card-index">${index + 1}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-type">${card.type}</div>
            <div class="card-power">${card.power}</div>
            <div class="card-description">${card.description}</div>
            ${card.isReactive ? `<div class="card-hint">Reactive +${card.reactiveBonus}</div>` : ""}
          </div>
        `;
    }).join("");
  }
  /**
   * Generate phase-specific actions
   */
  generatePhaseActions() {
    const gameState = this.gameManager.getGameState();
    if (gameState === "BATTLE" /* BATTLE */) {
      return '<p class="action-text">Cards resolve automatically. Watch the encounter unfold.</p>';
    }
    if (gameState === "TRANSITION" /* TRANSITION */) {
      return '<p class="action-text">The serpent moves to the next node.</p>';
    }
    if (gameState === "REWARD" /* REWARD */) {
      return '<p class="action-text">Evolution available. Pick one mutation.</p>';
    }
    if (gameState === "REST" /* REST */) {
      return '<p class="action-text">The shedding site offers one brief recovery.</p>';
    }
    return "";
  }
  /**
   * Generate composition bar
   */
  generateCompositionBar() {
    const counts = this.gameManager.getDeck().getSpecializedCounts();
    const total = Math.max(1, this.gameManager.getDeck().getTotalCardCount());
    const venomPercent = Math.round(counts.venom / total * 100);
    const constrictPercent = Math.round(counts.constrict / total * 100);
    const moltingPercent = Math.round(counts.molt / total * 100);
    return `
      <div class="composition-bar">
        <div class="comp-segment venom" style="width: ${venomPercent}%;" title="Venom ${venomPercent}%"></div>
        <div class="comp-segment constrict" style="width: ${constrictPercent}%;" title="Constrict ${constrictPercent}%"></div>
        <div class="comp-segment molting" style="width: ${moltingPercent}%;" title="Molting ${moltingPercent}%"></div>
      </div>
      <div class="composition-labels">
        <span>\u{1F7E2} ${venomPercent}%</span>
        <span>\u{1F535} ${constrictPercent}%</span>
        <span>\u{1F7E1} ${moltingPercent}%</span>
      </div>
    `;
  }
  /**
   * Attach event handlers to interactive elements
   */
  attachEventHandlers() {
    const volumeSlider = document.getElementById("volume-slider");
    if (volumeSlider) {
      volumeSlider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value) / 100;
        this.gameManager.getAudioManager().setVolume(value);
      });
    }
    const pauseBtn = document.getElementById("pause-btn");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        this.gameManager.togglePaused();
      });
    }
    document.querySelectorAll(".mutation-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mutationId = btn.getAttribute("data-mutation-id");
        if (mutationId) {
          this.gameManager.applyMutation(mutationId);
        }
      });
    });
    document.querySelectorAll(".rest-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-rest-action");
        if (action) {
          this.gameManager.applyRestAction(action);
        }
      });
    });
    document.querySelectorAll(".shed-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cardId = btn.getAttribute("data-card-id");
        if (cardId) {
          this.gameManager.removeCardFromDeck(cardId);
        }
      });
    });
    const rebirthBtn = document.getElementById("rebirth-btn");
    if (rebirthBtn) {
      rebirthBtn.addEventListener("click", () => {
        this.gameManager.reset();
        this.gameManager.startBattle();
      });
    }
    const resumeBtn = document.getElementById("resume-btn");
    if (resumeBtn) {
      resumeBtn.addEventListener("click", () => {
        this.gameManager.setPaused(false);
      });
    }
    const quitBtn = document.getElementById("quit-btn");
    if (quitBtn) {
      quitBtn.addEventListener("click", () => {
        this.gameManager.quitRun();
      });
    }
  }
  describeRestAction(action, healAmount) {
    switch (action) {
      case "CONSUME" /* CONSUME */:
        return `Consume restores ${healAmount ?? 0} HP from missing health.`;
      case "HARDEN" /* HARDEN */:
        return "Harden reinforces random cards.";
      case "SHED" /* SHED */:
        return "Choose a card to shed from the deck. Costs 4 max HP.";
      default:
        return "The serpent pauses at the rest site.";
    }
  }
  getRestActionColor(action) {
    switch (action) {
      case "CONSUME" /* CONSUME */:
        return "#00ff88";
      case "SHED" /* SHED */:
        return "#ffcc00";
      case "HARDEN" /* HARDEN */:
        return "#66ccff";
      default:
        return "#00ff00";
    }
  }
  getRestActionIcon(action) {
    switch (action) {
      case "CONSUME" /* CONSUME */:
        return "\u{1F356}";
      case "SHED" /* SHED */:
        return "\u{1FAB6}";
      case "HARDEN" /* HARDEN */:
        return "\u{1F6E1}\uFE0F";
      default:
        return "\u2753";
    }
  }
  getRestActionDescription(action) {
    switch (action) {
      case "CONSUME" /* CONSUME */:
        return "Restore 25% of missing HP.";
      case "SHED" /* SHED */:
        return "Remove one card from the deck and lose 4 max HP.";
      case "HARDEN" /* HARDEN */:
        return "Buff two random cards by +2 power.";
      default:
        return "Pause and recover.";
    }
  }
};

// src/index.ts
function initializeGame() {
  const root = document.getElementById("game-root");
  if (!root) {
    throw new Error("Missing #game-root container");
  }
  const starterDeck = [
    new Card("strike1", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("strike2", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("strike3", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("strike4", "Strike", "STRIKE" /* STRIKE */, 6, "Deal 6 damage."),
    new Card("coil1", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("coil2", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("coil3", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("coil4", "Coil", "COIL" /* COIL */, 6, "Gain 6 block."),
    new Card("hiss1", "Hiss", "HISS" /* HISS */, 0, "Draw 1 card."),
    new Card("hiss2", "Hiss", "HISS" /* HISS */, 0, "Draw 1 card.")
  ];
  const deck = new Deck(starterDeck);
  const gameManager = new GameManager(deck);
  const uiRenderer = new UIRenderer(gameManager, root);
  uiRenderer.render();
  gameManager.startBattle();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGame);
} else {
  initializeGame();
}
//# sourceMappingURL=index.js.map
