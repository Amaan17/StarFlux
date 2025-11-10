import React, { useEffect, useState } from 'react';
import { THEME_PRESETS, getPreset, useTheme } from '../state/theme';

export function Customizer() {
  const { theme, setTheme, preset, setPreset, apply } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [theme, open]);

  const onPreset = (p: string) => {
    setPreset(p);
    setTheme(getPreset(p));
  };

  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'starflux-theme.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const text = await file.text(); const t = JSON.parse(text); setTheme(t); } catch {}
  };

  return (
    <>
      <button className="fab fab-bottom" title="Customize" onClick={() => setOpen((v) => !v)}>⚙️</button>
      {open && (
        <div className="customizer">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Customize</strong>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <select value={preset} onChange={(e) => onPreset(e.target.value)}>
              {THEME_PRESETS.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <button onClick={() => setTheme(getPreset('Dark'))}>Reset</button>
            <button onClick={exportTheme}>Export</button>
            <label className="btn-file">
              Import
              <input type="file" accept="application/json" onChange={importTheme} hidden />
            </label>
          </div>
          <div className="grid2">
            {(['bg','panel','muted','fg','accent','accent2','danger'] as const).map((k) => (
              <div key={k} className="row" style={{ alignItems: 'center', gap: 8 }}>
                <label style={{ width: 90 }}>{k}</label>
                <input type="color" value={(theme as any)[k]} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} />
                <input value={(theme as any)[k]} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
