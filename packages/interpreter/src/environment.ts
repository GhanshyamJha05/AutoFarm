import { SourceSpan } from './lexer.js';

export interface ScopeFrame {
  name: string;
  variables: Map<string, unknown>;
  parent?: ScopeFrame;
}

export class RuntimeError extends Error {
  constructor(
    message: string,
    public span: SourceSpan,
    public hint?: string
  ) {
    super(`[Line ${span.start.line}, Col ${span.start.column}] RuntimeError: ${message}`);
    this.name = 'RuntimeError';
  }
}

export class Environment {
  private current: ScopeFrame;

  constructor(globalVariables: Record<string, unknown> = {}) {
    const rootMap = new Map<string, unknown>();
    for (const [k, v] of Object.entries(globalVariables)) {
      rootMap.set(k, v);
    }
    this.current = {
      name: 'global',
      variables: rootMap,
    };
  }

  public pushScope(name: string): void {
    this.current = {
      name,
      variables: new Map<string, unknown>(),
      parent: this.current,
    };
  }

  public popScope(): void {
    if (this.current.parent) {
      this.current = this.current.parent;
    }
  }

  public get(name: string, span: SourceSpan): unknown {
    let scope: ScopeFrame | undefined = this.current;
    while (scope) {
      if (scope.variables.has(name)) {
        return scope.variables.get(name);
      }
      scope = scope.parent;
    }
    throw new RuntimeError(`Name '${name}' is not defined.`, span, `Did you forget to define or assign '${name}'?`);
  }

  public set(name: string, value: unknown): void {
    // If variable exists in an existing scope chain, update it there, else set in current scope
    let scope: ScopeFrame | undefined = this.current;
    while (scope) {
      if (scope.variables.has(name)) {
        scope.variables.set(name, value);
        return;
      }
      scope = scope.parent;
    }
    this.current.variables.set(name, value);
  }

  public setLocal(name: string, value: unknown): void {
    this.current.variables.set(name, value);
  }

  public has(name: string): boolean {
    let scope: ScopeFrame | undefined = this.current;
    while (scope) {
      if (scope.variables.has(name)) return true;
      scope = scope.parent;
    }
    return false;
  }

  public getSnapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    let scope: ScopeFrame | undefined = this.current;
    const scopes: ScopeFrame[] = [];
    while (scope) {
      scopes.unshift(scope);
      scope = scope.parent;
    }
    for (const s of scopes) {
      for (const [k, v] of s.variables.entries()) {
        result[k] = v;
      }
    }
    return result;
  }
}

