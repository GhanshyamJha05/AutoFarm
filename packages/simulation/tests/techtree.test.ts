import { describe, it, expect } from 'vitest';
import { TechTreeManager } from '../src/techtree/TechTreeManager.js';
import { TECH_TREE_NODES } from '../src/techtree/tech-tree-data.js';
import { EconomyManager } from '../src/economy/EconomyManager.js';

describe('Tech Tree & Economy', () => {
  it('contains comprehensive node catalog across tiers', () => {
    expect(TECH_TREE_NODES.length).toBeGreaterThanOrEqual(25);
    const tier1 = TECH_TREE_NODES.filter((n) => n.tier === 1);
    const tier2 = TECH_TREE_NODES.filter((n) => n.tier === 2);
    const tier3 = TECH_TREE_NODES.filter((n) => n.tier === 3);
    expect(tier1.length).toBeGreaterThanOrEqual(8);
    expect(tier2.length).toBeGreaterThanOrEqual(8);
    expect(tier3.length).toBeGreaterThanOrEqual(5);
  });

  it('enforces research prerequisites and resource consumption', () => {
    const tech = new TechTreeManager(['t1_grass_harvest']);
    const inv = { hay: 10 };

    // Cannot unlock loops directly without variables
    const checkLoops = tech.canUnlock('t1_loops', inv);
    expect(checkLoops.allowed).toBe(false);
    expect(checkLoops.reason).toMatch(/prerequisite/i);

    // Can unlock variables
    const checkVars = tech.canUnlock('t1_variables', inv);
    expect(checkVars.allowed).toBe(true);

    tech.unlock('t1_variables');
    expect(tech.getUnlockedFeatures()).toContain('variables');
  });

  it('handles crop selling and currency accrual in economy manager', () => {
    const econ = new EconomyManager(0, { hay: 50, carrot: 10 });
    const earnedHay = econ.sellCrop('hay', 20);
    expect(earnedHay).toBe(20 * 1); // hay unit price = 1
    expect(econ.getCoins()).toBe(20);
    expect(econ.getInventory()['hay']).toBe(30);

    const totalSold = econ.sellAllCrops();
    expect(totalSold).toBe(30 * 1 + 10 * 4); // remaining hay + carrots
    expect(econ.getCoins()).toBe(20 + 70);
  });
});
