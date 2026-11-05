# AutoFarm Architecture Documentation

## 1. System Overview
**AutoFarm** is a programming-puzzle game where players program an automated farm drone using a deterministic Python-like language. The central constraint and scoring hook is **Tick Cost Optimization**: every operation (movement, planting, tilling, watering, harvesting, measurement) has a deterministic cost in simulated ticks.

```
+-----------------------------------------------------------------------+
|                              AutoFarm                                 |
+------------------------------------+----------------------------------+
|            Client Layer            |          Engine Layer            |
|                                    |                                  |
|   +----------------------------+   |   +--------------------------+   |
|   | React 19 UI / Tailwind     |   |   | Lexer & Parser (AST)     |   |
|   | PixiJS WebGL Renderer      |<=====>| Steppable Tree Interpreter|  |
|   | Monaco Code Editor         |   |   | Deterministic PRNG       |   |
|   | Procedural Web Audio API   |   |   | Feature Gate System      |   |
|   +----------------------------+   |   +--------------------------+   |
+------------------------------------+----------------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |            Backend Services           |
                 |                                       |
                 |   - Go / Chi HTTP API                 |
                 |   - Auth & Cloud Saves (Guest / JWT)  |
                 |   - Anti-Cheat Replay Verifier        |
                 |   - PostgreSQL Storage Layer          |
                 +---------------------------------------+
```

## 2. Monorepo Organization
- **`packages/interpreter`**: Pure TypeScript headless lexer, parser, AST structures, cost model, feature gates, and generator-based steppable interpreter. Runs in browser or node environments without DOM dependencies.
- **`packages/simulation`**: Pure TypeScript farm grid, drone entity, crop lifecycles, economy manager, 40+ tech tree nodes, 15+ campaign missions, and replay serialization.
- **`apps/web`**: React + Vite frontend featuring Monaco code editor with dynamic API autocomplete, PixiJS hardware-accelerated grid renderer, procedural Web Audio effects synthesizer, and responsive layout.
- **`services/api`**: Go backend service providing JWT auth, cloud save management, global leaderboards, and server-side replay execution verification.

## 3. Interpreter & Execution Coroutines
The interpreter is constructed as a JavaScript Generator function:
```typescript
function* run(ast: ProgramNode): Generator<ExecutionYield, void, void>
```
This enables:
1. **Interactive Stepping**: Executing a single line or AST instruction on command.
2. **Speed Multipliers**: Running arbitrary batches of operations (e.g. 1x, 5x, 30x) per animation frame without freezing the main browser thread.
3. **Deterministic Score Verification**: Total ticks accumulated match identically across browsers and Go server validation checks.

## 4. Anti-Cheat & Replay Engine
When players submit a high score:
1. The client submits `level_id`, `code`, `ticks`, and `actions_replay`.
2. The server (`services/api/verifier.go`) parses the actions, simulates cost calculation independently, and checks against the level constraints.
3. Scores that do not match the deterministic tick costs or attempt impossible crops are automatically rejected with `400 Invalid Replay`.
