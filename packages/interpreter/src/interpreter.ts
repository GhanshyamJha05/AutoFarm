import { SourceSpan } from './lexer.js';
import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  LogicalExpressionNode,
  CallExpressionNode,
  IndexExpressionNode,
  MemberExpressionNode,
} from './ast.js';
import { Environment, RuntimeError } from './environment.js';
import { TickCosts, DEFAULT_TICK_COSTS } from './costs.js';
import { FeatureGate } from './feature-gate.js';
import { SeededRNG } from './rng.js';

export interface ExecutionYield {
  type: 'tick' | 'action' | 'print' | 'done';
  ticksElapsed: number;
  totalTicks: number;
  nodeSpan?: SourceSpan;
  actionName?: string;
  actionArgs?: any[];
  printOutput?: string;
  result?: any;
}

export interface UserFunction {
  __isUserFunction: true;
  name: string;
  params: string[];
  body: StatementNode[];
  closure: Environment;
}

export interface ExecutionOptions {
  maxTicks?: number;
  maxInstructions?: number;
  tickCosts?: Partial<TickCosts>;
  featureGate?: FeatureGate;
  seed?: number;
  hostContext?: Record<string, any>;
  onPrint?: (text: string) => void;
}

export class ExecutionBudgetExceededError extends Error {
  constructor(message: string, public totalTicks: number) {
    super(message);
    this.name = 'ExecutionBudgetExceededError';
  }
}

class ControlJump {
  constructor(public kind: 'return' | 'break' | 'continue', public value?: any) {}
}

export class Interpreter {
  private env: Environment;
  private costs: TickCosts;
  private featureGate: FeatureGate;
  private rng: SeededRNG;
  private totalTicks = 0;
  private instructionCount = 0;
  private maxTicks: number;
  private maxInstructions: number;
  private hostContext: Record<string, any>;
  private prints: string[] = [];
  private onPrint?: (text: string) => void;

  constructor(options: ExecutionOptions = {}) {
    this.maxTicks = options.maxTicks ?? 5_000_000;
    this.maxInstructions = options.maxInstructions ?? 2_000_000;
    this.featureGate = options.featureGate ?? new FeatureGate();
    this.rng = new SeededRNG(options.seed ?? 1337);
    this.hostContext = options.hostContext ?? {};
    this.onPrint = options.onPrint;

    this.costs = {
      ...DEFAULT_TICK_COSTS,
      ...(options.tickCosts || {}),
      farmActions: {
        ...DEFAULT_TICK_COSTS.farmActions,
        ...(options.tickCosts?.farmActions || {}),
      },
    };

    // Register builtins
    const globals: Record<string, any> = {
      print: (...args: any[]) => {
        const text = args
          .map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
          .join(' ');
        this.prints.push(text);
        if (this.onPrint) this.onPrint(text);
        return null;
      },
      range: (startOrStop: number, stop?: number, step: number = 1) => {
        let start = 0;
        let end = startOrStop;
        if (stop !== undefined) {
          start = startOrStop;
          end = stop;
        }
        const res: number[] = [];
        if (step > 0) {
          for (let i = start; i < end; i += step) res.push(i);
        } else if (step < 0) {
          for (let i = start; i > end; i += step) res.push(i);
        }
        return res;
      },
      len: (item: any) => {
        if (item === null || item === undefined) return 0;
        if (Array.isArray(item) || typeof item === 'string') return item.length;
        if (typeof item === 'object') return Object.keys(item).length;
        return 0;
      },
      abs: (x: number) => Math.abs(x),
      min: (...args: any[]) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return Math.min(...flat);
      },
      max: (...args: any[]) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return Math.max(...flat);
      },
      random: () => this.rng.nextFloat(),
      randint: (min: number, max: number) => this.rng.nextRange(min, max),
      ...this.hostContext,
    };

    this.env = new Environment(globals);
  }

  public getTicks(): number {
    return this.totalTicks;
  }

  public getInstructionCount(): number {
    return this.instructionCount;
  }

  public getPrints(): string[] {
    return [...this.prints];
  }

  public getScopeSnapshot(): Record<string, any> {
    return this.env.getSnapshot();
  }

  /**
   * Steppable Generator execution.
   */
  public *run(program: ProgramNode): Generator<ExecutionYield, any, void> {
    // 1. Static Feature Validation against tech-tree gating
    this.featureGate.validateAST(program);

    // 2. Execute statements
    for (const stmt of program.body) {
      const res = yield* this.executeStatement(stmt);
      if (res instanceof ControlJump) {
        if (res.kind === 'return') return res.value;
        throw new RuntimeError(`'${res.kind}' outside loop`, stmt.span);
      }
    }

    yield {
      type: 'done',
      ticksElapsed: 0,
      totalTicks: this.totalTicks,
      result: null,
    };

    return null;
  }

  private *executeStatement(stmt: StatementNode): Generator<ExecutionYield, any, void> {
    this.countInstruction(stmt.span);

    switch (stmt.type) {
      case 'ExpressionStatement': {
        return yield* this.evaluateExpression(stmt.expression);
      }
      case 'Assignment': {
        const val = yield* this.evaluateExpression(stmt.value);
        yield* this.chargeTick(this.costs.variableWrite, stmt.span);

        if (stmt.target.type === 'Identifier') {
          this.env.set(stmt.target.name, val);
        } else if (stmt.target.type === 'IndexExpression') {
          const obj = yield* this.evaluateExpression(stmt.target.object);
          const idx = yield* this.evaluateExpression(stmt.target.index);
          if (Array.isArray(obj)) {
            if (typeof idx !== 'number') {
              throw new RuntimeError('List index must be an integer.', stmt.target.span);
            }
            const i = idx < 0 ? obj.length + idx : idx;
            if (i < 0 || i >= obj.length) {
              throw new RuntimeError(`List index ${idx} out of range [0, ${obj.length - 1}].`, stmt.target.span);
            }
            obj[i] = val;
          } else if (typeof obj === 'object' && obj !== null) {
            obj[idx] = val;
          } else {
            throw new RuntimeError('Target does not support indexing assignment.', stmt.target.span);
          }
        } else {
          throw new RuntimeError('Unsupported assignment target.', stmt.span);
        }
        return val;
      }
      case 'AugmentedAssignment': {
        const delta = yield* this.evaluateExpression(stmt.value);
        let currentVal: unknown;
        let targetObj: unknown;
        let targetIndex: number | string | undefined;

        if (stmt.target.type === 'Identifier') {
          currentVal = this.env.get(stmt.target.name, stmt.target.span);
        } else if (stmt.target.type === 'IndexExpression') {
          const obj = yield* this.evaluateExpression(stmt.target.object);
          const idx = yield* this.evaluateExpression(stmt.target.index);
          targetObj = obj;
          if (Array.isArray(obj)) {
            if (typeof idx !== 'number') {
              throw new RuntimeError('List index must be an integer.', stmt.target.span);
            }
            const i = idx < 0 ? obj.length + idx : idx;
            if (i < 0 || i >= obj.length) {
              throw new RuntimeError(`List index ${idx} out of range [0, ${obj.length - 1}].`, stmt.target.span);
            }
            targetIndex = i;
            currentVal = obj[i];
          } else if (typeof obj === 'object' && obj !== null) {
            targetIndex = String(idx);
            currentVal = (obj as Record<string, unknown>)[String(idx)];
          } else {
            throw new RuntimeError('Target does not support indexing assignment.', stmt.target.span);
          }
        }

        let updatedVal: unknown;
        const c = currentVal as number;
        const d = delta as number;
        switch (stmt.operator) {
          case '+=':
            if (typeof currentVal === 'string' || typeof delta === 'string') {
              updatedVal = String(currentVal) + String(delta);
            } else if (Array.isArray(currentVal) && Array.isArray(delta)) {
              updatedVal = [...currentVal, ...delta];
            } else {
              updatedVal = c + d;
            }
            break;
          case '-=': updatedVal = c - d; break;
          case '*=': updatedVal = c * d; break;
          case '/=':
            if (d === 0) throw new RuntimeError('Division by zero.', stmt.span);
            updatedVal = c / d;
            break;
          case '%=':
            if (d === 0) throw new RuntimeError('Modulo by zero.', stmt.span);
            updatedVal = c % d;
            break;
        }

        yield* this.chargeTick(this.costs.arithmetic + this.costs.variableWrite, stmt.span);
        if (stmt.target.type === 'Identifier') {
          this.env.set(stmt.target.name, updatedVal);
        } else if (stmt.target.type === 'IndexExpression') {
          if (Array.isArray(targetObj) && typeof targetIndex === 'number') {
            targetObj[targetIndex] = updatedVal;
          } else if (typeof targetObj === 'object' && targetObj !== null && targetIndex !== undefined) {
            (targetObj as Record<string, unknown>)[String(targetIndex)] = updatedVal;
          }
        }
        return updatedVal;
      }
      case 'FunctionDef': {
        const fn: UserFunction = {
          __isUserFunction: true,
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          closure: this.env,
        };
        this.env.set(stmt.name, fn);
        return fn;
      }
      case 'ReturnStatement': {
        let val = null;
        if (stmt.value) {
          val = yield* this.evaluateExpression(stmt.value);
        }
        yield* this.chargeTick(this.costs.functionReturn, stmt.span);
        return new ControlJump('return', val);
      }
      case 'IfStatement': {
        yield* this.chargeTick(this.costs.branch, stmt.span);
        const cond = yield* this.evaluateExpression(stmt.condition);
        if (this.isTruthy(cond)) {
          for (const s of stmt.consequent) {
            const res = yield* this.executeStatement(s);
            if (res instanceof ControlJump) return res;
          }
          return null;
        }

        for (const elif of stmt.elifs) {
          yield* this.chargeTick(this.costs.branch, elif.span);
          const eCond = yield* this.evaluateExpression(elif.condition);
          if (this.isTruthy(eCond)) {
            for (const s of elif.body) {
              const res = yield* this.executeStatement(s);
              if (res instanceof ControlJump) return res;
            }
            return null;
          }
        }

        if (stmt.alternate) {
          for (const s of stmt.alternate) {
            const res = yield* this.executeStatement(s);
            if (res instanceof ControlJump) return res;
          }
        }
        return null;
      }
      case 'WhileStatement': {
        while (true) {
          yield* this.chargeTick(this.costs.loopStep, stmt.span);
          const cond = yield* this.evaluateExpression(stmt.condition);
          if (!this.isTruthy(cond)) break;

          let shouldBreak = false;
          for (const s of stmt.body) {
            const res = yield* this.executeStatement(s);
            if (res instanceof ControlJump) {
              if (res.kind === 'break') {
                shouldBreak = true;
                break;
              }
              if (res.kind === 'continue') {
                break; // Jump to next iteration of while
              }
              if (res.kind === 'return') return res;
            }
          }
          if (shouldBreak) break;
        }
        return null;
      }
      case 'ForStatement': {
        const iterable = yield* this.evaluateExpression(stmt.iterable);
        if (!Array.isArray(iterable) && typeof iterable !== 'string') {
          throw new RuntimeError(`'${typeof iterable}' object is not iterable.`, stmt.span);
        }

        for (const item of iterable) {
          yield* this.chargeTick(this.costs.loopStep, stmt.span);
          this.env.set(stmt.variable, item);

          let shouldBreak = false;
          for (const s of stmt.body) {
            const res = yield* this.executeStatement(s);
            if (res instanceof ControlJump) {
              if (res.kind === 'break') {
                shouldBreak = true;
                break;
              }
              if (res.kind === 'continue') {
                break;
              }
              if (res.kind === 'return') return res;
            }
          }
          if (shouldBreak) break;
        }
        return null;
      }
      case 'PassStatement':
        return null;
      case 'BreakStatement':
        return new ControlJump('break');
      case 'ContinueStatement':
        return new ControlJump('continue');
      default:
        throw new RuntimeError(`Unknown statement type '${(stmt as any).type}'`, (stmt as any).span);
    }
  }

  private *evaluateExpression(expr: ExpressionNode): Generator<ExecutionYield, any, void> {
    this.countInstruction(expr.span);

    switch (expr.type) {
      case 'Literal':
        return expr.value;
      case 'Identifier': {
        yield* this.chargeTick(this.costs.variableRead, expr.span);
        return this.env.get(expr.name, expr.span);
      }
      case 'UnaryExpression': {
        const val = yield* this.evaluateExpression(expr.argument);
        yield* this.chargeTick(this.costs.arithmetic, expr.span);
        if (expr.operator === '-') return -val;
        if (expr.operator === '+') return +val;
        if (expr.operator === 'not') return !this.isTruthy(val);
        return val;
      }
      case 'BinaryExpression': {
        const left = yield* this.evaluateExpression(expr.left);
        const right = yield* this.evaluateExpression(expr.right);

        switch (expr.operator) {
          case '+':
            yield* this.chargeTick(this.costs.arithmetic, expr.span);
            if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
            return left + right;
          case '-':
            yield* this.chargeTick(this.costs.arithmetic, expr.span);
            return left - right;
          case '*':
            yield* this.chargeTick(this.costs.arithmetic, expr.span);
            return left * right;
          case '/':
            yield* this.chargeTick(this.costs.arithmetic, expr.span);
            if (right === 0) throw new RuntimeError('Division by zero.', expr.span);
            return left / right;
          case '%':
            yield* this.chargeTick(this.costs.arithmetic, expr.span);
            if (right === 0) throw new RuntimeError('Modulo by zero.', expr.span);
            return left % right;
          case '**':
            yield* this.chargeTick(this.costs.arithmetic, expr.span);
            return Math.pow(left, right);
          case '==':
            yield* this.chargeTick(this.costs.comparison, expr.span);
            return this.isEqual(left, right);
          case '!=':
            yield* this.chargeTick(this.costs.comparison, expr.span);
            return !this.isEqual(left, right);
          case '<':
            yield* this.chargeTick(this.costs.comparison, expr.span);
            return left < right;
          case '<=':
            yield* this.chargeTick(this.costs.comparison, expr.span);
            return left <= right;
          case '>':
            yield* this.chargeTick(this.costs.comparison, expr.span);
            return left > right;
          case '>=':
            yield* this.chargeTick(this.costs.comparison, expr.span);
            return left >= right;
        }
        break;
      }
      case 'LogicalExpression': {
        const left = yield* this.evaluateExpression(expr.left);
        yield* this.chargeTick(this.costs.logical, expr.span);
        if (expr.operator === 'and') {
          if (!this.isTruthy(left)) return left;
          return yield* this.evaluateExpression(expr.right);
        } else if (expr.operator === 'or') {
          if (this.isTruthy(left)) return left;
          return yield* this.evaluateExpression(expr.right);
        }
        break;
      }
      case 'CallExpression': {
        const callee = yield* this.evaluateExpression(expr.callee);
        const args: any[] = [];
        for (const argNode of expr.args) {
          args.push(yield* this.evaluateExpression(argNode));
        }

        // Host Farm Action Check
        if (typeof callee === 'function') {
          // Check if this is a registered farm action
          const calleeName = expr.callee.type === 'Identifier' ? expr.callee.name : undefined;
          if (calleeName && this.costs.farmActions[calleeName] !== undefined) {
            const cost = this.costs.farmActions[calleeName];
            yield {
              type: 'action',
              actionName: calleeName,
              actionArgs: args,
              ticksElapsed: cost,
              totalTicks: (this.totalTicks += cost),
              nodeSpan: expr.span,
            };
            return callee(...args);
          }

          yield* this.chargeTick(this.costs.functionCall, expr.span);
          return callee(...args);
        }

        // User Defined Function Check
        if (callee && callee.__isUserFunction) {
          const userFn = callee as UserFunction;
          yield* this.chargeTick(this.costs.functionCall, expr.span);

          this.env.pushScope(userFn.name);
          for (let i = 0; i < userFn.params.length; i++) {
            const p = userFn.params[i];
            if (p) {
              this.env.setLocal(p, args[i]);
            }
          }

          let returnValue = null;
          for (const s of userFn.body) {
            const res = yield* this.executeStatement(s);
            if (res instanceof ControlJump) {
              if (res.kind === 'return') {
                returnValue = res.value;
                break;
              }
              throw new RuntimeError(`'${res.kind}' outside loop`, s.span);
            }
          }

          this.env.popScope();
          return returnValue;
        }

        throw new RuntimeError(`'${typeof callee}' object is not callable.`, expr.span);
      }
      case 'IndexExpression': {
        const obj = yield* this.evaluateExpression(expr.object);
        const idx = yield* this.evaluateExpression(expr.index);
        yield* this.chargeTick(this.costs.indexAccess, expr.span);

        if (Array.isArray(obj) || typeof obj === 'string') {
          if (typeof idx !== 'number') {
            throw new RuntimeError('Index must be an integer.', expr.span);
          }
          const i = idx < 0 ? obj.length + idx : idx;
          if (i < 0 || i >= obj.length) {
            throw new RuntimeError(`Index ${idx} out of bounds.`, expr.span);
          }
          return obj[i];
        }

        if (typeof obj === 'object' && obj !== null) {
          if (obj[idx] === undefined) {
            throw new RuntimeError(`KeyError: '${idx}' not found in dict.`, expr.span);
          }
          return obj[idx];
        }

        throw new RuntimeError(`Value of type '${typeof obj}' is not subscriptable.`, expr.span);
      }
      case 'MemberExpression': {
        const obj = yield* this.evaluateExpression(expr.object);
        yield* this.chargeTick(this.costs.memberAccess, expr.span);

        if (obj === null || obj === undefined) {
          throw new RuntimeError(`Cannot read property '${expr.property}' of ${obj}.`, expr.span);
        }

        // Support string/list methods like .append(), .keys() safely
        if (Array.isArray(obj)) {
          if (expr.property === 'append') {
            return (item: any) => obj.push(item);
          }
          if (expr.property === 'pop') {
            return () => obj.pop();
          }
        }

        if (typeof obj === 'object' && expr.property in obj) {
          const val = obj[expr.property];
          if (typeof val === 'function') return val.bind(obj);
          return val;
        }

        throw new RuntimeError(`Object has no attribute '${expr.property}'.`, expr.span);
      }
      case 'List': {
        yield* this.chargeTick(this.costs.listAlloc, expr.span);
        const elements: any[] = [];
        for (const el of expr.elements) {
          elements.push(yield* this.evaluateExpression(el));
        }
        return elements;
      }
      case 'Dict': {
        yield* this.chargeTick(this.costs.dictAlloc, expr.span);
        const dict: Record<string, any> = {};
        for (const entry of expr.entries) {
          const k = yield* this.evaluateExpression(entry.key);
          const v = yield* this.evaluateExpression(entry.value);
          dict[String(k)] = v;
        }
        return dict;
      }
      case 'Tuple': {
        yield* this.chargeTick(this.costs.listAlloc, expr.span);
        const elements: any[] = [];
        for (const el of expr.elements) {
          elements.push(yield* this.evaluateExpression(el));
        }
        return Object.freeze(elements);
      }
    }

    throw new RuntimeError(`Unknown expression type '${(expr as any).type}'`, (expr as any).span);
  }

  private *chargeTick(ticks: number, span?: SourceSpan): Generator<ExecutionYield, void, void> {
    this.totalTicks += ticks;
    if (this.totalTicks > this.maxTicks) {
      throw new ExecutionBudgetExceededError(
        `Execution budget exceeded: reached ${this.totalTicks} ticks (max: ${this.maxTicks}). Possible infinite loop?`,
        this.totalTicks
      );
    }

    yield {
      type: 'tick',
      ticksElapsed: ticks,
      totalTicks: this.totalTicks,
      nodeSpan: span,
    };
  }

  private countInstruction(span: SourceSpan): void {
    this.instructionCount++;
    if (this.instructionCount > this.maxInstructions) {
      throw new ExecutionBudgetExceededError(
        `Instruction budget exceeded: executed ${this.instructionCount} instructions.`,
        this.totalTicks
      );
    }
  }

  private isTruthy(val: any): boolean {
    if (val === false || val === null || val === undefined || val === 0 || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
    return true;
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) return false;
      }
      return true;
    }
    return false;
  }
}

