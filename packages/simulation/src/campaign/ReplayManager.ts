import { ReplayAction } from '../engine.js';

export interface ReplayRecording {
  version: '1.0';
  levelId?: string;
  seed: number;
  initialGridSize: number;
  code: string;
  actions: ReplayAction[];
  finalTicks: number;
  finalInventory: Record<string, number>;
  timestamp: number;
}

export class ReplayPlayer {
  private currentStep = 0;
  private isPlaying = false;

  constructor(public replay: ReplayRecording) {}

  public getLength(): number {
    return this.replay.actions.length;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getActionAt(step: number): ReplayAction | undefined {
    return this.replay.actions[step];
  }

  public seek(step: number): ReplayAction | undefined {
    this.currentStep = Math.max(0, Math.min(step, this.replay.actions.length - 1));
    return this.replay.actions[this.currentStep];
  }

  public next(): ReplayAction | null {
    if (this.currentStep >= this.replay.actions.length) return null;
    const action = this.replay.actions[this.currentStep];
    this.currentStep++;
    return action || null;
  }

  public reset(): void {
    this.currentStep = 0;
    this.isPlaying = false;
  }
}
