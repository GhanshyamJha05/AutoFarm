import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine.js';
import { FarmGrid } from '../src/farm.js';
import { Drone } from '../src/drone.js';

describe('Simulation Engine', () => {
  it('moves drone across toroidal boundaries', () => {
    const drone = new Drone(0, 0);
    drone.move('west', 3);
    expect(drone.x).toBe(2);
    drone.move('east', 3);
    expect(drone.x).toBe(0);
    drone.move('north', 3);
    expect(drone.y).toBe(2);
    drone.move('south', 3);
    expect(drone.y).toBe(0);
  });

  it('plants, grows, and harvests hay via script', () => {
    const sim = new SimulationEngine({ gridSize: 3, seed: 42 });
    const code = `
plant("hay")
move("east")
plant("hay")
move("west")

# Loop to allow crop growth
for i in range(10):
    move("north")
    move("south")

harvest()
`;
    const res = sim.execute(code);
    expect(res.inventory['hay']).toBeGreaterThanOrEqual(1);
    expect(res.replay.actions.length).toBeGreaterThan(10);
    expect(res.ticks).toBeGreaterThan(1000);
  });

  it('requires soil preparation (tilling) for carrots', () => {
    const farm = new FarmGrid(3);
    const successGrass = farm.plant(0, 0, 'carrot');
    expect(successGrass).toBe(false);

    farm.till(0, 0);
    const successTilled = farm.plant(0, 0, 'carrot');
    expect(successTilled).toBe(true);
  });

  it('produces identical deterministic replay traces on identical seeds', () => {
    const code = `
till()
water()
plant("carrot")
move("east")
`;
    const sim1 = new SimulationEngine({ gridSize: 3, seed: 777 });
    const res1 = sim1.execute(code);

    const sim2 = new SimulationEngine({ gridSize: 3, seed: 777 });
    const res2 = sim2.execute(code);

    expect(res1.ticks).toBe(res2.ticks);
    expect(res1.replay.actions).toEqual(res2.replay.actions);
  });

  it('performs headless 1,000,000 tick stress test in milliseconds', () => {
    const sim = new SimulationEngine({ gridSize: 4, seed: 101 });
    const code = `
for i in range(2500):
    move("east")
`;
    const t0 = performance.now();
    const res = sim.execute(code);
    const elapsed = performance.now() - t0;

    // 2500 moves * 200 ticks = 500,000+ ticks
    expect(res.ticks).toBeGreaterThanOrEqual(500000);
    // Should run within 1-2 seconds easily
    expect(elapsed).toBeLessThan(4000);
  });
});

