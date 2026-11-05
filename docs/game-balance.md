# AutoFarm Economy & Game Balance Design

## 1. Tick Cost Model
Every action executed by the interpreter expends deterministic simulated time units ("Ticks"). A player's rating on campaign levels is strictly determined by completing objectives within minimum tick budgets.

| Operation / Action | Tick Cost | Design Rationale |
|---|---|---|
| Arithmetic / Variable Assignment | 1 Tick | Fast compute; encourages algorithmic efficiency over raw loops |
| Boolean Comparison | 1 Tick | Minimal branch cost |
| `move(direction)` | 200 Ticks | Drone traversal is a significant physical investment; requires smart pathing |
| `plant(crop)` | 200 Ticks | Seed placement; necessitates deliberate layout |
| `harvest()` | 200 Ticks | Crop gathering; penalizes premature harvesting |
| `water()` | 150 Ticks | Hydration accelerates growth cycles |
| `till()` | 150 Ticks | Soil preparation required for advanced crops |
| `measure()` | 50 Ticks | Sensor scan (e.g. sunflower petals, soil moisture) |
| `swap(direction)` | 250 Ticks | Soil exchange used for sorting puzzles |

## 2. Crop Lifecycles & Economics

| Crop | Base Growth Ticks | Soil Requirement | Petals / Attributes | Sell Value | Pedagogical Focus |
|---|---|---|---|---|---|
| **Golden Hay** | 400 | Any | None | 2 Coins | Basic sequencing & loops |
| **Orange Carrot** | 800 | Tilled | None | 6 Coins | Pre-condition checks (`till` before `plant`) |
| **Sunflower** | 1,200 | Tilled + Watered | 5 - 15 Petals | 15 Coins | Sorting algorithms & comparison |
| **Giant Pumpkin** | 2,000 | Hydrated (3x3 cluster) | Growth Synergy | 50 Coins | 2D array traversal & nested loops |
| **Treasure Maize** | 1,500 | Maze soil | Path key | 30 Coins | Graph search (DFS / BFS) |
| **Companion Herb** | 1,000 | Adjacent companion | Symbiosis bonus | 25 Coins | Hash maps / dictionary lookups |

## 3. Tech Tree Pacing
- **Tier 1 (Basics)**: Grass harvest, loops, farm size 3x3.
- **Tier 2 (Logic & Carrots)**: Conditionals, functions, farm size 5x5.
- **Tier 3 (Data Structures)**: Lists, tuples, sunflowers, sorting routines.
- **Tier 4 (Advanced Algorithms)**: Dictionaries, recursion, farm size 7x7, pathfinding mazes.
- **Tier 5 (Mastery)**: Drone speed boost, companion herb matrices, farm size 10x10.
