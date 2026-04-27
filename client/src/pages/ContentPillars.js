import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiLayers } from 'react-icons/fi';
import { pillarAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#818cf8', '#22d3ee', '#f472b6', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#fb923c'];

const ContentPillars = () => {
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPillar, setEditingPillar] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });

  useEffect(() => { fetchPillars(); }, []);

  const fetchPillars = async () => {
    try {
      const res = await pillarAPI.getAll();
      if (res.data.success) setPillars(res.data.pillars);
    } catch (err) {
      toast.error('Failed to load content pillars');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Pillar name is required'); return; }
    setSubmitting(true);
    try {
      if (editingPillar) {
        await pillarAPI.update(editingPillar.id, form);
        toast.success('Pillar updated');
      } else {
        await pillarAPI.create(form);
        toast.success('Pillar created');
      }
      setShowModal(false);
      resetForm();
      fetchPillars();
    } catch (err) {
      toast.error('Failed to save pillar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pillar?')) return;
    try {
      await pillarAPI.delete(id);
      toast.success('Pillar deleted');
      fetchPillars();
    } catch (err) {
      toast.error('Failed to delete pillar');
    }
  };

  const openEdit = (p) => {
    setEditingPillar(p);
    setForm({ name: p.name, description: p.description || '', color: p.color || COLORS[0] });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPillar(null);
    setForm({ name: '', description: '', color: COLORS[pillars.length % COLORS.length] });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="content-pillars animate-fade-in">
      <div className="page-header justify-end">
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus size={18} /> Add Pillar
        </button>
      </div>

      {pillars.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FiLayers /></div>
          <h3 className="empty-state-title">No content pillars yet</h3>
          <p className="empty-state-description">
            Add 3–5 pillars that represent the main topics you want to post about. Example: "Founder Lessons", "Product Design", "AI Tools"
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Add Your First Pillar
          </button>
        </div>
      ) : (
        <div className="pillars-grid">
          {pillars.map(p => (
            <div key={p.id} className="pillar-card">
              <div className="pillar-color" style={{ background: p.color || COLORS[0] }} />
              <div className="pillar-body">
                <div className="pillar-header">
                  <h3>{p.name}</h3>
                  <div className="pillar-actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)} title="Edit"><FiEdit2 size={14} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)} title="Delete"><FiTrash2 size={14} /></button>
                  </div>
                </div>
                {p.description && <p className="pillar-desc">{p.description}</p>}
                <span className="pillar-count">{p.postCount || 0} posts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingPillar ? 'Edit Pillar' : 'Add Pillar'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Pillar Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Startup Lessons, Product Design, AI Tools" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="What kind of posts fall under this pillar?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="color-picker">
                    {COLORS.map(c => (
                      <button key={c} type="button"
                        className={`color-swatch ${form.color === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setForm({ ...form, color: c })} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingPillar ? 'Update' : 'Add Pillar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-xl); }
        .page-header h1 { margin-bottom: var(--spacing-xs); }
        .page-header p { color: var(--color-text-muted); max-width: 500px; }
        .pillars-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg); }
        .pillar-card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden;
          transition: border-color var(--transition-fast); }
        .pillar-card:hover { border-color: var(--color-border-light); }
        .pillar-color { height: 4px; }
        .pillar-body { padding: var(--spacing-lg); }
        .pillar-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-sm); }
        .pillar-header h3 { font-size: 1.125rem; font-weight: 600; }
        .pillar-actions { display: flex; gap: var(--spacing-xs); }
        .pillar-desc { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: var(--spacing-md); }
        .pillar-count { font-size: 0.75rem; color: var(--color-text-muted); }
        .form-textarea { width: 100%; padding: var(--spacing-md); background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); color: var(--color-text-primary); font-family: inherit; font-size: 0.9375rem; line-height: 1.5; resize: vertical; }
        .form-textarea:focus { outline: none; border-color: var(--color-accent-primary); }
        .color-picker { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
        .color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all var(--transition-fast); }
        .color-swatch.active { border-color: var(--color-text-primary); transform: scale(1.15); }
        .color-swatch:hover { transform: scale(1.1); }
        @media (max-width: 768px) { .page-header { flex-direction: column; gap: var(--spacing-md); } }
      `}</style>
    </div>
  );
};

export default ContentPillars;
