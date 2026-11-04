import { CropType } from './api-spec.js';

export interface CropDefinition {
  type: CropType;
  displayName: string;
  tier: number;
  baseGrowthTicks: number;
  waterNeed: number; // 0 to 100
  pedagogicalConcept: string; // What programming idea this crop exercises
  description: string;
  baseSaleValue: number;
}

export const CROP_DEFINITIONS: Record<CropType, CropDefinition> = {
  hay: {
    type: 'hay',
    displayName: 'Golden Hay',
    tier: 1,
    baseGrowthTicks: 800,
    waterNeed: 0,
    pedagogicalConcept: 'Basic sequences and loops',
    description: 'A hardy, self-seeding grass. Perfect for first-time farm scripts and simple loop harvesting.',
    baseSaleValue: 1,
  },
  carrot: {
    type: 'carrot',
    displayName: 'Amber Carrot',
    tier: 1,
    baseGrowthTicks: 1500,
    waterNeed: 40,
    pedagogicalConcept: 'Conditionals (if get_tile_type() / soil check)',
    description: 'Requires tilled soil and moderate moisture to germinate.',
    baseSaleValue: 3,
  },
  sunflower: {
    type: 'sunflower',
    displayName: 'Solar Flower',
    tier: 2,
    baseGrowthTicks: 2500,
    waterNeed: 50,
    pedagogicalConcept: 'Sorting algorithms (bubble/selection sort with swap)',
    description: 'Blooms with varying petal counts. When sorted in ascending order across the row, provides solar energy.',
    baseSaleValue: 10,
  },
  pumpkin: {
    type: 'pumpkin',
    displayName: 'Colossal Pumpkin',
    tier: 2,
    baseGrowthTicks: 3000,
    waterNeed: 60,
    pedagogicalConcept: 'Nested loops & 2D area sweeps',
    description: 'Grows into an enormous mega-pumpkin when a full rectangle or quadrant is completely planted and watered together.',
    baseSaleValue: 25,
  },
  treasure_maize: {
    type: 'treasure_maize',
    displayName: 'Labyrinth Maize',
    tier: 3,
    baseGrowthTicks: 4000,
    waterNeed: 30,
    pedagogicalConcept: 'Pathfinding (BFS/DFS / maze traversal)',
    description: 'Sprouts dense stalks forming a hedge maze. A golden ear is hidden at the maze endpoint.',
    baseSaleValue: 50,
  },
  companion_herb: {
    type: 'companion_herb',
    displayName: 'Harmonic Herb',
    tier: 3,
    baseGrowthTicks: 3500,
    waterNeed: 50,
    pedagogicalConcept: 'Dictionaries / associative mapping & companion synergies',
    description: 'Thrives when paired adjacent to complementary crops. Maximizes yield when surrounding crop variety is balanced.',
    baseSaleValue: 40,
  },
};
