import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';

type Btn = { label: string; target: string; icon?: string };
const LS_KEY = 'starflux.quickButtons';

export function QuickButtons() {
  const [items, setItems] = useState<Btn[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '') || []; } catch { return []; }
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Btn>({ label: '', target: '', icon: '🔗' });
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {} }, [items]);

  const open = (t: string) => {
    if (!t) return;
    if (/^https?:\/\//i.test(t)) window.api.openExternal(t);
    else window.api.openPath(t);
  };

  const startEdit = (i: number) => {
    const cur = items[i] || { label: '', target: '', icon: '🔗' };
    setForm(cur);
    setEditIndex(i);
  };
  const save = () => {
    if (editIndex === null) return;
    const next = [...items];
    next[editIndex] = form;
    setItems(next);
    setEditIndex(null);
  };

  const cells = Array.from({ length: 4 }, (_, i) => items[i] || { label: 'Set', target: '', icon: '🔗' });

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
        {cells.map((b, i) => (
          <div key={i} className="panel" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="primary" onClick={() => (b.target ? open(b.target) : startEdit(i))} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span style={{ fontSize: 16 }}>{b.icon || '🔗'}</span>
              <span>{b.label || 'Set'}</span>
            </button>
            <button title="Edit" onClick={() => startEdit(i)}>⚙️</button>
          </div>
        ))}
      </div>

      <Modal open={editIndex !== null} onClose={() => setEditIndex(null)} title="Edit Quick Button">
        <div className="col" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={{ flex: 1 }} />
            <input placeholder="Icon (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} style={{ width: 120 }} />
          </div>
          <input placeholder="Target (URL or path)" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setEditIndex(null)}>Cancel</button>
            <button className="primary" onClick={save}>Save</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
