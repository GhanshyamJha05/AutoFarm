import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, Pause, StepForward, RotateCcw, FastForward } from 'lucide-react';

export const ControlBar: React.FC = () => {
  const status = useGameStore((s) => s.status);
  const speed = useGameStore((s) => s.speed);
  const ticks = useGameStore((s) => s.ticks);
  const inventory = useGameStore((s) => s.inventory);

  const runCode = useGameStore((s) => s.runCode);
  const pauseCode = useGameStore((s) => s.pauseCode);
  const stepCode = useGameStore((s) => s.stepCode);
  const resetSim = useGameStore((s) => s.resetSim);
  const setSpeed = useGameStore((s) => s.setSpeed);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg shadow-sm">
      {/* Execution Controls */}
      <div className="flex items-center gap-2">
        {status === 'running' ? (
          <button
            onClick={pauseCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e58878] hover:bg-[#d47060] text-black font-semibold rounded-md shadow transition"
          >
            <Pause size={16} /> Pause
          </button>
        ) : (
          <button
            onClick={runCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a8ce79] hover:bg-[#92b865] text-[#17251d] font-semibold rounded-md shadow transition"
          >
            <Play size={16} /> Run
          </button>
        )}

        <button
          onClick={stepCode}
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-panel-raised)] hover:bg-[#344d3d] text-[var(--color-ink)] rounded-md border border-[var(--color-border)] transition"
        >
          <StepForward size={16} /> Step
        </button>

        <button
          onClick={resetSim}
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-panel-raised)] hover:bg-[#344d3d] text-[var(--color-ink)] rounded-md border border-[var(--color-border)] transition"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      {/* Speed Multiplier Slider */}
      <div className="flex items-center gap-2">
        <FastForward size={16} className="text-[#f3c875]" />
        <span className="text-xs font-mono text-[var(--color-ink-muted)]">Speed: {speed}x</span>
        <input
          type="range"
          min="1"
          max="30"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
          className="w-24 accent-[#f3c875] cursor-pointer"
        />
      </div>

      {/* Ticks Score & Resources Bar */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1 bg-[#17251d] px-2.5 py-1.5 rounded border border-[var(--color-border)]">
          <span className="text-[var(--color-ink-muted)]">TICKS:</span>
          <span className="text-[#f3c875] font-bold">{ticks.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2 bg-[#17251d] px-2.5 py-1.5 rounded border border-[var(--color-border)]">
          <span className="text-[var(--color-ink-muted)]">HARVEST:</span>
          {Object.keys(inventory).length === 0 ? (
            <span className="text-gray-500 italic">None</span>
          ) : (
            Object.entries(inventory).map(([k, v]) => (
              <span key={k} className="text-[#a8ce79] font-bold">
                {k}: {v}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
