export * from './lexer.js';
export * from './ast.js';
export * from './parser.js';
export * from './costs.js';
export * from './feature-gate.js';
export * from './rng.js';
export * from './environment.js';
export * from './interpreter.js';

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Interpreter, ExecutionOptions, ExecutionYield } from './interpreter.js';

export function runScript(source: string, options: ExecutionOptions = {}): {
  ticks: number;
  instructions: number;
  prints: string[];
  scope: Record<string, unknown>;
  yields: ExecutionYield[];
} {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const interpreter = new Interpreter(options);
  const generator = interpreter.run(ast);
  const yields: ExecutionYield[] = [];

  let step = generator.next();
  while (!step.done) {
    yields.push(step.value);
    step = generator.next();
  }

  return {
    ticks: interpreter.getTicks(),
    instructions: interpreter.getInstructionCount(),
    prints: interpreter.getPrints(),
    scope: interpreter.getScopeSnapshot(),
    yields,
  };
}

