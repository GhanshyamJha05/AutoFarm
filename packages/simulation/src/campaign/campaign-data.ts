import { LanguageFeature } from '@autofarm/interpreter';
import { CropType } from '../api-spec.js';

export interface LevelObjective {
  crop: CropType;
  count: number;
}

export interface LevelStarCriteria {
  threeStarsMaxTicks: number;
  twoStarsMaxTicks: number;
  oneStarMaxTicks: number; // Failing this or exceeding maxTicks = 0 stars
}

export interface CampaignLevel {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  pedagogicalFocus: string;
  gridSize: number;
  allowedFeatures: LanguageFeature[];
  allowedCommands: string[];
  startingCode: string;
  objectives: LevelObjective[];
  starCriteria: LevelStarCriteria;
  hint: string;
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  // --- ACT 1: BOOTSTRAP (Levels 1-8: Sequences, Loops, & Variables) ---
  {
    id: 'lvl_01',
    number: 1,
    title: 'First Contact',
    subtitle: 'Autonomous drone commands',
    pedagogicalFocus: 'Sequential statement execution',
    gridSize: 1,
    allowedFeatures: [],
    allowedCommands: ['plant', 'harvest'],
    startingCode: `# Welcome Operator!
# Command your farm drone to plant and harvest Hay.
plant("hay")
harvest()
`,
    objectives: [{ crop: 'hay', count: 1 }],
    starCriteria: { threeStarsMaxTicks: 500, twoStarsMaxTicks: 800, oneStarMaxTicks: 1500 },
    hint: 'Commands execute in top-to-bottom sequence. First plant("hay"), then harvest().',
  },
  {
    id: 'lvl_02',
    number: 2,
    title: 'Cardinal Traversal',
    subtitle: 'Navigating coordinate planes',
    pedagogicalFocus: 'Positional motion and state changes',
    gridSize: 2,
    allowedFeatures: [],
    allowedCommands: ['move', 'plant', 'harvest'],
    startingCode: `# Navigate around a 2x2 grid to plant 2 Hay patches.
plant("hay")
move("east")
plant("hay")
`,
    objectives: [{ crop: 'hay', count: 2 }],
    starCriteria: { threeStarsMaxTicks: 900, twoStarsMaxTicks: 1400, oneStarMaxTicks: 2500 },
    hint: 'Move east or south to reach adjacent plots and plant each one.',
  },
  {
    id: 'lvl_03',
    number: 3,
    title: 'The Great Loop',
    subtitle: 'Eliminating code duplication',
    pedagogicalFocus: 'while loops & condition testing',
    gridSize: 3,
    allowedFeatures: ['variables', 'while_loops', 'augmented_assignment'],
    allowedCommands: ['move', 'plant'],
    startingCode: `# Use a while loop to plant 5 patches without copy-pasting!
count = 0
while count < 5:
    plant("hay")
    move("east")
    count += 1
`,
    objectives: [{ crop: 'hay', count: 5 }],
    starCriteria: { threeStarsMaxTicks: 2200, twoStarsMaxTicks: 3000, oneStarMaxTicks: 5000 },
    hint: 'Indented statements repeat every iteration until count reaches 5.',
  },
  {
    id: 'lvl_04',
    number: 4,
    title: 'Bounded Sequences',
    subtitle: 'Iterating over ranges',
    pedagogicalFocus: 'for ... in range(...)',
    gridSize: 3,
    allowedFeatures: ['for_loops'],
    allowedCommands: ['move', 'plant', 'get_farm_size'],
    startingCode: `# for loops handle the counter automatically!
for step in range(6):
    plant("hay")
    move("east")
`,
    objectives: [{ crop: 'hay', count: 6 }],
    starCriteria: { threeStarsMaxTicks: 2600, twoStarsMaxTicks: 3500, oneStarMaxTicks: 6000 },
    hint: 'range(6) runs the indented block exactly 6 times.',
  },
  {
    id: 'lvl_05',
    number: 5,
    title: 'Soil Preparation',
    subtitle: 'Tilling and hydration',
    pedagogicalFocus: 'Stateful agricultural prerequisites',
    gridSize: 2,
    allowedFeatures: ['for_loops'],
    allowedCommands: ['till', 'water', 'plant', 'move'],
    startingCode: `# Carrots need tilled, hydrated soil before planting!
till()
water()
plant("carrot")
move("east")
till()
water()
plant("carrot")
`,
    objectives: [{ crop: 'carrot', count: 2 }],
    starCriteria: { threeStarsMaxTicks: 1500, twoStarsMaxTicks: 2200, oneStarMaxTicks: 4000 },
    hint: 'Order matters: till() converts grass to dirt, water() hydrates it, then plant("carrot").',
  },
  {
    id: 'lvl_06',
    number: 6,
    title: 'Sensory Branching',
    subtitle: 'Inspecting environment before acting',
    pedagogicalFocus: 'if / else conditionals',
    gridSize: 3,
    allowedFeatures: ['variables', 'for_loops', 'if_else'],
    allowedCommands: ['get_tile_type', 'till', 'water', 'plant', 'move'],
    startingCode: `# Check the soil before tilling to save valuable ticks!
for i in range(4):
    if get_tile_type() == "grass":
        till()
        water()
    plant("carrot")
    move("east")
`,
    objectives: [{ crop: 'carrot', count: 4 }],
    starCriteria: { threeStarsMaxTicks: 2800, twoStarsMaxTicks: 3800, oneStarMaxTicks: 6500 },
    hint: 'Checking get_tile_type() avoids wasted duplicate till() calls.',
  },
  {
    id: 'lvl_07',
    number: 7,
    title: 'Grid Rasterizer',
    subtitle: '2D Nested coordinate sweep',
    pedagogicalFocus: 'Nested loops (x within y)',
    gridSize: 3,
    allowedFeatures: ['for_loops'],
    allowedCommands: ['plant', 'move'],
    startingCode: `# Sweep all 9 tiles using nested for loops
for y in range(3):
    for x in range(3):
        plant("hay")
        move("east")
    move("south")
`,
    objectives: [{ crop: 'hay', count: 9 }],
    starCriteria: { threeStarsMaxTicks: 3900, twoStarsMaxTicks: 5200, oneStarMaxTicks: 9000 },
    hint: 'Inner loop handles the row; outer loop steps down to the next row.',
  },
  {
    id: 'lvl_08',
    number: 8,
    title: 'Harvest Watcher',
    subtitle: 'Waiting on biological maturation',
    pedagogicalFocus: 'Event polling with can_harvest()',
    gridSize: 2,
    allowedFeatures: ['while_loops', 'if_else'],
    allowedCommands: ['plant', 'can_harvest', 'harvest', 'move'],
    startingCode: `# Plant and poll until crops are ripe
plant("hay")
while not can_harvest():
    move("east")
    move("west")

harvest()
`,
    objectives: [{ crop: 'hay', count: 1 }],
    starCriteria: { threeStarsMaxTicks: 2200, twoStarsMaxTicks: 3200, oneStarMaxTicks: 5500 },
    hint: 'while not can_harvest() waits for growth stages to reach maturity.',
  },

  // --- ACT 2: STRUCTURES & FUNCTIONS (Levels 9-16) ---
  {
    id: 'lvl_09',
    number: 9,
    title: 'Subroutine Engineering',
    subtitle: 'Modular reusable functions',
    pedagogicalFocus: 'def custom_function(params):',
    gridSize: 3,
    allowedFeatures: ['variables', 'for_loops', 'functions'],
    allowedCommands: ['till', 'water', 'plant', 'move'],
    startingCode: `# Define a helper function to cultivate a plot
def cultivate(crop_name):
    till()
    water()
    plant(crop_name)
    move("east")

for i in range(3):
    cultivate("carrot")
`,
    objectives: [{ crop: 'carrot', count: 3 }],
    starCriteria: { threeStarsMaxTicks: 2200, twoStarsMaxTicks: 3000, oneStarMaxTicks: 5000 },
    hint: 'Functions package repeatable actions into clean, maintainable blocks.',
  },
  {
    id: 'lvl_10',
    number: 10,
    title: 'Colossal Cultivation',
    subtitle: 'Coordinated quadrant seeding',
    pedagogicalFocus: 'Multi-tile area synchronization',
    gridSize: 3,
    allowedFeatures: ['variables', 'for_loops', 'functions'],
    allowedCommands: ['till', 'water', 'plant', 'move', 'harvest'],
    startingCode: `# Plant a full 3x3 patch of pumpkins for a massive cluster yield!
def prep_and_plant():
    till()
    water()
    plant("pumpkin")

for y in range(3):
    for x in range(3):
        prep_and_plant()
        move("east")
    move("south")
`,
    objectives: [{ crop: 'pumpkin', count: 5 }],
    starCriteria: { threeStarsMaxTicks: 7000, twoStarsMaxTicks: 9500, oneStarMaxTicks: 15000 },
    hint: 'When pumpkins fill a contiguous area, their harvest yield multiplies dramatically.',
  },
  {
    id: 'lvl_11',
    number: 11,
    title: 'Solar Measurements',
    subtitle: 'Array storage and indexing',
    pedagogicalFocus: 'Lists & list indexing',
    gridSize: 3,
    allowedFeatures: ['variables', 'for_loops', 'lists'],
    allowedCommands: ['plant', 'move', 'measure'],
    startingCode: `# Record petal measurements in a Python list
measurements = []

for i in range(3):
    plant("sunflower")
    petals = measure()
    measurements.append(petals)
    move("east")

print(measurements)
`,
    objectives: [{ crop: 'sunflower', count: 3 }],
    starCriteria: { threeStarsMaxTicks: 2500, twoStarsMaxTicks: 3500, oneStarMaxTicks: 6000 },
    hint: 'Use list.append() to accumulate measurements across drone steps.',
  },
  {
    id: 'lvl_12',
    number: 12,
    title: 'Solar Alignment',
    subtitle: 'Sorting adjacent crops',
    pedagogicalFocus: 'Bubble / Selection swap algorithms',
    gridSize: 3,
    allowedFeatures: ['variables', 'for_loops', 'if_else', 'augmented_assignment'],
    allowedCommands: ['plant', 'measure', 'swap', 'move'],
    startingCode: `# Inspect and swap sunflowers so petals are in ascending order
plant("sunflower")
p1 = measure()
move("east")
plant("sunflower")
p2 = measure()

if p1 > p2:
    swap("west")
`,
    objectives: [{ crop: 'sunflower', count: 2 }],
    starCriteria: { threeStarsMaxTicks: 1800, twoStarsMaxTicks: 2500, oneStarMaxTicks: 4500 },
    hint: 'swap("direction") exchanges the crops of two neighboring tiles.',
  },

  // --- ACT 3: ADVANCED ALGORITHMS (Levels 13-18) ---
  {
    id: 'lvl_13',
    number: 13,
    title: 'Companion Synergy',
    subtitle: 'Associative dictionary pairing',
    pedagogicalFocus: 'Dictionaries {key: value} & pairings',
    gridSize: 3,
    allowedFeatures: ['variables', 'for_loops', 'dicts', 'functions'],
    allowedCommands: ['till', 'water', 'plant', 'move', 'harvest'],
    startingCode: `# Companion herbs yield bonus output when paired next to different crops
plant("hay")
move("east")
till()
water()
plant("companion_herb")
`,
    objectives: [{ crop: 'companion_herb', count: 2 }],
    starCriteria: { threeStarsMaxTicks: 2600, twoStarsMaxTicks: 3800, oneStarMaxTicks: 6000 },
    hint: 'Harmonic Herbs check neighboring tiles for distinct species.',
  },
  {
    id: 'lvl_14',
    number: 14,
    title: 'Labyrinth Navigator',
    subtitle: 'Depth-first search pathfinding',
    pedagogicalFocus: 'DFS / recursion & backtracking',
    gridSize: 4,
    allowedFeatures: ['variables', 'while_loops', 'for_loops', 'functions', 'lists', 'if_else'],
    allowedCommands: ['move', 'plant', 'can_harvest', 'harvest'],
    startingCode: `# Solve the maze to reach and harvest the golden treasure maize
for i in range(4):
    move("east")
for j in range(4):
    move("south")
plant("treasure_maize")
`,
    objectives: [{ crop: 'treasure_maize', count: 1 }],
    starCriteria: { threeStarsMaxTicks: 4500, twoStarsMaxTicks: 6500, oneStarMaxTicks: 10000 },
    hint: 'Traverse maze pathways systematically, keeping track of visited coordinates.',
  },
  {
    id: 'lvl_15',
    number: 15,
    title: 'Industrial Synthesis',
    subtitle: 'Multi-crop automated production',
    pedagogicalFocus: 'System integration & tick efficiency',
    gridSize: 4,
    allowedFeatures: [
      'variables',
      'for_loops',
      'while_loops',
      'functions',
      'lists',
      'dicts',
      'if_else',
      'augmented_assignment',
    ],
    allowedCommands: ['till', 'water', 'plant', 'harvest', 'can_harvest', 'move'],
    startingCode: `# Produce 5 Hay and 5 Carrots in optimal simulated time!
for i in range(5):
    plant("hay")
    move("east")

for i in range(5):
    till()
    water()
    plant("carrot")
    move("east")
`,
    objectives: [
      { crop: 'hay', count: 5 },
      { crop: 'carrot', count: 5 },
    ],
    starCriteria: { threeStarsMaxTicks: 8500, twoStarsMaxTicks: 12000, oneStarMaxTicks: 20000 },
    hint: 'Interleave planting and watering so crops mature simultaneously.',
  },
];
