import React, { useMemo, useState } from 'react';

type DiffLine = { type: 'same' | 'added' | 'removed'; text: string };

function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split(/\r?\n/);
  const bLines = b.split(/\r?\n/);
  const max = Math.max(aLines.length, bLines.length);
  const res: DiffLine[] = [];
  for (let i = 0; i < max; i++) {
    const al = aLines[i];
    const bl = bLines[i];
    if (al === bl) {
      if (al !== undefined) res.push({ type: 'same', text: al });
    } else {
      if (al !== undefined) res.push({ type: 'removed', text: al });
      if (bl !== undefined) res.push({ type: 'added', text: bl });
    }
  }
  return res;
}

export function TextCompare() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const lines = useMemo(() => diffLines(left, right), [left, right]);
  return (
    <div className="panel">
      <h3>Text Compare</h3>
      <div className="split">
        <div className="col">
          <label>Left</label>
          <textarea rows={12} value={left} onChange={(e) => setLeft(e.target.value)} />
        </div>
        <div className="col">
          <label>Right</label>
          <textarea rows={12} value={right} onChange={(e) => setRight(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="diff">
          {lines.map((l, i) => (
            <div key={i} className={l.type}>
              {l.type === 'same' ? '  ' : l.type === 'added' ? '+ ' : '- '} {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

