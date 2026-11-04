import { ASTNode } from './ast.js';
import { SourceSpan } from './lexer.js';

export type LanguageFeature =
  | 'variables'
  | 'while_loops'
  | 'for_loops'
  | 'if_else'
  | 'functions'
  | 'lists'
  | 'dicts'
  | 'tuples'
  | 'augmented_assignment'
  | 'advanced_math'; // power, modulo

export interface FeatureGateInfo {
  tier: number;
  techNode: string;
  description: string;
}

export const LANGUAGE_FEATURE_CATALOG: Record<LanguageFeature, FeatureGateInfo> = {
  variables: { tier: 1, techNode: 'Basic Memory', description: 'Variable assignments and state storage' },
  while_loops: { tier: 1, techNode: 'Continuous Cycles', description: 'while condition: loops' },
  for_loops: { tier: 1, techNode: 'Range Iteration', description: 'for item in range(...) loops' },
  if_else: { tier: 1, techNode: 'Conditional Logic', description: 'if, elif, and else branching' },
  functions: { tier: 2, techNode: 'Subroutines', description: 'def custom_function(...) definitions' },
  lists: { tier: 2, techNode: 'Array Registers', description: 'Dynamic list collections and indexing' },
  augmented_assignment: { tier: 1, techNode: 'Operator Shortcuts', description: '+=, -=, *= operators' },
  tuples: { tier: 2, techNode: 'Coordinate Tuples', description: 'Immutable tuples like (x, y)' },
  dicts: { tier: 3, techNode: 'Key-Value Memory', description: 'Associative key-value dictionaries' },
  advanced_math: { tier: 2, techNode: 'Advanced Arithmetic', description: 'Exponentiation (**) and modulo (%)' },
};

export class FeatureLockedError extends Error {
  constructor(
    public feature: LanguageFeature,
    public span: SourceSpan,
    info: FeatureGateInfo
  ) {
    super(
      `[Line ${span.start.line}, Col ${span.start.column}] Feature Locked: '${feature}' is locked.\n` +
      `Unlock Tier ${info.tier} technology '${info.techNode}' in the Tech Tree to use this capability.`
    );
    this.name = 'FeatureLockedError';
  }
}

export class FeatureGate {
  private unlockedFeatures: Set<LanguageFeature>;

  constructor(unlocked?: LanguageFeature[]) {
    // By default, if nothing provided, allow everything (sandbox/sandbox mode or full mode)
    if (!unlocked) {
      this.unlockedFeatures = new Set(Object.keys(LANGUAGE_FEATURE_CATALOG) as LanguageFeature[]);
    } else {
      this.unlockedFeatures = new Set(unlocked);
    }
  }

  public isUnlocked(feature: LanguageFeature): boolean {
    return this.unlockedFeatures.has(feature);
  }

  public check(feature: LanguageFeature, span: SourceSpan): void {
    if (!this.unlockedFeatures.has(feature)) {
      const info = LANGUAGE_FEATURE_CATALOG[feature];
      throw new FeatureLockedError(feature, span, info);
    }
  }

  /**
   * Static validation of an entire AST before execution starts.
   */
  public validateAST(node: ASTNode): void {
    switch (node.type) {
      case 'Program':
        for (const stmt of node.body) this.validateAST(stmt);
        break;
      case 'Assignment':
      case 'VariableDecl':
        this.check('variables', node.span);
        this.validateAST(node.value);
        if (node.type === 'Assignment') this.validateAST(node.target);
        break;
      case 'AugmentedAssignment':
        this.check('augmented_assignment', node.span);
        this.validateAST(node.target);
        this.validateAST(node.value);
        break;
      case 'FunctionDef':
        this.check('functions', node.span);
        for (const stmt of node.body) this.validateAST(stmt);
        break;
      case 'IfStatement':
        this.check('if_else', node.span);
        this.validateAST(node.condition);
        for (const stmt of node.consequent) this.validateAST(stmt);
        for (const elif of node.elifs) {
          this.validateAST(elif.condition);
          for (const stmt of elif.body) this.validateAST(stmt);
        }
        if (node.alternate) {
          for (const stmt of node.alternate) this.validateAST(stmt);
        }
        break;
      case 'WhileStatement':
        this.check('while_loops', node.span);
        this.validateAST(node.condition);
        for (const stmt of node.body) this.validateAST(stmt);
        break;
      case 'ForStatement':
        this.check('for_loops', node.span);
        this.validateAST(node.iterable);
        for (const stmt of node.body) this.validateAST(stmt);
        break;
      case 'ReturnStatement':
        if (node.value) this.validateAST(node.value);
        break;
      case 'ExpressionStatement':
        this.validateAST(node.expression);
        break;
      case 'BinaryExpression':
        if (node.operator === '**' || node.operator === '%') {
          this.check('advanced_math', node.span);
        }
        this.validateAST(node.left);
        this.validateAST(node.right);
        break;
      case 'UnaryExpression':
        this.validateAST(node.argument);
        break;
      case 'LogicalExpression':
        this.validateAST(node.left);
        this.validateAST(node.right);
        break;
      case 'CallExpression':
        this.validateAST(node.callee);
        for (const arg of node.args) this.validateAST(arg);
        break;
      case 'IndexExpression':
        this.validateAST(node.object);
        this.validateAST(node.index);
        break;
      case 'MemberExpression':
        this.validateAST(node.object);
        break;
      case 'List':
        this.check('lists', node.span);
        for (const el of node.elements) this.validateAST(el);
        break;
      case 'Dict':
        this.check('dicts', node.span);
        for (const entry of node.entries) {
          this.validateAST(entry.key);
          this.validateAST(entry.value);
        }
        break;
      case 'Tuple':
        this.check('tuples', node.span);
        for (const el of node.elements) this.validateAST(el);
        break;
      case 'Literal':
      case 'Identifier':
      case 'PassStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
    }
  }
}

