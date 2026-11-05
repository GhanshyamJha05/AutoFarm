import { CAMPAIGN_LEVELS, CampaignLevel, LevelStarCriteria } from './campaign-data.js';

export interface LevelProgress {
  levelId: string;
  completed: boolean;
  stars: number; // 0, 1, 2, or 3
  bestTicks: number;
  bestCode?: string;
}

export class CampaignManager {
  private progress: Map<string, LevelProgress> = new Map();
  private currentLevelId: string;

  constructor(initialProgress: LevelProgress[] = []) {
    for (const p of initialProgress) {
      this.progress.set(p.levelId, p);
    }
    this.currentLevelId = CAMPAIGN_LEVELS[0]?.id || 'lvl_01';
  }

  public getLevel(levelId: string): CampaignLevel | undefined {
    return CAMPAIGN_LEVELS.find((l) => l.id === levelId);
  }

  public getAllLevels(): CampaignLevel[] {
    return [...CAMPAIGN_LEVELS];
  }

  public getCurrentLevel(): CampaignLevel {
    return this.getLevel(this.currentLevelId) || CAMPAIGN_LEVELS[0]!;
  }

  public setCurrentLevel(levelId: string): boolean {
    const lvl = this.getLevel(levelId);
    if (!lvl) return false;
    this.currentLevelId = levelId;
    return true;
  }

  public isLevelUnlocked(levelId: string): boolean {
    const idx = CAMPAIGN_LEVELS.findIndex((l) => l.id === levelId);
    if (idx === 0) return true; // Level 1 is always unlocked
    const prevLevel = CAMPAIGN_LEVELS[idx - 1];
    if (!prevLevel) return false;
    const prevProg = this.progress.get(prevLevel.id);
    return prevProg !== undefined && prevProg.completed;
  }

  public calculateStars(criteria: LevelStarCriteria, ticks: number): number {
    if (ticks <= criteria.threeStarsMaxTicks) return 3;
    if (ticks <= criteria.twoStarsMaxTicks) return 2;
    if (ticks <= criteria.oneStarMaxTicks) return 1;
    return 0;
  }

  public evaluateRun(
    levelId: string,
    ticks: number,
    inventory: Record<string, number>,
    code: string
  ): {
    passed: boolean;
    stars: number;
    reason: string;
  } {
    const level = this.getLevel(levelId);
    if (!level) return { passed: false, stars: 0, reason: 'Level not found' };

    // Check all objectives
    for (const obj of level.objectives) {
      const harvested = inventory[obj.crop] || 0;
      if (harvested < obj.count) {
        return {
          passed: false,
          stars: 0,
          reason: `Objective incomplete: Harvested ${harvested}/${obj.count} ${obj.crop}.`,
        };
      }
    }

    const stars = this.calculateStars(level.starCriteria, ticks);
    const existing = this.progress.get(levelId);

    const updated: LevelProgress = {
      levelId,
      completed: true,
      stars: Math.max(existing?.stars || 0, stars),
      bestTicks: existing ? Math.min(existing.bestTicks, ticks) : ticks,
      bestCode: existing && existing.bestTicks < ticks ? existing.bestCode : code,
    };

    this.progress.set(levelId, updated);

    return {
      passed: true,
      stars,
      reason: `Level completed with ${stars} Star${stars === 1 ? '' : 's'} (${ticks} ticks)!`,
    };
  }

  public getProgress(levelId: string): LevelProgress | undefined {
    return this.progress.get(levelId);
  }

  public getTotalStars(): number {
    let total = 0;
    for (const p of this.progress.values()) {
      total += p.stars;
    }
    return total;
  }

  public serialize(): LevelProgress[] {
    return Array.from(this.progress.values());
  }
}

