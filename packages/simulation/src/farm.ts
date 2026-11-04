import { CropType, CropState, SoilType, Direction } from './api-spec.js';
import { SeededRNG } from '@autofarm/interpreter';

export interface FarmTile {
  x: number;
  y: number;
  soil: SoilType;
  moisture: number; // 0 to 100
  crop: CropState | null;
}

export class FarmGrid {
  private tiles: FarmTile[][];

  constructor(
    public readonly size: number = 3,
    private rng: SeededRNG = new SeededRNG(1337)
  ) {
    this.tiles = [];
    for (let y = 0; y < size; y++) {
      const row: FarmTile[] = [];
      for (let x = 0; x < size; x++) {
        row.push({
          x,
          y,
          soil: 'grass',
          moisture: 20,
          crop: null,
        });
      }
      this.tiles.push(row);
    }
  }

  public getTile(x: number, y: number): FarmTile {
    const wrappedX = ((x % this.size) + this.size) % this.size;
    const wrappedY = ((y % this.size) + this.size) % this.size;
    const row = this.tiles[wrappedY];
    if (!row) throw new Error(`Invalid row ${wrappedY}`);
    const tile = row[wrappedX];
    if (!tile) throw new Error(`Invalid tile ${wrappedX}`);
    return tile;
  }

  public till(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    tile.soil = 'tilled';
    tile.crop = null;
    return true;
  }

  public water(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    tile.moisture = Math.min(100, tile.moisture + 40);
    if (tile.moisture >= 40 && tile.soil === 'tilled') {
      tile.soil = 'hydrated';
    }
    return true;
  }

  public plant(x: number, y: number, cropType: CropType): boolean {
    const tile = this.getTile(x, y);
    // Hay can grow on raw grass; all other crops require tilled or hydrated soil
    if (cropType !== 'hay' && tile.soil === 'grass') {
      return false;
    }
    if (tile.crop !== null) {
      return false; // already occupied
    }

    let petalCount: number | undefined;
    if (cropType === 'sunflower') {
      // Petals random 7 to 15 for sorting challenge
      petalCount = this.rng.nextRange(7, 15);
    }

    tile.crop = {
      type: cropType,
      growth: 0,
      stage: 0,
      isMature: false,
      waterLevel: tile.moisture,
      petalCount,
    };
    return true;
  }

  public harvest(x: number, y: number): { type: CropType; yieldCount: number } | null {
    const tile = this.getTile(x, y);
    if (!tile.crop || !tile.crop.isMature) {
      return null;
    }

    const crop = tile.crop;
    let yieldCount = 1;

    // Special mechanics:
    // 1. Sunflower yields energy based on petal count
    if (crop.type === 'sunflower' && crop.petalCount) {
      yieldCount = crop.petalCount;
    }

    // 2. Pumpkin mega-cluster: If entire 3x3 or 2x2 is full of mature pumpkins, big yield
    if (crop.type === 'pumpkin') {
      const fullAreaBonus = this.checkAreaCrop(crop.type);
      if (fullAreaBonus > 1) {
        yieldCount = fullAreaBonus * 5;
      }
    }

    // 3. Companion planting bonuses
    if (crop.type === 'companion_herb') {
      const neighbors = this.getNeighborCrops(x, y);
      const uniqueTypes = new Set(neighbors.map((c) => c.type)).size;
      yieldCount = 1 + uniqueTypes * 2;
    }

    tile.crop = null; // Removed upon harvest
    return { type: crop.type, yieldCount };
  }

  public swap(x: number, y: number, direction: Direction): boolean {
    const offset = this.getDirectionOffset(direction);
    const targetTile = this.getTile(x + offset.dx, y + offset.dy);
    const currentTile = this.getTile(x, y);

    const tempCrop = currentTile.crop;
    currentTile.crop = targetTile.crop;
    targetTile.crop = tempCrop;
    return true;
  }

  /**
   * Advance simulation world ticks (crop growth, moisture evaporation).
   */
  public advanceTicks(ticks: number): void {
    // 1000 ticks = 1 growth cycle step
    const growthCycles = ticks / 500;
    if (growthCycles <= 0) return;

    for (let y = 0; y < this.size; y++) {
      const row = this.tiles[y];
      if (!row) continue;
      for (let x = 0; x < this.size; x++) {
        const tile = row[x];
        if (!tile) continue;

        // Evaporate water
        tile.moisture = Math.max(0, tile.moisture - 0.005 * ticks);
        if (tile.moisture < 30 && tile.soil === 'hydrated') {
          tile.soil = 'tilled';
        }

        if (tile.crop && !tile.crop.isMature) {
          // Growth rate depends on water and crop type
          let speedMultiplier = 1.0;
          if (tile.soil === 'hydrated' || tile.moisture > 40) {
            speedMultiplier = 2.0;
          }

          if (tile.crop.type === 'hay') speedMultiplier *= 2.5; // Fast initial crop

          tile.crop.growth = Math.min(100, tile.crop.growth + growthCycles * 25 * speedMultiplier);
          tile.crop.stage = Math.min(3, Math.floor(tile.crop.growth / 33.34));
          if (tile.crop.growth >= 100) {
            tile.crop.isMature = true;
            tile.crop.stage = 3;
          }
        }
      }
    }
  }

  public getNeighborCrops(x: number, y: number): CropState[] {
    const crops: CropState[] = [];
    const offsets = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const off of offsets) {
      const neighbor = this.getTile(x + off.dx, y + off.dy);
      if (neighbor.crop) crops.push(neighbor.crop);
    }
    return crops;
  }

  private checkAreaCrop(cropType: CropType): number {
    let count = 0;
    for (let y = 0; y < this.size; y++) {
      const row = this.tiles[y];
      if (!row) continue;
      for (let x = 0; x < this.size; x++) {
        const tile = row[x];
        const c = tile?.crop;
        if (c && c.type === cropType && c.isMature) {
          count++;
        }
      }
    }
    return count;
  }

  public getDirectionOffset(direction: Direction): { dx: number; dy: number } {
    switch (direction) {
      case 'north': return { dx: 0, dy: -1 };
      case 'south': return { dx: 0, dy: 1 };
      case 'east': return { dx: 1, dy: 0 };
      case 'west': return { dx: -1, dy: 0 };
    }
  }

  public toJSON() {
    return {
      size: this.size,
      tiles: this.tiles,
    };
  }
}
