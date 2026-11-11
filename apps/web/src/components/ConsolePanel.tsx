import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Terminal } from 'lucide-react';

export const ConsolePanel: React.FC = () => {
  const logs = useGameStore((s) => s.consoleLogs);

  return (
    <div className="h-36 w-full flex flex-col bg-[#141e18] border border-[var(--color-border)] rounded-lg overflow-hidden font-mono text-xs">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-panel)] border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
        <Terminal size={14} />
        <span>Execution Console</span>
      </div>

      <div className="flex-1 p-2.5 overflow-y-auto space-y-1 select-text">
        {logs.map((log, idx) => {
          let color = 'text-[var(--color-ink)]';
          if (log.startsWith('[Error]') || log.startsWith('[Compile/Runtime Error]')) {
            color = 'text-[#e58878] font-bold';
          } else if (log.startsWith('[Log]')) {
            color = 'text-[#83c4c3]';
          } else if (log.startsWith('[Engine]')) {
            color = 'text-[#a8ce79]';
          }
          return (
            <div key={idx} className={`${color} leading-relaxed`}>
              {log}
            </div>
          );
        })}
      </div>
    </div>
  );
};

