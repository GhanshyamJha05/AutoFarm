import { Token, TokenType, SourceSpan } from './lexer.js';
import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  IfStatementNode,
  WhileStatementNode,
  ForStatementNode,
  FunctionDefNode,
  ReturnStatementNode,
  AssignmentNode,
  AugmentedAssignmentNode,
} from './ast.js';

export class ParserError extends Error {
  constructor(
    message: string,
    public span: SourceSpan,
    public hint?: string
  ) {
    super(`[Line ${span.start.line}, Col ${span.start.column}] SyntaxError: ${message}`);
    this.name = 'ParserError';
  }
}

export class Parser {
  private current = 0;

  constructor(private tokens: Token[]) {}

  public parse(): ProgramNode {
    const statements: StatementNode[] = [];
    const start = this.peek().span.start;

    this.skipNewlines();

    while (!this.isAtEnd()) {
      statements.push(this.statement());
      this.skipNewlines();
    }

    const end = this.previous() ? this.previous().span.end : start;

    return {
      type: 'Program',
      body: statements,
      span: { start, end },
    };
  }

  // Statements
  private statement(): StatementNode {
    if (this.match(TokenType.DEF)) {
      return this.functionDefStatement();
    }
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }
    if (this.match(TokenType.PASS)) {
      const prev = this.previous();
      this.consumeNewlineOrEof();
      return { type: 'PassStatement', span: prev.span };
    }
    if (this.match(TokenType.BREAK)) {
      const prev = this.previous();
      this.consumeNewlineOrEof();
      return { type: 'BreakStatement', span: prev.span };
    }
    if (this.match(TokenType.CONTINUE)) {
      const prev = this.previous();
      this.consumeNewlineOrEof();
      return { type: 'ContinueStatement', span: prev.span };
    }

    return this.expressionOrAssignmentStatement();
  }

  private functionDefStatement(): FunctionDefNode {
    const defToken = this.previous();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected function name after 'def'.");
    this.consume(TokenType.LPAREN, "Expected '(' after function name.");

    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const param = this.consume(TokenType.IDENTIFIER, 'Expected parameter name.');
        params.push(param.value);
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')' after parameters.");
    this.consume(TokenType.COLON, "Expected ':' after function signature.");

    const body = this.block();
    const lastStmt = body[body.length - 1];
    const end = lastStmt ? lastStmt.span.end : this.previous().span.end;

    return {
      type: 'FunctionDef',
      name: nameToken.value,
      params,
      body,
      span: { start: defToken.span.start, end },
    };
  }

  private ifStatement(): IfStatementNode {
    const ifToken = this.previous();
    const condition = this.expression();
    this.consume(TokenType.COLON, "Expected ':' after if condition.");
    const consequent = this.block();

    const elifs: { condition: ExpressionNode; body: StatementNode[]; span: SourceSpan }[] = [];
    while (this.match(TokenType.ELIF)) {
      const elifToken = this.previous();
      const elifCondition = this.expression();
      this.consume(TokenType.COLON, "Expected ':' after elif condition.");
      const elifBody = this.block();
      const lastElif = elifBody[elifBody.length - 1];
      const end = lastElif ? lastElif.span.end : this.previous().span.end;
      elifs.push({
        condition: elifCondition,
        body: elifBody,
        span: { start: elifToken.span.start, end },
      });
    }

    let alternate: StatementNode[] | null = null;
    if (this.match(TokenType.ELSE)) {
      this.consume(TokenType.COLON, "Expected ':' after else.");
      alternate = this.block();
    }

    let end = ifToken.span.end;
    const lastAlt = alternate ? alternate[alternate.length - 1] : undefined;
    const lastEl = elifs[elifs.length - 1];
    const lastConseq = consequent[consequent.length - 1];

    if (lastAlt) {
      end = lastAlt.span.end;
    } else if (lastEl) {
      end = lastEl.span.end;
    } else if (lastConseq) {
      end = lastConseq.span.end;
    }

    return {
      type: 'IfStatement',
      condition,
      consequent,
      elifs,
      alternate,
      span: { start: ifToken.span.start, end },
    };
  }

  private whileStatement(): WhileStatementNode {
    const whileToken = this.previous();
    const condition = this.expression();
    this.consume(TokenType.COLON, "Expected ':' after while condition.");
    const body = this.block();
    const lastStmt = body[body.length - 1];
    const end = lastStmt ? lastStmt.span.end : this.previous().span.end;

    return {
      type: 'WhileStatement',
      condition,
      body,
      span: { start: whileToken.span.start, end },
    };
  }

  private forStatement(): ForStatementNode {
    const forToken = this.previous();
    const varToken = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'for'.");
    this.consume(TokenType.IN, "Expected 'in' after variable name in for loop.");
    const iterable = this.expression();
    this.consume(TokenType.COLON, "Expected ':' after for loop iterable.");
    const body = this.block();
    const lastStmt = body[body.length - 1];
    const end = lastStmt ? lastStmt.span.end : this.previous().span.end;

    return {
      type: 'ForStatement',
      variable: varToken.value,
      iterable,
      body,
      span: { start: forToken.span.start, end },
    };
  }

  private returnStatement(): ReturnStatementNode {
    const retToken = this.previous();
    let value: ExpressionNode | null = null;

    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.EOF)) {
      value = this.expression();
    }
    this.consumeNewlineOrEof();

    const end = value ? value.span.end : retToken.span.end;
    return {
      type: 'ReturnStatement',
      value,
      span: { start: retToken.span.start, end },
    };
  }

  private block(): StatementNode[] {
    this.consume(TokenType.NEWLINE, "Expected newline before indented block.");
    this.consume(TokenType.INDENT, "Expected indented block.");

    const statements: StatementNode[] = [];
    this.skipNewlines();

    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      statements.push(this.statement());
      this.skipNewlines();
    }

    this.consume(TokenType.DEDENT, "Expected dedent at the end of block.");
    return statements;
  }

  private expressionOrAssignmentStatement(): StatementNode {
    const expr = this.expression();

    // Assignment: target = expr
    if (this.match(TokenType.ASSIGN)) {
      const value = this.expression();
      this.consumeNewlineOrEof();

      if (expr.type !== 'Identifier' && expr.type !== 'IndexExpression' && expr.type !== 'MemberExpression') {
        throw new ParserError('Invalid assignment target.', expr.span, 'Target must be a variable, list index, or object property.');
      }

      return {
        type: 'Assignment',
        target: expr,
        value,
        span: { start: expr.span.start, end: value.span.end },
      } as AssignmentNode;
    }

    // Augmented assignment: target += expr, -=, etc.
    if (
      this.match(
        TokenType.PLUS_ASSIGN,
        TokenType.MINUS_ASSIGN,
        TokenType.MUL_ASSIGN,
        TokenType.DIV_ASSIGN,
        TokenType.MOD_ASSIGN
      )
    ) {
      const opToken = this.previous();
      const value = this.expression();
      this.consumeNewlineOrEof();

      if (expr.type !== 'Identifier' && expr.type !== 'IndexExpression' && expr.type !== 'MemberExpression') {
        throw new ParserError('Invalid assignment target for augmented operator.', expr.span);
      }

      return {
        type: 'AugmentedAssignment',
        operator: opToken.value,
        target: expr,
        value,
        span: { start: expr.span.start, end: value.span.end },
      } as AugmentedAssignmentNode;
    }

    this.consumeNewlineOrEof();
    return {
      type: 'ExpressionStatement',
      expression: expr,
      span: expr.span,
    };
  }

  // Expressions (Pratt / Precedence climbing)
  private expression(): ExpressionNode {
    return this.logicalOr();
  }

  private logicalOr(): ExpressionNode {
    let expr = this.logicalAnd();

    while (this.match(TokenType.OR)) {
      const right = this.logicalAnd();
      expr = {
        type: 'LogicalExpression',
        operator: 'or',
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private logicalAnd(): ExpressionNode {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const right = this.equality();
      expr = {
        type: 'LogicalExpression',
        operator: 'and',
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private equality(): ExpressionNode {
    let expr = this.comparison();

    while (this.match(TokenType.EQ, TokenType.NEQ)) {
      const op = this.previous();
      const right = this.comparison();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private comparison(): ExpressionNode {
    let expr = this.addition();

    while (this.match(TokenType.LT, TokenType.LTE, TokenType.GT, TokenType.GTE)) {
      const op = this.previous();
      const right = this.addition();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private addition(): ExpressionNode {
    let expr = this.multiplication();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const op = this.previous();
      const right = this.multiplication();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private multiplication(): ExpressionNode {
    let expr = this.power();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const op = this.previous();
      const right = this.power();
      expr = {
        type: 'BinaryExpression',
        operator: op.value,
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private power(): ExpressionNode {
    let expr = this.unary();

    while (this.match(TokenType.POWER)) {
      const right = this.unary();
      expr = {
        type: 'BinaryExpression',
        operator: '**',
        left: expr,
        right,
        span: { start: expr.span.start, end: right.span.end },
      };
    }

    return expr;
  }

  private unary(): ExpressionNode {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS)) {
      const op = this.previous();
      const right = this.unary();
      return {
        type: 'UnaryExpression',
        operator: op.value === 'not' ? 'not' : op.value,
        argument: right,
        span: { start: op.span.start, end: right.span.end },
      };
    }

    return this.postfix();
  }

  private postfix(): ExpressionNode {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        // Function call: expr(arg1, arg2)
        const args: ExpressionNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        const rparen = this.consume(TokenType.RPAREN, "Expected ')' after argument list.");
        expr = {
          type: 'CallExpression',
          callee: expr,
          args,
          span: { start: expr.span.start, end: rparen.span.end },
        };
      } else if (this.match(TokenType.LBRACKET)) {
        // Indexing: expr[index]
        const indexExpr = this.expression();
        const rbracket = this.consume(TokenType.RBRACKET, "Expected ']' after indexing expression.");
        expr = {
          type: 'IndexExpression',
          object: expr,
          index: indexExpr,
          span: { start: expr.span.start, end: rbracket.span.end },
        };
      } else if (this.match(TokenType.DOT)) {
        // Member access: expr.prop
        const prop = this.consume(TokenType.IDENTIFIER, 'Expected property name after dot.');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: prop.value,
          span: { start: expr.span.start, end: prop.span.end },
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private primary(): ExpressionNode {
    const token = this.peek();

    if (this.match(TokenType.INTEGER, TokenType.FLOAT, TokenType.STRING, TokenType.BOOLEAN, TokenType.NONE)) {
      return {
        type: 'Literal',
        value: token.value,
        raw: token.raw,
        span: token.span,
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return {
        type: 'Identifier',
        name: token.value,
        span: token.span,
      };
    }

    // List: [e1, e2, ...]
    if (this.match(TokenType.LBRACKET)) {
      const lbracket = this.previous();
      const elements: ExpressionNode[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          if (this.check(TokenType.RBRACKET)) break;
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }
      const rbracket = this.consume(TokenType.RBRACKET, "Expected ']' at end of list.");
      return {
        type: 'List',
        elements,
        span: { start: lbracket.span.start, end: rbracket.span.end },
      };
    }

    // Dict: {k1: v1, k2: v2}
    if (this.match(TokenType.LBRACE)) {
      const lbrace = this.previous();
      const entries: { key: ExpressionNode; value: ExpressionNode; span: SourceSpan }[] = [];
      if (!this.check(TokenType.RBRACE)) {
        do {
          if (this.check(TokenType.RBRACE)) break;
          const kStart = this.peek().span.start;
          const key = this.expression();
          this.consume(TokenType.COLON, "Expected ':' between key and value in dictionary.");
          const value = this.expression();
          entries.push({
            key,
            value,
            span: { start: kStart, end: value.span.end },
          });
        } while (this.match(TokenType.COMMA));
      }
      const rbrace = this.consume(TokenType.RBRACE, "Expected '}' at end of dictionary.");
      return {
        type: 'Dict',
        entries,
        span: { start: lbrace.span.start, end: rbrace.span.end },
      };
    }

    // Parenthesized expression or Tuple: (e1) or (e1, e2)
    if (this.match(TokenType.LPAREN)) {
      const lparen = this.previous();
      if (this.match(TokenType.RPAREN)) {
        // Empty tuple: ()
        return {
          type: 'Tuple',
          elements: [],
          span: { start: lparen.span.start, end: this.previous().span.end },
        };
      }

      const first = this.expression();

      if (this.match(TokenType.COMMA)) {
        // Tuple: (first, second, ...)
        const elements: ExpressionNode[] = [first];
        if (!this.check(TokenType.RPAREN)) {
          do {
            if (this.check(TokenType.RPAREN)) break;
            elements.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        const rparen = this.consume(TokenType.RPAREN, "Expected ')' at end of tuple.");
        return {
          type: 'Tuple',
          elements,
          span: { start: lparen.span.start, end: rparen.span.end },
        };
      }

      this.consume(TokenType.RPAREN, "Expected ')' after expression.");
      return first; // Simple grouping
    }

    throw new ParserError(
      `Unexpected token '${token.raw}' (${token.type})`,
      token.span,
      'Check for missing parentheses, colons, or misspelled keywords.'
    );
  }

  // Helpers
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === TokenType.EOF;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current] ?? this.tokens[this.tokens.length - 1]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1] ?? this.tokens[0]!;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek().span);
  }

  private consumeNewlineOrEof(): void {
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    } else if (!this.check(TokenType.EOF) && !this.check(TokenType.DEDENT)) {
      throw new ParserError(
        `Expected newline or end of statement, got '${this.peek().raw}'`,
        this.peek().span,
        'Place each statement on its own line.'
      );
    }
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }
}

