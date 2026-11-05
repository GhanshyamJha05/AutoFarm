import { create } from 'zustand';
import {
  SimulationEngine,
  FarmGrid,
  Drone,
  FarmTile,
  Direction,
  TechTreeManager,
  EconomyManager,
  CampaignManager,
  CAMPAIGN_LEVELS,
  CampaignLevel,
  LevelProgress,
} from '@autofarm/simulation';
import {
  Lexer,
  Parser,
  Interpreter,
  ExecutionYield,
  FeatureGate,
} from '@autofarm/interpreter';

export type SimStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

export interface GameState {
  code: string;
  gridSize: number;
  tiles: FarmTile[][];
  drone: { x: number; y: number; facing: Direction };
  inventory: Record<string, number>;
  coins: number;
  unlockedNodes: string[];
  currentLevelId: string;
  campaignProgress: Record<string, LevelProgress>;
  ticks: number;
  speed: number; // 1x to 50x
  status: SimStatus;
  consoleLogs: string[];
  activeLine: number | null;
  errorMessage: string | null;

  // Actions
  setCode: (code: string) => void;
  setSpeed: (speed: number) => void;
  selectLevel: (levelId: string) => void;
  runCode: () => void;
  pauseCode: () => void;
  stepCode: () => void;
  resetSim: () => void;
  unlockTech: (nodeId: string) => void;
  sellHarvest: () => void;
}

let activeGenerator: Generator<ExecutionYield, any, void> | null = null;
let activeEngine: SimulationEngine | null = null;
let animFrameId: number | null = null;
const techManager = new TechTreeManager(['t1_grass_harvest']);
const economyManager = new EconomyManager(0, {});
const campaignManager = new CampaignManager();

const DEFAULT_SCRIPT = `# AUTOFARM: Automated Drone Script
# Tier 1 Tutorial: Plant and harvest Golden Hay

till()
water()
plant("hay")

# Sweep across the farm
for step in range(get_farm_size()):
    move("east")
    plant("hay")

print("Field seeded successfully!")
`;

export const useGameStore = create<GameState>((set, get) => {
  const initEngine = (size: number) => {
    const engine = new SimulationEngine({ gridSize: size, seed: 1337 });
    return {
      engine,
      tiles: engine.farm.toJSON().tiles,
      drone: engine.drone.getState(),
      inventory: {},
    };
  };

  const initialLevel = campaignManager.getCurrentLevel();
  const initial = initEngine(initialLevel.gridSize);

  return {
    code: initialLevel.startingCode,
    gridSize: initialLevel.gridSize,
    tiles: initial.tiles,
    drone: initial.drone,
    inventory: initial.inventory,
    coins: 0,
    unlockedNodes: techManager.serialize(),
    currentLevelId: initialLevel.id,
    campaignProgress: {},
    ticks: 0,
    speed: 5,
    status: 'idle',
    consoleLogs: [`[Mission] Initialized Level ${initialLevel.number}: ${initialLevel.title}`],
    activeLine: null,
    errorMessage: null,

    setCode: (code: string) => set({ code }),
    setSpeed: (speed: number) => set({ speed }),

    selectLevel: (levelId: string) => {
      const lvl = campaignManager.getLevel(levelId);
      if (!lvl) return;
      campaignManager.setCurrentLevel(levelId);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      activeGenerator = null;
      activeEngine = null;

      const freshEngine = new SimulationEngine({ gridSize: lvl.gridSize, seed: 1337 });
      set({
        currentLevelId: lvl.id,
        code: lvl.startingCode,
        gridSize: lvl.gridSize,
        tiles: freshEngine.farm.toJSON().tiles,
        drone: freshEngine.drone.getState(),
        inventory: {},
        ticks: 0,
        status: 'idle',
        activeLine: null,
        errorMessage: null,
        consoleLogs: [`[Mission] Switched to Level ${lvl.number}: ${lvl.title} (${lvl.pedagogicalFocus})`],
      });
    },

    unlockTech: (nodeId: string) => {
      const state = get();
      const check = techManager.canUnlock(nodeId, state.inventory);
      if (!check.allowed) {
        set({
          consoleLogs: [...get().consoleLogs, `[Research Failed] ${check.reason}`],
        });
        return;
      }

      // Deduct inventory cost
      const node = techManager.getNode(nodeId);
      if (node) {
        const nextInv = { ...state.inventory };
        for (const [res, needed] of Object.entries(node.cost)) {
          if (needed) nextInv[res] = (nextInv[res] || 0) - needed;
        }
        techManager.unlock(nodeId);
        set({
          inventory: nextInv,
          gridSize: techManager.getFarmSize(),
          unlockedNodes: techManager.serialize(),
          consoleLogs: [
            ...get().consoleLogs,
            `[Research Complete] Unlocked '${node.name}'!`,
          ],
        });
      }
    },

    sellHarvest: () => {
      const state = get();
      for (const [k, v] of Object.entries(state.inventory)) {
        economyManager.addResource(k, v);
      }
      const earned = economyManager.sellAllCrops();
      set({
        inventory: {},
        coins: economyManager.getCoins(),
        consoleLogs: [
          ...get().consoleLogs,
          `[Market] Sold crops for ${earned} Gold Coins. Balance: ${economyManager.getCoins()} Coins.`,
        ],
      });
    },

    resetSim: () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      activeGenerator = null;
      activeEngine = null;
      const refreshed = initEngine(get().gridSize);
      set({
        tiles: refreshed.tiles,
        drone: refreshed.drone,
        inventory: {},
        ticks: 0,
        status: 'idle',
        activeLine: null,
        errorMessage: null,
        consoleLogs: ['[Engine] Simulation reset.'],
      });
    },

    pauseCode: () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      set({ status: 'paused' });
    },

    stepCode: () => {
      const state = get();
      if (!activeGenerator) {
        get().runCode();
        get().pauseCode();
        return;
      }

      try {
        const next = activeGenerator.next();
        if (next.done) {
          set({ status: 'done', activeLine: null });
        } else {
          const stepVal = next.value;
          set({
            ticks: stepVal.totalTicks,
            tiles: activeEngine!.farm.toJSON().tiles,
            drone: activeEngine!.drone.getState(),
            inventory: activeEngine!.drone.getState().inventory,
            activeLine: stepVal.nodeSpan ? stepVal.nodeSpan.start.line : null,
          });
        }
      } catch (err: any) {
        set({
          status: 'error',
          errorMessage: err.message,
          consoleLogs: [...get().consoleLogs, `[Error] ${err.message}`],
        });
      }
    },

    runCode: () => {
      const state = get();
      if (animFrameId) cancelAnimationFrame(animFrameId);

      // Initialize fresh engine if not stepping
      if (!activeGenerator || state.status === 'idle' || state.status === 'done' || state.status === 'error') {
        const engine = new SimulationEngine({ gridSize: state.gridSize, seed: 1337 });
        activeEngine = engine;

        try {
          const lexer = new Lexer(state.code);
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          const ast = parser.parse();

          // Enforce tech-tree gating dynamically
          const currentLvl = campaignManager.getLevel(state.currentLevelId);
          const unlockedFeatures = currentLvl
            ? [...techManager.getUnlockedFeatures(), ...currentLvl.allowedFeatures]
            : techManager.getUnlockedFeatures();
          const featureGate = new FeatureGate(unlockedFeatures);

          let interp!: Interpreter;
          const hostContext = engine.createHostContext(() => interp);
          interp = new Interpreter({
            seed: 1337,
            featureGate,
            hostContext,
            onPrint: (msg) => {
              set((s) => ({ consoleLogs: [...s.consoleLogs, `[Log] ${msg}`] }));
            },
          });

          activeGenerator = interp.run(ast);
          set({
            status: 'running',
            errorMessage: null,
            consoleLogs: ['[Engine] Execution started...'],
          });
        } catch (err: any) {
          set({
            status: 'error',
            errorMessage: err.message,
            consoleLogs: [...state.consoleLogs, `[Compile/Runtime Error] ${err.message}`],
          });
          return;
        }
      } else {
        set({ status: 'running' });
      }

      // Main Loop
      const runLoop = () => {
        if (!activeGenerator || get().status !== 'running') return;

        const currentSpeed = get().speed;
        let lastYield: ExecutionYield | null = null;

        try {
          // Process multiple generator steps per animation frame according to speed multiplier
          for (let i = 0; i < currentSpeed; i++) {
            const next = activeGenerator.next();
            if (next.done) {
              const finalTicks = get().ticks;
              const finalInv = activeEngine ? activeEngine.drone.getState().inventory : get().inventory;
              const evaluation = campaignManager.evaluateRun(
                get().currentLevelId,
                finalTicks,
                finalInv,
                get().code
              );

              const updatedProg: Record<string, LevelProgress> = {};
              for (const p of campaignManager.serialize()) {
                updatedProg[p.levelId] = p;
              }

              set({
                status: 'done',
                activeLine: null,
                campaignProgress: updatedProg,
                consoleLogs: [
                  ...get().consoleLogs,
                  `[Engine] Execution completed in ${finalTicks} ticks.`,
                  evaluation.passed
                    ? `[Mission Success] ${evaluation.reason}`
                    : `[Mission Incomplete] ${evaluation.reason}`,
                ],
              });
              activeGenerator = null;
              return;
            }
            lastYield = next.value;
          }

          if (lastYield && activeEngine) {
            set({
              ticks: lastYield.totalTicks,
              tiles: activeEngine.farm.toJSON().tiles,
              drone: activeEngine.drone.getState(),
              inventory: activeEngine.drone.getState().inventory,
              activeLine: lastYield.nodeSpan ? lastYield.nodeSpan.start.line : null,
            });
          }

          animFrameId = requestAnimationFrame(runLoop);
        } catch (err: any) {
          set({
            status: 'error',
            errorMessage: err.message,
            consoleLogs: [...get().consoleLogs, `[Execution Error] ${err.message}`],
          });
          activeGenerator = null;
        }
      };

      animFrameId = requestAnimationFrame(runLoop);
    },
  };
});

