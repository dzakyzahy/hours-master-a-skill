import React, { useState } from 'react';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { useStore, type SkillPhase, type Project } from '../store';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function EditProjectModal({ project, isOpen, onClose }: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [phases, setPhases] = useState<SkillPhase[]>(project.phases);
  const { updateProject, addManualTime } = useStore();
  const [addMinutes, setAddMinutes] = useState('');

  if (!isOpen) return null;

  const handleAddPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const prevEnd = lastPhase?.hoursEnd ?? 0;
    setPhases([
      ...phases,
      {
        id: Date.now().toString(),
        name: '',
        title: '',
        hoursRequired: 20,
        hoursStart: prevEnd,
        hoursEnd: prevEnd + 20,
        desc: '',
        isCompleted: false,
      },
    ]);
  };

  const handleUpdatePhase = (id: string, field: 'name' | 'hoursRequired', value: string | number) => {
    setPhases(phases.map(p => {
      const pId = p.id || p.title;
      if (pId !== id) return p;
      if (field === 'name') {
        return { ...p, name: String(value), title: String(value) };
      }
      const hrs = Number(value) || 0;
      return { ...p, hoursRequired: hrs, hoursEnd: p.hoursStart + hrs };
    }));
  };

  const handleRemovePhase = (id: string) => {
    setPhases(phases.filter(p => (p.id || p.title) !== id));
  };

  const handleManualTimeAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(addMinutes);
    if (!isNaN(mins) && mins !== 0) {
      addManualTime(project.id, mins);
      setAddMinutes('');
      alert(`Successfully added ${mins} minutes to ${project.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProject(project.id, name, phases);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto no-drag">
        <div className="flex justify-between items-center mb-6">
          <h2 className="m-0">Edit Project</h2>
          <button onClick={onClose} className="btn"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="text-muted mb-2 block text-sm font-medium">Project Name</label>
            <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Learn Rust" autoFocus />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-muted text-sm font-medium">Learning Phases</label>
              <button type="button" onClick={handleAddPhase} className="btn text-xs py-1 px-2"><Plus size={14} className="mr-1" /> Add Phase</button>
            </div>
            
            <div className="flex flex-col gap-3">
              {phases.map((phase, idx) => {
                const phaseId = phase.id || phase.title || `phase-${idx}`;
                const phaseName = phase.name ?? phase.title ?? '';
                const phaseHours = phase.hoursRequired ?? (phase.hoursEnd - phase.hoursStart);
                return (
                  <div key={phaseId} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                    <input type="text" className="input-field flex-1" value={phaseName} onChange={e => handleUpdatePhase(phaseId, 'name', e.target.value)} placeholder="Phase Name (e.g., Basics)" />
                    <input type="number" className="input-field w-24" value={phaseHours} onChange={e => handleUpdatePhase(phaseId, 'hoursRequired', Number(e.target.value))} min="1" />
                    <span className="text-muted text-sm">hrs</span>
                    <button type="button" onClick={() => handleRemovePhase(phaseId)} className="btn p-2 text-red-400 hover:bg-red-400/20"><Trash2 size={16} /></button>
                  </div>
                );
              })}
              {phases.length === 0 && <div className="text-center p-4 border border-dashed border-slate-700 rounded-lg text-muted text-sm">No phases defined. Add a phase to break down your goal.</div>}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 border-b border-slate-700 pb-6">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2"><Clock size={16}/> Manual Time Entry</h3>
          <p className="text-xs text-muted mb-3">Forgot to start the timer? Add or subtract minutes manually.</p>
          <form onSubmit={handleManualTimeAdd} className="flex gap-2">
            <input type="number" className="input-field flex-1" value={addMinutes} onChange={e => setAddMinutes(e.target.value)} placeholder="Minutes (e.g., 30 or -15)" />
            <button type="submit" className="btn btn-primary bg-cyan-600 hover:bg-cyan-700 text-white">Apply</button>
          </form>
        </div>
      </div>
    </div>
  );
}
