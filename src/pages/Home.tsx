import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Moon, Sun, Eye, EyeOff, LogOut, Plus, User, MessageSquare, RefreshCcw, Video, Layers, Users, Key } from 'lucide-react';
import { useStore } from '../store';
import { AiGenerator } from '../AiGenerator';
import { ManualProjectModal } from '../components/ManualProjectModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { SkilloLogo } from '../components/SkilloLogo';

export function Home() {
  const { theme, toggleTheme, projects, setActiveProject, deleteProject, logout, restoreProject, hardDeleteProject, clockEnabled, toggleClock, username, friends, geminiApiKey, userId } = useStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const userProjects = projects.filter(p => !p.userId || p.userId === userId);
  const activeProjects = userProjects.filter(p => !p.deletedAt);
  const deletedProjects = userProjects.filter(p => !!p.deletedAt);

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    navigate('/dashboard');
  };

  const onlineFriendsCount = friends.filter(f => f.isOnline).length;

  return (
    <div style={{ padding: '32px 20px 80px', flex: 1, zIndex: 10, position: 'relative', maxWidth: '1120px', margin: '0 auto', width: '100%' }} className="no-drag mobile-content-container">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <SkilloLogo size={30} animated={true} />
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '24px', fontWeight: 400, letterSpacing: 0, lineHeight: 1.1, color: 'var(--text-primary)' }}>
              Skillo
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>
              Halo, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }} className="capitalize">{username || 'Diky'}</span>
            </span>
          </div>
        </div>
        
        {/* Desktop Header Actions */}
        <div className="desktop-header-actions flex gap-2">
          <button className="btn" onClick={() => navigate('/meeting')} title="Enter Focus Room">
            <Video size={14} /> Focus Room
          </button>
          <button className="btn" onClick={() => setShowRecycleBin(!showRecycleBin)}>
            {showRecycleBin ? 'Back to Projects' : `Recycle Bin (${deletedProjects.length})`}
          </button>
          {!showRecycleBin && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={15} /> New Project
            </button>
          )}
          <button className="btn" onClick={() => setIsApiKeyModalOpen(true)} title="Pengaturan Kunci API Gemini" style={{ width: '38px', padding: 0 }}>
            <Key size={15} style={{ color: geminiApiKey ? '#4ade80' : 'var(--text-secondary)' }} />
          </button>
          <button className="btn" onClick={toggleClock} title="Toggle Background Clock" style={{ width: '38px', padding: 0 }}>
            {clockEnabled ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button className="btn" onClick={toggleTheme} title="Toggle Theme" style={{ width: '38px', padding: 0 }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn" onClick={() => navigate('/chat')} title="Collaboration & Chat" style={{ width: '38px', padding: 0 }}>
            <MessageSquare size={15} />
          </button>
          <button className="btn" onClick={() => navigate('/profile')} title="Profile Settings" style={{ width: '38px', padding: 0 }}>
            <User size={15} />
          </button>
          <button className="btn" onClick={logout} title="Logout" style={{ width: '38px', padding: 0 }}>
            <LogOut size={15} />
          </button>
        </div>

        {/* Mobile-Only Header Quick Toggles */}
        <div className="mobile-only-header flex gap-2">
          <button className="btn" style={{ padding: '0 10px', height: '36px' }} onClick={() => setIsApiKeyModalOpen(true)} title="API Key">
            <Key size={15} style={{ color: geminiApiKey ? '#4ade80' : 'var(--text-secondary)' }} />
          </button>
          <button className="btn" style={{ padding: '0 10px', height: '36px' }} onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn" style={{ padding: '0 10px', height: '36px' }} onClick={() => setShowRecycleBin(!showRecycleBin)} title="Recycle Bin">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

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
          <Users size={15} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>Rekan Tim:</span>
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
                borderRadius: '4px'
              }}
              title={`Klik untuk chat dengan ${f.name}`}
            >
              <span 
                style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: f.isOnline ? '#4ade80' : '#64748b',
                }} 
              />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{f.isOnline ? 'Online' : 'Offline'}</span>
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

      {!showRecycleBin && <AiGenerator />}

      {showRecycleBin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {deletedProjects.length === 0 && <p className="text-muted col-span-full">Recycle bin is empty.</p>}
          {deletedProjects.map(p => (
            <div key={p.id} className="glass-panel relative opacity-70 border-dashed border-2">
              <h3 className="mb-2">{p.name}</h3>
              <p className="text-sm text-muted mb-4">Deleted on: {new Date(p.deletedAt!).toLocaleDateString()}</p>
              <div className="flex gap-2">
                <button className="btn flex-1 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/30" onClick={(e) => { e.stopPropagation(); restoreProject(p.id); }}>
                  <RefreshCcw size={16} className="mr-2"/> Restore
                </button>
                <button className="btn flex-1 text-red-500 hover:bg-red-500/20 border border-red-500/30" onClick={(e) => {
                  e.stopPropagation();
                  if(confirm("Permanently delete this project?")) hardDeleteProject(p.id);
                }}>
                  <Trash2 size={16} className="mr-2"/> Delete Forever
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
              className="glass-panel project-card-interactive" 
              style={{ cursor: 'pointer', position: 'relative', padding: '20px' }} 
              onClick={() => handleOpenProject(p.id)}
            >
              <button 
                className="btn" 
                style={{ position: 'absolute', top: 12, right: 12, width: '28px', height: '28px', padding: 0, color: 'var(--text-placeholder)', borderColor: 'transparent' }}
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                title="Move to Recycle Bin"
              >
                <Trash2 size={14} />
              </button>
              <h3 
                style={{ 
                  margin: '0 0 12px 0', 
                  paddingRight: '24px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)'
                }}
                title={p.name}
              >
                {p.name}
              </h3>
              <div style={{ fontSize: '28px', fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--text-primary)', lineHeight: 1 }}>
                {p.totalHours.toFixed(1)} <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>hrs</span>
              </div>
              <div className="progress-track mt-3" style={{ height: '3px' }}>
                <div className="progress-fill" style={{ width: `${Math.min((p.totalHours / (p.phases[p.phases.length-1]?.hoursEnd || 10000))*100, 100)}%`, background: '#00E5FF' }}></div>
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
          <Layers size={20} className="text-cyan" />
          <span>Projects</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/meeting')} title="Focus Room">
          <Video size={20} />
          <span>Focus</span>
        </button>
        <button className="nav-item" onClick={() => setIsModalOpen(true)} title="New Project">
          <Plus size={22} className="text-cyan" />
          <span>Add</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/chat')} title="Collaboration & Chat">
          <MessageSquare size={20} className="text-purple" />
          <span>Chat</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')} title="Profile">
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
