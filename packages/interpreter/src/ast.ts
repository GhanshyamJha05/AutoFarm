import { SourceSpan } from './lexer.js';

export type ASTNode =
  | ProgramNode
  | StatementNode
  | ExpressionNode;

export interface BaseNode {
  type: string;
  span: SourceSpan;
}

export interface ProgramNode extends BaseNode {
  type: 'Program';
  body: StatementNode[];
}

export type StatementNode =
  | VariableDeclNode
  | AssignmentNode
  | AugmentedAssignmentNode
  | FunctionDefNode
  | ReturnStatementNode
  | IfStatementNode
  | WhileStatementNode
  | ForStatementNode
  | PassStatementNode
  | BreakStatementNode
  | ContinueStatementNode
  | ExpressionStatementNode;

export interface VariableDeclNode extends BaseNode {
  type: 'VariableDecl';
  name: string;
  value: ExpressionNode;
}

export interface AssignmentNode extends BaseNode {
  type: 'Assignment';
  target: ExpressionNode; // Identifier or IndexExpression
  value: ExpressionNode;
}

export interface AugmentedAssignmentNode extends BaseNode {
  type: 'AugmentedAssignment';
  operator: '+=' | '-=' | '*=' | '/=' | '%=';
  target: ExpressionNode;
  value: ExpressionNode;
}

export interface FunctionDefNode extends BaseNode {
  type: 'FunctionDef';
  name: string;
  params: string[];
  body: StatementNode[];
}

export interface ReturnStatementNode extends BaseNode {
  type: 'ReturnStatement';
  value: ExpressionNode | null;
}

export interface IfStatementNode extends BaseNode {
  type: 'IfStatement';
  condition: ExpressionNode;
  consequent: StatementNode[];
  elifs: { condition: ExpressionNode; body: StatementNode[]; span: SourceSpan }[];
  alternate: StatementNode[] | null;
}

export interface WhileStatementNode extends BaseNode {
  type: 'WhileStatement';
  condition: ExpressionNode;
  body: StatementNode[];
}

export interface ForStatementNode extends BaseNode {
  type: 'ForStatement';
  variable: string;
  iterable: ExpressionNode;
  body: StatementNode[];
}

export interface PassStatementNode extends BaseNode {
  type: 'PassStatement';
}

export interface BreakStatementNode extends BaseNode {
  type: 'BreakStatement';
}

export interface ContinueStatementNode extends BaseNode {
  type: 'ContinueStatement';
}

export interface ExpressionStatementNode extends BaseNode {
  type: 'ExpressionStatement';
  expression: ExpressionNode;
}

export type ExpressionNode =
  | LiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | IndexExpressionNode
  | ListNode
  | DictNode
  | TupleNode;

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: number | string | boolean | null;
  raw: string;
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  operator: '-' | '+' | 'not';
  argument: ExpressionNode;
}

export interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '%' | '**' | '==' | '!=' | '<' | '<=' | '>' | '>=';
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface LogicalExpressionNode extends BaseNode {
  type: 'LogicalExpression';
  operator: 'and' | 'or';
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface CallExpressionNode extends BaseNode {
  type: 'CallExpression';
  callee: ExpressionNode;
  args: ExpressionNode[];
}

export interface MemberExpressionNode extends BaseNode {
  type: 'MemberExpression';
  object: ExpressionNode;
  property: string;
}

export interface IndexExpressionNode extends BaseNode {
  type: 'IndexExpression';
  object: ExpressionNode;
  index: ExpressionNode;
}

export interface ListNode extends BaseNode {
  type: 'List';
  elements: ExpressionNode[];
}

export interface DictNode extends BaseNode {
  type: 'Dict';
  entries: { key: ExpressionNode; value: ExpressionNode; span: SourceSpan }[];
}

export interface TupleNode extends BaseNode {
  type: 'Tuple';
  elements: ExpressionNode[];
}

