import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHandFist, 
  faTrophy, 
  faCrown, 
  faMedal, 
  faAward,
  faFire,
  faBolt,
  faThumbtack
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { useStore, type FriendUser } from '../store';
import { playDuelStart } from '../utils/audio';
import { getAvatarDisplay } from '../utils/profilePresets';

interface ClashArenaProps {
  friends: FriendUser[];
  myUsername: string;
  myTotalHours: number;
}

export function ClashArena({ friends, myUsername, myTotalHours }: ClashArenaProps) {
  const { clashPinned, toggleClashPinned, avatar: myAvatar } = useStore();
  const [viewMode, setViewMode] = useState<'leaderboard' | '1v1'>('leaderboard');
  const [selectedOpponent, setSelectedOpponent] = useState<FriendUser | null>(friends[0] || null);

  const handleTogglePin = () => {
    toggleClashPinned();
    if (!clashPinned) {
      toast.success('Disematkan ke Beranda & Dashboard!', { id: 'clash-pin' });
    } else {
      toast('Sematan dilepas dari Beranda', { id: 'clash-pin', icon: '📌' });
    }
  };

  // Compile all participants including myself
  const allParticipants = [
    { username: myUsername || 'You', name: myUsername || 'You', totalHours: myTotalHours, isMe: true, avatar: myAvatar },
    ...friends.map(f => ({
      username: f.username,
      name: f.name,
      totalHours: f.totalHours || 0,
      isMe: false,
      avatar: f.avatar
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

  // Duel dynamic calculations
  const diffHours = me.totalHours - (opp?.totalHours || 0);
  const isMeLeading = diffHours > 0.05;
  const isOppLeading = diffHours < -0.05;
  const isTied = Math.abs(diffHours) <= 0.05;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Clash Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '18px', color: 'var(--accent-primary)' }} /> Clash Arena
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={clashPinned ? 'btn-primary' : 'btn'}
            onClick={handleTogglePin}
            style={{ 
              height: '30px', 
              fontSize: '11.5px', 
              padding: '0 12px', 
              gap: '6px', 
              borderRadius: 'var(--radius-btn, 8px)'
            }}
            title={clashPinned ? 'Lepas sematan dari Beranda & Dashboard' : 'Sematkan ke Beranda & Dashboard'}
            aria-label={clashPinned ? 'Lepas sematan dari Beranda & Dashboard' : 'Sematkan ke Beranda & Dashboard'}
          >
            <FontAwesomeIcon icon={faThumbtack} style={{ fontSize: '11px', transform: clashPinned ? 'rotate(45deg)' : 'none' }} />
            <span>{clashPinned ? 'Disematkan' : 'Sematkan'}</span>
          </button>

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
              onClick={() => {
                setViewMode('1v1');
                playDuelStart();
              }}
              style={{ height: '28px', fontSize: '11px', padding: '0 12px', gap: '5px' }}
            >
              <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '11px' }} /> 1 VS 1
            </button>
          </div>
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
                    padding: '16px 20px',
                    background: p.isMe ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-input)',
                    border: `1px solid ${p.isMe ? 'rgba(34, 197, 94, 0.35)' : 'var(--border-hairline)'}`,
                    borderRadius: 'var(--radius-card, 14px)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '76px'
                  }}
                >
                  {/* Rank Number */}
                  <div style={{ width: '44px', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: iconDef ? iconColor : 'var(--text-secondary)', opacity: isTop3 ? 1 : 0.6 }}>
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
              Pilih Lawan Tanding
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
              {friends.length === 0 && <option value="">Belum ada teman</option>}
              {friends.map(f => (
                <option key={f.username} value={f.username}>{(f.username || '').replace(/^@+/, '')}</option>
              ))}
            </select>
          </div>

          {/* VS Arena: Diagonal Layout (Left-Top: Aku -> Center: VS -> Right-Bottom: Musuh) */}
          {friends.length > 0 && opp ? (
            <div className="flex-1 flex flex-col justify-between relative py-6 px-1 sm:px-4 md:px-6 my-auto" style={{ minHeight: '520px', gap: '24px' }}>
              
              {/* Background Diagonal Guideline */}
              <div 
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '12%',
                  left: '6%',
                  width: '88%',
                  height: '76%',
                  pointerEvents: 'none',
                  border: '1px dashed var(--border-hairline)',
                  borderRadius: '24px',
                  opacity: 0.6,
                  zIndex: 0
                }}
              />

              {/* Top-Left Card: Aku (YOU) */}
              <div 
                className="self-start w-full sm:w-[86%] md:w-[410px] relative z-10 transition-all duration-300"
                style={{
                  background: 'var(--surface-input)',
                  border: isMeLeading 
                    ? '1.5px solid rgba(34, 197, 94, 0.45)' 
                    : '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '24px 22px',
                  boxShadow: isMeLeading 
                    ? '0 10px 28px -6px rgba(34, 197, 94, 0.14)' 
                    : '0 2px 10px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Leading Crown Badge */}
                {isMeLeading && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '-12px', 
                      left: '20px', 
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                      color: '#000', 
                      padding: '3px 12px', 
                      borderRadius: '9999px', 
                      fontSize: '10.5px', 
                      fontWeight: 800, 
                      letterSpacing: '0.04em',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)' 
                    }}
                  >
                    <FontAwesomeIcon icon={faCrown} /> MEMIMPIN
                  </div>
                )}

                {/* Header: Avatar + Username + Tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {(() => {
                      const initials = (myUsername || 'U').substring(0, 2).toUpperCase();
                      const myDisplay = getAvatarDisplay(myAvatar, initials);
                      return (
                        <div 
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '10px', 
                            background: myDisplay.isCustomImage ? 'none' : myDisplay.gradient, 
                            border: '1px solid var(--border-hairline-strong)', 
                            color: myDisplay.textColor, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            fontSize: '13px',
                            fontFamily: 'Geist Mono, monospace',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {myDisplay.isCustomImage ? (
                            <img src={myDisplay.imageUrl} alt={myUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            myDisplay.initials
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {(myUsername || 'You').replace(/^@+/, '')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Pemain Utama
                      </div>
                    </div>
                  </div>
                  <span 
                    style={{ 
                      fontSize: '10.5px', 
                      fontWeight: 800, 
                      letterSpacing: '0.08em', 
                      textTransform: 'uppercase', 
                      color: 'var(--color-success)', 
                      background: 'rgba(34, 197, 94, 0.12)', 
                      padding: '3px 10px', 
                      borderRadius: '9999px' 
                    }}
                  >
                    YOU
                  </span>
                </div>

                {/* Big Counter */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: 'var(--color-success)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {me.totalHours.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                    HRS
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '10px', background: 'var(--surface-card)', borderRadius: '9999px', border: '1px solid var(--border-hairline)', overflow: 'hidden', marginTop: '14px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Progres Duel</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mePercentage.toFixed(0)}%</span>
                </div>
              </div>

              {/* Center VS Emblem & Dynamic Matchup Status */}
              <div className="self-center my-4 md:my-0 flex flex-col items-center justify-center relative z-10">
                <div 
                  style={{ 
                    width: '54px', 
                    height: '54px', 
                    background: 'var(--surface-card)', 
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '50%',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontFamily: 'Instrument Serif, serif', 
                    fontSize: '22px', 
                    fontWeight: 'bold', 
                    fontStyle: 'italic',
                    color: 'var(--accent-primary)',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  VS
                </div>

                {/* Dynamic Matchup Pill */}
                {isMeLeading && (
                  <div 
                    style={{ 
                      marginTop: '10px', 
                      padding: '6px 14px', 
                      borderRadius: '9999px', 
                      fontSize: '11.5px', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      background: 'rgba(34, 197, 94, 0.12)', 
                      border: '1px solid rgba(34, 197, 94, 0.35)', 
                      color: 'var(--color-success)',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
                    }}
                  >
                    <FontAwesomeIcon icon={faFire} style={{ color: '#f59e0b' }} />
                    <span>Kamu memimpin +{diffHours.toFixed(1)} jam!</span>
                  </div>
                )}
                {isOppLeading && (
                  <div 
                    style={{ 
                      marginTop: '10px', 
                      padding: '6px 14px', 
                      borderRadius: '9999px', 
                      fontSize: '11.5px', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.25)', 
                      color: 'var(--color-danger)',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <FontAwesomeIcon icon={faBolt} style={{ color: '#ef4444' }} />
                    <span>Tertinggal {Math.abs(diffHours).toFixed(1)} jam • Kejar!</span>
                  </div>
                )}
                {isTied && (
                  <div 
                    style={{ 
                      marginTop: '10px', 
                      padding: '6px 14px', 
                      borderRadius: '9999px', 
                      fontSize: '11.5px', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      background: 'var(--surface-input)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-secondary)' 
                    }}
                  >
                    <FontAwesomeIcon icon={faHandFist} />
                    <span>Skor seimbang • Pertarungan sengit!</span>
                  </div>
                )}
              </div>

              {/* Bottom-Right Card: Musuh (OPPONENT) */}
              <div 
                className="self-end w-full sm:w-[86%] md:w-[410px] relative z-10 transition-all duration-300"
                style={{
                  background: 'var(--surface-input)',
                  border: isOppLeading 
                    ? '1.5px solid rgba(245, 158, 11, 0.45)' 
                    : '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '24px 22px',
                  boxShadow: isOppLeading 
                    ? '0 10px 28px -6px rgba(245, 158, 11, 0.14)' 
                    : '0 2px 10px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Leading Crown Badge */}
                {isOppLeading && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '-12px', 
                      right: '20px', 
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                      color: '#000', 
                      padding: '3px 12px', 
                      borderRadius: '9999px', 
                      fontSize: '10.5px', 
                      fontWeight: 800, 
                      letterSpacing: '0.04em',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)' 
                    }}
                  >
                    <FontAwesomeIcon icon={faCrown} /> MEMIMPIN
                  </div>
                )}

                {/* Header: Avatar + Username + Tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {(() => {
                      const oppInitials = ((opp?.username || 'O').slice(0, 2)).toUpperCase();
                      const oppDisplay = getAvatarDisplay(opp?.avatar, oppInitials);
                      return (
                        <div 
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '10px', 
                            background: oppDisplay.isCustomImage ? 'none' : oppDisplay.gradient, 
                            border: '1px solid var(--border-hairline-strong)', 
                            color: oppDisplay.textColor, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            fontSize: '13px',
                            fontFamily: 'Geist Mono, monospace',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {oppDisplay.isCustomImage ? (
                            <img src={oppDisplay.imageUrl} alt={opp?.username || 'Opponent'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            oppDisplay.initials
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {(opp.username || '').replace(/^@+/, '')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Lawan Tanding
                      </div>
                    </div>
                  </div>
                  <span 
                    style={{ 
                      fontSize: '10.5px', 
                      fontWeight: 800, 
                      letterSpacing: '0.08em', 
                      textTransform: 'uppercase', 
                      color: 'var(--text-secondary)', 
                      background: 'var(--border-hairline)', 
                      padding: '3px 10px', 
                      borderRadius: '9999px' 
                    }}
                  >
                    OPPONENT
                  </span>
                </div>

                {/* Big Counter */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'Geist Mono, monospace', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {opp.totalHours.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                    HRS
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '10px', background: 'var(--surface-card)', borderRadius: '9999px', border: '1px solid var(--border-hairline)', overflow: 'hidden', marginTop: '14px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Progres Duel</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{oppPercentage.toFixed(0)}%</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-12">
              <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '42px' }} className="mb-4" />
              <p>Tambahkan teman untuk memulai clash 1 VS 1!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
