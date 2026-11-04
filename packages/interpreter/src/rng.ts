export class SeededRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed ? seed >>> 0 : 1337;
    if (this.state === 0) this.state = 1337;
  }

  // Linear Congruential Generator (Numerical Recipes)
  public nextInt(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state;
  }

  // Returns float in [0, 1)
  public nextFloat(): number {
    return this.nextInt() / 4294967296.0;
  }

  // Returns integer in [min, max]
  public nextRange(min: number, max: number): number {
    return Math.floor(min + this.nextFloat() * (max - min + 1));
  }

  // Choice from array
  public choice<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    const idx = Math.floor(this.nextFloat() * arr.length);
    return arr[idx];
  }
}

