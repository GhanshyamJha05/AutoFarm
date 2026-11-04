export interface TickCosts {
  // Primitive operations
  arithmetic: number;
  comparison: number;
  logical: number;
  variableRead: number;
  variableWrite: number;
  memberAccess: number;
  indexAccess: number;

  // Control flow & memory
  functionCall: number;
  functionReturn: number;
  loopStep: number;
  branch: number;
  listAlloc: number;
  dictAlloc: number;

  // Drone/Farm actions (configurable per action)
  farmActions: Record<string, number>;
}

export const DEFAULT_TICK_COSTS: TickCosts = {
  arithmetic: 1,
  comparison: 1,
  logical: 1,
  variableRead: 1,
  variableWrite: 1,
  memberAccess: 1,
  indexAccess: 1,

  functionCall: 2,
  functionReturn: 1,
  loopStep: 1,
  branch: 1,
  listAlloc: 2,
  dictAlloc: 3,

  farmActions: {
    move: 200,
    plant: 200,
    harvest: 200,
    water: 150,
    till: 150,
    get_tile_type: 10,
    get_crop_state: 10,
    get_position: 5,
    can_harvest: 10,
    measure: 20,
    swap: 250,
  },
};

