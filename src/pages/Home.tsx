import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Activity, Moon, Sun, Eye, EyeOff, LogOut, Plus } from 'lucide-react';
import { useStore } from '../store';
import { AiGenerator } from '../AiGenerator';
import { ManualProjectModal } from '../components/ManualProjectModal';

export function Home() {
  const { projects, setActiveProject, deleteProject, theme, toggleTheme, clockEnabled, toggleClock, logout } = useStore();
  const navigate = useNavigate();
  const [showManualModal, setShowManualModal] = useState(false);

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '32px', flex: 1, zIndex: 10, position: 'relative' }} className="no-drag">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Activity size={32} className="text-cyan" />
          <h1 style={{ margin: 0 }}>Your <span className="text-cyan">Projects</span></h1>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={toggleClock} title="Toggle Background Clock">
            {clockEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button className="btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn" onClick={() => navigate('/profile')} title="Profile Settings">
            <User size={18} />
          </button>
          <button className="btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {projects.map(p => (
          <div key={p.id} className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }} onClick={() => handleOpenProject(p.id)}>
            <button 
              className="btn" 
              style={{ position: 'absolute', top: 12, right: 12, padding: '6px', color: '#ef4444', borderColor: 'transparent' }}
              onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
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
        
        {/* Manual Create Button */}
        <div 
          className="glass-panel flex flex-col justify-center items-center" 
          style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '160px', borderStyle: 'dashed' }} 
          onClick={() => setShowManualModal(true)}
        >
          <div className="btn btn-primary rounded-full p-4 mb-4" style={{ borderRadius: '50%' }}>
            <Plus size={32} />
          </div>
          <h3 style={{ margin: 0 }} className="text-muted">Create Manual Project</h3>
        </div>
      </div>

      <div className="mt-8">
        <AiGenerator />
      </div>

      {showManualModal && <ManualProjectModal onClose={() => setShowManualModal(false)} />}
    </div>
  );
}
