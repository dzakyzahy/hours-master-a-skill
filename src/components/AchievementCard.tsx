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
  textColor: string;
  glow: string;
}> = {
  bronze: {
    label: 'Perunggu',
    badgeBg: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
    borderColor: 'rgba(217, 119, 6, 0.4)',
    textColor: '#f59e0b',
    glow: '0 0 16px rgba(217, 119, 6, 0.25)',
  },
  silver: {
    label: 'Perak',
    badgeBg: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    borderColor: 'rgba(148, 163, 184, 0.45)',
    textColor: '#cbd5e1',
    glow: '0 0 16px rgba(148, 163, 184, 0.2)',
  },
  gold: {
    label: 'Emas',
    badgeBg: 'linear-gradient(135deg, #854d0e 0%, #ca8a04 100%)',
    borderColor: 'rgba(234, 179, 8, 0.5)',
    textColor: '#fde047',
    glow: '0 0 20px rgba(234, 179, 8, 0.3)',
  },
  diamond: {
    label: 'Berlian',
    badgeBg: 'linear-gradient(135deg, #0e7490 0%, #6366f1 100%)',
    borderColor: 'rgba(6, 182, 212, 0.55)',
    textColor: '#38bdf8',
    glow: '0 0 22px rgba(6, 182, 212, 0.35)',
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
    <div
      className="glass-panel"
      style={{
        padding: '16px',
        position: 'relative',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: isUnlocked ? 1 : 0.62,
        border: isUnlocked ? `1px solid ${tier.borderColor}` : '1px solid var(--border-hairline)',
        boxShadow: isUnlocked ? tier.glow : 'none',
        background: isUnlocked ? 'var(--surface-card)' : 'rgba(255, 255, 255, 0.02)',
        transition: 'all 0.2s ease',
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
            boxShadow: isUnlocked ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
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
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '2px 7px',
              borderRadius: '4px',
              background: isUnlocked ? `${tier.borderColor}` : 'var(--surface-input)',
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
            margin: '0 0 4px',
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

      {/* Criteria footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontFamily: 'Geist Mono, monospace',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Syarat</span>
        <span style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 500 }}>
          {achievement.criteriaText}
        </span>
      </div>
    </div>
  );
};
