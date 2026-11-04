export type Direction = 'north' | 'south' | 'east' | 'west';

export type CropType =
  | 'hay'
  | 'carrot'
  | 'sunflower'
  | 'pumpkin'
  | 'treasure_maize'
  | 'companion_herb';

export type SoilType = 'grass' | 'tilled' | 'hydrated';

export interface CropState {
  type: CropType;
  growth: number; // 0 to 100 (%)
  stage: number; // 0, 1, 2, 3 (mature)
  isMature: boolean;
  waterLevel: number; // 0 to 100
  petalCount?: number; // for sunflower (sorting mechanic)
  companionBonus?: number; // for companion herbs
}

export interface ApiMethodSpec {
  name: string;
  category: 'motion' | 'farming' | 'sensing' | 'inventory';
  params: { name: string; type: string; description: string; default?: any }[];
  returnType: string;
  tickCost: number;
  description: string;
  example: string;
}

export const DRONE_API_SPEC: ApiMethodSpec[] = [
  {
    name: 'move',
    category: 'motion',
    params: [{ name: 'direction', type: 'str', description: '"north", "south", "east", or "west"' }],
    returnType: 'bool',
    tickCost: 200,
    description: 'Moves the drone 1 tile in the specified cardinal direction. Wraps around world edge.',
    example: 'move("north")',
  },
  {
    name: 'plant',
    category: 'farming',
    params: [{ name: 'crop', type: 'str', description: 'Name of crop ("hay", "carrot", etc.)' }],
    returnType: 'bool',
    tickCost: 200,
    description: 'Plants the given crop on the current tile if the soil is prepared.',
    example: 'plant("carrot")',
  },
  {
    name: 'harvest',
    category: 'farming',
    params: [],
    returnType: 'bool',
    tickCost: 200,
    description: 'Harvests the mature crop under the drone and adds yield to inventory.',
    example: 'if can_harvest():\n    harvest()',
  },
  {
    name: 'water',
    category: 'farming',
    params: [],
    returnType: 'bool',
    tickCost: 150,
    description: 'Pours water on the current tile, raising soil moisture by 40%.',
    example: 'water()',
  },
  {
    name: 'till',
    category: 'farming',
    params: [],
    returnType: 'bool',
    tickCost: 150,
    description: 'Tills grass into farm soil or clears withered debris.',
    example: 'till()',
  },
  {
    name: 'get_tile_type',
    category: 'sensing',
    params: [],
    returnType: 'str',
    tickCost: 10,
    description: 'Returns the ground soil type ("grass", "tilled", "hydrated").',
    example: 'soil = get_tile_type()',
  },
  {
    name: 'get_crop_state',
    category: 'sensing',
    params: [],
    returnType: 'dict | None',
    tickCost: 10,
    description: 'Returns metadata dictionary for the crop under the drone, or None.',
    example: 'info = get_crop_state()',
  },
  {
    name: 'get_position',
    category: 'sensing',
    params: [],
    returnType: 'tuple',
    tickCost: 5,
    description: 'Returns the current coordinates of the drone as (x, y).',
    example: 'x, y = get_position()',
  },
  {
    name: 'can_harvest',
    category: 'sensing',
    params: [],
    returnType: 'bool',
    tickCost: 10,
    description: 'Checks if the crop on the current tile is fully mature and ready to harvest.',
    example: 'if can_harvest():\n    harvest()',
  },
  {
    name: 'measure',
    category: 'sensing',
    params: [],
    returnType: 'int',
    tickCost: 20,
    description: 'Measures sunflower petal count or maze treasure distance on current tile.',
    example: 'petals = measure()',
  },
  {
    name: 'swap',
    category: 'farming',
    params: [{ name: 'direction', type: 'str', description: 'Direction of adjacent tile to swap with' }],
    returnType: 'bool',
    tickCost: 250,
    description: 'Swaps the crop on the current tile with the adjacent tile (used for sorting algorithms).',
    example: 'swap("east")',
  },
  {
    name: 'get_farm_size',
    category: 'sensing',
    params: [],
    returnType: 'int',
    tickCost: 5,
    description: 'Returns the dimension N of the N x N grid.',
    example: 'size = get_farm_size()',
  },
];

