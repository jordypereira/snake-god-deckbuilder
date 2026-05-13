# Loop Hero Refactor: Complete Implementation Guide

## 📊 Architecture Overview

The Snake God game has been refactored from a traditional turn-based system into a **Loop Hero-style auto-battler** with the following progression flow:

```
BATTLE (auto-play)
    ↓
REWARD (mutation selection)
    ↓
REST (shedding site options)
    ↓
TRANSITION (progress map)
    ↓
[LOOP BACK TO BATTLE]
```

---

## 🎮 Game States (New)

### 1. **BATTLE** State
- Snake automatically plays 3 cards in sequence
- Each card plays with **0.6 second delay** between them
- Snake sprite displays **vertical sine wave animation** during battle
- Enemy has a randomized **Intent** (ATTACK or WAIT)
- **Reactive cards** trigger bonus effects if enemy is attacking
- Battle ends immediately when enemy HP ≤ 0

### 2. **REWARD** State
- Display 3 mutation choices after defeating enemy
- Player selects 1 mutation to add to deck
- Snake color/visual state updates instantly
- Audio switches to slow "planning" phase (mysterious triangle wave)

### 3. **REST** State
- Display 3 shedding site options:
  - **CONSUME**: Heal 30% max HP
  - **SHED**: Remove 1 card from deck (UI selects card)
  - **HARDEN**: Buff 2 random cards (+2 power each)
- Player selects 1 action
- Audio remains in "planning" phase

### 4. **TRANSITION** State
- Map progresses to next node
- Distance traveled increases
- Snake slithering animation continues
- Brief pause before next battle starts

### 5. **GAME_OVER** State
- Victory: Boss defeated (unchanged)
- Defeat: Snake HP ≤ 0 (unchanged)

---

## 🔄 Key Architectural Changes

### Removed (No Longer Used)
- ❌ Prescience system (no card reordering)
- ❌ Commit button (auto-play handles it)
- ❌ Manual card swapping (`swapCards()` method removed)
- ❌ Boss-specific audio phase

### Added (New Features)
- ✅ **Reactive Card System**: Cards marked `isReactive: true` gain bonuses when enemy is attacking
- ✅ **Auto-Play Engine**: All cards play automatically with fixed 0.6s delay
- ✅ **Rest Site System**: Post-reward options for gameplay progression
- ✅ **Vertical Sine Wave Animation**: Snake sprite animates during battle/transition
- ✅ **Automatic Progression**: Game state machine handles transitions without player input
- ✅ **Card Buffing**: HARDEN action permanently increases card power

---

## 📝 Updated Classes

### **Card** (`card.ts`)
```typescript
export class Card {
  id: string;
  name: string;
  type: CardType;
  power: number;
  description: string;
  isReactive: boolean;      // ← NEW: Triggers bonus if enemy intent matches
  reactiveBonus: number;    // ← NEW: Bonus damage/healing amount

  constructor(
    id, name, type, power, description,
    isReactive = false,
    reactiveBonus = 0
  ) { ... }
}
```

**Example Reactive Cards:**
- "Lunge" (STRIKE): Deal 6 DMG. If enemy attacking, +2 bonus → 8 total
- "Shield Coil" (COIL): Heal 7 HP. If enemy attacking, +1 bonus → 8 total heal
- "Viper Fangs" (VENOM mutation): Deal 12 DMG. If enemy attacking, +3 bonus → 15 total

### **Snake** (`snake.ts`)
```typescript
export class Snake {
  // ← REMOVED: prescience: number
  // ← NEW: isSlithering: boolean (for vertical sine wave animation)

  startSlithering(): void   // Call when BATTLE starts
  stopSlithering(): void    // Call when BATTLE ends
  isCurrentlySlithering(): boolean
}
```

**Animation Implementation (CSS):**
```css
@keyframes slither {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.snake.slithering {
  animation: slither 0.6s ease-in-out infinite;
}
```

### **GameManager** (`game-manager.ts`) - Major Refactor

#### New Enums
```typescript
export enum GameState {
  BATTLE = 'BATTLE',
  REWARD = 'REWARD',
  REST = 'REST',
  TRANSITION = 'TRANSITION',
  GAME_OVER = 'GAME_OVER',
}

export enum RestSiteAction {
  CONSUME = 'CONSUME',    // Heal 30% max HP
  SHED = 'SHED',          // Remove 1 card
  HARDEN = 'HARDEN',      // Buff 2 cards
}
```

#### New Event Callbacks
```typescript
// Replace old events with:
'battleStarted'        // Battle phase begins (data: { turn, isBoss })
'rewardPhase'          // Reward phase with mutations (data: { mutations })
'restPhase'            // Rest site options (data: { sites })
'restActionApplied'    // Rest action completed (data: { action, ... })
'cardRemoved'          // Card shed from deck (data: { cardId })
'gameOver'             // Victory/Defeat (data: { victory })
```

#### New Methods
```typescript
// Battle Flow
startBattle(): void                    // Initiates BATTLE state
autoPlayCards(): Promise<void>         // Auto-plays 3 cards with 0.6s delay
resolveBattle(): void                  // Checks win/loss conditions

// Reward Flow
triggerRewardPhase(): void            // Shows REWARD state with mutations
applyMutation(mutationId): void       // Adds mutation, moves to REST

// Rest Flow
triggerRestPhase(): void              // Shows REST state with 3 options
applyRestAction(action): void         // Applies CONSUME/SHED/HARDEN
removeCardFromDeck(cardId): void      // SHED callback from UI
buffRandomCards(count, amount): Card[] // HARDEN implementation

// Transition
triggerTransition(): void             // Moves to next node, starts new BATTLE

// Helpers
playCard(card, index): void           // Plays single card with reactive check
```

#### Reactive Bonus Logic
```typescript
private playCard(card: Card, index: number): void {
  // Check if card is reactive AND enemy is attacking
  const enemyIsAttacking = this.enemy.getCurrentIntent() === EnemyIntent.ATTACK;
  if (card.isReactive && enemyIsAttacking) {
    // Apply bonus damage/healing
    if (card.type === CardType.STRIKE || card.type === CardType.VENOM) {
      damage = card.power + card.reactiveBonus;
    } else if (card.type === CardType.COIL || card.type === CardType.CONSTRICT) {
      healing = card.power + card.reactiveBonus;
    }
  }
}
```

### **Enemy** (`enemy.ts`) - Minor Addition
```typescript
export class Enemy {
  // ← NEW: getCurrentIntent() method (alias for getIntent())
  getCurrentIntent(): EnemyIntent {
    return this.intent;
  }
}
```

### **AudioManager** (`audio-manager.ts`) - Simplified
```typescript
setPhase(phase: string): void {
  // Simplified: PLANNING now handles both REST and REWARD phases
  // Both use slow, mysterious triangle wave
  case 'PLANNING':
  case 'REST':
    this.playPlanningPhase();  // Same audio for both
    break;
  
  case 'ACTION':
    this.playActionPhase();    // Fast Phrygian for battle
    break;
}

// REMOVED: playBossMusic() - boss now uses ACTION phase
```

### **Deck** (`deck.ts`) - New Methods
```typescript
export class Deck {
  // ← NEW: Get all cards in deck
  getDeckCards(): Card[] {
    return [...this.cards];
  }

  // ← NEW: Remove card by ID (for SHED action)
  removeCard(cardId: string): boolean {
    const index = this.cards.findIndex((c) => c.id === cardId);
    if (index !== -1) {
      this.cards.splice(index, 1);
      return true;
    }
    return false;
  }
}
```

---

## 🎨 UI Integration Updates Needed

The UIRenderer will need updates to handle new states:

### Event Listeners to Update
```typescript
// OLD EVENT (REMOVE)
on('mutationSelection', ...)

// NEW EVENTS (ADD)
on('battleStarted', ...)       // Show battle in progress
on('rewardPhase', ...)         // Show mutation selection overlay
on('restPhase', ...)           // Show rest site options
on('restActionApplied', ...)   // Apply rest effect visually
on('cardRemoved', ...)         // Update deck display
```

### Conditional Rendering
```typescript
generateHTML(): string {
  const state = this.gameManager.getGameState();
  
  switch (state) {
    case GameState.BATTLE:
      return this.generateBattleHTML();  // Show active battle
    
    case GameState.REWARD:
      return this.generateRewardHTML();  // Mutation selection
    
    case GameState.REST:
      return this.generateRestHTML();    // Rest site options
    
    case GameState.TRANSITION:
      return this.generateTransitionHTML(); // Progress animation
    
    case GameState.GAME_OVER:
      return this.generateEndScreenHTML(); // Victory/Defeat
  }
}

generateRewardHTML(): string {
  // Display 3 mutation cards
  // Each with SELECT button calling: gameManager.applyMutation(mutationId)
}

generateRestHTML(): string {
  // Display 3 action buttons:
  // 1. CONSUME: gameManager.applyRestAction(RestSiteAction.CONSUME)
  // 2. SHED: Show deck, let user select card, then gameManager.removeCardFromDeck(cardId)
  // 3. HARDEN: gameManager.applyRestAction(RestSiteAction.HARDEN)
}
```

### Snake Animation CSS
```css
.snake.slithering {
  animation: slither 0.6s ease-in-out infinite;
}

@keyframes slither {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}
```

---

## 📋 Card Configuration Updates

Starter deck now includes reactive cards:

```typescript
const starterCards: Card[] = [
  // STRIKE cards
  new Card('strike1', 'Quick Jab', CardType.STRIKE, 5, 'Fast attack', false, 0),
  new Card('strike2', 'Power Slash', CardType.STRIKE, 8, 'Strong blow', false, 0),
  new Card('strike3', 'Lunge', CardType.STRIKE, 6, 'Direct strike', true, 2),  // REACTIVE
  new Card('strike4', 'Smash', CardType.STRIKE, 9, 'Heavy attack', false, 0),

  // COIL cards
  new Card('coil1', 'Defend', CardType.COIL, 5, 'Basic protection', false, 0),
  new Card('coil2', 'Shield Coil', CardType.COIL, 7, 'Strong defense', true, 1),  // REACTIVE
  new Card('coil3', 'Wrap', CardType.COIL, 6, 'Protective embrace', false, 0),
  new Card('coil4', 'Fortress', CardType.COIL, 8, 'Maximum protection', false, 0),

  // HISS cards
  new Card('hiss1', 'Taunt', CardType.HISS, 0, 'Draw attention', false, 0),
  new Card('hiss2', 'Distract', CardType.HISS, 0, 'Dodge next attack', false, 0),
];
```

---

## 🔄 Game Flow Diagram

```
START BATTLE
  ↓
Draw 3 cards
Snake starts slithering
Audio: ACTION phase (fast square wave)
  ↓
AUTO-PLAY CARDS (0.6s delay each)
  For each card:
    • Check if REACTIVE + enemy attacking
    • Apply bonus if conditions met
    • Remove from hand, add to discard
    • Check if enemy defeated
  ↓
  If enemy alive:
    → Next turn (BATTLE)
  ↓
DEFEAT ENEMY
  ↓
REWARD PHASE
  Show 3 mutations
  Player selects 1
  Add to deck
  Audio: PLANNING phase (slow triangle wave)
  ↓
REST PHASE
  Show 3 shedding site options
  Player selects 1:
    • CONSUME: +30% HP
    • SHED: Select 1 card to remove
    • HARDEN: +2 power to 2 random cards
  ↓
TRANSITION
  Progress map node
  Distance += 10
  Audio: TRANSITION phase (white noise fade)
  ↓
[LOOP BACK TO BATTLE]

---

BOSS BATTLE (same flow as regular)
Boss has 300 HP instead of 100 HP
Uses same ACTION phase audio
When boss defeated → GAME_OVER (Victory)

---

SNAKE DEFEATED
  At any time if Snake HP ≤ 0
  → GAME_OVER (Defeat)
  Audio: playDeathDirge()
```

---

## ✅ Compilation Status

```
✓ TypeScript: 0 errors (strict mode)
✓ Bundle: 52.9kb (esbuild)
✓ All new methods: autoPlayCards, triggerRewardPhase, etc.
✓ Reactive system: isReactive boolean, reactiveBonus property
✓ Snake animation: startSlithering/stopSlithering methods
```

---

## 🚀 Next Steps

1. **UI Update**: Refactor UIRenderer to handle new GameState enum and events
2. **CSS Animation**: Add slither animation for snake during BATTLE
3. **REST UI**: Create card selection interface for SHED action
4. **Testing**: Play through full game loop:
   - Battle 1 → Reward → Rest → Battle 2
   - Check reactive cards trigger correctly
   - Verify mutations add properly
   - Test CONSUME/SHED/HARDEN actions
5. **Audio Verification**: Confirm phase transitions play correct tracks
6. **Polish**: Visual feedback for reactive bonuses, rest actions

---

## 💡 Design Rationale

**Why Auto-Play?** Reduces decision fatigue, increases pacing, mirrors Loop Hero's flow.

**Why Reactive Cards?** Adds strategic depth—building around enemy intents becomes viable.

**Why Rest Sites?** Provides agency between battles without disrupting auto-play momentum.

**Why Vertical Sine Wave?** Visual indication that battle is ongoing; mirrors "movement" aesthetic.

**Why Unified ACTION Audio?** Simplifies audio management; boss felt overengineered.

---

## 🔧 Configuration Constants

If you need to adjust gameplay:

```typescript
// Card play delay (in GameManager.autoPlayCards)
await this.delay(600);  // Change for faster/slower auto-play

// Rest site healing percentage
const healAmount = Math.floor(this.snake.getMaxHealth() * 0.3);  // Change multiplier

// Card buff amount
this.buffRandomCards(2, 2);  // Change 2nd param for bigger buffs

// Boss health multiplier
this.enemy = new Enemy(300);  // Change 300 for different difficulty

// Animation duration (in CSS)
animation: slither 0.6s ease-in-out infinite;  // Match delay timing
```
