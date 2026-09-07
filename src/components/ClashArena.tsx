import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHandFist, 
  faTrophy, 
  faCrown, 
  faMedal, 
  faAward 
} from '@fortawesome/free-solid-svg-icons';
import type { FriendUser } from '../store';

interface ClashArenaProps {
  friends: FriendUser[];
  myUsername: string;
  myTotalHours: number;
}

export function ClashArena({ friends, myUsername, myTotalHours }: ClashArenaProps) {
  const [viewMode, setViewMode] = useState<'leaderboard' | '1v1'>('leaderboard');
  const [selectedOpponent, setSelectedOpponent] = useState<FriendUser | null>(friends[0] || null);

  // Compile all participants including myself
  const allParticipants = [
    { username: myUsername || 'You', name: myUsername || 'You', totalHours: myTotalHours, isMe: true },
    ...friends.map(f => ({
      username: f.username,
      name: f.name,
      totalHours: f.totalHours || 0,
      isMe: false
    }))
  ].sort((a, b) => b.totalHours - a.totalHours);

  // 1v1 specific stats
  const me = allParticipants.find(p => p.isMe)!;
  const opp = selectedOpponent 
    ? allParticipants.find(p => p.username === selectedOpponent.username) || allParticipants[0]
    : allParticipants[0];

  const maxHours = Math.max(me.totalHours, opp?.totalHours || 0, 1); // prevent division by zero
  const mePercentage = Math.min(100, (me.totalHours / maxHours) * 100);
  const oppPercentage = Math.min(100, ((opp?.totalHours || 0) / maxHours) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Clash Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Instrument Serif, serif', color: 'var(--accent-primary)' }}>
          <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '20px' }} /> Clash Arena
        </h2>
        
        <div style={{ display: 'flex', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
          <button 
            className={viewMode === 'leaderboard' ? 'btn-primary' : 'btn'}
            onClick={() => setViewMode('leaderboard')}
            style={{ height: '28px', fontSize: '11px', padding: '0 12px', gap: '5px' }}
          >
            <FontAwesomeIcon icon={faTrophy} style={{ fontSize: '11px' }} /> Leaderboard
          </button>
          <button 
            className={viewMode === '1v1' ? 'btn-primary' : 'btn'}
            onClick={() => setViewMode('1v1')}
            style={{ height: '28px', fontSize: '11px', padding: '0 12px', gap: '5px' }}
          >
            <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '11px' }} /> 1 VS 1
          </button>
        </div>
      </div>

      {viewMode === 'leaderboard' ? (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {allParticipants.map((p, index) => {
              const isTop3 = index < 3;
              let iconDef = null;
              let iconColor = '';
              if (index === 0) { iconDef = faCrown; iconColor = '#fbbf24'; }
              else if (index === 1) { iconDef = faMedal; iconColor = '#94a3b8'; }
              else if (index === 2) { iconDef = faAward; iconColor = '#b45309'; }

              const cleanUsername = (p.username || '').replace(/^@+/, '');

              return (
                <div 
                  key={p.username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '18px 20px',
                    background: p.isMe ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-input)',
                    border: `1px solid ${p.isMe ? 'rgba(34, 197, 94, 0.35)' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '76px'
                  }}
                >
                  {/* Rank Number */}
                  <div style={{ width: '42px', fontSize: '1.25rem', fontWeight: 800, color: iconDef ? iconColor : 'var(--text-secondary)', opacity: isTop3 ? 1 : 0.5 }}>
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {iconDef && <FontAwesomeIcon icon={iconDef} style={{ fontSize: '14px', color: iconColor }} />}
                      <span style={{ fontWeight: 600, fontSize: '14px', color: p.isMe ? 'var(--color-success)' : 'var(--text-primary)' }}>
                        {p.isMe ? 'You' : cleanUsername}
                      </span>
                    </div>
                    {/* Progress Bar representing absolute volume compared to leader */}
                    <div style={{ width: '100%', height: '7px', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.max(0, (p.totalHours / Math.max(allParticipants[0].totalHours, 1)) * 100)}%`,
                          background: p.isMe ? 'var(--color-success)' : (isTop3 ? iconColor : 'var(--accent-primary)'),
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '20px', textAlign: 'right', minWidth: '70px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'Geist Mono, monospace', letterSpacing: '-0.02em', color: p.isMe ? 'var(--color-success)' : 'var(--text-primary)' }}>
                      {p.totalHours.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>HOURS</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1">
          {/* Opponent Selector */}
          <div className="mb-6">
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
              Select Opponent
            </label>
            <select 
              className="input-field" 
              style={{ width: '100%', maxWidth: '300px' }}
              value={selectedOpponent?.username || ''}
              onChange={(e) => {
                const friend = friends.find(f => f.username === e.target.value);
                if (friend) setSelectedOpponent(friend);
              }}
            >
              {friends.length === 0 && <option value="">No friends available</option>}
              {friends.map(f => (
                <option key={f.username} value={f.username}>{(f.username || '').replace(/^@+/, '')}</option>
              ))}
            </select>
          </div>

          {/* VS Arena: Left (You/Aku) - Center (VS) - Right (Opponent/Musuh) */}
          {friends.length > 0 && opp ? (
            <div className="flex-1 flex flex-col md:flex-row items-center md:items-stretch justify-center gap-4 md:gap-6 my-auto py-4">
              
              {/* Left Card: YOU (Aku) */}
              <div 
                style={{
                  flex: 1,
                  width: '100%',
                  maxWidth: '380px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  letterSpacing: '0.08em', 
                  textTransform: 'uppercase', 
                  color: 'var(--color-success)', 
                  background: 'rgba(34, 197, 94, 0.12)', 
                  padding: '3px 12px', 
                  borderRadius: '9999px',
                  marginBottom: '10px'
                }}>
                  YOU
                </span>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  {(myUsername || 'You').replace(/^@+/, '')}
                </div>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: 'var(--color-success)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {me.totalHours.toFixed(1)}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginTop: '6px', marginBottom: '20px' }}>
                  HOURS
                </div>
                <div style={{ width: '100%', height: '10px', background: 'var(--surface-card)', borderRadius: '9999px', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${mePercentage}%`, 
                      background: 'var(--color-success)', 
                      borderRadius: '9999px', 
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }} 
                  />
                </div>
              </div>

              {/* Center Separator Badge (In-flow, Zero Overlap) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0', flexShrink: 0 }}>
                <div style={{ 
                  width: '46px', 
                  height: '46px', 
                  background: 'var(--surface-card)', 
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '50%',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontFamily: 'Instrument Serif, serif', 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  fontStyle: 'italic',
                  color: 'var(--accent-primary)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}>
                  VS
                </div>
              </div>

              {/* Right Card: OPPONENT (Musuh) */}
              <div 
                style={{
                  flex: 1,
                  width: '100%',
                  maxWidth: '380px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  letterSpacing: '0.08em', 
                  textTransform: 'uppercase', 
                  color: 'var(--text-secondary)', 
                  background: 'var(--border-hairline)', 
                  padding: '3px 12px', 
                  borderRadius: '9999px',
                  marginBottom: '10px'
                }}>
                  OPPONENT
                </span>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  {(opp.username || '').replace(/^@+/, '')}
                </div>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {opp.totalHours.toFixed(1)}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginTop: '6px', marginBottom: '20px' }}>
                  HOURS
                </div>
                <div style={{ width: '100%', height: '10px', background: 'var(--surface-card)', borderRadius: '9999px', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${oppPercentage}%`, 
                      background: 'var(--accent-primary)', 
                      borderRadius: '9999px', 
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }} 
                  />
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-12">
              <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '42px' }} className="mb-4" />
              <p>Add some friends to start clashing!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
