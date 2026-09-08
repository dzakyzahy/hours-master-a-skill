import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHandFist, 
  faThumbtack, 
  faArrowRight, 
  faCrown, 
  faMedal, 
  faAward 
} from '@fortawesome/free-solid-svg-icons';
import { useStore } from '../store';
import { getClashSummary, type ClashParticipant } from '../utils/clashSummary';
import { getAvatarDisplay } from '../utils/profilePresets';

export function ClashPinnedCard() {
  const navigate = useNavigate();
  const { 
    username, 
    projects, 
    friends, 
    userId, 
    clashPinned, 
    toggleClashPinned,
    avatar: myAvatar 
  } = useStore();

  if (!clashPinned) return null;

  const currentUsername = (username || 'You').replace(/^@+/, '');
  const myTotalHours = projects
    .filter(p => !p.userId || p.userId === userId)
    .reduce((acc, p) => acc + (p.deletedAt ? 0 : p.totalHours), 0);

  const participants: ClashParticipant[] = [
    {
      username: currentUsername,
      name: currentUsername,
      totalHours: myTotalHours,
      avatar: myAvatar
    },
    ...friends.map(f => ({
      username: (f.username || f.name || 'Friend').replace(/^@+/, ''),
      name: f.name || f.username,
      totalHours: f.totalHours || 0,
      avatar: f.avatar
    }))
  ];

  const summary = getClashSummary(participants, currentUsername);
  const { myRank, totalParticipants, leader, isMeLeader, gapToLeader, topParticipants } = summary;

  const handleOpenArena = () => {
    navigate('/chat', { state: { tab: 'clash' } });
  };

  return (
    <div 
      className="glass-panel mb-6" 
      style={{ 
        padding: '20px 22px', 
        position: 'relative',
        borderRadius: 'var(--radius-card, 14px)',
        border: '1px solid var(--border-hairline-strong)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 8px 24px -4px rgba(0, 0, 0, 0.35)',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.04) 0%, rgba(124, 58, 237, 0.04) 100%), var(--surface-card)'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: 'var(--radius-input, 8px)', 
              background: 'rgba(14, 165, 233, 0.12)', 
              color: 'var(--accent-primary)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(14, 165, 233, 0.25)'
            }}
          >
            <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '14px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Clash Arena
              </h3>
              <span 
                style={{ 
                  fontSize: '10px', 
                  fontFamily: 'Geist Mono, monospace', 
                  padding: '2px 8px', 
                  borderRadius: 'var(--radius-pill, 9999px)',
                  background: isMeLeader ? 'rgba(34, 197, 94, 0.12)' : 'var(--surface-input)',
                  color: isMeLeader ? '#22c55e' : 'var(--text-secondary)',
                  border: isMeLeader ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-hairline)',
                  fontWeight: 600
                }}
              >
                Peringkat #{myRank} {totalParticipants > 0 ? `dari ${totalParticipants}` : ''}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Klasemen fokus belajar dan duel produktivitas tim
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            type="button"
            className="btn-icon" 
            onClick={toggleClashPinned}
            title="Lepas sematan dari Dashboard"
            aria-label="Lepas sematan dari Dashboard"
            style={{ width: '30px', height: '30px', color: 'var(--accent-primary)' }}
          >
            <FontAwesomeIcon icon={faThumbtack} style={{ fontSize: '12px', transform: 'rotate(45deg)' }} />
          </button>
        </div>
      </div>

      {/* Main Status Banner */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '12px',
          background: 'var(--surface-input)', 
          border: '1px solid var(--border-hairline)', 
          borderRadius: 'var(--radius-input, 8px)', 
          padding: '14px 16px',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>
              {isMeLeader ? '👑' : myRank === 2 ? '🥈' : '⚔️'}
            </span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {isMeLeader 
                  ? 'Kamu memimpin klasemen!' 
                  : `Selisih ${gapToLeader.toFixed(1)} jam di belakang ${leader.username}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>
                Total belajarmu: <strong style={{ color: 'var(--text-primary)' }}>{myTotalHours.toFixed(1)} hrs</strong>
                {!isMeLeader && (
                  <span> • Pemimpin: {leader.totalHours.toFixed(1)} hrs</span>
                )}
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="btn-primary" 
            onClick={handleOpenArena}
            style={{ 
              height: '32px', 
              fontSize: '11.5px', 
              padding: '0 12px', 
              gap: '6px',
              borderRadius: 'var(--radius-btn, 8px)',
              fontWeight: 600
            }}
          >
            <span>Buka Arena</span>
            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '11px' }} />
          </button>
        </div>

        {/* Top 3 Participants Micro Bar */}
        {topParticipants.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-hairline)', overflowX: 'auto' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Top 3:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              {topParticipants.map((p, idx) => {
                const isMe = p.username.toLowerCase() === currentUsername.toLowerCase();
                const avatarDisplay = getAvatarDisplay(p.avatar || (isMe ? myAvatar : undefined), p.username.substring(0, 2).toUpperCase());
                let rankIcon = faCrown;
                let rankColor = '#fbbf24';
                if (idx === 1) { rankIcon = faMedal; rankColor = '#94a3b8'; }
                if (idx === 2) { rankIcon = faAward; rankColor = '#b45309'; }

                return (
                  <div 
                    key={p.username} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      background: isMe ? 'rgba(14, 165, 233, 0.12)' : 'var(--surface-card)', 
                      border: isMe ? '1px solid var(--accent-primary)' : '1px solid var(--border-hairline)', 
                      borderRadius: 'var(--radius-pill, 9999px)', 
                      padding: '3px 9px 3px 4px',
                      flexShrink: 0
                    }}
                  >
                    <div 
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        background: avatarDisplay.gradient, 
                        color: avatarDisplay.textColor,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 700
                      }}
                    >
                      {avatarDisplay.initials}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {p.username}
                    </span>
                    <FontAwesomeIcon icon={rankIcon} style={{ fontSize: '10px', color: rankColor }} />
                    <span style={{ fontSize: '10.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
                      {p.totalHours.toFixed(1)}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
