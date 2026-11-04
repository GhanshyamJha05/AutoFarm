import { CropType } from '../api-spec.js';

export interface EconomyConfig {
  cropPrices: Record<CropType, number>;
  tickCostMultiplier: number;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  cropPrices: {
    hay: 1,
    carrot: 4,
    sunflower: 12,
    pumpkin: 35,
    treasure_maize: 80,
    companion_herb: 65,
  },
  tickCostMultiplier: 1.0,
};

export class EconomyManager {
  private coins: number = 0;
  private inventory: Map<string, number> = new Map();

  constructor(initialCoins: number = 0, initialInventory: Record<string, number> = {}) {
    this.coins = initialCoins;
    for (const [k, v] of Object.entries(initialInventory)) {
      this.inventory.set(k, v);
    }
  }

  public getCoins(): number {
    return this.coins;
  }

  public getInventory(): Record<string, number> {
    const inv: Record<string, number> = {};
    for (const [k, v] of this.inventory.entries()) {
      inv[k] = v;
    }
    return inv;
  }

  public addResource(item: string, count: number): void {
    const current = this.inventory.get(item) || 0;
    this.inventory.set(item, current + count);
  }

  public consumeResource(item: string, count: number): boolean {
    const current = this.inventory.get(item) || 0;
    if (current < count) return false;
    this.inventory.set(item, current - count);
    return true;
  }

  public sellCrop(crop: CropType, count?: number): number {
    const available = this.inventory.get(crop) || 0;
    const amountToSell = count !== undefined ? Math.min(count, available) : available;
    if (amountToSell <= 0) return 0;

    const unitPrice = DEFAULT_ECONOMY_CONFIG.cropPrices[crop] || 1;
    const earned = amountToSell * unitPrice;

    this.inventory.set(crop, available - amountToSell);
    this.coins += earned;
    return earned;
  }

  public sellAllCrops(): number {
    let totalEarned = 0;
    for (const crop of Object.keys(DEFAULT_ECONOMY_CONFIG.cropPrices) as CropType[]) {
      totalEarned += this.sellCrop(crop);
    }
    return totalEarned;
  }
}
