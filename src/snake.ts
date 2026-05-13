import { debugLog } from './debug';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Snake Visual State interface
 */
export interface SnakeVisualState {
  isFanged: boolean;  // If Venom cards > 3
  isArmored: boolean; // If Constrict cards > 3
}

/**
 * Snake Class - Represents the player character with animation
 */
export class Snake {
  private baseColor: RGB = { r: 128, g: 128, b: 128 }; // Gray default
  private currentColor: RGB;
  private health: number;
  private maxHealth: number;
  private block: number = 0;
  private visualState: SnakeVisualState = { isFanged: false, isArmored: false };
  private isSlithering: boolean = false; // Vertical sine wave animation flag

  constructor(maxHealth: number = 40) {
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
  morphBySpecializations(
    venomCount: number,
    constrictCount: number,
    moltCount: number,
    totalDeckCount: number
  ): void {
    // Update visual state
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
      b: Math.round(venomRatio * 100 + constrictRatio * 255 + moltRatio * 252),
    };

    this.currentColor = {
      r: Math.round(this.baseColor.r + (mutationColor.r - this.baseColor.r) * mutationWeight),
      g: Math.round(this.baseColor.g + (mutationColor.g - this.baseColor.g) * mutationWeight),
      b: Math.round(this.baseColor.b + (mutationColor.b - this.baseColor.b) * mutationWeight),
    };

    debugLog(`Snake morphed: Fanged=${this.visualState.isFanged}, Armored=${this.visualState.isArmored}`);
  }

  /**
   * Get current color as hex string
   */
  getColorHex(): string {
    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(this.currentColor.r)}${toHex(this.currentColor.g)}${toHex(this.currentColor.b)}`;
  }

  /**
   * Get current color as RGB tuple for display
   */
  getColorRGB(): RGB {
    return { ...this.currentColor };
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    const absorbed = Math.min(this.block, amount);
    this.block -= absorbed;
    this.health = Math.max(0, this.health - (amount - absorbed));
  }

  /**
   * Heal
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Get health
   */
  getHealth(): number {
    return this.health;
  }

  /**
   * Get max health
   */
  getMaxHealth(): number {
    return this.maxHealth;
  }

  getMissingHealth(): number {
    return this.maxHealth - this.health;
  }

  gainBlock(amount: number): void {
    this.block += Math.max(0, amount);
  }

  clearBlock(): void {
    this.block = 0;
  }

  getBlock(): number {
    return this.block;
  }

  reduceMaxHealth(amount: number): void {
    this.maxHealth = Math.max(8, this.maxHealth - Math.max(0, amount));
    this.health = Math.min(this.health, this.maxHealth);
  }

  getBodyScale(): number {
    return Math.max(0.6, this.maxHealth / 40);
  }

  /**
   * Start slithering animation (vertical sine wave)
   */
  startSlithering(): void {
    this.isSlithering = true;
  }

  /**
   * Stop slithering animation
   */
  stopSlithering(): void {
    this.isSlithering = false;
  }

  /**
   * Get slithering state
   */
  isCurrentlySlithering(): boolean {
    return this.isSlithering;
  }

  /**
   * Check if alive
   */
  isAlive(): boolean {
    return this.health > 0;
  }

  /**
   * Get visual state
   */
  getVisualState(): SnakeVisualState {
    return { ...this.visualState };
  }
}
