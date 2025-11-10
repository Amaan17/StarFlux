import React, { useEffect, useMemo, useRef, useState } from 'react';

export function CommandPalette({
  open,
  onClose,
  items,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  items: { id: string; label: string }[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, filtered.length - 1));
      if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
      if (e.key === 'Enter') {
        const it = filtered[index];
        if (it) onSelect(it.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  if (!open) return null;
  return (
    <div className="cmd-palette" onClick={onClose}>
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          placeholder="Type a tool name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="list" style={{ marginTop: 8, maxHeight: 380, overflow: 'auto' }}>
          {filtered.map((it, i) => (
            <div key={it.id} className={`cmd-item ${i === index ? 'active' : ''}`} onClick={() => onSelect(it.id)}>
              {it.label}
            </div>
          ))}
          {filtered.length === 0 && <div className="cmd-item">No matches</div>}
        </div>
      </div>
    </div>
  );
}

