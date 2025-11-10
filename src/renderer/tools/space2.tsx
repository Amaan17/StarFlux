import React, { useEffect, useMemo, useRef, useState } from 'react';

type DuEntry = { path: string; name: string; size: number; isDir: boolean; children?: DuEntry[] };

function human(n: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

export function Space() {
  const [root, setRoot] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ files: number; dirs: number; bytes: number; hint?: string } | null>(null);
  const [liveChildren, setLiveChildren] = useState<DuEntry[]>([]);
  const [tree, setTree] = useState<DuEntry | null>(null);
  const [view, setView] = useState<'children' | 'folders' | 'treemap'>('children');
  const [limit, setLimit] = useState(500);
  const [maxEntries, setMaxEntries] = useState(50000);
  const [minSizeMB, setMinSizeMB] = useState(1);
  const [treemapDirs, setTreemapDirs] = useState(false);
  const [zoomNode, setZoomNode] = useState<DuEntry | null>(null);

  const max = useMemo(() => (tree?.children && tree.children[0]?.size) || 1, [tree]);

  const pickRoot = async () => {
    const p = await window.api.dialog.pickDir();
    if (p) setRoot(p);
  };

  const scan = async () => {
    if (!root) return;
    setBusy(true);
    const offP = window.api.du.onProgress((p) => setProgress(p));
    const offR = window.api.du.onReset(() => setLiveChildren([]));
    const offC = window.api.du.onChild((child) => setLiveChildren((prev) => {
      const next = [...prev.filter(c => c.path !== child.path), child as any];
      next.sort((a, b) => b.size - a.size);
      return next;
    }));
    const res = await window.api.du.scan({ root, maxEntries, minSizeBytes: Math.max(0, Math.floor(minSizeMB * 1024 * 1024)) });
    setTree(res);
    offP(); offR(); offC();
    setProgress(null);
    setZoomNode(null);
    setBusy(false);
  };

  const openChild = async (p: string) => {
    setRoot(p);
    setTimeout(scan, 0);
  };

  return (
    <div className="panel">
      <h3>Disk Usage</h3>
      <div className="row" style={{ gap: 8 }}>
        <input placeholder="Root folder" value={root} onChange={(e) => setRoot(e.target.value)} style={{ flex: 1 }} />
        <button onClick={pickRoot}>Choose...</button>
        <button className="primary" onClick={scan} disabled={busy || !root}>{busy ? 'Scanning...' : 'Scan'}</button>
        <select value={view} onChange={(e) => setView(e.target.value as any)}>
          <option value="children">Top Level</option>
          <option value="folders">All Folders</option>
          <option value="treemap">Treemap</option>
        </select>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ color: '#93a4c0', fontSize: 12 }}>Limit</label>
          <input type="number" min={50} max={5000} value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '0') || 0)} style={{ width: 90 }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ color: '#93a4c0', fontSize: 12 }}>Max entries</label>
          <input type="number" min={1000} max={200000} step={1000} value={maxEntries} onChange={(e) => setMaxEntries(parseInt(e.target.value || '0') || 0)} style={{ width: 110 }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ color: '#93a4c0', fontSize: 12 }}>Min size (MB)</label>
          <input type="number" min={0} max={1024} step={1} value={minSizeMB} onChange={(e) => setMinSizeMB(parseFloat(e.target.value || '0') || 0)} style={{ width: 110 }} />
        </div>
        {view === 'treemap' && (
          <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#93a4c0' }}>
              <input type="checkbox" checked={treemapDirs} onChange={(e) => setTreemapDirs(e.target.checked)} />
              Directories in treemap
            </label>
            <button onClick={() => setZoomNode(null)}>Reset Zoom</button>
          </>
        )}
      </div>
      {!!progress && busy && (
        <div style={{ fontSize: 12, color: '#93a4c0', marginTop: 6 }}>
          Scanning… files {progress.files.toLocaleString()} · dirs {progress.dirs.toLocaleString()} · {human(progress.bytes)}
        </div>
      )}
      {tree && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#93a4c0', marginBottom: 6 }}>{tree.path} — {human(tree.size)}</div>
          {view === 'children' ? (
            busy ? <LiveTopLevelList items={liveChildren} onOpen={openChild} /> : <TopLevelList tree={tree} max={max} onOpen={openChild} />
          ) : view === 'folders' ? (
            <FolderList tree={tree} onOpen={openChild} />
          ) : (
            <Treemap tree={zoomNode || tree} limit={limit} dirsOnly={treemapDirs} onZoom={(n) => setZoomNode(n)} onOpen={openChild} />
          )}
        </div>
      )}
    </div>
  );
}

function TopLevelList({ tree, max, onOpen }: { tree: DuEntry; max: number; onOpen: (p: string) => void }) {
  return (
    <div className="list">
      {(tree.children || []).map((c) => (
        <div key={c.path} className="list-item" style={{ alignItems: 'center' }}>
          <div style={{ width: 28, color: '#93a4c0' }}>{c.isDir ? '[D]' : '[F]'}</div>
          <div style={{ flex: 1 }}>{c.name}</div>
          <div style={{ width: 200 }}>
            <div style={{ background: '#0b1020', border: '1px solid #1e293b', height: 10, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, Math.min(100, ((c.size / max) * 100) || 0)).toFixed(1)}%`, background: 'var(--accent)', height: '100%' }} />
            </div>
          </div>
          <div style={{ width: 110, textAlign: 'right' }}>{human(c.size)}</div>
          {c.isDir && (
            <div style={{ marginLeft: 8 }}>
              <button onClick={() => onOpen(c.path)}>Open</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// While scanning, show live root children
function LiveTopLevelList({ items, onOpen }: { items: DuEntry[]; onOpen: (p: string) => void }) {
  const max = useMemo(() => (items[0]?.size || 1), [items]);
  return (
    <div className="list">
      {items.map((c) => (
        <div key={c.path} className="list-item" style={{ alignItems: 'center' }}>
          <div style={{ width: 28, color: '#93a4c0' }}>{c.isDir ? '[D]' : '[F]'}</div>
          <div style={{ flex: 1 }}>{c.name}</div>
          <div style={{ width: 200 }}>
            <div style={{ background: '#0b1020', border: '1px solid #1e293b', height: 10, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, Math.min(100, ((c.size / max) * 100) || 0)).toFixed(1)}%`, background: 'var(--accent)', height: '100%' }} />
            </div>
          </div>
          <div style={{ width: 110, textAlign: 'right' }}>{human(c.size)}</div>
          {c.isDir && (
            <div style={{ marginLeft: 8 }}>
              <button onClick={() => onOpen(c.path)}>Open</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function flattenDirs(node: DuEntry): DuEntry[] {
  const out: DuEntry[] = [];
  (function walk(n: DuEntry) {
    if (n.isDir) out.push(n);
    for (const ch of n.children || []) walk(ch);
  })(node);
  return out;
}

function FolderList({ tree, onOpen }: { tree: DuEntry; onOpen: (p: string) => void }) {
  const dirs = useMemo(() => flattenDirs(tree).sort((a, b) => b.size - a.size), [tree]);
  return (
    <div className="list">
      {dirs.map((d) => (
        <div key={d.path} className="list-item" style={{ alignItems: 'center' }}>
          <div style={{ width: 28, color: '#93a4c0' }}>[D]</div>
          <div style={{ flex: 1 }} title={d.path}>{d.path}</div>
          <div style={{ width: 110, textAlign: 'right' }}>{human(d.size)}</div>
          <div style={{ marginLeft: 8 }}><button onClick={() => onOpen(d.path)}>Open</button></div>
        </div>
      ))}
    </div>
  );
}

// Treemap
 type Rect = { x: number; y: number; w: number; h: number; item: DuEntry };

function squarify(items: { item: DuEntry; size: number }[], x: number, y: number, w: number, h: number): Rect[] {
  const rects: Rect[] = [];
  if (w <= 0 || h <= 0) return rects;
  const filtered = items.filter((it) => it.size > 0);
  const area = w * h;
  const total = filtered.reduce((s, it) => s + it.size, 0);
  if (total <= 0) return rects;
  const values = filtered.map((it) => ({ ...it, area: (it.size / total) * area }));

  let row: typeof values = [];
  let rx = x, ry = y, rw = w, rh = h;

  const worst = (r: typeof values, side: number) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    if (s <= 0 || side <= 0) return Number.POSITIVE_INFINITY;
    const maxA = Math.max(...r.map((d) => d.area));
    const minA = Math.min(...r.map((d) => d.area));
    if (minA <= 0) return Number.POSITIVE_INFINITY;
    const side2 = side * side;
    return Math.max((side2 * maxA) / (s * s), (s * s) / (side2 * minA));
  };

  const layoutRow = (r: typeof values, horizontal: boolean) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    if (s <= 0) return;
    if (horizontal) {
      const rowH = s / rw;
      if (!isFinite(rowH) || rowH <= 0) return;
      let cx = rx;
      for (const d of r) {
        const cw = d.area / rowH;
        if (!isFinite(cw) || cw <= 0) continue;
        rects.push({ x: cx, y: ry, w: cw, h: rowH, item: d.item });
        cx += cw;
      }
      ry += rowH; rh -= rowH;
    } else {
      const colW = s / rh;
      if (!isFinite(colW) || colW <= 0) return;
      let cy = ry;
      for (const d of r) {
        const ch = d.area / colW;
        if (!isFinite(ch) || ch <= 0) continue;
        rects.push({ x: rx, y: cy, w: colW, h: ch, item: d.item });
        cy += ch;
      }
      rx += colW; rw -= colW;
    }
  };

  let horizontal = rw >= rh;
  for (const v of values) {
    const test = row.concat([v]);
    if (row.length === 0 || worst(test, horizontal ? rh : rw) <= worst(row, horizontal ? rh : rw)) {
      row = test;
    } else {
      layoutRow(row, horizontal);
      horizontal = rw >= rh;
      row = [v];
    }
  }
  if (row.length) layoutRow(row, horizontal);
  return rects;
}

function Treemap({ tree, limit, dirsOnly, onZoom, onOpen }: { tree: DuEntry; limit: number; dirsOnly: boolean; onZoom: (n: DuEntry) => void; onOpen: (p: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 480 });

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: Math.max(420, Math.round(window.innerHeight * 0.8)) });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const items = useMemo(() => {
    let children = (tree.children || []).filter((c) => (dirsOnly ? c.isDir : !c.isDir));
    if (!dirsOnly && children.length === 0) children = (tree.children || []).filter((c) => c.isDir);
    return children.filter((c) => c.size > 0).sort((a, b) => b.size - a.size).slice(0, Math.max(1, limit || 300));
  }, [tree, dirsOnly, limit]);

  const rects = useMemo(() => squarify(items.map((f) => ({ item: f, size: f.size })), 0, 0, size.w, size.h), [items, size]);

  return (
    <div ref={containerRef} className="panel" style={{ position: 'relative', height: size.h, overflow: 'hidden' }}>
      {rects.map((r, i) => (
        <div
          key={i}
          title={`${r.item.path}\n${human(r.item.size)}`}
          onClick={() => { if (r.item.isDir) onZoom(r.item); }}
          onDoubleClick={() => onOpen(r.item.path)}
          style={{
            position: 'absolute', left: r.x, top: r.y, width: Math.max(1, r.w), height: Math.max(1, r.h),
            border: '1px solid #0b1020',
            background: r.item.isDir ? 'linear-gradient(180deg, rgba(255,200,0,0.18), rgba(255,140,0,0.18))' : 'linear-gradient(180deg, rgba(106,160,255,0.15), rgba(56,211,159,0.15))',
            overflow: 'hidden'
          }}
        >
          <div style={{ fontSize: 11, padding: 4, color: '#e6eefc', textShadow: '0 1px 1px rgba(0,0,0,0.8)' }}>
            {r.item.name} - {human(r.item.size)}
          </div>
        </div>
      ))}
    </div>
  );
}
