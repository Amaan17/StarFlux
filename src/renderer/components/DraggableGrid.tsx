import React, { useEffect, useMemo, useRef, useState } from 'react';

type Item = { id: string; title: string; node: React.ReactNode };

const LS_KEY_ORDER = 'starflux.layout';
const LS_KEY_CFG = 'starflux.layoutCfg';

type CardCfg = { spanX: 1 | 2 | 3; collapsed: boolean; autoHeight: boolean; heightPx?: number };

export function DraggableGrid({ items }: { items: Item[] }) {
  const initialOrder = useMemo(() => items.map((i) => i.id), [items]);
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(LS_KEY_ORDER) || '[]');
      if (!Array.isArray(saved) || saved.length === 0) return initialOrder;
      const filtered = saved.filter((id) => initialOrder.includes(id));
      const missing = initialOrder.filter((id) => !filtered.includes(id));
      return [...filtered, ...missing];
    } catch { return initialOrder; }
  });
  useEffect(() => { try { localStorage.setItem(LS_KEY_ORDER, JSON.stringify(order)); } catch {} }, [order]);

  const [cfg, setCfg] = useState<Record<string, CardCfg>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_CFG) || '') || {}; } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(LS_KEY_CFG, JSON.stringify(cfg)); } catch {} }, [cfg]);

  const updateCfg = (id: string, patch: Partial<CardCfg>) => setCfg((c) => ({ ...c, [id]: { spanX: 1, collapsed: false, autoHeight: true, ...(c[id] || {}), ...patch } }));

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const onDragStart = (id: string) => (e: React.DragEvent) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
  const onDragEnd = () => { setDragId(null); setOverId(null); };
  const onDragOver = (id: string) => (e: React.DragEvent) => { e.preventDefault(); setOverId(id); e.dataTransfer.dropEffect = 'move'; };
  const onDragEnter = (id: string) => (e: React.DragEvent) => { e.preventDefault(); setOverId(id); };
  const onDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const src = dragId || e.dataTransfer.getData('text/plain');
    if (!src || src === id) return;
    const newOrder = [...order.filter((x) => x !== src)];
    const idx = newOrder.indexOf(id);
    newOrder.splice(idx, 0, src);
    setOrder(newOrder);
    setDragId(null);
    setOverId(null);
  };

  // Masonry-like grid using CSS grid-auto-rows + JS-calculated spans
  const rowHeight = 8; // must match CSS grid-auto-rows
  const gap = 12; // must match CSS gap

  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const bodyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [spans, setSpans] = useState<Record<string, number>>({});

  const recalc = () => {
    const next: Record<string, number> = {};
    for (const id of order) {
      const el = refs.current[id];
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      const span = Math.ceil((h + gap) / (rowHeight + gap));
      next[id] = Math.max(1, span);
    }
    setSpans(next);
  };

  useEffect(() => {
    recalc();
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [order, cfg]);

  const orderedItems = order.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[];

  return (
    <div className="dashboard-grid" style={{ gridAutoRows: `${rowHeight}px` }}>
      {orderedItems.map((it) => {
        const c = { spanX: 1, collapsed: false, autoHeight: true, ...(cfg[it.id] || {}) } as CardCfg;
        const startResize = (id: string) => (e: React.PointerEvent) => {
          e.preventDefault();
          const body = bodyRefs.current[id];
          if (!body) return;
          const startY = e.clientY;
          const startH = body.getBoundingClientRect().height;
          const onMove = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            const newH = Math.max(120, startH + dy);
            updateCfg(id, { autoHeight: false, heightPx: Math.round(newH) });
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };
        const startResizeBottom = (id: string) => (e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const body = bodyRefs.current[id];
          if (!body) return;
          const startY = e.clientY;
          const startH = body.getBoundingClientRect().height;
          const onMove = (ev: PointerEvent) => {
            const dy = ev.clientY - startY;
            const newH = Math.max(120, startH + dy);
            updateCfg(id, { autoHeight: false, heightPx: Math.round(newH) });
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };

        const startResizeRight = (id: string) => (e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const sec = sectionRefs.current[id];
          if (!sec) return;
          const startX = e.clientX;
          const startW = sec.getBoundingClientRect().width;
          const current = c.spanX as number;
          const base = startW / current;
          const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            const desired = startW + dx;
            let spanX = Math.max(1, Math.min(3, Math.round(desired / base)));
            if (spanX !== c.spanX) updateCfg(id, { spanX: spanX as CardCfg['spanX'] });
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };

        const startResizeLeft = (id: string) => (e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const sec = sectionRefs.current[id];
          if (!sec) return;
          const startX = e.clientX;
          const startW = sec.getBoundingClientRect().width;
          const current = c.spanX as number;
          const base = startW / current;
          const onMove = (ev: PointerEvent) => {
            const dx = startX - ev.clientX; // dragging left increases width if moving left
            const desired = startW + dx;
            let spanX = Math.max(1, Math.min(3, Math.round(desired / base)));
            if (spanX !== c.spanX) updateCfg(id, { spanX: spanX as CardCfg['spanX'] });
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };

        return (
          <section
            key={it.id}
            className={`draggable ${dragId === it.id ? 'dragging' : ''} ${overId === it.id && dragId !== it.id ? 'over' : ''}`}
            onDragOver={onDragOver(it.id)}
            onDragEnter={onDragEnter(it.id)}
            onDrop={onDrop(it.id)}
            style={{ gridColumn: `span ${c.spanX}`, gridRowEnd: `span ${spans[it.id] || 1}` }}
            ref={(el) => (sectionRefs.current[it.id] = el)}
          >
            <div className="card">
              <div className="card-head">
                <div className="drag-handle" title="Drag" draggable onDragStart={onDragStart(it.id)} onDragEnd={onDragEnd}>≡</div>
                <div className="card-title">{it.title}</div>
                <div className="grow" />
              </div>
              <div ref={(el) => (refs.current[it.id] = el)} style={{ display: c.collapsed ? 'none' : 'block' }}>
                <div
                  className="card-body"
                  ref={(el) => (bodyRefs.current[it.id] = el)}
                  style={{ height: c.autoHeight ? undefined : (c.heightPx || 240), overflow: c.autoHeight ? 'visible' : 'auto', position: 'relative' }}
                >
                  {it.node}
                  <div className="edge edge-right" onPointerDown={startResizeRight(it.id)} />
                  <div className="edge edge-left" onPointerDown={startResizeLeft(it.id)} />
                  <div className="edge edge-bottom" onPointerDown={startResizeBottom(it.id)} onDoubleClick={() => updateCfg(it.id, { autoHeight: true, heightPx: undefined })} />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
