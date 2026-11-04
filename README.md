# Autofarm

Autofarm is a programming-puzzle game about building a thriving farm by writing code. The drone takes its instructions from the player; each action will have a deterministic time cost so players can improve their scripts and compare runs.

## Repository layout

- `apps/web` — React, TypeScript, and Vite client.
- `packages/design-tokens` — shared palette, typography, and layout tokens.
- `services/api` — Go API service foundation.
- `docs` — architecture, balance, and operations documentation as the project grows.

## Prerequisites

- Node.js 22 or newer
- pnpm 11.2.0
- Go 1.25 or newer

## Local development

```sh
pnpm install
pnpm dev
```

The web app runs at the Vite URL printed in the terminal. To run the API foundation separately:

```sh
cd services/api
go run .
```

The API health endpoint is `http://localhost:8080/health`.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
cd services/api && go test ./... && go build ./...
```

## Product phases

The initial milestone establishes the monorepo, CI checks, visual tokens, and app/API entry points. The next milestone implements the headless language lexer, parser, and deterministic step interpreter.
