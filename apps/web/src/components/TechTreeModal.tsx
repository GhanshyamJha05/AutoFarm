import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { TECH_TREE_NODES, TechNode } from '@autofarm/simulation';
import { X, CheckCircle2, Lock, Zap } from 'lucide-react';

interface TechTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechTreeModal: React.FC<TechTreeModalProps> = ({ isOpen, onClose }) => {
  const unlockedNodes = useGameStore((s) => s.unlockedNodes);
  const inventory = useGameStore((s) => s.inventory);
  const unlockTech = useGameStore((s) => s.unlockTech);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[#19271f]">
          <div className="flex items-center gap-2">
            <Zap className="text-[#f3c875]" size={22} />
            <div>
              <h2 className="font-display font-bold text-lg text-[var(--color-ink)]">
                Research & Tech Tree
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Unlock programming features, crops, and drone upgrades with harvested resources.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-panel-raised)] text-[var(--color-ink-muted)] hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Interactive Graph/Card Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[var(--color-night)]">
          {TECH_TREE_NODES.map((node: TechNode) => {
            const isUnlocked = unlockedNodes.includes(node.id);
            const canAfford = Object.entries(node.cost).every(
              ([res, count]) => (inventory[res] || 0) >= (count || 0)
            );
            const prereqsMet = node.prerequisites.every((pr) => unlockedNodes.includes(pr));
            const availableToUnlock = !isUnlocked && prereqsMet && canAfford;

            return (
              <div
                key={node.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isUnlocked
                    ? 'bg-[#1b2b22] border-[#a8ce79]/60 shadow-sm'
                    : prereqsMet
                    ? 'bg-[var(--color-panel)] border-[var(--color-border)] hover:border-[#f3c875]/60'
                    : 'bg-[#141d18] border-gray-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#17251d] text-[#f3c875] border border-[var(--color-border)]">
                      Tier {node.tier} • {node.category}
                    </span>
                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-xs text-[#a8ce79] font-semibold">
                        <CheckCircle2 size={15} /> Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Lock size={14} /> Locked
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-[var(--color-ink)] mb-1">{node.name}</h3>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed mb-3">
                    {node.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)]/50 flex items-center justify-between">
                  <div className="text-[11px] font-mono text-[var(--color-ink-muted)] space-x-2">
                    <span>Cost:</span>
                    {Object.entries(node.cost).length === 0 ? (
                      <span className="text-[#a8ce79]">Free</span>
                    ) : (
                      Object.entries(node.cost).map(([res, amt]) => {
                        const hasEnough = (inventory[res] || 0) >= (amt || 0);
                        return (
                          <span
                            key={res}
                            className={hasEnough ? 'text-[#a8ce79] font-bold' : 'text-red-400'}
                          >
                            {amt} {res}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {!isUnlocked && (
                    <button
                      disabled={!availableToUnlock}
                      onClick={() => unlockTech(node.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md shadow transition ${
                        availableToUnlock
                          ? 'bg-[#f3c875] hover:bg-[#e6bb67] text-black cursor-pointer'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Research
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

