import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

// Mock PixiFarmRenderer in JSDOM headless environment
vi.mock('./renderer/PixiFarmRenderer', () => {
  return {
    PixiFarmRenderer: class {
      async init() {}
      resize() {}
      renderFarm() {}
      destroy() {}
    },
  };
});

// Mock Monaco Editor in JSDOM headless environment
vi.mock('@monaco-editor/react', () => {
  return {
    default: ({ value, onChange }: any) => (
      <textarea
        data-testid="monaco-mock"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

describe('Autofarm App UI', () => {
  it('renders the header, controls, canvas container, and editor', () => {
    render(<App />);

    expect(screen.getByText('AUTOFARM')).toBeTruthy();
    expect(screen.getByText('Run')).toBeTruthy();
    expect(screen.getByText('Step')).toBeTruthy();
    expect(screen.getByText('Reset')).toBeTruthy();
    expect(screen.getByText(/Speed:/)).toBeTruthy();
    expect(screen.getByText('Execution Console')).toBeTruthy();
    expect(screen.getByTestId('monaco-mock')).toBeTruthy();
  });
});
