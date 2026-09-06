import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Activity, Target, Trophy, Play, Square, Plus, Trash2, Edit, Check, Edit2, ArrowLeft } from 'lucide-react';
import { useStore, type Project } from '../store';
import { EditProjectModal } from '../components/EditProjectModal';

export function Dashboard() {
  const { projects, activeProjectId, addHours, toggleTimer, activeTimer, setTotalHours, deleteProject } = useStore();
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
    <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', zIndex: 10, position: 'relative', overflowY: 'auto' }} className="no-drag">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button className="btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Activity size={32} className="text-cyan" />
            <h1 style={{ margin: 0 }}>{project.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              className="btn p-2 hover:text-cyan-400"
              onClick={() => setEditProject(project)}
              title="Edit Project"
            >
              <Edit size={18} />
            </button>
            <button 
              className="btn p-2 hover:text-red-500"
              onClick={() => { deleteProject(project.id); navigate('/'); }}
              title="Move to Recycle Bin"
            >
              <Trash2 size={18} />
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Total Progress Card */}
        <div className="glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={24} className="text-purple" />
              <h3 style={{ margin: 0 }}>Total Mastery</h3>
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
                    style={{ width: '100px', fontSize: '1.5rem', padding: '4px 8px' }}
                  />
                  <button className="btn btn-primary" onClick={handleSaveTotal}><Check size={16} /></button>
                </div>
              ) : (
                <>
                  <div className="text-cyan font-bold" style={{ fontSize: '3rem', lineHeight: 1 }}>
                    {totalHours.toFixed(1)} <span className="text-muted" style={{ fontSize: '1.2rem', fontWeight: 400 }}>hrs</span>
                  </div>
                  <button className="btn" style={{ padding: '6px' }} onClick={() => { setEditTotalInput(totalHours.toString()); setIsEditingTotal(true); }}>
                    <Edit2 size={14} />
                  </button>
                </>
              )}
            </div>
            
            <p className="text-muted mt-2">Target: {targetTotal} hrs ({project.name})</p>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span>{currentPhase.title}</span>
              <span className="text-muted">{Math.max(0, Math.round(phaseProgress))}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.max(0, phaseProgress)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target size={24} className="text-cyan" />
              <h3 style={{ margin: 0 }}>Daily Goal</h3>
            </div>
            <div className="flex items-end gap-2">
              <div className="font-bold" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
                {hoursToday.toFixed(1)} <span style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {dailyGoal} hrs</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
             <div className="progress-track">
              <div className="progress-fill" style={{ width: `${goalProgress}%`, background: goalProgress >= 100 ? '#4ade80' : '' }}></div>
            </div>
            <p className="text-muted text-sm mt-2">{dailyGoal - hoursToday > 0 ? `${(dailyGoal - hoursToday).toFixed(1)} hours left today` : 'Daily goal reached!'}</p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={24} className="text-cyan" />
              <h3 style={{ margin: 0 }}>Track Time</h3>
            </div>
            {activeTimer && (
              <div className="flex items-center justify-center gap-2 mb-1">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
                <span className="text-xs uppercase font-semibold text-cyan" style={{ letterSpacing: '0.08em' }}>Focus Active</span>
              </div>
            )}
            <div className={`text-center font-bold tabular-nums ${activeTimer ? 'timer-active-pulse' : ''}`} style={{ fontSize: '2.5rem', margin: '16px 0', fontFamily: 'monospace' }}>
              {formatTime(timerSeconds)}
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <button className={`btn ${activeTimer ? 'btn' : 'btn-primary'} w-full`} style={activeTimer ? { borderColor: '#ef4444', color: '#ef4444' } : {}} onClick={toggleTimer}>
              {activeTimer ? <><Square size={18} /> Stop Timer</> : <><Play size={18} /> Start Timer</>}
            </button>
            <div className="flex gap-2">
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                className="input-field" 
                placeholder="Add manual hours..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleManualAdd}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>
      
      {/* Phases Overview */}
      <h3 className="mt-8 mb-4">Mastery Roadmap</h3>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {phases.map((p, i) => {
          const isActive = totalHours >= p.hoursStart && totalHours <= p.hoursEnd;
          const isDone = totalHours > p.hoursEnd;
          return (
            <div key={i} className="flex flex-col gap-2 p-4 rounded-lg" style={{ background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)', border: isActive ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent' }}>
              <div className="flex justify-between items-center">
                <h4 style={{ margin: 0, color: isActive ? 'var(--accent-cyan)' : (isDone ? '#4ade80' : 'var(--text-main)') }}>
                  Phase {i + 1}: {p.title}
                </h4>
                <span className="text-sm font-bold text-muted" style={{ fontFamily: 'monospace' }}>{p.hoursStart} - {p.hoursEnd} hrs</span>
              </div>
              <p className="text-muted text-sm" style={{ margin: 0 }}>{p.desc}</p>
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
