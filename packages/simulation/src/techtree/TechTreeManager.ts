import { TECH_TREE_NODES, TechNode, TechCost } from './tech-tree-data.js';
import { LanguageFeature } from '@autofarm/interpreter';
import { CropType } from '../api-spec.js';

export interface TechProgressState {
  unlockedNodeIds: Set<string>;
  unlockedFeatures: Set<LanguageFeature>;
  unlockedCrops: Set<CropType>;
  unlockedCommands: Set<string>;
  farmSize: number;
  droneSpeedMultiplier: number; // 1.0 down to 0.4
}

export class TechTreeManager {
  private unlockedNodes: Set<string> = new Set();
  private features: Set<LanguageFeature> = new Set();
  private crops: Set<CropType> = new Set(['hay']);
  private commands: Set<string> = new Set(['move', 'get_farm_size']);
  private farmSize: number = 3;
  private speedMultiplier: number = 1.0;

  constructor(initialUnlockedIds: string[] = ['t1_grass_harvest']) {
    for (const id of initialUnlockedIds) {
      this.unlock(id, true);
    }
  }

  public getNode(id: string): TechNode | undefined {
    return TECH_TREE_NODES.find((n) => n.id === id);
  }

  public getAllNodes(): TechNode[] {
    return [...TECH_TREE_NODES];
  }

  public isUnlocked(id: string): boolean {
    return this.unlockedNodes.has(id);
  }

  public canUnlock(id: string, currentInventory: Record<string, number>): { allowed: boolean; reason?: string } {
    const node = this.getNode(id);
    if (!node) return { allowed: false, reason: 'Node does not exist' };
    if (this.unlockedNodes.has(id)) return { allowed: false, reason: 'Already unlocked' };

    // Check prerequisites
    for (const prereq of node.prerequisites) {
      if (!this.unlockedNodes.has(prereq)) {
        const prereqNode = this.getNode(prereq);
        return {
          allowed: false,
          reason: `Prerequisite '${prereqNode?.name || prereq}' is not yet researched.`,
        };
      }
    }

    // Check costs
    for (const [res, needed] of Object.entries(node.cost)) {
      if (needed && (currentInventory[res] || 0) < needed) {
        return {
          allowed: false,
          reason: `Insufficient ${res}: need ${needed}, have ${currentInventory[res] || 0}.`,
        };
      }
    }

    return { allowed: true };
  }

  public unlock(id: string, bypassCost = false): boolean {
    const node = this.getNode(id);
    if (!node) return false;

    this.unlockedNodes.add(id);

    if (node.unlockedFeatures) {
      for (const f of node.unlockedFeatures) this.features.add(f);
    }
    if (node.unlockedCrops) {
      for (const c of node.unlockedCrops) this.crops.add(c);
    }
    if (node.unlockedCommands) {
      for (const cmd of node.unlockedCommands) this.commands.add(cmd);
    }
    if (node.farmSizeUpgrade && node.farmSizeUpgrade > this.farmSize) {
      this.farmSize = node.farmSizeUpgrade;
    }
    if (node.droneSpeedBonus) {
      this.speedMultiplier = Math.max(0.3, this.speedMultiplier - node.droneSpeedBonus);
    }

    return true;
  }

  public getUnlockedFeatures(): LanguageFeature[] {
    return Array.from(this.features);
  }

  public getUnlockedCrops(): CropType[] {
    return Array.from(this.crops);
  }

  public getUnlockedCommands(): string[] {
    return Array.from(this.commands);
  }

  public getFarmSize(): number {
    return this.farmSize;
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public serialize(): string[] {
    return Array.from(this.unlockedNodes);
  }
}

