# Architecture

Autofarm is a pnpm workspace monorepo. Browser code lives in `apps/web`; shared TypeScript packages live in `packages`; the Go API is isolated under `services/api` so the interpreter and simulation can later be validated by both the browser worker and server.

The interpreter and farm simulation are planned as deterministic, DOM-free TypeScript packages. The browser will run them in a Web Worker, while the API will re-simulate submissions for verification. Stable fixtures and explicit package boundaries will keep those paths aligned.

Visual foundations live in `packages/design-tokens`. CSS custom properties are the runtime source for themes; the typed token export provides a convenient reference for canvas and component code.
