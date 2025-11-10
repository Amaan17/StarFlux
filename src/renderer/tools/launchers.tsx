import React, { useEffect, useState } from 'react';

type Launcher = { id: string; name: string; kind: 'url' | 'path'; target: string };

export function Launchers() {
  const [list, setList] = useState<Launcher[]>([]);
  const [name, setName] = useState('My Shortcut');
  const [kind, setKind] = useState<'url' | 'path'>('url');
  const [target, setTarget] = useState('https://example.com');
  const [accel, setAccel] = useState('');
  const hasLaunchers = !!window.api?.launchers;
  const hasShortcuts = !!window.api?.shortcuts;

  const reload = async () => {
    if (!hasLaunchers) return;
    setList(await window.api!.launchers.list());
  };

  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!name || !target || !hasLaunchers) return;
    await window.api!.launchers.add({ name, kind, target });
    setName('');
    setTarget('');
    reload();
  };

  const remove = async (id: string) => {
    if (!hasLaunchers) return;
    await window.api!.launchers.remove(id);
    reload();
  };

  const open = async (id: string) => {
    if (!hasLaunchers) return;
    await window.api!.launchers.open(id);
  };

  const registerShortcut = async (id: string) => {
    if (!accel || !hasShortcuts) return;
    await window.api!.shortcuts.register({ accelerator: accel, action: `launcher:${id}` });
    setAccel('');
  };

  return (
    <div className="panel">
      <h3>Launchers (Browser / File Explorer)</h3>
      <div className="row">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 180 }} />
        <select value={kind} onChange={(e) => setKind(e.target.value as 'url' | 'path')}>
          <option value="url">URL</option>
          <option value="path">Path</option>
        </select>
        <input placeholder={kind === 'url' ? 'https://...' : 'C:\\path\\to\\folder'} value={target} onChange={(e) => setTarget(e.target.value)} style={{ flex: 1 }} />
        <button className="primary" onClick={add} disabled={!hasLaunchers}>Add</button>
      </div>
      <div className="list" style={{ marginTop: 8 }}>
        {list.map((l) => (
          <div key={l.id} className="list-item">
            <div>
              <div>{l.name}</div>
              <div style={{ fontSize: 12, color: '#93a4c0' }}>{l.kind}: {l.target}</div>
            </div>
            <div className="row">
              <input placeholder="Accelerator (e.g. Ctrl+Alt+1)" value={accel} onChange={(e) => setAccel(e.target.value)} style={{ width: 180 }} />
              <button onClick={() => registerShortcut(l.id)} disabled={!hasShortcuts}>Register Shortcut</button>
              <button onClick={() => open(l.id)} disabled={!hasLaunchers}>Open</button>
              <button className="danger" onClick={() => remove(l.id)} disabled={!hasLaunchers}>Delete</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="list-item">No launchers yet.</div>}
      </div>
      {!hasLaunchers && (
        <div style={{ fontSize: 12, color: '#93a4c0', marginTop: 8 }}>
          Preload bridge for Launchers is unavailable; try restarting the app.
        </div>
      )}
      <div style={{ fontSize: 12, color: '#93a4c0', marginTop: 8 }}>
        Tip: You can also use action formats in Global Shortcuts: open-url:https://..., open-path:C:\\Users\\... 
      </div>
    </div>
  );
}
