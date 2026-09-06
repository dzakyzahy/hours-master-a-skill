import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { useStore, type SkillPhase } from '../store';

export function ManualProjectModal({ onClose }: { onClose: () => void }) {
  const addProject = useStore(state => state.addProject);
  
  const [name, setName] = useState('');
  const [phases, setPhases] = useState<SkillPhase[]>([
    { title: 'Beginner Phase', hoursStart: 0, hoursEnd: 100, desc: 'Learning the basics' }
  ]);

  const handleAddPhase = () => {
    const lastPhase = phases[phases.length - 1];
    setPhases([...phases, { 
      title: 'New Phase', 
      hoursStart: lastPhase ? lastPhase.hoursEnd + 1 : 0, 
      hoursEnd: lastPhase ? lastPhase.hoursEnd + 100 : 100, 
      desc: '' 
    }]);
  };

  const handlePhaseChange = (index: number, field: keyof SkillPhase, value: string | number) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value as never };
    setPhases(newPhases);
  };

  const handleRemovePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return alert("Project name is required");
    if (phases.length === 0) return alert("At least one phase is required");
    
    const sortedPhases = [...phases].sort((a, b) => a.hoursStart - b.hoursStart);
    addProject(name, sortedPhases);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="glass-panel no-drag" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} className="btn" style={{ position: 'absolute', top: 16, right: 16 }}><X size={20} /></button>
        <h2 className="mb-6">Manual Project Creator</h2>
        
        <div className="mb-6">
          <label className="text-muted mb-2 block font-semibold text-sm">Project Name</label>
          <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Learn Guitar" />
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 style={{ margin: 0 }}>Phases</h3>
          <button className="btn btn-primary" onClick={handleAddPhase} style={{ padding: '4px 12px', fontSize: '0.9rem' }}><Plus size={16} /> Add Phase</button>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {phases.map((p, i) => (
            <div key={i} style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
              {phases.length > 1 && (
                <button onClick={() => handleRemovePhase(i)} className="btn" style={{ position: 'absolute', top: 8, right: 8, padding: '4px', color: '#ef4444' }}><X size={16} /></button>
              )}
              
              <div className="mb-3 pr-8">
                <label className="text-muted mb-1 block text-xs">Phase Title</label>
                <input type="text" className="input-field" style={{ padding: '8px' }} value={p.title} onChange={e => handlePhaseChange(i, 'title', e.target.value)} />
              </div>
              
              <div className="flex gap-4 mb-3">
                <div style={{ flex: 1 }}>
                  <label className="text-muted mb-1 block text-xs">Start Hours</label>
                  <input type="number" min="0" className="input-field" style={{ padding: '8px' }} value={p.hoursStart} onChange={e => handlePhaseChange(i, 'hoursStart', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-muted mb-1 block text-xs">End Hours</label>
                  <input type="number" min="0" className="input-field" style={{ padding: '8px' }} value={p.hoursEnd} onChange={e => handlePhaseChange(i, 'hoursEnd', Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="text-muted mb-1 block text-xs">Description</label>
                <input type="text" className="input-field" style={{ padding: '8px' }} value={p.desc} onChange={e => handlePhaseChange(i, 'desc', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary w-full flex items-center justify-center gap-2" onClick={handleSave}><Save size={18} /> Save Project</button>
      </div>
    </div>
  );
}
