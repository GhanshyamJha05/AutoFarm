import { describe, it, expect } from 'vitest';
import { CampaignManager } from '../src/campaign/CampaignManager.js';
import { CAMPAIGN_LEVELS } from '../src/campaign/campaign-data.js';
import { ReplayPlayer, ReplayRecording } from '../src/campaign/ReplayManager.js';

describe('Campaign & Replay Systems', () => {
  it('contains progressive pedagogical campaign levels', () => {
    expect(CAMPAIGN_LEVELS.length).toBeGreaterThanOrEqual(15);
    const lvl1 = CAMPAIGN_LEVELS[0];
    expect(lvl1.id).toBe('lvl_01');
    expect(lvl1.objectives[0].crop).toBe('hay');
  });

  it('evaluates star criteria correctly based on ticks', () => {
    const manager = new CampaignManager();
    const lvl1 = manager.getLevel('lvl_01')!;

    // 3 stars
    const r3 = manager.evaluateRun('lvl_01', 400, { hay: 1 }, 'plant("hay")\nharvest()');
    expect(r3.passed).toBe(true);
    expect(r3.stars).toBe(3);

    // 2 stars
    const r2 = manager.evaluateRun('lvl_01', 750, { hay: 1 }, 'plant("hay")\nharvest()');
    expect(r2.passed).toBe(true);
    // best stars remains 3
    expect(manager.getProgress('lvl_01')?.stars).toBe(3);

    // Objective not met
    const rFail = manager.evaluateRun('lvl_01', 300, { hay: 0 }, '');
    expect(rFail.passed).toBe(false);
  });

  it('replays recorded simulation actions step by step', () => {
    const recording: ReplayRecording = {
      version: '1.0',
      levelId: 'lvl_01',
      seed: 1337,
      initialGridSize: 2,
      code: 'move("east")',
      actions: [
        { tick: 200, action: 'move', args: ['east'], drone: { x: 1, y: 0, facing: 'east' } },
        { tick: 400, action: 'plant', args: ['hay'], drone: { x: 1, y: 0, facing: 'east' } },
      ],
      finalTicks: 400,
      finalInventory: { hay: 1 },
      timestamp: Date.now(),
    };

    const player = new ReplayPlayer(recording);
    expect(player.getLength()).toBe(2);

    const act1 = player.next();
    expect(act1?.action).toBe('move');
    const act2 = player.next();
    expect(act2?.action).toBe('plant');
    expect(player.next()).toBeNull();
  });
});
