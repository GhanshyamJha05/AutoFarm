import { describe, it, expect } from 'vitest';
import { Lexer, TokenType } from '../src/lexer.js';

describe('Lexer', () => {
  it('tokenizes identifiers and keywords', () => {
    const code = 'x = 42\ndef harvest_crop():\n    return True\n';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INTEGER,
      TokenType.NEWLINE,
      TokenType.DEF,
      TokenType.IDENTIFIER,
      TokenType.LPAREN,
      TokenType.RPAREN,
      TokenType.COLON,
      TokenType.NEWLINE,
      TokenType.INDENT,
      TokenType.RETURN,
      TokenType.BOOLEAN,
      TokenType.NEWLINE,
      TokenType.DEDENT,
      TokenType.EOF,
    ]);
  });

  it('handles nested indentations and dedents cleanly', () => {
    const code = `
while True:
    if x > 0:
        x -= 1
    else:
        pass
`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const indents = tokens.filter((t) => t.type === TokenType.INDENT).length;
    const dedents = tokens.filter((t) => t.type === TokenType.DEDENT).length;

    // Outer while (1) + inner if (1) + inner else (1) = 3 indents, exactly 3 dedents
    expect(indents).toBe(3);
    expect(dedents).toBe(3);
  });

  it('scans string escapes and numbers correctly', () => {
    const code = `s = "hello \\"drone\\"\\n"\nval = 3.1415\n`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const strToken = tokens.find((t) => t.type === TokenType.STRING);
    expect(strToken?.value).toBe('hello "drone"\n');

    const floatToken = tokens.find((t) => t.type === TokenType.FLOAT);
    expect(floatToken?.value).toBeCloseTo(3.1415);
  });
});
