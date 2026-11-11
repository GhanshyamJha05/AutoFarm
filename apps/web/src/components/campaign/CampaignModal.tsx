import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { CAMPAIGN_LEVELS, CampaignLevel } from '@autofarm/simulation';
import { X, Star, Lock, ChevronRight, Award } from 'lucide-react';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({ isOpen, onClose }) => {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const campaignProgress = useGameStore((s) => s.campaignProgress);
  const selectLevel = useGameStore((s) => s.selectLevel);

  if (!isOpen) return null;

  const totalStars = Object.values(campaignProgress).reduce(
    (acc, p) => acc + (p?.stars || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[#19271f]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#f3c875]/20 text-[#f3c875]">
              <Award size={24} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[var(--color-ink)]">
                Campaign Operations
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Master programming principles through guided farming optimization missions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-[#17251d] px-3 py-1 rounded-full border border-[var(--color-border)]">
              <Star size={15} className="text-[#f3c875] fill-[#f3c875]" />
              <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                {totalStars} / {CAMPAIGN_LEVELS.length * 3} Stars
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--color-panel-raised)] text-[var(--color-ink-muted)] hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Level List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[var(--color-night)]">
          {CAMPAIGN_LEVELS.map((lvl: CampaignLevel, idx: number) => {
            const prog = campaignProgress[lvl.id];
            const isCompleted = prog?.completed;
            const stars = prog?.stars || 0;
            const prevLvl = idx > 0 ? CAMPAIGN_LEVELS[idx - 1] : null;
            const isUnlocked = idx === 0 || (prevLvl && campaignProgress[prevLvl.id]?.completed);
            const isSelected = currentLevelId === lvl.id;

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  if (isUnlocked) {
                    selectLevel(lvl.id);
                    onClose();
                  }
                }}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                } ${
                  isSelected
                    ? 'border-[#f3c875] bg-[#223528]'
                    : isCompleted
                    ? 'border-[#a8ce79]/50 bg-[var(--color-panel)] hover:border-[#a8ce79]'
                    : isUnlocked
                    ? 'border-[var(--color-border)] bg-[var(--color-panel)] hover:border-[#f3c875]/70'
                    : 'border-gray-800 bg-[#141d18]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                      isCompleted
                        ? 'bg-[#a8ce79] text-[#17251d]'
                        : isUnlocked
                        ? 'bg-[#f3c875] text-[#17251d]'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {isUnlocked ? lvl.number : <Lock size={16} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[var(--color-ink)]">{lvl.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#17251d] text-[var(--color-ink-muted)] border border-[var(--color-border)]">
                        {lvl.pedagogicalFocus}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)]">{lvl.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Stars Display */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        className={
                          s <= stars
                            ? 'text-[#f3c875] fill-[#f3c875]'
                            : 'text-gray-600 fill-transparent'
                        }
                      />
                    ))}
                  </div>

                  {prog?.bestTicks && (
                    <div className="text-xs font-mono text-[var(--color-ink-muted)]">
                      Best: <span className="text-[#a8ce79] font-bold">{prog.bestTicks}</span> ticks
                    </div>
                  )}

                  <ChevronRight size={18} className="text-[var(--color-ink-muted)]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

