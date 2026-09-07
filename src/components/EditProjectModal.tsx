import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faClock, faCheck, faPen } from '@fortawesome/free-solid-svg-icons';
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
  const [timeMessage, setTimeMessage] = useState('');

  if (!isOpen) return null;

  const handleAddPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const prevEnd = lastPhase?.hoursEnd ?? 0;
    setPhases([
      ...phases,
      {
        id: `phase_${Date.now()}`,
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
      setTimeMessage(`Berhasil menambahkan ${mins} menit ke ${project.name}`);
      setTimeout(() => setTimeMessage(''), 4000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProject(project.id, name, phases);
    onClose();
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.6)', 
        backdropFilter: 'blur(8px)', 
        zIndex: 100, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '20px' 
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel no-drag" 
        style={{ 
          width: '100%', 
          maxWidth: '560px', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          position: 'relative',
          padding: '24px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="btn" 
          style={{ position: 'absolute', top: 18, right: 18, width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Tutup"
        >
          <FontAwesomeIcon icon={faXmark} className="text-[14px]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '6px', 
              background: 'var(--surface-input)', 
              border: '1px solid var(--border-hairline-strong)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              flexShrink: 0
            }}
          >
            <FontAwesomeIcon icon={faPen} className="text-[14px]" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'Geist, sans-serif' }}>
              Edit Proyek Keahlian
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Perbarui judul, fase pembelajaran, atau sesuaikan jam manual
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Nama Proyek
            </label>
            <input 
              type="text" 
              className="input-field" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Learn Rust" 
              style={{ height: '38px', fontSize: '12.5px' }}
              autoFocus 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Fase Pembelajaran ({phases.length})
              </label>
              <button 
                type="button" 
                onClick={handleAddPhase} 
                className="btn"
                style={{ height: '28px', padding: '0 10px', fontSize: '11px', gap: '5px' }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-[11px]" /> Tambah Fase
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {phases.map((phase, idx) => {
                const phaseId = phase.id || phase.title || `phase-${idx}`;
                const phaseName = phase.name ?? phase.title ?? '';
                const phaseHours = phase.hoursRequired ?? (phase.hoursEnd - phase.hoursStart);
                return (
                  <div 
                    key={phaseId} 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center', 
                      background: 'var(--surface-input)', 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-hairline)' 
                    }}
                  >
                    <input 
                      type="text" 
                      className="input-field flex-1" 
                      value={phaseName} 
                      onChange={e => handleUpdatePhase(phaseId, 'name', e.target.value)} 
                      placeholder="Nama Fase (e.g. Dasar Sintaksis)"
                      style={{ height: '34px', fontSize: '12px' }}
                    />
                    <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={phaseHours} 
                        onChange={e => handleUpdatePhase(phaseId, 'hoursRequired', Number(e.target.value))} 
                        min="1" 
                        style={{ width: '68px', height: '34px', fontSize: '12px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>jam</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemovePhase(phaseId)} 
                      className="btn"
                      style={{ width: '32px', height: '32px', padding: 0, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)', flexShrink: 0 }}
                      title="Hapus Fase"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="text-[11px]" />
                    </button>
                  </div>
                );
              })}
              {phases.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', border: '1px dashed var(--border-hairline-strong)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Belum ada fase. Klik &quot;Tambah Fase&quot; untuk merancang tahapan.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-3" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            <button type="button" onClick={onClose} className="btn" style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}>
              Batal
            </button>
            <button type="submit" className="btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '12px', gap: '6px' }}>
              <FontAwesomeIcon icon={faCheck} className="text-[13px]" /> Simpan Perubahan
            </button>
          </div>
        </form>

        {/* Manual Time Entry Section */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <FontAwesomeIcon icon={faClock} style={{ color: 'var(--accent-primary)', fontSize: '14px' }} />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Entri Jam Belajar Manual
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
            Lupa menyalakan timer? Tambahkan atau kurangi menit belajar secara manual.
          </p>
          <form onSubmit={handleManualTimeAdd} className="flex gap-2">
            <input 
              type="number" 
              className="input-field flex-1" 
              value={addMinutes} 
              onChange={e => setAddMinutes(e.target.value)} 
              placeholder="Menit (e.g. 30 atau -15)"
              style={{ height: '36px', fontSize: '12px' }}
            />
            <button 
              type="submit" 
              className="btn"
              disabled={!addMinutes.trim()}
              style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
            >
              Terapkan
            </button>
          </form>
          {timeMessage && (
            <span style={{ fontSize: '11px', color: '#22c55e', display: 'block', marginTop: '6px', fontFamily: 'Geist Mono, monospace' }}>
              {timeMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
