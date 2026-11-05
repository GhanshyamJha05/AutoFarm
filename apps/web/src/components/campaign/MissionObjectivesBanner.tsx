import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { CampaignLevel, CAMPAIGN_LEVELS } from '@autofarm/simulation';
import { Target, HelpCircle, Award } from 'lucide-react';

export const MissionObjectivesBanner: React.FC = () => {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const inventory = useGameStore((s) => s.inventory);
  const campaignProgress = useGameStore((s) => s.campaignProgress);

  const level = CAMPAIGN_LEVELS.find((l) => l.id === currentLevelId) || CAMPAIGN_LEVELS[0]!;
  const progress = campaignProgress[level.id];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#18261e] border-b border-[var(--color-border)] text-xs">
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold text-[#f3c875] bg-[#121c16] px-2 py-0.5 rounded border border-[var(--color-border)]">
          MISSION {level.number}
        </span>
        <span className="font-semibold text-[var(--color-ink)]">{level.title}:</span>
        <span className="text-[var(--color-ink-muted)] italic">{level.pedagogicalFocus}</span>
      </div>

      {/* Objectives */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[#a8ce79]" />
          <span className="text-[var(--color-ink-muted)]">Objective:</span>
          {level.objectives.map((obj) => {
            const current = inventory[obj.crop] || 0;
            const complete = current >= obj.count;
            return (
              <span
                key={obj.crop}
                className={`font-mono font-bold px-2 py-0.5 rounded ${
                  complete
                    ? 'bg-[#a8ce79]/20 text-[#a8ce79] border border-[#a8ce79]/50'
                    : 'bg-[#121c16] text-[var(--color-ink)] border border-[var(--color-border)]'
                }`}
              >
                {current} / {obj.count} {obj.crop}
              </span>
            );
          })}
        </div>

        {/* 3-Star threshold */}
        <div className="flex items-center gap-1.5 font-mono text-[var(--color-ink-muted)]">
          <Award size={14} className="text-[#f3c875]" />
          <span>3★ Goal: &le;{level.starCriteria.threeStarsMaxTicks} ticks</span>
        </div>
      </div>
    </div>
  );
};
