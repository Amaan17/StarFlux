import React from 'react';
import type { Tool } from '../tools';

export function Sidebar({ tools, active, onSelect }: { tools: Tool[]; active: string; onSelect: (id: string) => void }) {
  return (
    <aside className="sidebar">
      <h1>StarFlux</h1>
      <div className="tool-list">
        {tools.map((t) => (
          <div key={t.id} className={`tool-item ${active === t.id ? 'active' : ''}`} onClick={() => onSelect(t.id)}>
            {t.title}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, color: '#93a4c0', fontSize: 12 }}>
        Tip: Press Ctrl/Cmd+K to open the command palette.
      </div>
    </aside>
  );
}

