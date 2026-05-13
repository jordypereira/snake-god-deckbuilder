# Snake God - Deckbuilder MVP

A side-scrolling auto-battle deckbuilder featuring a morphing serpent that changes color based on deck composition.

## Quick Start

### Installation
```bash
# Install dependencies (includes esbuild and tsx)
npm install
```

### Option 1: Build with esbuild (Recommended)
```bash
# One-time build
npm run build

# Watch mode for development
npm run watch

# Build + Serve (opens on http://localhost:8000)
npm run dev

# Watch mode + Serve with live reloading
npm run dev:watch
```

### Option 2: Build with TypeScript Compiler
```bash
# One-time build
npm run build:tsc

# Watch mode
npm run watch:tsc
```

Then open `http://localhost:8000` in your browser and select `index.html`.

### Option 3: Run with tsx (Direct Node execution)
```bash
# For development/testing without bundling
npx tsx src/index.ts
```

## Core Mechanics

### 1. The Snake 🐍
- Central character that moves right
- Color morphs based on deck composition:
  - **Venom (Green)**: Damage/Poison effects
  - **Constrict (Blue)**: Defense/Healing
  - **Molting (Yellow)**: Utility/Buffs

### 2. The Deck
Three card archetypes:
- **VENOM** (Green): Deals damage, high power
- **CONSTRICT** (Blue): Grants defense, healing
- **MOLTING** (Yellow): Special utilities and buffs

### 3. The Turn Flow

#### Phase 1: PLANNING
- Draw 3 cards
- Re-order them using **Prescience** resource (3 per turn)
- Click two cards to swap them

#### Phase 2: ACTION
- Cards play automatically left to right
- 0.5s delay between each card
- Effects resolve sequentially

#### Phase 3: TRANSITION
- Distance traveled increases by 10m per turn
- Next turn begins

## Game Features

### State Machine
```
PLANNING → ACTION → TRANSITION → PLANNING (loop)
                                  ↓
                            GAME_OVER (when snake dies)
```

### Snake Color Morphing
The snake's color is calculated as a weighted blend of:
- **Green** = % of VENOM cards × (0, 255, 0)
- **Blue** = % of CONSTRICT cards × (0, 153, 255)
- **Yellow** = % of MOLTING cards × (255, 255, 0)

### Distance Tracking
- Increments by 10m after each completed turn
- Represents the snake's progression through the level

## Project Structure

```
snake-auto-battle/
├── src/
│   ├── card.ts           # Card class with archetype system
│   ├── deck.ts           # Deck management and shuffling
│   ├── snake.ts          # Snake with morphing color logic
│   ├── game-manager.ts   # Core game state machine
│   ├── ui.ts             # UI rendering system
│   └── index.ts          # Entry point
├── dist/                 # Compiled & bundled output (generated)
├── styles.css            # Pixel-art aesthetic CSS
├── index.html            # Main game HTML
├── package.json          # Dependencies and build scripts
├── tsconfig.json         # TypeScript configuration
├── .instructions.md      # Copilot agent rules & guidelines
└── README.md             # This file
```

## API Reference

### Card Class
```typescript
class Card {
  id: string;
  name: string;
  type: CardType;
  power: number;
  description: string;
  getTypeColor(): string;
}
```

### Deck Class
```typescript
class Deck {
  draw(count: number): Card[];
  discard(card: Card): void;
  getCompositionRatio(): { venom, constrict, molting };
  getRemainingCount(): number;
}
```

### Snake Class
```typescript
class Snake {
  morphColor(venomWeight, constrictWeight, moltingWeight): void;
  getColorHex(): string;
  takeDamage(amount): void;
  heal(amount): void;
  usePrescience(): boolean;
  isAlive(): boolean;
}
```

### GameManager Class
```typescript
class GameManager {
  startTurn(): void;
  swapCards(indexA, indexB): boolean;
  executePlanning(): Promise<void>;
  getGameState(): GameState;
  getCurrentHand(): Card[];
  getDistanceTraveled(): number;
  on(event, callback): void;
}
```

## UI Features

- **Pixel-Art Aesthetic**: Uses `image-rendering: pixelated` for retro look
- **Hand Display**: 3 cards with visual representation
- **Snake Display**: Animated color-changing serpent
- **Deck Composition Bar**: Visual representation of deck ratios
- **Status Panel**: Shows phase, turn, health, prescience
- **Interactive Swapping**: Click cards to reorder during PLANNING phase

## Card Event System

The GameManager emits events that the UI listens to:
- `turnStarted`: New turn begins
- `cardsDrawn`: Cards drawn from deck
- `cardsSwapped`: Player reordered cards
- `phaseChanged`: Game phase changed
- `cardPlayed`: Card executed
- `snakeColorChanged`: Snake color updated
- `distanceUpdated`: Distance traveled changed
- `gameOver`: Game ended

## Future Enhancements

- [ ] Enemy system with attacks
- [ ] Progressive difficulty
- [ ] Card synergies and combos
- [ ] Deck editing between battles
- [ ] Sound effects and animations
- [ ] Mobile touch support
- [ ] Save/Load game state
- [ ] Leaderboards
- [ ] Multiple skins/themes

## Technical Stack

- **Language**: TypeScript (strict mode)
- **Build Tools**: `esbuild` (primary) / `tsx` (direct execution) / `tsc` (fallback)
- **Runtime**: Browser (ES2020+)
- **UI**: Vanilla HTML/CSS/JavaScript
- **Server**: Python http.server or your preferred choice
- **Ecosystem**: Nuxt team packages (`consola`, etc.)
- **Package Manager**: npm

## License

MIT
# snake-god-deckbuilder
