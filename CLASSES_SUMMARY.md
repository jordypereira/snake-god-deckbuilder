# Loop Hero Refactor: Core Classes Summary

## 1. GameManager - Complete Architecture

### State Machine
```typescript
export enum GameState {
  BATTLE = 'BATTLE',           // Auto-play cards 0.6s apart
  REWARD = 'REWARD',           // Choose mutation
  REST = 'REST',               // Choose rest site action
  TRANSITION = 'TRANSITION',   // Move to next node
  GAME_OVER = 'GAME_OVER',     // Victory or Defeat
}

export enum RestSiteAction {
  CONSUME = 'CONSUME',    // Heal 30% max HP
  SHED = 'SHED',          // Remove 1 card from deck
  HARDEN = 'HARDEN',      // Buff 2 random cards +2 power
}
```

### Game Flow Engine
```typescript
startBattle()
  ↓ (auto-play cards with 0.6s delay)
autoPlayCards()
  ↓ (all cards played or enemy defeated)
resolveBattle()
  ├→ Enemy alive: startBattle() [next turn]
  ├→ Boss defeated: GAME_OVER (Victory)
  └→ Regular enemy defeated: triggerRewardPhase()

triggerRewardPhase()
  ↓ (player selects mutation)
applyMutation()
  ↓ (add to deck, move to rest)
triggerRestPhase()
  ↓ (player selects rest action)
applyRestAction()
  ↓ (heal/remove/buff)
triggerTransition()
  ↓ (progress map)
startBattle() [loop continues]
```

### Key Methods

**Battle Phase**
```typescript
// Starts new battle, triggers auto-play
startBattle(): void {
  // Draw 3 cards
  // Randomize enemy intent
  // Start snake slithering animation
  // Emit 'battleStarted' event
  // Queue autoPlayCards() after 800ms
}

// Auto-plays all 3 cards with reactive bonus checking
private async autoPlayCards(): Promise<void> {
  for each card {
    if enemy HP <= 0: return to REWARD
    playCard(card) with reactive check
    await 600ms delay
    emit 'cardPlayed'
  }
  resolveBattle()
}

// Applies card effect + reactive bonus
private playCard(card: Card, index: number): void {
  if card.isReactive && enemy.getCurrentIntent() === ATTACK {
    // Add card.reactiveBonus to damage/healing
  }
  // Apply based on card type
}
```

**Reward Phase**
```typescript
// Show mutation selection overlay
private triggerRewardPhase(): void {
  gameState = REWARD
  generateMutationOptions() // 3 random mutations
  emit 'rewardPhase'
}

// Add mutation to deck, move to REST
applyMutation(mutationId: string): void {
  deck.addCard(mutation.card)
  triggerRestPhase()
}
```

**Rest Phase**
```typescript
// Show rest site options
private triggerRestPhase(): void {
  gameState = REST
  emit 'restPhase'
}

// Apply rest action
applyRestAction(action: RestSiteAction): void {
  if CONSUME:
    snake.heal(maxHealth * 0.3)
  if SHED:
    emit signal for UI to select card
    return (wait for removeCardFromDeck callback)
  if HARDEN:
    buffRandomCards(2, 2)
  
  triggerTransition()
}

// Called by UI after SHED card selection
removeCardFromDeck(cardId: string): void {
  deck.removeCard(cardId)
  triggerTransition()
}
```

**Transition Phase**
```typescript
// Progress map, start next battle
private async triggerTransition(): Promise<void> {
  gameState = TRANSITION
  distanceTraveled += 10
  await 1500ms
  map.progressNode()
  startBattle()
}
```

---

## 2. Snake - Visual Evolution

### Core Properties
```typescript
export class Snake {
  private health: number = 100;
  private maxHealth: number = 100;
  private currentColor: RGB;
  private visualState: SnakeVisualState;
  private isSlithering: boolean = false;  // ← NEW
}
```

### Removed (No Longer Needed)
```typescript
// ❌ REMOVED: prescience system
private prescience: number = 3;
usePrescience(): boolean { ... }
resetPrescience(): void { ... }
```

### New Animation Methods
```typescript
// Start vertical sine wave animation during BATTLE
startSlithering(): void {
  this.isSlithering = true;
}

// Stop animation after BATTLE ends
stopSlithering(): void {
  this.isSlithering = false;
}

// Check animation state for CSS class
isCurrentlySlithering(): boolean {
  return this.isSlithering;
}
```

### CSS Implementation
```css
@keyframes slither {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.snake.slithering {
  animation: slither 0.6s ease-in-out infinite;
}

/* Apply in UI: */
<div class="snake ${snake.isCurrentlySlithering() ? 'slithering' : ''}">
```

---

## 3. AudioManager - Simplified Phases

### Phase Routing
```typescript
setPhase(phase: string): void {
  this.stopPhaseMusic();
  
  switch (phase) {
    case 'PLANNING':
    case 'REST':
      // Both use same slow, mysterious audio
      this.playPlanningPhase();
      break;
    
    case 'ACTION':
      // Fast, driving for battles (both regular and boss)
      this.playActionPhase();
      break;
    
    case 'TRANSITION':
      this.playTransitionPhase();
      break;
  }
}
```

### Audio Character

**PLANNING Phase** (110Hz triangle, 80 BPM)
- Triggered: REWARD and REST phases
- Purpose: Calm, mysterious background during choices
- Wave: Triangle (smooth, atmospheric)

**ACTION Phase** (Phrygian scale, 140 BPM)
- Triggered: BATTLE phases (both regular and boss)
- Purpose: Fast, driving, urgent
- Wave: Square (sharp, energetic)
- Scale: E F G A B C D (Phrygian mode)

**TRANSITION Phase** (White noise fade)
- Triggered: Moving to next zone
- Purpose: Ambient, fading background
- Effect: 2-second fade-out

---

## 4. Card System - Reactive Bonuses

### Updated Card Class
```typescript
export class Card {
  id: string;
  name: string;
  type: CardType;
  power: number;
  description: string;
  isReactive: boolean;      // ← NEW
  reactiveBonus: number;    // ← NEW

  constructor(
    id: string,
    name: string,
    type: CardType,
    power: number,
    description: string,
    isReactive: boolean = false,
    reactiveBonus: number = 0
  ) { ... }
}
```

### Reactive Card Examples

```typescript
// Starter Deck Examples
new Card('strike3', 'Lunge', CardType.STRIKE, 6, 
  'Direct strike', true, 2)
  // Normal: 6 damage
  // Reactive: 6 + 2 = 8 damage (if enemy attacking)

new Card('coil2', 'Shield Coil', CardType.COIL, 7,
  'Strong defense', true, 1)
  // Normal: 7 heal
  // Reactive: 7 + 1 = 8 heal (if enemy attacking)

// Mutation Examples
new Card('venom1', 'Viper Fangs', CardType.VENOM, 12,
  '+2 Toxic damage', true, 3)
  // Normal: 12 damage
  // Reactive: 12 + 3 = 15 damage (if enemy attacking!)

new Card('regen2', 'Regeneration', CardType.MOLT, 9,
  'Adaptive growth', true, 4)
  // Normal: 9 heal
  // Reactive: 9 + 4 = 13 heal (if enemy attacking)
```

### Reactive Check Logic
```typescript
private playCard(card: Card, index: number): void {
  let damage = card.power;
  let healing = card.power;
  let reactiveTriggered = false;

  // Check for reactive bonus
  const enemyIsAttacking = 
    this.enemy.getCurrentIntent() === EnemyIntent.ATTACK;
  
  if (card.isReactive && enemyIsAttacking) {
    reactiveTriggered = true;
    console.log('⚡ REACTIVE BONUS!');
    damage += card.reactiveBonus;
    healing += card.reactiveBonus;
  }

  // Apply based on type
  if (card.type === CardType.STRIKE || 
      card.type === CardType.VENOM) {
    this.enemy.takeDamage(damage);
  } else if (card.type === CardType.COIL || 
             card.type === CardType.CONSTRICT) {
    this.snake.heal(healing);
  }
}
```

### Deck Updates
```typescript
export class Deck {
  // Get all cards in deck
  getDeckCards(): Card[] {
    return [...this.cards];
  }

  // Remove a card by ID (for SHED action)
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

## 5. Enemy - Minor Enhancement

```typescript
export class Enemy {
  // Add alias for getCurrentIntent
  getCurrentIntent(): EnemyIntent {
    return this.intent;
  }
}
```

---

## 6. Event System - Updated Callbacks

### Old Events (Remove from UI)
```typescript
// ❌ NO LONGER USED
'turnStarted'
'cardsSwapped'
'mutationSelection'
'prescience' updates
```

### New Events (Update UI Listeners)
```typescript
// ✅ NEW EVENTS
'battleStarted'       // { turn, isBoss }
'rewardPhase'         // { mutations }
'restPhase'           // { sites }
'restActionApplied'   // { action, healAmount?, buffs? }
'cardRemoved'         // { cardId }
'gameOver'            // { victory }

// Still Used
'cardsDrawn'          // { cards }
'cardPlayed'          // { card, index }
'phaseChanged'        // { phase }
'snakeColorChanged'   // { color }
'enemyIntentChanged'  // { enemy }
'distanceUpdated'     // { distance }
'victory'             // { distanceTraveled, turn }
```

---

## 🎯 Integration Checklist

- [x] GameManager: New state machine (BATTLE→REWARD→REST→TRANSITION)
- [x] GameManager: Auto-play cards at 0.6s delay
- [x] GameManager: Reactive card bonus checking
- [x] GameManager: Rest site logic (CONSUME/SHED/HARDEN)
- [x] Snake: Slithering animation methods
- [x] Snake: Removed prescience system
- [x] AudioManager: Unified ACTION phase for boss
- [x] Card: isReactive and reactiveBonus properties
- [x] Enemy: getCurrentIntent() alias
- [x] Deck: getDeckCards() and removeCard() methods
- [ ] UIRenderer: Update for new GameStates
- [ ] UIRenderer: REWARD and REST overlays
- [ ] CSS: Slither animation keyframes
- [ ] Testing: Full game loop validation
