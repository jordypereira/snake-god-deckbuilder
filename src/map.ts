/**
 * Map Node Type
 */
export enum NodeType {
  BATTLE = 'BATTLE',
  BOSS = 'BOSS',
}

/**
 * Map Class - Tracks progression through nodes
 */
export class Map {
  private nodes: NodeType[] = [];
  private currentNodeIndex: number = 0;
  private totalBattles: number = 0;
  private isBossBattle: boolean = false;

  constructor() {
    // Create map: 5 battles, then boss (repeating pattern)
    this.nodes = [
      NodeType.BATTLE,
      NodeType.BATTLE,
      NodeType.BATTLE,
      NodeType.BATTLE,
      NodeType.BATTLE,
      NodeType.BOSS,
    ];
    this.currentNodeIndex = 0;
    this.updateIsBossBattle();
  }

  /**
   * Check if current node is a boss battle
   */
  private updateIsBossBattle(): void {
    this.isBossBattle = this.nodes[this.currentNodeIndex] === NodeType.BOSS;
  }

  /**
   * Progress to next node
   */
  progressNode(): void {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
    this.totalBattles++;
    this.updateIsBossBattle();
    console.log(`Progressed to Node ${this.currentNodeIndex + 1}. Total battles: ${this.totalBattles}`);
  }

  /**
   * Get current node type
   */
  getCurrentNodeType(): NodeType {
    return this.nodes[this.currentNodeIndex];
  }

  /**
   * Check if current battle is boss
   */
  getIsBossBattle(): boolean {
    return this.isBossBattle;
  }

  /**
   * Get current node index
   */
  getCurrentNodeIndex(): number {
    return this.currentNodeIndex;
  }

  /**
   * Get all nodes
   */
  getNodes(): NodeType[] {
    return this.nodes;
  }

  /**
   * Get total battles completed
   */
  getTotalBattles(): number {
    return this.totalBattles;
  }

  /**
   * Reset map for new run
   */
  reset(): void {
    this.currentNodeIndex = 0;
    this.totalBattles = 0;
    this.updateIsBossBattle();
  }
}
