import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashCan, 
  faRightFromBracket, 
  faPlus, 
  faUser, 
  faCommentDots, 
  faArrowsRotate, 
  faVideo, 
  faLayerGroup, 
  faUsers, 
  faKey 
} from '@fortawesome/free-solid-svg-icons';
import { useStore } from '../store';
import { AiGenerator } from '../AiGenerator';
import { ManualProjectModal } from '../components/ManualProjectModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { SkilloLogo } from '../components/SkilloLogo';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function Home() {
  const { 
    projects, 
    userId,
    setActiveProject, 
    deleteProject, 
    logout, 
    restoreProject, 
    hardDeleteProject, 
    username, 
    friends, 
    geminiApiKey,
    friendRequests,
    fetchFriendRequests
  } = useStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const isDiky = (username || '').toLowerCase() === 'diky';
  const userProjects = projects.filter(p => p.userId === userId || (!p.userId && isDiky));
  const activeProjects = userProjects.filter(p => !p.deletedAt);
  const deletedProjects = userProjects.filter(p => !!p.deletedAt);

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    navigate('/dashboard');
  };

  useEffect(() => {
    fetchFriendRequests();
  }, [fetchFriendRequests]);

  const onlineFriendsCount = friends.filter(f => f.isOnline).length;

  return (
    <div style={{ padding: '32px 20px 80px', flex: 1, zIndex: 10, position: 'relative', maxWidth: '1120px', margin: '0 auto', width: '100%' }} className="no-drag mobile-content-container">
      {/* Top Bar with Clear Symmetrical Alignment */}
      <header className="header-topbar">
        {/* Left: Brand + Identity */}
        <div className="header-brand-wrap">
          <SkilloLogo size={34} animated={true} />
          <div>
            <h1 className="header-brand-title">
              Skillo
            </h1>
            <span className="header-brand-subtitle">
              Halo, <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }} className="capitalize">{username || 'Diky'}</strong>
            </span>
          </div>
        </div>
        
        {/* Desktop Header Actions: Workspace Group, Utility Icons, and Separated Theme Switcher */}
        <div className="desktop-header-actions header-actions-cluster">
          {/* Workspace Primary Controls */}
          <button className="btn" onClick={() => navigate('/meeting')} title="Masuk Focus Room" style={{ gap: '6px' }}>
            <FontAwesomeIcon icon={faVideo} style={{ fontSize: '13px' }} /> Focus Room
          </button>
          <button className="btn" onClick={() => setShowRecycleBin(!showRecycleBin)} title="Lihat item yang dihapus" style={{ gap: '6px' }}>
            <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: '13px' }} />
            <span>{showRecycleBin ? 'Kembali' : `Recycle Bin (${deletedProjects.length})`}</span>
          </button>
          {!showRecycleBin && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)} title="Buat Proyek Baru" style={{ gap: '6px' }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: '13px' }} /> Proyek Baru
            </button>
          )}

          {/* Symmetrical Vertical Separator */}
          <div className="header-divider" aria-hidden="true" />

          {/* Quick Utility Icon Group */}
          <button 
            className="btn-icon" 
            onClick={() => setIsApiKeyModalOpen(true)} 
            title={geminiApiKey ? 'Kunci API Gemini: Terhubung' : 'Konfigurasi Kunci API Gemini'}
            style={{ position: 'relative' }}
          >
            <FontAwesomeIcon icon={faKey} style={{ color: geminiApiKey ? '#22c55e' : 'var(--text-secondary)', fontSize: '13px' }} />
            {geminiApiKey && (
              <span 
                style={{ 
                  position: 'absolute', 
                  top: '6px', 
                  right: '6px', 
                  width: '5px', 
                  height: '5px', 
                  borderRadius: '50%', 
                  backgroundColor: '#22c55e' 
                }} 
              />
            )}
          </button>

          <button 
            className="btn-icon" 
            onClick={() => navigate('/chat')} 
            title="Kolaborasi & Chat Tim"
            style={{ position: 'relative' }}
          >
            <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '14px' }} />
            {friendRequests.length > 0 && (
              <span 
                style={{ 
                  position: 'absolute', 
                  top: '-2px', 
                  right: '-2px', 
                  backgroundColor: 'var(--color-danger)', 
                  color: '#ffffff', 
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '9px', 
                  fontWeight: 700 
                }}
              >
                {friendRequests.length}
              </span>
            )}
          </button>

          <button 
            className="btn-icon" 
            onClick={() => navigate('/profile')} 
            title={`Profil Saya (${username || 'user'})`}
            style={{ 
              position: 'relative', 
              fontWeight: 700, 
              fontSize: '11px', 
              fontFamily: 'Geist Mono, monospace',
              color: 'var(--text-primary)'
            }}
          >
            {(username || 'DK').substring(0, 2).toUpperCase()}
            <span 
              style={{ 
                position: 'absolute', 
                bottom: '4px', 
                right: '4px', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--color-success)',
                border: '1.5px solid var(--surface-card)'
              }} 
            />
          </button>

          <button className="btn-icon" onClick={logout} title="Keluar dari Akun">
            <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: '13px' }} />
          </button>

          {/* Symmetrical Vertical Separator */}
          <div className="header-divider" aria-hidden="true" />

          {/* Dedicated Isolated Theme Switcher */}
          <ThemeSwitcher />
        </div>

        {/* Mobile-Only Header Quick Toggles */}
        <div className="mobile-only-header flex items-center gap-2">
          <button className="btn-icon" onClick={() => setIsApiKeyModalOpen(true)} title="API Key">
            <FontAwesomeIcon icon={faKey} style={{ color: geminiApiKey ? '#22c55e' : 'var(--text-secondary)', fontSize: '13px' }} />
          </button>
          <ThemeSwitcher compact={true} />
          <button className="btn-icon" onClick={() => setShowRecycleBin(!showRecycleBin)} title="Recycle Bin">
            <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: '13px' }} />
          </button>
        </div>
      </header>

      {/* Live Friends Online Bar */}
      <div 
        className="glass-panel mb-6" 
        style={{ 
          padding: '14px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faUsers} style={{ color: 'var(--accent-primary)', fontSize: '13px' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', fontFamily: "'Geist', sans-serif" }}>
            Rekan Tim
          </span>
          <span 
            style={{ 
              fontSize: '11px', 
              fontFamily: "'Geist', sans-serif", 
              color: 'var(--text-secondary)',
              background: 'var(--surface-input)',
              padding: '3px 9px',
              borderRadius: '9999px',
              border: '1px solid var(--border-hairline)',
              fontWeight: 500
            }}
          >
            {onlineFriendsCount} Online
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {friends.map(f => (
            <div 
              key={f.id}
              onClick={() => navigate('/chat')}
              className="cursor-pointer transition-all hover:border-white/30"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-hairline)',
                fontSize: '12px',
                fontFamily: "'Geist', sans-serif",
                borderRadius: '9999px',
                padding: '6px 14px',
                userSelect: 'none'
              }}
              title={`Klik untuk chat dengan ${f.name}`}
            >
              <span 
                style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  backgroundColor: f.isOnline ? 'var(--color-success)' : '#64748b',
                  border: '1.5px solid var(--surface-card)',
                  flexShrink: 0
                }} 
              />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.01em' }}>{f.name}</span>
            </div>
          ))}
          <button 
            type="button"
            className="cursor-pointer transition-all hover:border-[var(--border-color-hover)]"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--surface-card)', 
              border: '1px solid var(--border-hairline-strong)', 
              color: 'var(--text-primary)', 
              fontSize: '12px', 
              fontFamily: "'Geist', sans-serif",
              borderRadius: '9999px',
              padding: '6px 14px',
              fontWeight: 500
            }}
            onClick={() => navigate('/chat')}
          >
            <span>Buka Hub &rarr;</span>
            {friendRequests.length > 0 && (
              <span style={{ background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700 }}>
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {!showRecycleBin && <AiGenerator />}

      {showRecycleBin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {deletedProjects.length === 0 && <p className="text-muted col-span-full">Recycle bin is empty.</p>}
          {deletedProjects.map(p => (
            <div key={p.id} className="glass-panel relative opacity-70 border-dashed border-2">
              <h3 className="mb-2">{p.name}</h3>
              <p className="text-sm text-muted mb-4">Deleted on: {new Date(p.deletedAt!).toLocaleDateString()}</p>
              <div className="flex gap-2">
                <button className="btn flex-1 text-[var(--accent-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)]" onClick={(e) => { e.stopPropagation(); restoreProject(p.id); }}>
                  <FontAwesomeIcon icon={faArrowsRotate} className="mr-2" style={{ fontSize: '13px' }} /> Restore
                </button>
                <button className="btn flex-1 text-red-500 hover:bg-red-500/20 border border-red-500/30" onClick={(e) => {
                  e.stopPropagation();
                  if(confirm("Permanently delete this project?")) hardDeleteProject(p.id);
                }}>
                  <FontAwesomeIcon icon={faTrashCan} className="mr-2" style={{ fontSize: '13px' }} /> Delete Forever
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeProjects.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            marginTop: '32px', 
            padding: '48px 24px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '12px' 
          }}
        >
          <div 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '50%', 
              background: 'rgba(14, 165, 233, 0.1)', 
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Belum Ada Proyek Keahlian
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.5 }}>
            Mulai perjalanan 10.000 jam Anda dengan membuat proyek manual atau gunakan AI Mastery Plan Generator di atas.
          </p>
          <button 
            className="btn-primary" 
            onClick={() => setIsModalOpen(true)}
            style={{ marginTop: '8px', height: '36px', padding: '0 16px', fontSize: '12.5px', gap: '6px' }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: '11px' }} /> Buat Proyek Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {activeProjects.map(p => (
            <div 
              key={p.id} 
              className="project-card-interactive" 
              style={{ cursor: 'pointer', position: 'relative', padding: '24px', borderRadius: '12px' }} 
              onClick={() => handleOpenProject(p.id)}
            >
              <button 
                className="btn-icon" 
                style={{ position: 'absolute', top: 14, right: 14, width: '30px', height: '30px', color: 'var(--text-placeholder)', borderColor: 'transparent' }}
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                title="Pindahkan ke Recycle Bin"
              >
                <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: '13px' }} />
              </button>
              <h3 
                style={{ 
                  margin: '0 0 16px 0', 
                  paddingRight: '32px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)'
                }}
                title={p.name}
              >
                {p.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', lineHeight: 1 }}>
                <span style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontFamily: 'Geist, sans-serif' }}>
                  {p.totalHours.toFixed(1)}
                </span>
                <span style={{ fontSize: '13px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  hrs
                </span>
              </div>
              <div className="progress-track mt-4" style={{ height: '5px', borderRadius: '9999px' }}>
                <div className="progress-fill" style={{ width: `${Math.min((p.totalHours / (p.phases[p.phases.length-1]?.hoursEnd || 10000))*100, 100)}%`, borderRadius: '9999px' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ManualProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button className="nav-item active" onClick={() => navigate('/')} title="Projects">
          <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: '18px', color: 'var(--accent-primary)' }} />
          <span>Projects</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/meeting')} title="Focus Room">
          <FontAwesomeIcon icon={faVideo} style={{ fontSize: '17px' }} />
          <span>Focus</span>
        </button>
        <button className="nav-item" onClick={() => setIsModalOpen(true)} title="New Project">
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: '19px', color: 'var(--accent-primary)' }} />
          <span>Add</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/chat')} title="Collaboration & Chat" style={{ position: 'relative' }}>
          <FontAwesomeIcon icon={faCommentDots} className="text-purple" style={{ fontSize: '18px' }} />
          {friendRequests.length > 0 && (
            <span style={{ position: 'absolute', top: '4px', right: '12px', background: '#ef4444', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
              {friendRequests.length}
            </span>
          )}
          <span>Chat</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')} title="Profile">
          <FontAwesomeIcon icon={faUser} style={{ fontSize: '17px' }} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
