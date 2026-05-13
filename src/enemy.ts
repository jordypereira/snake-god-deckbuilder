/**
 * Enemy Intent Enum - Simplified
 */
export enum EnemyIntent {
  ATTACK = 'ATTACK',
  EMPOWER = 'EMPOWER',
}

/**
 * Enemy Class - Simple opponent with 2 move types
 */
export class Enemy {
  private health: number;
  private maxHealth: number;
  private intent: EnemyIntent;
  private damage: number; // Damage on ATTACK intent
  private cardCountdown: number; // How many cards before enemy acts
  private damageScaling: number;
  private pendingEmpower: number;

  constructor(maxHealth: number = 40, damageScaling: number = 0) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.cardCountdown = 2; // Enemy acts after every 2 cards
    this.intent = EnemyIntent.ATTACK;
    this.damage = 0;
    this.damageScaling = damageScaling;
    this.pendingEmpower = 0;
  }

  /**
   * Randomize enemy intent for the next action window
   */
  randomizeIntent(): void {
    const intents = Object.values(EnemyIntent);
    this.intent = intents[Math.floor(Math.random() * intents.length)];

    if (this.intent === EnemyIntent.ATTACK) {
      this.damage = 8 + Math.floor(Math.random() * 3) + this.damageScaling + this.pendingEmpower;
    } else {
      this.damage = 4;
    }

    this.cardCountdown = 2;
    console.log(
      `Enemy Intent: ${this.intent}${this.intent === EnemyIntent.ATTACK ? ` (${this.damage} dmg)` : ` (+${this.damage} next attack)`}, Countdown: ${this.cardCountdown}`
    );
  }

  resolveIntent(): { intent: EnemyIntent; damage: number; empower: number } {
    if (this.intent === EnemyIntent.ATTACK) {
      const damage = this.damage;
      this.pendingEmpower = 0;
      return { intent: EnemyIntent.ATTACK, damage, empower: 0 };
    }

    this.pendingEmpower += this.damage;
    return { intent: EnemyIntent.EMPOWER, damage: 0, empower: this.damage };
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    console.log(`Enemy took ${amount} damage! Health: ${this.health}/${this.maxHealth}`);
  }

  /**
   * Decrement card countdown
   */
  decrementCountdown(): void {
    this.cardCountdown--;
  }

  /**
   * Get current intent
   */
  getIntent(): EnemyIntent {
    return this.intent;
  }

  /**
   * Get current intent (alias)
   */
  getCurrentIntent(): EnemyIntent {
    return this.intent;
  }

  /**
   * Get damage value (only relevant for ATTACK intent)
   */
  getDamage(): number {
    return this.damage;
  }

  /**
   * Get card countdown
   */
  getCardCountdown(): number {
    return this.cardCountdown;
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

  /**
   * Get health percentage
   */
  getHealthPercent(): number {
    return (this.health / this.maxHealth) * 100;
  }

  /**
   * Check if alive
   */
  isAlive(): boolean {
    return this.health > 0;
  }

  /**
   * Reset for new battle
   */
  reset(): void {
    this.health = this.maxHealth;
    this.cardCountdown = 2;
    this.pendingEmpower = 0;
    this.randomizeIntent();
  }

  setDamageScaling(value: number): void {
    this.damageScaling = value;
  }

  getPendingEmpower(): number {
    return this.pendingEmpower;
  }

  /**
   * Get intent icon emoji
   */
  getIntentIcon(): string {
    switch (this.intent) {
      case EnemyIntent.ATTACK:
        return '⚔️';
      case EnemyIntent.EMPOWER:
        return '🔥';
      default:
        return '❓';
    }
  }
}
