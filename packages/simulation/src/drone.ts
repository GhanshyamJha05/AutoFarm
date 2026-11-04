import { Direction, CropType } from './api-spec.js';

export interface DroneState {
  x: number;
  y: number;
  facing: Direction;
  inventory: Record<string, number>;
}

export class Drone {
  public x: number = 0;
  public y: number = 0;
  public facing: Direction = 'north';
  public inventory: Map<string, number> = new Map();

  constructor(startX: number = 0, startY: number = 0) {
    this.x = startX;
    this.y = startY;
  }

  public move(direction: Direction, gridSize: number): boolean {
    this.facing = direction;
    switch (direction) {
      case 'north':
        this.y = ((this.y - 1) % gridSize + gridSize) % gridSize;
        break;
      case 'south':
        this.y = (this.y + 1) % gridSize;
        break;
      case 'east':
        this.x = (this.x + 1) % gridSize;
        break;
      case 'west':
        this.x = ((this.x - 1) % gridSize + gridSize) % gridSize;
        break;
    }
    return true;
  }

  public addInventory(item: string, count: number): void {
    const cur = this.inventory.get(item) || 0;
    this.inventory.set(item, cur + count);
  }

  public getInventory(item: string): number {
    return this.inventory.get(item) || 0;
  }

  public getState(): DroneState {
    const inv: Record<string, number> = {};
    for (const [k, v] of this.inventory.entries()) {
      inv[k] = v;
    }
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
      inventory: inv,
    };
  }
}

