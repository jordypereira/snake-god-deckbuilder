import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudioParam {
  value = 0;

  setValueAtTime(value: number): void {
    this.value = value;
  }

  exponentialRampToValueAtTime(value: number): void {
    this.value = value;
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();

  connect(): void {}

  disconnect(): void {}
}

class FakeOscillatorNode {
  type = 'sine';
  frequency = new FakeAudioParam();

  connect(): void {}

  disconnect(): void {}

  start(): void {}

  stop(): void {}
}

class FakeBufferSourceNode {
  buffer: { getChannelData: () => Float32Array } | null = null;
  loop = false;

  connect(): void {}

  disconnect(): void {}

  start(): void {}

  stop(): void {}
}

class FakeBiquadFilterNode {
  type = 'lowpass';
  frequency = new FakeAudioParam();
  Q = { value: 0 };

  connect(): void {}

  disconnect(): void {}
}

class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {} as AudioDestinationNode;

  createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return new FakeOscillatorNode() as unknown as OscillatorNode;
  }

  createBuffer(_channels: number, length: number): AudioBuffer {
    return {
      getChannelData: () => new Float32Array(length),
    } as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return new FakeBufferSourceNode() as unknown as AudioBufferSourceNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    return new FakeBiquadFilterNode() as unknown as BiquadFilterNode;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}

(globalThis as typeof globalThis & {
  window: {
    AudioContext: typeof FakeAudioContext;
    webkitAudioContext: typeof FakeAudioContext;
  };
}).window = {
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
};

const [{ Deck }, { Snake }, { GameManager, GameState }, { createStarterDeck }] = await Promise.all([
  import('../src/deck.ts'),
  import('../src/snake.ts'),
  import('../src/game-manager.ts'),
  import('../src/starter-deck.ts'),
]);

function createStarterCards() {
  return createStarterDeck();
}

test('deck removes cards from draw and discard piles', () => {
  const deck = new Deck(createStarterCards());
  const [drawn] = deck.draw(1);
  deck.discard(drawn);

  assert.equal(deck.removeCard(drawn.id), true);
  assert.equal(deck.getDeckCards().some((card) => card.id === drawn.id), false);
});

test('snake morphing enables visual traits and clamps health changes', () => {
  const snake = new Snake();
  snake.morphBySpecializations(4, 1, 0, 10);
  snake.takeDamage(120);
  snake.heal(999);

  assert.equal(snake.getVisualState().isFanged, true);
  assert.equal(snake.getHealth(), snake.getMaxHealth());
  assert.match(snake.getColorHex(), /^#/);
});

test('game manager starts a battle and draws a frontline', () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (() => 0) as typeof setTimeout;

  try {
    const manager = new GameManager(new Deck(createStarterCards()));
    manager.startBattle();

    assert.equal(manager.getGameState(), GameState.BATTLE);
    assert.equal(manager.getCurrentHand().length, 3);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('game manager can start a run in reward phase', () => {
  const manager = new GameManager(new Deck(createStarterCards()));

  manager.startRun();

  assert.equal(manager.getGameState(), GameState.REWARD);
  assert.equal(manager.getAvailableMutations().length, 3);
  assert.equal(manager.getCurrentHand().length, 0);
});

test('game manager enemy turn damages the snake when countdown reaches zero', () => {
  const manager = new GameManager(new Deck(createStarterCards())) as GameManager & {
    resolveEnemyTurn: () => void;
  };
  const enemy = manager.getEnemy() as ReturnType<GameManager['getEnemy']> & {
    intent: string;
    damage: number;
    cardCountdown: number;
  };

  enemy.intent = 'ATTACK';
  enemy.damage = 11;
  enemy.cardCountdown = 0;

  manager.resolveEnemyTurn();

  assert.equal(manager.getSnake().getHealth(), 29);
});

test('deck remaining count only tracks draw pile while total count tracks identity', () => {
  const deck = new Deck(createStarterCards());
  const [drawn] = deck.draw(1);
  deck.discard(drawn);

  assert.equal(deck.getRemainingCount(), 9);
  assert.equal(deck.getTotalCardCount(), 10);
});

test('pause toggles freeze state without changing battle phase', () => {
  const manager = new GameManager(new Deck(createStarterCards()));
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (() => 0) as typeof setTimeout;

  try {
    manager.startBattle();
    manager.setPaused(true);

    assert.equal(manager.getIsPaused(), true);
    assert.equal(manager.getGameState(), GameState.BATTLE);
    assert.equal(manager.getSnake().isCurrentlySlithering(), false);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('enemy empowers and resets countdown after acting', () => {
  const manager = new GameManager(new Deck(createStarterCards())) as GameManager & {
    resolveEnemyTurn: () => void;
  };
  const enemy = manager.getEnemy() as ReturnType<GameManager['getEnemy']> & {
    intent: string;
    damage: number;
    cardCountdown: number;
  };

  enemy.intent = 'EMPOWER';
  enemy.damage = 4;
  enemy.cardCountdown = 0;

  manager.resolveEnemyTurn();

  assert.equal(enemy.getPendingEmpower(), 4);
  assert.equal(enemy.getCardCountdown(), 2);
});

test('shedding permanently reduces max health', () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (() => 0) as typeof setTimeout;

  try {
    const manager = new GameManager(new Deck(createStarterCards()));
    const cardId = manager.getDeck().getDeckCards()[0].id;

    manager.removeCardFromDeck(cardId);

    assert.equal(manager.getSnake().getMaxHealth(), 36);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});
