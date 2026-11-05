# AutoFarm

<div align="center">

**A programming-puzzle game where you automate a farm with code.**

[![CI Workflow](https://github.com/GhanshyamJha05/AutoFarm/actions/workflows/ci.yml/badge.svg)](https://github.com/GhanshyamJha05/AutoFarm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Go Backend](https://img.shields.io/badge/Backend-Go%201.22-00ADD8.svg)](services/api)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20PixiJS-61DAFB.svg)](apps/web)

</div>

---

## 🌾 Concept

The player controls a futuristic agricultural drone **ONLY** by writing code in a Python-like language. The drone cannot be piloted manually. 

Starting with a basic command set on a modest plot, you harvest resources, unlock language features (loops, functions, lists, dicts, recursion), research crops, expand farm size, and master computer science fundamentals (sorting algorithms, graph searches, pathfinding).

**The Core Hook is OPTIMIZATION:** Every movement, harvest, sensor scan, and computation expends deterministic simulated **Ticks**. Your leaderboard rank and star awards depend on writing faster, more algorithmic code.

---

## 🚀 Key Features

- **Custom Deterministic Steppable Interpreter**:
  - Indentation-based Python-like grammar (`if/elif/else`, `while`, `for in range()`, `def`, `lists`, `dicts`, `print`).
  - AST-level tech-tree gating with plain-English unlock guidance.
  - Coroutine generator execution (`1x` to `30x` speed) with live line stepping and breakpoints.
- **Hardware-Accelerated WebGL Visuals**:
  - Built with PixiJS v8. Smooth drone interpolation, dynamic crop growth animations, particle harvest bursts, and day/night atmospheric tinting tied to ticks.
- **Procedural Audio Synthesis**:
  - Real-time sound generation using the Web Audio API with zero external audio assets.
- **Rich Campaign**:
  - 15+ curated pedagogical missions with 1-star, 2-star, and 3-star tick benchmarks.
  - Interactive tech tree with 40+ researchable nodes.
- **Production-Grade Go Backend**:
  - Email/Password + Guest Auth with JWT cookies.
  - Cloud save synchronization with conflict resolution.
  - Server-side anti-cheat replay verification that re-simulates tick costs before granting leaderboard positions.

---

## 🛠 Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo-ready setup.
- **Frontend**: TypeScript, React 19, Tailwind CSS, Zustand, PixiJS, Monaco Editor.
- **Interpreter & Simulation**: Pure TypeScript libraries with 100% headless testability.
- **Backend Service**: Go 1.22 with chi router + PostgreSQL.
- **Containerization**: Multi-stage Dockerfile + Docker Compose.

---

## 💻 Quickstart (Local Development)

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Go >= 1.22 (for backend API)
- Docker (optional for full-stack containerized runs)

### 1. Install & Build
```bash
git clone https://github.com/GhanshyamJha05/AutoFarm.git
cd AutoFarm

pnpm install
pnpm build
```

### 2. Run Tests
```bash
# Run interpreter & simulation tests
pnpm test

# Run Go backend verification tests
cd services/api
go test -v ./...
cd ../..
```

### 3. Launch Development Server
```bash
pnpm --filter @autofarm/web dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker Production Setup

Run the complete full-stack environment (React Frontend + Go API + PostgreSQL database) with a single command:
```bash
docker compose up --build
```
Navigate to [http://localhost:8080](http://localhost:8080).

---

## 🎮 Keyboard Shortcuts

- <kbd>F5</kbd> : Run / Pause Code Execution
- <kbd>F6</kbd> / <kbd>F10</kbd> : Step Next Instruction
- <kbd>F7</kbd> : Reset Simulation
- <kbd>Ctrl</kbd> + <kbd>Space</kbd> : Auto-Complete Drone API in Editor

---

## 📖 Documentation

- [Architecture Guide](docs/architecture.md)
- [Economy & Game Balance](docs/game-balance.md)

---

## 📄 License

MIT License. Designed and developed for algorithmic agriculture enthusiasts.
