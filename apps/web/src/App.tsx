import React, { useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { CodeEditor } from './editor/CodeEditor';
import { FarmCanvas } from './components/FarmCanvas';
import { ControlBar } from './components/ControlBar';
import { ConsolePanel } from './components/ConsolePanel';
import { Cpu, BookOpen, Sparkles } from 'lucide-react';

export function App() {
  const code = useGameStore((s) => s.code);
  const setCode = useGameStore((s) => s.setCode);
  const activeLine = useGameStore((s) => s.activeLine);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[var(--color-night)] text-[var(--color-ink)] overflow-hidden">
      {/* Top Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#a8ce79] flex items-center justify-center text-[#17251d] font-bold shadow">
            <Cpu size={18} />
          </div>
          <div>
            <h1 className="font-bold tracking-wide text-sm font-display leading-tight">
              AUTOFARM
            </h1>
            <p className="text-[10px] text-[var(--color-ink-muted)]">
              Algorithmic Agriculture Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="text-xs px-2.5 py-1 rounded bg-[var(--color-panel-raised)] hover:bg-[#344d3d] border border-[var(--color-border)] text-[var(--color-ink-muted)] transition"
          >
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>
      </header>

      {/* Main Workspace: Farm Canvas + Code Editor */}
      <main className="flex-1 p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 overflow-hidden">
        {/* Left: Interactive Pixi Farm Canvas */}
        <section className="flex flex-col gap-3 h-full min-h-0">
          <ControlBar />
          <div className="flex-1 min-h-0">
            <FarmCanvas />
          </div>
          <ConsolePanel />
        </section>

        {/* Right: Monaco Code Editor */}
        <section className="flex flex-col gap-2 h-full min-h-0">
          <div className="flex items-center justify-between px-2 text-xs text-[var(--color-ink-muted)]">
            <span className="font-mono flex items-center gap-1">
              <BookOpen size={13} /> drone_routine.py
            </span>
            <span className="italic">Press Ctrl+Space for Drone API suggestions</span>
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={code}
              onChange={setCode}
              activeLine={activeLine}
              errorMessage={errorMessage}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
