import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Moon, Sun, Eye, EyeOff, LogOut, Plus, User, MessageSquare, RefreshCcw, Video, Layers } from 'lucide-react';
import { useStore } from '../store';
import { AiGenerator } from '../AiGenerator';
import { ManualProjectModal } from '../components/ManualProjectModal';
import logoMark from '../assets/logo.svg';

export function Home() {
  const { theme, toggleTheme, projects, setActiveProject, deleteProject, logout, restoreProject, hardDeleteProject, clockEnabled, toggleClock } = useStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const activeProjects = projects.filter(p => !p.deletedAt);
  const deletedProjects = projects.filter(p => !!p.deletedAt);

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '32px', flex: 1, zIndex: 10, position: 'relative' }} className="no-drag mobile-content-container">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="Skillo" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Skil<span className="text-cyan">lo</span></h1>
        </div>
        
        {/* Desktop Header Actions */}
        <div className="desktop-header-actions flex gap-2">
          <button className="btn btn-primary" onClick={() => navigate('/meeting')} title="Enter Video Meeting Room">
            <Video size={16} /> Focus Room
          </button>
          <button className="btn" onClick={() => setShowRecycleBin(!showRecycleBin)}>
            {showRecycleBin ? 'Back to Projects' : `Recycle Bin (${deletedProjects.length})`}
          </button>
          {!showRecycleBin && (
            <button className="btn btn-primary shadow-lg shadow-cyan-500/20" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} className="mr-2" /> New Project
            </button>
          )}
          <button className="btn" onClick={toggleClock} title="Toggle Background Clock">
            {clockEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button className="btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn" onClick={() => navigate('/chat')} title="Collaboration & Chat">
            <MessageSquare size={18} className="text-purple" />
          </button>
          <button className="btn" onClick={() => navigate('/profile')} title="Profile Settings">
            <User size={18} />
          </button>
          <button className="btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile-Only Header Quick Toggles */}
        <div className="flex gap-2 sm:hidden">
          <button className="btn" style={{ padding: '8px' }} onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn" style={{ padding: '8px' }} onClick={() => setShowRecycleBin(!showRecycleBin)} title="Recycle Bin">
            <Trash2 size={16} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {activeProjects.map(p => (
            <div key={p.id} className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }} onClick={() => handleOpenProject(p.id)}>
              <button 
                className="btn" 
                style={{ position: 'absolute', top: 12, right: 12, padding: '6px', color: '#ef4444', borderColor: 'transparent' }}
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                title="Move to Recycle Bin"
              >
                <Trash2 size={16} />
              </button>
              <h3 
                style={{ 
                  margin: '0 0 16px 0', 
                  paddingRight: '24px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block'
                }}
                title={p.name}
              >
                {p.name}
              </h3>
              <div className="text-cyan font-bold" style={{ fontSize: '2rem' }}>
                {p.totalHours.toFixed(1)} <span className="text-muted" style={{ fontSize: '1rem', fontWeight: 400 }}>hrs</span>
              </div>
              <div className="progress-track mt-4">
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
