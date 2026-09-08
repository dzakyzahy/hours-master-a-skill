import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrophy, 
  faCheckCircle, 
  faLock, 
  faMedal 
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { ACHIEVEMENTS, type Achievement } from '../utils/achievements';
import { AchievementCard } from './AchievementCard';

export const AchievementsSection: React.FC = () => {
  const { unlockedAchievements, checkAndUnlockAchievements } = useStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  // Evaluate on mount and notify user if new achievements were unlocked
  useEffect(() => {
    const newlyUnlocked = checkAndUnlockAchievements();
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      for (const id of newlyUnlocked) {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
          toast.success(`Prestasi Terbuka: ${ach.title}!`, {
            icon: '🏆',
            duration: 4500,
            id: `ach-${ach.id}`
          });
        }
      }
    }
  }, [checkAndUnlockAchievements]);

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedAchievements.includes(a.id)).length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = ACHIEVEMENTS.filter((ach: Achievement) => {
    const isUnlocked = unlockedAchievements.includes(ach.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Progress Summary */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div className="flex items-center gap-2">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0
              }}
            >
              <FontAwesomeIcon icon={faTrophy} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                Prestasi & Pencapaian
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Buka lencana kehormatan melalui dedikasi jam belajar
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill, 9999px)',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-hairline)',
              fontFamily: 'Geist Mono, monospace',
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{unlockedCount}/{totalCount}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>({progressPercent}%)</span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'var(--surface-input)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid var(--border-hairline)'
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #eab308, #0ea5e9)',
              borderRadius: '999px',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-btn, 8px)',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            border: filter === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-hairline)',
            background: filter === 'all' ? 'rgba(14, 165, 233, 0.1)' : 'var(--surface-input)',
            color: filter === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <FontAwesomeIcon icon={faMedal} style={{ fontSize: '10px' }} />
          Semua ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter('unlocked')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-btn, 8px)',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            border: filter === 'unlocked' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border-hairline)',
            background: filter === 'unlocked' ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface-input)',
            color: filter === 'unlocked' ? '#22c55e' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '10px' }} />
          Terbuka ({unlockedCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter('locked')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-btn, 8px)',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            border: filter === 'locked' ? '1px solid rgba(148, 163, 184, 0.4)' : '1px solid var(--border-hairline)',
            background: filter === 'locked' ? 'rgba(148, 163, 184, 0.1)' : 'var(--surface-input)',
            color: filter === 'locked' ? 'var(--text-primary)' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <FontAwesomeIcon icon={faLock} style={{ fontSize: '10px' }} />
          Terkunci ({totalCount - unlockedCount})
        </button>
      </div>

      {/* Grid of Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px'
        }}
      >
        {filteredAchievements.map((ach) => {
          const isUnlocked = unlockedAchievements.includes(ach.id);
          return (
            <AchievementCard
              key={ach.id}
              achievement={ach}
              isUnlocked={isUnlocked}
            />
          );
        })}
      </div>
    </div>
  );
};
