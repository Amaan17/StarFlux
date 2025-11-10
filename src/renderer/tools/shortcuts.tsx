import React, { useEffect, useState } from 'react';

type Shortcut = { id: string; accelerator: string; action: string };

export function Shortcuts() {
  const [list, setList] = useState<Shortcut[]>([]);
  const [accelerator, setAccelerator] = useState('CommandOrControl+Shift+K');
  const [action, setAction] = useState('show-command-palette');

  const reload = async () => {
    const items = await window.api.shortcuts.list();
    setList(items);
  };

  useEffect(() => {
    reload();
  }, []);

  const register = async () => {
    if (!accelerator) return;
    await window.api.shortcuts.register({ accelerator, action });
    setAccelerator('');
    reload();
  };

  const remove = async (id: string) => {
    await window.api.shortcuts.unregister(id);
    reload();
  };

  const clear = async () => {
    if (!confirm('Clear all shortcuts?')) return;
    await window.api.shortcuts.clear();
    reload();
  };

  return (
    <div className="panel">
      <h3>Global Shortcuts</h3>
      <div className="row">
        <input
          placeholder="Accelerator (e.g., CommandOrControl+Shift+K)"
          value={accelerator}
          onChange={(e) => setAccelerator(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="show-command-palette">Show Command Palette</option>
          <option value="focus-notes">Focus Notes</option>
        </select>
        <button className="primary" onClick={register}>Register</button>
        <button onClick={clear}>Clear All</button>
      </div>
      <div className="list" style={{ marginTop: 8 }}>
        {list.map((s) => (
          <div key={s.id} className="list-item">
            <div>
              <div>{s.accelerator}</div>
              <div style={{ fontSize: 12, color: '#93a4c0' }}>{s.action}</div>
            </div>
            <div>
              <button className="danger" onClick={() => remove(s.id)}>Remove</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="list-item">No shortcuts registered.</div>}
      </div>
      <div style={{ fontSize: 12, color: '#93a4c0', marginTop: 8 }}>
        Accelerator format uses Electron accelerators, e.g., "CommandOrControl+Shift+K".
      </div>
    </div>
  );
}

