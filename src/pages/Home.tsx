import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash, 
  Eye, 
  EyeSlash, 
  SignOut, 
  Plus, 
  User, 
  ChatTeardropText, 
  ArrowsClockwise, 
  VideoCamera, 
  Stack, 
  Users, 
  Key 
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { AiGenerator } from '../AiGenerator';
import { ManualProjectModal } from '../components/ManualProjectModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { SkilloLogo } from '../components/SkilloLogo';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function Home() {
  const { 
    projects, 
    setActiveProject, 
    deleteProject, 
    logout, 
    restoreProject, 
    hardDeleteProject, 
    clockEnabled, 
    toggleClock, 
    username, 
    friends, 
    geminiApiKey 
  } = useStore();
  
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const activeProjects = projects.filter(p => !p.deletedAt);
  const deletedProjects = projects.filter(p => !!p.deletedAt);

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    navigate('/dashboard');
  };

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
          <button className="btn" onClick={() => navigate('/meeting')} title="Masuk Focus Room">
            <VideoCamera size={15} weight="regular" /> Focus Room
          </button>
          <button className="btn" onClick={() => setShowRecycleBin(!showRecycleBin)} title="Lihat item yang dihapus">
            <Trash size={15} weight="regular" />
            <span>{showRecycleBin ? 'Kembali' : `Recycle Bin (${deletedProjects.length})`}</span>
          </button>
          {!showRecycleBin && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)} title="Buat Proyek Baru">
              <Plus size={15} weight="bold" /> Proyek Baru
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
            <Key size={16} weight={geminiApiKey ? 'fill' : 'regular'} style={{ color: geminiApiKey ? '#22c55e' : 'var(--text-secondary)' }} />
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

          <button className="btn-icon" onClick={toggleClock} title="Toggle Jam Ambient Latar Belakang">
            {clockEnabled ? <Eye size={16} weight="regular" /> : <EyeSlash size={16} weight="regular" />}
          </button>

          <button className="btn-icon" onClick={() => navigate('/chat')} title="Kolaborasi & Chat Tim">
            <ChatTeardropText size={16} weight="regular" />
          </button>

          <button className="btn-icon" onClick={() => navigate('/profile')} title="Pengaturan Profil Pengguna">
            <User size={16} weight="regular" />
          </button>

          <button className="btn-icon" onClick={logout} title="Keluar dari Akun">
            <SignOut size={16} weight="regular" />
          </button>

          {/* Symmetrical Vertical Separator */}
          <div className="header-divider" aria-hidden="true" />

          {/* Dedicated Isolated Theme Switcher */}
          <ThemeSwitcher />
        </div>

        {/* Mobile-Only Header Quick Toggles */}
        <div className="mobile-only-header flex items-center gap-2">
          <button className="btn-icon" onClick={() => setIsApiKeyModalOpen(true)} title="API Key">
            <Key size={16} style={{ color: geminiApiKey ? '#22c55e' : 'var(--text-secondary)' }} />
          </button>
          <ThemeSwitcher compact={true} />
          <button className="btn-icon" onClick={() => setShowRecycleBin(!showRecycleBin)} title="Recycle Bin">
            <Trash size={16} />
          </button>
        </div>
      </header>

      {/* Live Friends Online Bar */}
      <div 
        className="glass-panel mb-6" 
        style={{ 
          padding: '12px 18px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div className="flex items-center gap-2">
          <Users size={16} weight="regular" style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Rekan Tim:</span>
          <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
            ({onlineFriendsCount} Online)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {friends.map(f => (
            <div 
              key={f.id}
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-2.5 py-1 rounded cursor-pointer transition-all hover:border-white/20"
              style={{
                background: 'var(--surface-input)',
                border: '1px solid var(--border-hairline)',
                fontSize: '11px',
                fontFamily: 'Geist Mono, monospace',
                borderRadius: '5px'
              }}
              title={`Klik untuk chat dengan ${f.name}`}
            >
              <span 
                style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: f.isOnline ? '#22c55e' : '#64748b',
                  boxShadow: f.isOnline ? '0 0 6px rgba(34, 197, 94, 0.75)' : 'none',
                  flexShrink: 0
                }} 
              />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.name}</span>
            </div>
          ))}
          <button 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)', 
              fontSize: '11px', 
              fontFamily: 'Geist Mono, monospace',
              cursor: 'pointer',
              textDecoration: 'none',
              borderBottom: '1px solid var(--border-hairline-strong)',
              padding: '0 0 1px'
            }}
            onClick={() => navigate('/chat')}
          >
            Buka Hub &rarr;
          </button>
        </div>
      </div>

      <AiGenerator />

      {showRecycleBin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {deletedProjects.length === 0 && <p className="text-muted col-span-full">Recycle bin is empty.</p>}
          {deletedProjects.map(p => (
            <div key={p.id} className="glass-panel relative opacity-70 border-dashed border-2">
              <h3 className="mb-2">{p.name}</h3>
              <p className="text-sm text-muted mb-4">Deleted on: {new Date(p.deletedAt!).toLocaleDateString()}</p>
              <div className="flex gap-2">
                <button className="btn flex-1 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/30" onClick={(e) => { e.stopPropagation(); restoreProject(p.id); }}>
                  <ArrowsClockwise size={15} className="mr-2" /> Restore
                </button>
                <button className="btn flex-1 text-red-500 hover:bg-red-500/20 border border-red-500/30" onClick={(e) => {
                  e.stopPropagation();
                  if(confirm("Permanently delete this project?")) hardDeleteProject(p.id);
                }}>
                  <Trash size={15} className="mr-2" /> Delete Forever
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '32px' }}>
          {activeProjects.map(p => (
            <div 
              key={p.id} 
              className="project-card-interactive" 
              style={{ cursor: 'pointer', position: 'relative', padding: '20px' }} 
              onClick={() => handleOpenProject(p.id)}
            >
              <button 
                className="btn-icon" 
                style={{ position: 'absolute', top: 12, right: 12, width: '28px', height: '28px', color: 'var(--text-placeholder)', borderColor: 'transparent' }}
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                title="Pindahkan ke Recycle Bin"
              >
                <Trash size={14} />
              </button>
              <h3 
                style={{ 
                  margin: '0 0 14px 0', 
                  paddingRight: '28px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '-0.015em',
                  color: 'var(--text-primary)'
                }}
                title={p.name}
              >
                {p.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', lineHeight: 1 }}>
                <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontFamily: 'Geist, sans-serif' }}>
                  {p.totalHours.toFixed(1)}
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  hrs
                </span>
              </div>
              <div className="progress-track mt-3" style={{ height: '4px' }}>
                <div className="progress-fill" style={{ width: `${Math.min((p.totalHours / (p.phases[p.phases.length-1]?.hoursEnd || 10000))*100, 100)}%` }}></div>
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
          <Stack size={20} weight="regular" className="text-cyan" />
          <span>Projects</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/meeting')} title="Focus Room">
          <VideoCamera size={20} weight="regular" />
          <span>Focus</span>
        </button>
        <button className="nav-item" onClick={() => setIsModalOpen(true)} title="New Project">
          <Plus size={22} weight="bold" className="text-cyan" />
          <span>Add</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/chat')} title="Collaboration & Chat">
          <ChatTeardropText size={20} weight="regular" className="text-purple" />
          <span>Chat</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')} title="Profile">
          <User size={20} weight="regular" />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
