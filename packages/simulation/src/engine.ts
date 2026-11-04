import {
  Lexer,
  Parser,
  Interpreter,
  ExecutionYield,
  FeatureGate,
  LanguageFeature,
  SeededRNG,
} from '@autofarm/interpreter';
import { FarmGrid } from './farm.js';
import { Drone, DroneState } from './drone.js';
import { Direction, CropType } from './api-spec.js';

export interface ReplayAction {
  tick: number;
  action: string;
  args: any[];
  drone: { x: number; y: number; facing: Direction };
}

export interface SimulationResult {
  ticks: number;
  instructions: number;
  inventory: Record<string, number>;
  prints: string[];
  replay: {
    seed: number;
    initialGridSize: number;
    actions: ReplayAction[];
    finalTicks: number;
  };
  gridSnapshot: any;
}

export interface SimulationConfig {
  gridSize?: number;
  seed?: number;
  unlockedFeatures?: LanguageFeature[];
  maxTicks?: number;
}

export class SimulationEngine {
  public farm: FarmGrid;
  public drone: Drone;
  private rng: SeededRNG;
  private replayActions: ReplayAction[] = [];

  constructor(public config: SimulationConfig = {}) {
    const seed = config.seed ?? 1337;
    const size = config.gridSize ?? 3;
    this.rng = new SeededRNG(seed);
    this.farm = new FarmGrid(size, this.rng);
    this.drone = new Drone(0, 0);
  }

  public createHostContext(interpreterGetter: () => Interpreter): Record<string, any> {
    return {
      move: (dir: string) => {
        const direction = dir as Direction;
        const ok = this.drone.move(direction, this.farm.size);
        const interp = interpreterGetter();
        this.farm.advanceTicks(200);
        this.replayActions.push({
          tick: interp.getTicks(),
          action: 'move',
          args: [dir],
          drone: { x: this.drone.x, y: this.drone.y, facing: this.drone.facing },
        });
        return ok;
      },
      plant: (cropName: string) => {
        const ok = this.farm.plant(this.drone.x, this.drone.y, cropName as CropType);
        const interp = interpreterGetter();
        this.farm.advanceTicks(200);
        this.replayActions.push({
          tick: interp.getTicks(),
          action: 'plant',
          args: [cropName],
          drone: { x: this.drone.x, y: this.drone.y, facing: this.drone.facing },
        });
        return ok;
      },
      harvest: () => {
        const result = this.farm.harvest(this.drone.x, this.drone.y);
        const interp = interpreterGetter();
        this.farm.advanceTicks(200);
        if (result) {
          this.drone.addInventory(result.type, result.yieldCount);
        }
        this.replayActions.push({
          tick: interp.getTicks(),
          action: 'harvest',
          args: [],
          drone: { x: this.drone.x, y: this.drone.y, facing: this.drone.facing },
        });
        return result !== null;
      },
      water: () => {
        const ok = this.farm.water(this.drone.x, this.drone.y);
        const interp = interpreterGetter();
        this.farm.advanceTicks(150);
        this.replayActions.push({
          tick: interp.getTicks(),
          action: 'water',
          args: [],
          drone: { x: this.drone.x, y: this.drone.y, facing: this.drone.facing },
        });
        return ok;
      },
      till: () => {
        const ok = this.farm.till(this.drone.x, this.drone.y);
        const interp = interpreterGetter();
        this.farm.advanceTicks(150);
        this.replayActions.push({
          tick: interp.getTicks(),
          action: 'till',
          args: [],
          drone: { x: this.drone.x, y: this.drone.y, facing: this.drone.facing },
        });
        return ok;
      },
      get_tile_type: () => {
        const tile = this.farm.getTile(this.drone.x, this.drone.y);
        return tile.soil;
      },
      get_crop_state: () => {
        const tile = this.farm.getTile(this.drone.x, this.drone.y);
        if (!tile.crop) return null;
        return {
          type: tile.crop.type,
          growth: Math.floor(tile.crop.growth),
          stage: tile.crop.stage,
          is_mature: tile.crop.isMature,
          petals: tile.crop.petalCount,
        };
      },
      get_position: () => {
        return [this.drone.x, this.drone.y];
      },
      can_harvest: () => {
        const tile = this.farm.getTile(this.drone.x, this.drone.y);
        return tile.crop !== null && tile.crop.isMature;
      },
      measure: () => {
        const tile = this.farm.getTile(this.drone.x, this.drone.y);
        if (tile.crop && tile.crop.petalCount !== undefined) {
          return tile.crop.petalCount;
        }
        return 0;
      },
      swap: (dir: string) => {
        const ok = this.farm.swap(this.drone.x, this.drone.y, dir as Direction);
        const interp = interpreterGetter();
        this.farm.advanceTicks(250);
        this.replayActions.push({
          tick: interp.getTicks(),
          action: 'swap',
          args: [dir],
          drone: { x: this.drone.x, y: this.drone.y, facing: this.drone.facing },
        });
        return ok;
      },
      get_farm_size: () => {
        return this.farm.size;
      },
    };
  }

  public execute(code: string): SimulationResult {
    let interpreter!: Interpreter;
    const hostContext = this.createHostContext(() => interpreter);

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const featureGate = new FeatureGate(this.config.unlockedFeatures);
    interpreter = new Interpreter({
      seed: this.config.seed ?? 1337,
      maxTicks: this.config.maxTicks ?? 2_000_000,
      featureGate,
      hostContext,
    });

    const generator = interpreter.run(ast);
    let step = generator.next();
    while (!step.done) {
      step = generator.next();
    }

    return {
      ticks: interpreter.getTicks(),
      instructions: interpreter.getInstructionCount(),
      inventory: this.drone.getState().inventory,
      prints: interpreter.getPrints(),
      replay: {
        seed: this.config.seed ?? 1337,
        initialGridSize: this.farm.size,
        actions: this.replayActions,
        finalTicks: interpreter.getTicks(),
      },
      gridSnapshot: this.farm.toJSON(),
    };
  }
}
