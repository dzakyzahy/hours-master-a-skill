import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Activity, Target, Trophy, Play, Square, Plus, Trash2, Edit, Edit2, Check, ArrowLeft } from 'lucide-react';
import { useStore, type Project } from '../store';
import { supabase } from '../supabaseClient';
import { EditProjectModal } from '../components/EditProjectModal';

export function Dashboard() {
  const { projects, activeProjectId, addHours, toggleTimer, activeTimer, setRemoteTimerState, setTotalHours, deleteProject } = useStore();
  const navigate = useNavigate();
  
  const [manualInput, setManualInput] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [editTotalInput, setEditTotalInput] = useState('');
  const [editProject, setEditProject] = useState<Project | null>(null);

  const project = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    if (!project) navigate('/');
  }, [project, navigate]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          const next = s + 1;
          if (next > 0 && next % 60 === 0) {
            addHours(1 / 60);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer, addHours]);

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
  const goalProgress = Math.min((hoursToday / dailyGoal) * 100, 100);
  
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

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '32px 24px 80px', flex: 1, display: 'flex', flexDirection: 'column', zIndex: 10, position: 'relative', overflowY: 'auto', maxWidth: '1120px', margin: '0 auto', width: '100%' }} className="no-drag">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button className="btn" onClick={() => navigate('/')} style={{ padding: '0 12px', height: '36px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2.5">
            <Activity size={20} style={{ color: 'var(--text-secondary)' }} />
            <h1 style={{ margin: 0, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)' }}>
              {project.name}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              className="btn"
              style={{ width: '36px', padding: 0 }}
              onClick={() => setEditProject(project)}
              title="Edit Project"
            >
              <Edit size={15} />
            </button>
            <button 
              className="btn"
              style={{ width: '36px', padding: 0, color: '#f87171' }}
              onClick={() => { deleteProject(project.id); navigate('/'); }}
              title="Move to Recycle Bin"
            >
              <Trash2 size={15} />
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Total Progress Card */}
        <div className="glass-panel flex flex-col justify-between" style={{ padding: '24px' }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} style={{ color: 'var(--text-secondary)' }} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Mastery</h3>
            </div>
            
            <div className="flex items-center gap-2">
              {isEditingTotal ? (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="0.1" 
                    className="input-field" 
                    value={editTotalInput} 
                    onChange={e => setEditTotalInput(e.target.value)} 
                    style={{ width: '100px', fontSize: '1.25rem', height: '36px' }}
                  />
                  <button className="btn-primary" onClick={handleSaveTotal} style={{ height: '36px', padding: '0 12px' }}><Check size={14} /></button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '36px', fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--text-primary)', lineHeight: 1 }}>
                    {totalHours.toFixed(1)} <span style={{ fontSize: '12px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>hrs</span>
                  </div>
                  <button className="btn" style={{ width: '28px', height: '28px', padding: 0 }} onClick={() => { setEditTotalInput(totalHours.toString()); setIsEditingTotal(true); }}>
                    <Edit2 size={12} />
                  </button>
                </>
              )}
            </div>
            
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>
              Target: {targetTotal} hrs
            </p>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1.5" style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
              <span>{currentPhase.title}</span>
              <span>{Math.max(0, Math.round(phaseProgress))}%</span>
            </div>
            <div className="progress-track" style={{ height: '3px' }}>
              <div className="progress-fill" style={{ width: `${Math.max(0, phaseProgress)}%`, background: '#00E5FF' }}></div>
            </div>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="glass-panel flex flex-col justify-between" style={{ padding: '24px' }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} style={{ color: 'var(--text-secondary)' }} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Daily Goal</h3>
            </div>
            <div className="flex items-end gap-2">
              <div style={{ fontSize: '36px', fontFamily: 'Instrument Serif, Georgia, serif', color: 'var(--text-primary)', lineHeight: 1 }}>
                {hoursToday.toFixed(1)} <span style={{ fontSize: '14px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>/ {dailyGoal} hrs</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="progress-track" style={{ height: '3px' }}>
              <div className="progress-fill" style={{ width: `${goalProgress}%`, background: goalProgress >= 100 ? '#4ade80' : '#00E5FF' }}></div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
              {dailyGoal - hoursToday > 0 ? `${(dailyGoal - hoursToday).toFixed(1)} hours left today` : 'Daily goal reached'}
            </p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="glass-panel flex flex-col justify-between" style={{ padding: '24px' }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Track Time</h3>
            </div>
            {activeTimer && (
              <div className="flex items-center justify-center gap-2 mb-1">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
                <span style={{ fontSize: '10px', fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#4ade80' }}>Focus Active</span>
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: '32px', fontFamily: 'Geist Mono, monospace', margin: '14px 0', color: 'var(--text-primary)' }}>
              {formatTime(timerSeconds)}
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              className={activeTimer ? "btn" : "btn-primary"} 
              style={{ width: '100%', height: '38px', color: activeTimer ? '#f87171' : undefined, borderColor: activeTimer ? 'rgba(248,113,113,0.3)' : undefined }} 
              onClick={toggleTimer}
            >
              {activeTimer ? <><Square size={15} /> Stop Timer</> : <><Play size={15} /> Start Timer</>}
            </button>
            <div className="flex gap-2">
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                className="input-field" 
                placeholder="Add hours..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                style={{ height: '38px' }}
              />
              <button className="btn-primary" onClick={handleManualAdd} style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

      </div>
      
      {/* Phases Overview */}
      <div className="mt-10 mb-4 flex items-center justify-between">
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Mastery Roadmap
        </h3>
        <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
          {phases.length} Phases
        </span>
      </div>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
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
                borderRadius: '4px'
              }}
            >
              <div className="flex justify-between items-center">
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: isActive ? 'var(--text-primary)' : (isDone ? '#4ade80' : 'var(--text-secondary)') }}>
                  Phase {i + 1}: {p.title}
                </h4>
                <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
                  {p.hoursStart} - {p.hoursEnd} hrs
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{p.desc}</p>
            </div>
          );
        })}
      </div>

      {editProject && (
        <EditProjectModal
          project={editProject}
          isOpen={Boolean(editProject)}
          onClose={() => setEditProject(null)}
        />
      )}
    </div>
  );
}
