import { useState } from 'react';
import { Plus, X, Trash, FolderPlus, Check } from '@phosphor-icons/react';
import { useStore, type SkillPhase } from '../store';

export function ManualProjectModal({ isOpen = true, onClose }: { isOpen?: boolean; onClose: () => void }) {
  const addProject = useStore(state => state.addProject);
  
  const [name, setName] = useState('');
  const [phases, setPhases] = useState<SkillPhase[]>([
    { title: 'Fase Fondasi', hoursStart: 0, hoursEnd: 100, desc: 'Mempelajari dasar dan prinsip inti' }
  ]);

  if (!isOpen) return null;

  const handleAddPhase = () => {
    const lastPhase = phases[phases.length - 1];
    setPhases([...phases, { 
      title: 'Fase Baru', 
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
    if (!name.trim()) return alert("Nama proyek wajib diisi");
    if (phases.length === 0) return alert("Minimal harus ada satu fase");
    
    const sortedPhases = [...phases].sort((a, b) => a.hoursStart - b.hoursStart);
    addProject(name, sortedPhases);
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
          <X size={15} />
        </button>
        
        {/* Header with Icon Box */}
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
              color: 'var(--accent-cyan)',
              flexShrink: 0
            }}
          >
            <FolderPlus size={17} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'Geist, sans-serif' }}>
              Buat Proyek Manual
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Rancang fase keahlian Anda secara terstruktur
            </span>
          </div>
        </div>
        
        {/* Project Name */}
        <div className="mb-4">
          <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            Nama Proyek / Keahlian
          </label>
          <input 
            type="text" 
            className="input-field" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Belajar Bermain Piano, Rust Programming..."
            style={{ height: '38px', fontSize: '12.5px' }}
          />
        </div>

        {/* Phases Section */}
        <div className="flex justify-between items-center mb-3">
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Fase Pembelajaran ({phases.length})
          </span>
          <button 
            type="button"
            className="btn" 
            onClick={handleAddPhase} 
            style={{ height: '28px', padding: '0 10px', fontSize: '11px', gap: '4px' }}
          >
            <Plus size={13} /> Tambah Fase
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {phases.map((p, i) => (
            <div 
              key={i} 
              style={{ 
                background: 'var(--surface-input)', 
                padding: '12px 14px', 
                borderRadius: '6px', 
                border: '1px solid var(--border-hairline)', 
                position: 'relative' 
              }}
            >
              {phases.length > 1 && (
                <button 
                  onClick={() => handleRemovePhase(i)} 
                  className="btn" 
                  style={{ position: 'absolute', top: 10, right: 10, width: '26px', height: '26px', padding: 0, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  title="Hapus Fase"
                >
                  <Trash size={13} />
                </button>
              )}
              
              <div className="mb-2 pr-8">
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontFamily: 'Geist Mono, monospace' }}>
                  Judul Fase {i + 1}
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ height: '34px', fontSize: '12px' }} 
                  value={p.title} 
                  onChange={e => handlePhaseChange(i, 'title', e.target.value)} 
                  placeholder="e.g. Dasar & Sintaksis"
                />
              </div>
              
              <div className="flex gap-3 mb-2">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontFamily: 'Geist Mono, monospace' }}>
                    Jam Mulai
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    className="input-field" 
                    style={{ height: '34px', fontSize: '12px' }} 
                    value={p.hoursStart} 
                    onChange={e => handlePhaseChange(i, 'hoursStart', Number(e.target.value))} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontFamily: 'Geist Mono, monospace' }}>
                    Jam Selesai
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    className="input-field" 
                    style={{ height: '34px', fontSize: '12px' }} 
                    value={p.hoursEnd} 
                    onChange={e => handlePhaseChange(i, 'hoursEnd', Number(e.target.value))} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontFamily: 'Geist Mono, monospace' }}>
                  Deskripsi / Fokus
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ height: '34px', fontSize: '12px' }} 
                  value={p.desc} 
                  onChange={e => handlePhaseChange(i, 'desc', e.target.value)} 
                  placeholder="e.g. Memahami konsep variabel, fungsi, dan struktur kontrol"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 justify-end pt-3" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <button type="button" className="btn" onClick={onClose} style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} style={{ height: '36px', padding: '0 16px', fontSize: '12px', gap: '6px' }}>
            <Check size={14} weight="bold" /> Simpan Proyek
          </button>
        </div>
      </div>
    </div>
  );
}
