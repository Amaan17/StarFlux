import React, { useEffect, useMemo, useState } from 'react';

function hexFromRgb(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function ColorPicker() {
  const [hex, setHex] = useState('#6AA0FF');
  const [rgb, setRgb] = useState('106, 160, 255');
  const [hsl, setHsl] = useState('');
  const [supported, setSupported] = useState<boolean>(false);
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('starflux.colors') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    setSupported(typeof (window as any).EyeDropper === 'function');
    // init HSL from hex
    updateAllFromHex(hex);
  }, []);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const parseHex = (h: string) => {
    const m = h.replace('#', '').trim();
    if (m.length === 3) {
      const r = parseInt(m[0] + m[0], 16);
      const g = parseInt(m[1] + m[1], 16);
      const b = parseInt(m[2] + m[2], 16);
      return { r, g, b };
    }
    if (m.length === 6) {
      const r = parseInt(m.slice(0, 2), 16);
      const g = parseInt(m.slice(2, 4), 16);
      const b = parseInt(m.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  };

  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  }

  function updateAllFromHex(h: string) {
    const parsed = parseHex(h);
    if (!parsed) return;
    setHex(hexFromRgb(parsed.r, parsed.g, parsed.b));
    setRgb(`${parsed.r}, ${parsed.g}, ${parsed.b}`);
    setHsl(rgbToHsl(parsed.r, parsed.g, parsed.b));
  }

  function saveCurrent() {
    const value = hex.toUpperCase();
    setSaved((prev) => {
      const arr = [value, ...prev.filter((c) => c.toUpperCase() !== value)].slice(0, 24);
      try { localStorage.setItem('starflux.colors', JSON.stringify(arr)); } catch {}
      return arr;
    });
  }

  function removeSaved(value: string) {
    setSaved((prev) => {
      const arr = prev.filter((c) => c.toUpperCase() !== value.toUpperCase());
      try { localStorage.setItem('starflux.colors', JSON.stringify(arr)); } catch {}
      return arr;
    });
  }

  const pick = async () => {
    if (!(window as any).EyeDropper) return;
    try {
      const eye = new (window as any).EyeDropper();
      const res = await eye.open();
      if (res?.sRGBHex) { updateAllFromHex(res.sRGBHex); setTimeout(saveCurrent, 0); }
    } catch {}
  };

  const [overlay, setOverlay] = useState<{ stream?: MediaStream } | null>(null);
  const [screens, setScreens] = useState<{ id: string; name: string; displayId: string | null; thumbnail: string | null }[]>([]);
  const [screenId, setScreenId] = useState<string | null>(null);
  const startCaptureWithSource = async (sourceId: string) => {
    try {
      const stream: MediaStream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            minHeight: 720,
            maxWidth: 8000,
            maxHeight: 8000,
          },
        },
      });
      setOverlay({ stream });
    } catch (e) {
      console.error('desktop capture failed', e);
    }
  };

  const startScreenPick = async () => {
    try {
      // Try native display capture first (prompts user on supported OS)
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false });
        if (stream) { setOverlay({ stream }); return; }
      } catch (e) {
        // ignore and try desktopCapturer
      }
      const list = await (window as any).api?.capture?.listScreens?.();
      if (Array.isArray(list) && list.length > 1) {
        setScreens(list);
        setScreenId(list[0].id);
        return; // user will click a screen tile to start capture
      }
      const fallbackId = (list && list[0]?.id) || (await (window as any).api?.capture?.getPrimaryScreenSourceId?.());
      if (fallbackId) {
        await startCaptureWithSource(fallbackId);
        return;
      }
      console.warn('No screen sources available for capture');
    } catch (e) {
      console.error('Screen pick failed', e);
    }
  };
  const stopOverlay = () => {
    overlay?.stream?.getTracks().forEach(t => t.stop());
    setOverlay(null);
  };

  return (
    <div className="panel">
      <h3>Color Picker</h3>
      <div className="row" style={{ alignItems: 'center' }}>
        <div style={{ width: 28, height: 28, background: hex, borderRadius: 6, border: '1px solid #1e293b' }} />
        <input value={hex} onChange={(e) => updateAllFromHex(e.target.value)} style={{ width: 120 }} />
        <button onClick={() => copy(hex)}>Copy HEX</button>
        <input value={rgb} onChange={(e) => setRgb(e.target.value)} style={{ width: 150 }} />
        <button onClick={() => copy(`rgb(${rgb})`)}>Copy RGB</button>
        <input value={hsl} onChange={(e) => setHsl(e.target.value)} style={{ width: 150 }} />
        <button onClick={() => copy(`hsl(${hsl})`)}>Copy HSL</button>
        <input type="color" value={hex} onChange={(e) => updateAllFromHex(e.target.value)} />
        <button className="primary" onClick={pick} disabled={!supported}>Pick (EyeDropper)</button>
        <button onClick={startScreenPick}>Pick (Screen Capture)</button>
        <button onClick={saveCurrent}>Save</button>
      </div>
      {!supported && (
        <div style={{ fontSize: 12, color: '#93a4c0', marginTop: 8 }}>
          EyeDropper API not available; use the color input.
        </div>
      )}
      {saved.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#93a4c0', marginBottom: 6 }}>Saved Colors</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
            {saved.map((c) => (
              <div key={c} className="panel" style={{ padding: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, background: c, borderRadius: 4, border: '1px solid #1e293b' }} />
                  <div style={{ fontSize: 12 }}>{c}</div>
                </div>
                <div className="row" style={{ marginTop: 6, gap: 6 }}>
                  <button onClick={() => { updateAllFromHex(c); }}>Use</button>
                  <button onClick={() => copy(c)}>Copy</button>
                  <button className="danger" onClick={() => removeSaved(c)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {overlay && (
        <ScreenOverlay stream={overlay.stream!} onPick={(hex) => { updateAllFromHex(hex); saveCurrent(); stopOverlay(); }} onClose={stopOverlay} />
      )}
      {!overlay && screens.length > 1 && (
        <div className="panel" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#93a4c0', marginBottom: 6 }}>Select screen to capture</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {screens.map(s => (
              <div key={s.id} className={`panel`} style={{ padding: 6, cursor: 'pointer', borderColor: s.id === screenId ? 'var(--accent)' : undefined }} onClick={() => { setScreenId(s.id); startCaptureWithSource(s.id); }}>
                {s.thumbnail ? <img src={s.thumbnail} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ height: 100 }} />}
                <div style={{ fontSize: 12, marginTop: 4 }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScreenOverlay({ stream, onPick, onClose }: { stream: MediaStream; onPick: (hex: string) => void; onClose: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stream]);
  const onClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current!;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const sx = Math.round((x / rect.width) * canvas.width);
    const sy = Math.round((y / rect.height) * canvas.height);
    const data = ctx.getImageData(sx, sy, 1, 1).data;
    const hex = `#${[data[0], data[1], data[2]].map(v => v.toString(16).padStart(2,'0')).join('')}`.toUpperCase();
    onPick(hex);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 80 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '90vw', height: '80vh', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }} onClick={(e) => { e.stopPropagation(); onClick(e); }}>
          <video ref={videoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'crosshair' }} />
        </div>
      </div>
    </div>
  );
}
