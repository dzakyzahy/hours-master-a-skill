import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClock, 
  faBullseye, 
  faTrophy, 
  faPlay, 
  faSquare, 
  faPlus, 
  faTrashCan, 
  faPen, 
  faCheck, 
  faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
import { useStore, type Project } from '../store';
import { supabase } from '../supabaseClient';
import { useGlobalTimer } from '../hooks/useGlobalTimer';
import { EditProjectModal } from '../components/EditProjectModal';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function Dashboard() {
  const { projects, activeProjectId, addHours, toggleTimer, activeTimer, setRemoteTimerState, setTotalHours, deleteProject } = useStore();
  const { elapsedSeconds, formatTime } = useGlobalTimer();
  const navigate = useNavigate();
  
  const [manualInput, setManualInput] = useState('');
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [editTotalInput, setEditTotalInput] = useState('');
  const [editProject, setEditProject] = useState<Project | null>(null);

  const project = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    if (!project) navigate('/');
  }, [project, navigate]);

  // Live Timer Sync
  useEffect(() => {
    if (!project) return;
    
    const channel = supabase.channel(`timer_${project.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'timer_state',
        filter: `project_id=eq.${project.id}`
      }, (payload) => {
        if (payload.new) {
           setRemoteTimerState((payload.new as any).is_active);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [project, setRemoteTimerState]);

  if (!project) return null;

  const { totalHours, dailyGoal, hoursToday, phases } = project;

  // Determine current phase
  const currentPhase = phases.find(p => totalHours >= p.hoursStart && totalHours <= p.hoursEnd) || phases[phases.length - 1] || { title: 'Unknown', hoursStart: 0, hoursEnd: 100, desc: '' };
  const targetTotal = phases[phases.length - 1]?.hoursEnd || 10000;
  const phaseProgress = Math.min(((totalHours - currentPhase.hoursStart) / Math.max(1, currentPhase.hoursEnd - currentPhase.hoursStart)) * 100, 100);
  const goalProgress = Math.min((hoursToday / (dailyGoal || 1)) * 100, 100);
  
  const handleManualAdd = () => {
    const h = parseFloat(manualInput);
    if (!isNaN(h) && h > 0) {
      addHours(h);
      setManualInput('');
    }
  };

  const handleSaveTotal = () => {
    const h = parseFloat(editTotalInput);
    if (!isNaN(h) && h >= 0) {
      setTotalHours(h);
    }
    setIsEditingTotal(false);
  };

  return (
    <div style={{ padding: '32px 24px 80px', flex: 1, display: 'flex', flexDirection: 'column', zIndex: 10, position: 'relative', overflowY: 'auto', maxWidth: '1120px', margin: '0 auto', width: '100%' }} className="no-drag">
      {/* Top Header Bar */}
      <header className="header-topbar">
        <div className="flex items-center gap-3">
          <button className="btn" onClick={() => navigate('/')} style={{ padding: '0 12px', height: '36px', gap: '6px' }} title="Kembali ke Beranda">
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '13px' }} /> Kembali
          </button>
          <div>
            <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dashboard Proyek
            </span>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: 'Geist, sans-serif' }}>
              {project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className="btn-icon"
            onClick={() => setEditProject(project)}
            title="Edit Proyek"
          >
            <FontAwesomeIcon icon={faPen} style={{ fontSize: '13px' }} />
          </button>
          <button 
            className="btn-icon"
            style={{ color: '#ef4444' }}
            onClick={() => { deleteProject(project.id); navigate('/'); }}
            title="Pindahkan ke Tempat Sampah"
          >
            <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: '13px' }} />
          </button>

          <div className="header-divider" aria-hidden="true" />

          {/* Dedicated Isolated Theme Switcher */}
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* Primary Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Total Progress Card */}
        <div className="glass-panel flex flex-col justify-between" style={{ padding: '24px' }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faTrophy} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>Total Penguasaan</h3>
            </div>
            
            <div className="flex items-center gap-3">
              {isEditingTotal ? (
                <div className="flex gap-2 items-center">
                  <input 
                    type="number" 
                    step="0.1" 
                    className="input-field" 
                    value={editTotalInput} 
                    onChange={e => setEditTotalInput(e.target.value)} 
                    style={{ width: '120px', fontSize: '18px', height: '38px', fontFamily: 'Geist Mono, monospace' }}
                  />
                  <button className="btn-primary" onClick={handleSaveTotal} style={{ height: '38px', padding: '0 14px' }}>
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: '13px' }} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1 }}>
                    <span style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontFamily: 'Geist, sans-serif' }}>
                      {totalHours.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '13px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      hrs
                    </span>
                  </div>
                  <button className="btn-icon" style={{ width: '28px', height: '28px' }} onClick={() => { setEditTotalInput(totalHours.toString()); setIsEditingTotal(true); }} title="Ubah Total Jam">
                    <FontAwesomeIcon icon={faPen} style={{ fontSize: '11px' }} />
                  </button>
                </>
              )}
            </div>
            
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>
              Target: {targetTotal} hrs
            </p>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1.5" style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
              <span>{currentPhase.title}</span>
              <span>{Math.max(0, Math.round(phaseProgress))}%</span>
            </div>
            <div className="progress-track" style={{ height: '4px' }}>
              <div className="progress-fill" style={{ width: `${Math.max(0, phaseProgress)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="glass-panel flex flex-col justify-between" style={{ padding: '24px' }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faBullseye} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>Target Harian</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontFamily: 'Geist, sans-serif', lineHeight: 1 }}>
                {hoursToday.toFixed(1)}
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
                / {dailyGoal} hrs
              </span>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="progress-track" style={{ height: '4px' }}>
              <div className="progress-fill" style={{ width: `${goalProgress}%`, background: goalProgress >= 100 ? 'var(--color-success)' : 'var(--accent-primary)' }}></div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
              {dailyGoal - hoursToday > 0 ? `Sisa ${(dailyGoal - hoursToday).toFixed(1)} jam hari ini` : 'Target harian tercapai!'}
            </p>
          </div>
        </div>

        {/* Focus Timer Action Card */}
        <div className="glass-panel flex flex-col justify-between" style={{ padding: '24px' }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faClock} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>Pelacak Waktu</h3>
            </div>
            {activeTimer && (
              <div className="flex items-center justify-center gap-2 mb-1">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span style={{ fontSize: '10px', fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#22c55e', fontWeight: 600 }}>Fokus Aktif</span>
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: '32px', fontFamily: 'Geist Mono, monospace', margin: '14px 0', color: 'var(--text-primary)', fontWeight: 600 }}>
              {formatTime(elapsedSeconds)}
            </div>
          </div>
          
          <div className="flex flex-col gap-2.5">
            <button 
              className={activeTimer ? "btn" : "btn-primary"} 
              style={{ width: '100%', height: '38px', color: activeTimer ? '#ef4444' : undefined, borderColor: activeTimer ? 'rgba(239, 68, 68, 0.3)' : undefined, gap: '6px' }} 
              onClick={() => toggleTimer()}
            >
              {activeTimer ? <><FontAwesomeIcon icon={faSquare} style={{ fontSize: '13px' }} /> Hentikan Timer</> : <><FontAwesomeIcon icon={faPlay} style={{ fontSize: '12px' }} /> Mulai Fokus</>}
            </button>
            <div className="flex gap-2" style={{ width: '100%', alignItems: 'center' }}>
              <input 
                type="number" 
                step="0.1" 
                min="0.1"
                className="input-field" 
                placeholder="Tambah jam..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                style={{ height: '38px', flex: '1 1 0%', minWidth: 0 }}
              />
              <button 
                className="btn-primary" 
                onClick={handleManualAdd} 
                style={{ width: '38px', height: '38px', minWidth: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Tambahkan jam"
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '13px' }} />
              </button>
            </div>
          </div>
        </div>

      </div>
      
      {/* Phases Roadmap Overview */}
      <div className="mt-10 mb-4 flex items-center justify-between">
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
          Roadmap Penguasaan (5 Fase)
        </h3>
        <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
          {phases.length} Fase Terstruktur
        </span>
      </div>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
        {phases.map((p, i) => {
          const isActive = totalHours >= p.hoursStart && totalHours <= p.hoursEnd;
          const isDone = totalHours > p.hoursEnd;
          return (
            <div 
              key={i} 
              className="flex flex-col gap-1.5 p-3.5 rounded" 
              style={{ 
                background: isActive ? 'var(--surface-input)' : 'transparent', 
                border: isActive ? '1px solid var(--border-hairline-strong)' : '1px solid var(--border-hairline)',
                borderRadius: '6px'
              }}
            >
              <div className="flex justify-between items-center">
                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: isActive ? 'var(--text-primary)' : (isDone ? '#22c55e' : 'var(--text-secondary)') }}>
                  Fase {i + 1}: {p.title}
                </h4>
                <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
                  {p.hoursStart} - {p.hoursEnd} hrs
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p.desc}</p>
            </div>
          );
        })}
      </div>

      {editProject && (
        <EditProjectModal
          key={editProject.id}
          project={editProject}
          isOpen={Boolean(editProject)}
          onClose={() => setEditProject(null)}
        />
      )}
    </div>
  );
}
