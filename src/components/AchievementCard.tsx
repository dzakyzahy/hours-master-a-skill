import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrophy, 
  faCrown, 
  faAward, 
  faBolt, 
  faFire, 
  faUsers, 
  faUserCheck, 
  faHandFist, 
  faLock, 
  faCircleCheck 
} from '@fortawesome/free-solid-svg-icons';
import type { Achievement, AchievementTier } from '../utils/achievements';

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
}

const TIER_CONFIG: Record<AchievementTier, {
  label: string;
  badgeBg: string;
  borderColor: string;
  tagBg: string;
  textColor: string;
  glow: string;
}> = {
  bronze: {
    label: 'Perunggu',
    badgeBg: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
    borderColor: 'rgba(217, 119, 6, 0.45)',
    tagBg: 'rgba(217, 119, 6, 0.14)',
    textColor: '#b45309',
    glow: '0 0 16px rgba(217, 119, 6, 0.2)',
  },
  silver: {
    label: 'Perak',
    badgeBg: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    borderColor: 'rgba(100, 116, 139, 0.45)',
    tagBg: 'rgba(100, 116, 139, 0.16)',
    textColor: 'var(--badge-silver-text, #334155)',
    glow: '0 0 16px rgba(148, 163, 184, 0.16)',
  },
  gold: {
    label: 'Emas',
    badgeBg: 'linear-gradient(135deg, #854d0e 0%, #ca8a04 100%)',
    borderColor: 'rgba(202, 138, 4, 0.45)',
    tagBg: 'rgba(234, 179, 8, 0.15)',
    textColor: '#a16207',
    glow: '0 0 20px rgba(234, 179, 8, 0.25)',
  },
  diamond: {
    label: 'Berlian',
    badgeBg: 'linear-gradient(135deg, #0e7490 0%, #6366f1 100%)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    tagBg: 'rgba(6, 182, 212, 0.15)',
    textColor: '#0284c7',
    glow: '0 0 22px rgba(6, 182, 212, 0.3)',
  },
};

function getIcon(iconName: string) {
  switch (iconName) {
    case 'Crown':
      return faCrown;
    case 'Trophy':
      return faTrophy;
    case 'Award':
      return faAward;
    case 'Zap':
      return faBolt;
    case 'Flame':
      return faFire;
    case 'Swords':
      return faHandFist;
    case 'Users':
      return faUsers;
    case 'UserCheck':
      return faUserCheck;
    default:
      return faAward;
  }
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, isUnlocked }) => {
  const tier = TIER_CONFIG[achievement.tier] || TIER_CONFIG.bronze;
  const icon = getIcon(achievement.icon);

  return (
    <article
      className="glass-panel"
      aria-label={`Pencapaian: ${achievement.title} - ${isUnlocked ? 'Terbuka' : 'Terkunci'}`}
      style={{
        padding: '16px',
        position: 'relative',
        borderRadius: 'var(--radius-card, 14px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: isUnlocked ? 1 : 0.65,
        border: isUnlocked ? `1px solid ${tier.borderColor}` : '1px solid var(--border-hairline)',
        boxShadow: isUnlocked ? `${tier.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.08)` : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        background: isUnlocked ? 'var(--surface-card)' : 'rgba(255, 255, 255, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        {/* Emblem Badge Icon */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: isUnlocked ? tier.badgeBg : 'var(--surface-input)',
            border: isUnlocked ? `1.5px solid ${tier.borderColor}` : '1px solid var(--border-hairline)',
            color: isUnlocked ? '#ffffff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
            boxShadow: isUnlocked ? '0 4px 12px rgba(0,0,0,0.25)' : 'none',
          }}
        >
          <FontAwesomeIcon icon={isUnlocked ? icon : faLock} />
        </div>

        {/* Status Tag */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'Geist Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '2.5px 8px',
              borderRadius: 'var(--radius-pill, 9999px)',
              background: isUnlocked ? tier.tagBg : 'var(--surface-input)',
              color: isUnlocked ? tier.textColor : 'var(--text-secondary)',
              border: `1px solid ${isUnlocked ? tier.borderColor : 'var(--border-hairline)'}`,
            }}
          >
            {tier.label}
          </span>
          <span
            style={{
              fontSize: '10.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: isUnlocked ? '#22c55e' : 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            <FontAwesomeIcon icon={isUnlocked ? faCircleCheck : faLock} style={{ fontSize: '10px' }} />
            {isUnlocked ? 'Terbuka' : 'Terkunci'}
          </span>
        </div>
      </div>

      {/* Info Block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            margin: '0 0 5px',
            fontSize: '14px',
            fontWeight: 600,
            color: isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)',
            letterSpacing: '-0.01em',
          }}
        >
          {achievement.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          {achievement.desc}
        </p>
      </div>

      {/* Criteria footer - Stacked layout to eliminate text collision */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        <span
          style={{
            fontSize: '9.5px',
            fontFamily: 'Geist Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-placeholder, #94a3b8)',
            fontWeight: 600,
          }}
        >
          Syarat
        </span>
        <span
          style={{
            fontSize: '11.5px',
            lineHeight: 1.45,
            color: isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 500,
            wordBreak: 'break-word',
          }}
        >
          {achievement.criteriaText}
        </span>
      </div>
    </article>
  );
};
