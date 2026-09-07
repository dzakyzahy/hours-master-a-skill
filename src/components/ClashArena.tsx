import { useState } from 'react';
import { Swords, Trophy, Crown, Medal, Award } from 'lucide-react';
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
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Instrument Serif, serif', color: 'var(--accent-purple)' }}>
          <Swords size={24} /> Clash Arena
        </h2>
        
        <div style={{ display: 'flex', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
          <button 
            className={viewMode === 'leaderboard' ? 'btn-primary' : 'btn'}
            onClick={() => setViewMode('leaderboard')}
            style={{ height: '28px', fontSize: '11px', padding: '0 12px' }}
          >
            <Trophy size={13} /> Leaderboard
          </button>
          <button 
            className={viewMode === '1v1' ? 'btn-primary' : 'btn'}
            onClick={() => setViewMode('1v1')}
            style={{ height: '28px', fontSize: '11px', padding: '0 12px' }}
          >
            <Swords size={13} /> 1 VS 1
          </button>
        </div>
      </div>

      {viewMode === 'leaderboard' ? (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex flex-col gap-3">
            {allParticipants.map((p, index) => {
              const isTop3 = index < 3;
              let Icon = null;
              let iconColor = '';
              if (index === 0) { Icon = Crown; iconColor = '#fbbf24'; }
              else if (index === 1) { Icon = Medal; iconColor = '#94a3b8'; }
              else if (index === 2) { Icon = Award; iconColor = '#b45309'; }

              return (
                <div 
                  key={p.username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    background: p.isMe ? 'rgba(74, 222, 128, 0.05)' : 'var(--surface-input)',
                    border: `1px solid ${p.isMe ? 'rgba(74, 222, 128, 0.3)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Rank Number */}
                  <div style={{ width: '40px', fontSize: '1.2rem', fontWeight: 800, color: Icon ? iconColor : 'var(--text-secondary)', opacity: isTop3 ? 1 : 0.5 }}>
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {Icon && <Icon size={16} color={iconColor} />}
                      <span style={{ fontWeight: 600, color: p.isMe ? '#4ade80' : 'var(--text-primary)' }}>
                        {p.isMe ? 'You' : `@${p.username}`}
                      </span>
                    </div>
                    {/* Progress Bar representing absolute volume compared to leader */}
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(p.totalHours / Math.max(allParticipants[0].totalHours, 1)) * 100}%`,
                          background: p.isMe ? '#4ade80' : (isTop3 ? iconColor : 'var(--accent-purple)'),
                          borderRadius: '4px'
                        }} 
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '16px', textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}>
                      {p.totalHours.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>HOURS</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Opponent Selector */}
          <div className="mb-8">
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
                <option key={f.username} value={f.username}>@{f.username}</option>
              ))}
            </select>
          </div>

          {/* VS Arena */}
          {friends.length > 0 && opp ? (
            <div className="flex-1 flex flex-col justify-center gap-12 relative pb-10">
              
              {/* VS Badge */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                <div style={{ 
                  width: '60px', height: '60px', 
                  background: 'var(--bg-app)', 
                  border: '2px solid var(--border-color)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Instrument Serif, serif', fontSize: '24px', fontWeight: 'bold', fontStyle: 'italic',
                  color: 'var(--accent-purple)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                  VS
                </div>
              </div>

              {/* OP Player (Top) */}
              <div className="flex flex-col items-center">
                <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {opp.totalHours.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>HRS</span>
                </div>
                <div style={{ width: '100%', maxWidth: '400px', height: '24px', background: 'var(--bg-app)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${oppPercentage}%`, background: 'var(--accent-purple)', transition: 'width 1s ease-out' }} />
                </div>
                <div style={{ marginTop: '12px', fontWeight: 600, fontSize: '14px' }}>@{opp.username}</div>
              </div>

              {/* YOU Player (Bottom) */}
              <div className="flex flex-col items-center">
                <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: '#4ade80', marginBottom: '8px' }}>
                  {me.totalHours.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>HRS</span>
                </div>
                <div style={{ width: '100%', maxWidth: '400px', height: '24px', background: 'var(--bg-app)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${mePercentage}%`, background: '#4ade80', transition: 'width 1s ease-out' }} />
                </div>
                <div style={{ marginTop: '12px', fontWeight: 600, fontSize: '14px', color: '#4ade80' }}>YOU</div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
              <Swords size={48} className="mb-4" />
              <p>Add some friends to start clashing!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
