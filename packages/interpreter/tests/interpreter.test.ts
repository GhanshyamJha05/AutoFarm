import { describe, it, expect } from 'vitest';
import { runScript } from '../src/index.js';
import { FeatureGate } from '../src/feature-gate.js';

describe('Interpreter', () => {
  it('executes basic arithmetic and variables', () => {
    const code = `
x = 10
y = 20
total = x + y * 2
`;
    const res = runScript(code);
    expect(res.scope.total).toBe(50);
    expect(res.ticks).toBeGreaterThan(0);
  });

  it('executes for loops with range() and accumulates sum', () => {
    const code = `
sum = 0
for i in range(1, 6):
    sum += i
`;
    const res = runScript(code);
    expect(res.scope.sum).toBe(15);
  });

  it('supports user functions and recursion/returns', () => {
    const code = `
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

ans = fib(7)
`;
    const res = runScript(code);
    expect(res.scope.ans).toBe(13);
  });

  it('charges realistic deterministic ticks and handles farm actions', () => {
    let moved = 0;
    const hostContext = {
      move: (dir: string) => {
        moved++;
        return true;
      },
    };

    const code = `
move("north")
move("east")
`;
    const res = runScript(code, { hostContext });
    expect(moved).toBe(2);
    // 2 moves at 200 ticks each = 400 ticks minimum
    expect(res.ticks).toBeGreaterThanOrEqual(400);
  });

  it('catches infinite loops via tick or instruction budget', () => {
    const code = `
while True:
    pass
`;
    expect(() => runScript(code, { maxTicks: 500, maxInstructions: 500 })).toThrowError(
      /budget exceeded/
    );
  });

  it('enforces tech-tree feature gating with friendly error messages', () => {
    const gate = new FeatureGate(['variables', 'augmented_assignment']); // No 'functions' or 'while_loops'
    const code = `
def my_func():
    return 42
`;
    expect(() => runScript(code, { featureGate: gate })).toThrowError(
      /Feature Locked: 'functions' is locked/
    );
  });

  it('is completely deterministic with seeded RNG', () => {
    const code = `
r1 = randint(1, 1000)
r2 = randint(1, 1000)
`;
    const res1 = runScript(code, { seed: 9999 });
    const res2 = runScript(code, { seed: 9999 });
    const res3 = runScript(code, { seed: 1234 });

    expect(res1.scope.r1).toBe(res2.scope.r1);
    expect(res1.scope.r2).toBe(res2.scope.r2);
    expect(res1.scope.r1).not.toBe(res3.scope.r1);
  });
});
