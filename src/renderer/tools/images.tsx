import React, { useEffect, useRef, useState } from 'react';

type ImgItem = { id: string; name: string; path: string; size: number; addedAt: number };

function human(n: number) {
  const u = ['B','KB','MB','GB']; let i=0; let v=n; while (v>=1024 && i<u.length-1){v/=1024;i++;} return `${v.toFixed(v>=10?0:1)} ${u[i]}`;
}

export function Images() {
  const [items, setItems] = useState<ImgItem[]>([]);
  const [busy, setBusy] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const reload = async () => {
    setItems(await window.api.images.list());
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const el = dropRef.current; if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect='copy'; };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault(); setBusy(true);
      try {
        const dt = e.dataTransfer!;
        // File items
        if (dt.files && dt.files.length) {
          for (const f of Array.from(dt.files)) {
            try {
              // Prefer File -> dataURL for cross-origin safety
              const buf = await f.arrayBuffer();
              const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
              const ext = (f.type || '').toLowerCase() || 'image/png';
              await window.api.images.addDataUrl({ name: f.name, dataUrl: `data:${ext};base64,${b64}` });
            } catch {}
          }
          await reload(); setBusy(false); return;
        }
        // URL items (from web) — let main process download to avoid CORS
        const url = dt.getData('text/uri-list') || dt.getData('text/plain');
        if (url && /^https?:\/\//i.test(url)) {
          try { await window.api.images.addByUrl(url.trim()); } catch {}
          await reload(); setBusy(false); return;
        }
      } finally { setBusy(false); }
    };
    el.addEventListener('dragover', onDragOver as any);
    el.addEventListener('drop', onDrop as any);
    return () => {
      el.removeEventListener('dragover', onDragOver as any);
      el.removeEventListener('drop', onDrop as any);
    };
  }, []);

  return (
    <div className="panel">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>Image Holder</h3>
        <div style={{ fontSize: 12, color: '#93a4c0' }}>{busy ? 'Processing…' : ''}</div>
      </div>
      <div ref={dropRef} style={{ border: '1px dashed #1e293b', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 10 }}>
        Drag & drop images here (files or from web)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} className="panel" style={{ padding: 8 }}>
            <Thumb id={it.id} />
            <div style={{ fontSize: 12, color: '#93a4c0', marginTop: 6 }}>{it.name} • {human(it.size)}</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <button onClick={async () => { await window.api.images.copyToClipboard(it.id); }}>Copy</button>
              <button onClick={async () => { await window.api.images.saveAs(it.id); }}>Download</button>
              <button className="danger" onClick={async () => { await window.api.images.remove(it.id); reload(); }}>Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="panel" style={{ padding: 16, textAlign: 'center' }}>No images yet.</div>}
      </div>
    </div>
  );
}

function Thumb({ id }: { id: string }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => { (async () => { const d = await window.api.images.getDataUrl(id); if (d) setSrc(d); })(); }, [id]);
  return <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 6, border: '1px solid #1e293b' }}>{src ? <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}</div>;
}
