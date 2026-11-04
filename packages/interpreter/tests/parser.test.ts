import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/lexer.js';
import { Parser } from '../src/parser.js';

describe('Parser', () => {
  it('parses function definitions and blocks', () => {
    const code = `
def add(a, b):
    return a + b

res = add(10, 20)
`;
    const tokens = new Lexer(code).tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.body).toHaveLength(2);
    expect(ast.body[0].type).toBe('FunctionDef');
    expect(ast.body[1].type).toBe('Assignment');
  });

  it('parses lists, dicts, and tuples', () => {
    const code = `
items = [1, 2, 3]
lookup = {"crop": "wheat", "water": 80}
coord = (10, 20)
`;
    const tokens = new Lexer(code).tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.body).toHaveLength(3);
    const assign1 = ast.body[0] as any;
    expect(assign1.value.type).toBe('List');
    const assign2 = ast.body[1] as any;
    expect(assign2.value.type).toBe('Dict');
    const assign3 = ast.body[2] as any;
    expect(assign3.value.type).toBe('Tuple');
  });

  it('throws friendly syntax errors with line/column for unexpected tokens', () => {
    const code = 'if True\n    x = 1';
    const tokens = new Lexer(code).tokenize();
    const parser = new Parser(tokens);

    expect(() => parser.parse()).toThrowError(/Expected ':' after if condition/);
  });
});

