export interface SourceLocation {
  line: number;
  column: number;
}

export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

export enum TokenType {
  // Literals & Identifiers
  IDENTIFIER = 'IDENTIFIER',
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NONE = 'NONE',

  // Keywords
  DEF = 'DEF',
  RETURN = 'RETURN',
  IF = 'IF',
  ELIF = 'ELIF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  FOR = 'FOR',
  IN = 'IN',
  PASS = 'PASS',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Punctuation & Layout
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  COLON = 'COLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',

  // Operators
  ASSIGN = 'ASSIGN',
  PLUS_ASSIGN = 'PLUS_ASSIGN',
  MINUS_ASSIGN = 'MINUS_ASSIGN',
  MUL_ASSIGN = 'MUL_ASSIGN',
  DIV_ASSIGN = 'DIV_ASSIGN',
  MOD_ASSIGN = 'MOD_ASSIGN',

  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  POWER = 'POWER',

  EQ = 'EQ',
  NEQ = 'NEQ',
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',

  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: any;
  raw: string;
  span: SourceSpan;
}

const KEYWORDS: Record<string, TokenType> = {
  def: TokenType.DEF,
  return: TokenType.RETURN,
  if: TokenType.IF,
  elif: TokenType.ELIF,
  else: TokenType.ELSE,
  while: TokenType.WHILE,
  for: TokenType.FOR,
  in: TokenType.IN,
  pass: TokenType.PASS,
  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
  True: TokenType.BOOLEAN,
  False: TokenType.BOOLEAN,
  None: TokenType.NONE,
};

export class LexerError extends Error {
  constructor(
    message: string,
    public span: SourceSpan,
    public hint?: string
  ) {
    super(`[Line ${span.start.line}, Col ${span.start.column}] LexerError: ${message}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private indentStack: number[] = [0];
  private parenDepth = 0;
  private atLineStart = true;
  private length: number;

  constructor(private source: string) {
    this.length = source.length;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.length) {
      if (this.atLineStart) {
        const indentTokens = this.handleIndentation();
        tokens.push(...indentTokens);
        if (this.pos >= this.length) break;
      }

      const ch = this.peek();

      // Skip non-newline whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      // Comments: # until end of line
      if (ch === '#') {
        while (this.pos < this.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Newlines
      if (ch === '\n') {
        const start = this.currentLocation();
        this.advance();
        // Ignore newlines inside brackets/parens/braces
        if (this.parenDepth === 0) {
          // Only emit NEWLINE if the previous token wasn't already a NEWLINE or INDENT
          const prev = tokens[tokens.length - 1];
          if (prev && prev.type !== TokenType.NEWLINE && prev.type !== TokenType.INDENT) {
            tokens.push({
              type: TokenType.NEWLINE,
              value: '\n',
              raw: '\n',
              span: { start, end: this.currentLocation() },
            });
          }
          this.atLineStart = true;
        }
        continue;
      }

      // Multi-character and single-character symbols/operators
      const token = this.scanToken();
      if (token) {
        tokens.push(token);
      }
    }

    // Emit trailing NEWLINE if needed
    const last = tokens[tokens.length - 1];
    if (last && last.type !== TokenType.NEWLINE && last.type !== TokenType.DEDENT) {
      const loc = this.currentLocation();
      tokens.push({
        type: TokenType.NEWLINE,
        value: '\n',
        raw: '\n',
        span: { start: loc, end: loc },
      });
    }

    // Dedent remaining indentation
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      const loc = this.currentLocation();
      tokens.push({
        type: TokenType.DEDENT,
        value: 0,
        raw: '',
        span: { start: loc, end: loc },
      });
    }

    const endLoc = this.currentLocation();
    tokens.push({
      type: TokenType.EOF,
      value: null,
      raw: '',
      span: { start: endLoc, end: endLoc },
    });

    return tokens;
  }

  private handleIndentation(): Token[] {
    const tokens: Token[] = [];
    let spaces = 0;
    const startLoc = this.currentLocation();

    while (this.pos < this.length) {
      const ch = this.peek();
      if (ch === ' ') {
        spaces += 1;
        this.advance();
      } else if (ch === '\t') {
        // Enforce 4 spaces per tab or tab conversion
        spaces += 4;
        this.advance();
      } else if (ch === '\r') {
        this.advance();
      } else if (ch === '#') {
        // Blank comment line - consume it without indentation change
        while (this.pos < this.length && this.peek() !== '\n') {
          this.advance();
        }
        if (this.peek() === '\n') {
          this.advance();
          spaces = 0;
        }
      } else if (ch === '\n') {
        // Empty line - reset spaces
        this.advance();
        spaces = 0;
      } else {
        break;
      }
    }

    this.atLineStart = false;
    if (this.pos >= this.length) {
      return tokens;
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1];
    const endLoc = this.currentLocation();

    if (spaces > currentIndent) {
      this.indentStack.push(spaces);
      tokens.push({
        type: TokenType.INDENT,
        value: spaces,
        raw: ' '.repeat(spaces - currentIndent),
        span: { start: startLoc, end: endLoc },
      });
    } else if (spaces < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > spaces) {
        this.indentStack.pop();
        tokens.push({
          type: TokenType.DEDENT,
          value: spaces,
          raw: '',
          span: { start: startLoc, end: endLoc },
        });
      }
      if (this.indentStack[this.indentStack.length - 1] !== spaces) {
        throw new LexerError(
          `Inconsistent indentation level (${spaces} spaces, expected ${this.indentStack[this.indentStack.length - 1]})`,
          { start: startLoc, end: endLoc },
          'Make sure indentation uses consistent multiples of 4 spaces.'
        );
      }
    }

    return tokens;
  }

  private scanToken(): Token {
    const start = this.currentLocation();
    const ch = this.peek();

    // Identifiers and Keywords
    if (this.isAlpha(ch) || ch === '_') {
      return this.scanIdentifier();
    }

    // Numbers (integers and floats)
    if (this.isDigit(ch)) {
      return this.scanNumber();
    }

    // Strings (single and double quotes)
    if (ch === '"' || ch === "'") {
      return this.scanString(ch);
    }

    this.advance();

    // 2-character operators
    if (ch === '+' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.PLUS_ASSIGN, value: '+=', raw: '+=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '-' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.MINUS_ASSIGN, value: '-=', raw: '-=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '*' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.MUL_ASSIGN, value: '*=', raw: '*=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '/' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.DIV_ASSIGN, value: '/=', raw: '/=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '%' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.MOD_ASSIGN, value: '%=', raw: '%=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '=' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.EQ, value: '==', raw: '==', span: { start, end: this.currentLocation() } };
    }
    if (ch === '!' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.NEQ, value: '!=', raw: '!=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '<' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.LTE, value: '<=', raw: '<=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '>' && this.peek() === '=') {
      this.advance();
      return { type: TokenType.GTE, value: '>=', raw: '>=', span: { start, end: this.currentLocation() } };
    }
    if (ch === '*' && this.peek() === '*') {
      this.advance();
      return { type: TokenType.POWER, value: '**', raw: '**', span: { start, end: this.currentLocation() } };
    }

    // Single-character tokens
    switch (ch) {
      case '=':
        return { type: TokenType.ASSIGN, value: '=', raw: '=', span: { start, end: this.currentLocation() } };
      case '+':
        return { type: TokenType.PLUS, value: '+', raw: '+', span: { start, end: this.currentLocation() } };
      case '-':
        return { type: TokenType.MINUS, value: '-', raw: '-', span: { start, end: this.currentLocation() } };
      case '*':
        return { type: TokenType.STAR, value: '*', raw: '*', span: { start, end: this.currentLocation() } };
      case '/':
        return { type: TokenType.SLASH, value: '/', raw: '/', span: { start, end: this.currentLocation() } };
      case '%':
        return { type: TokenType.PERCENT, value: '%', raw: '%', span: { start, end: this.currentLocation() } };
      case '<':
        return { type: TokenType.LT, value: '<', raw: '<', span: { start, end: this.currentLocation() } };
      case '>':
        return { type: TokenType.GT, value: '>', raw: '>', span: { start, end: this.currentLocation() } };
      case ':':
        return { type: TokenType.COLON, value: ':', raw: ':', span: { start, end: this.currentLocation() } };
      case ',':
        return { type: TokenType.COMMA, value: ',', raw: ',', span: { start, end: this.currentLocation() } };
      case '.':
        return { type: TokenType.DOT, value: '.', raw: '.', span: { start, end: this.currentLocation() } };
      case '(':
        this.parenDepth++;
        return { type: TokenType.LPAREN, value: '(', raw: '(', span: { start, end: this.currentLocation() } };
      case ')':
        this.parenDepth = Math.max(0, this.parenDepth - 1);
        return { type: TokenType.RPAREN, value: ')', raw: ')', span: { start, end: this.currentLocation() } };
      case '[':
        this.parenDepth++;
        return { type: TokenType.LBRACKET, value: '[', raw: '[', span: { start, end: this.currentLocation() } };
      case ']':
        this.parenDepth = Math.max(0, this.parenDepth - 1);
        return { type: TokenType.RBRACKET, value: ']', raw: ']', span: { start, end: this.currentLocation() } };
      case '{':
        this.parenDepth++;
        return { type: TokenType.LBRACE, value: '{', raw: '{', span: { start, end: this.currentLocation() } };
      case '}':
        this.parenDepth = Math.max(0, this.parenDepth - 1);
        return { type: TokenType.RBRACE, value: '}', raw: '}', span: { start, end: this.currentLocation() } };
      default:
        throw new LexerError(
          `Unexpected character '${ch}'`,
          { start, end: this.currentLocation() },
          'Remove or replace this character.'
        );
    }
  }

  private scanIdentifier(): Token {
    const start = this.currentLocation();
    let name = '';

    while (this.pos < this.length) {
      const ch = this.peek();
      if (this.isAlphaNumeric(ch) || ch === '_') {
        name += ch;
        this.advance();
      } else {
        break;
      }
    }

    const end = this.currentLocation();
    const keywordType = KEYWORDS[name];

    if (keywordType !== undefined) {
      let val: any = name;
      if (keywordType === TokenType.BOOLEAN) {
        val = name === 'True';
      } else if (keywordType === TokenType.NONE) {
        val = null;
      }
      return { type: keywordType, value: val, raw: name, span: { start, end } };
    }

    return { type: TokenType.IDENTIFIER, value: name, raw: name, span: { start, end } };
  }

  private scanNumber(): Token {
    const start = this.currentLocation();
    let numStr = '';
    let isFloat = false;

    while (this.pos < this.length && this.isDigit(this.peek())) {
      numStr += this.peek();
      this.advance();
    }

    // Check for decimal point followed by digits
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      isFloat = true;
      numStr += '.';
      this.advance(); // consume '.'
      while (this.pos < this.length && this.isDigit(this.peek())) {
        numStr += this.peek();
        this.advance();
      }
    }

    const end = this.currentLocation();
    const value = isFloat ? parseFloat(numStr) : parseInt(numStr, 10);
    return {
      type: isFloat ? TokenType.FLOAT : TokenType.INTEGER,
      value,
      raw: numStr,
      span: { start, end },
    };
  }

  private scanString(quoteChar: string): Token {
    const start = this.currentLocation();
    this.advance(); // consume opening quote
    let str = '';

    while (this.pos < this.length) {
      const ch = this.peek();
      if (ch === quoteChar) {
        this.advance(); // consume closing quote
        const end = this.currentLocation();
        return {
          type: TokenType.STRING,
          value: str,
          raw: quoteChar + str + quoteChar,
          span: { start, end },
        };
      }

      if (ch === '\n') {
        throw new LexerError(
          'Unterminated string literal before end of line',
          { start, end: this.currentLocation() },
          'Close the string literal with matching ' + quoteChar + ' before the newline.'
        );
      }

      if (ch === '\\') {
        this.advance();
        const esc = this.peek();
        if (esc === 'n') str += '\n';
        else if (esc === 't') str += '\t';
        else if (esc === 'r') str += '\r';
        else if (esc === '\\') str += '\\';
        else if (esc === quoteChar) str += quoteChar;
        else str += esc;
        this.advance();
      } else {
        str += ch;
        this.advance();
      }
    }

    throw new LexerError(
      'Unterminated string literal at end of file',
      { start, end: this.currentLocation() },
      'Add a closing ' + quoteChar + ' to finish the string.'
    );
  }

  private peek(offset = 0): string {
    const idx = this.pos + offset;
    return idx < this.length ? this.source[idx] : '';
  }

  private advance(): string {
    const ch = this.source[this.pos];
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private currentLocation(): SourceLocation {
    return { line: this.line, column: this.column };
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }
}

