import React, { useEffect, useMemo, useState } from 'react';

type JobEvent = { id: string; text?: string; percent?: number; done?: boolean; code?: number; error?: string };

export function YouTube() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [outputDir, setOutputDir] = useState('');
  const defaultYt = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent) ? 'yt-dlp.exe' : 'yt-dlp';
  const [ytdlpPath, setYtdlpPath] = useState(defaultYt);
  const [log, setLog] = useState<string[]>([]);
  const [percent, setPercent] = useState<number | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string>('');
  const [ffmpegPath, setFfmpegPath] = useState('');
  const [singleOnly, setSingleOnly] = useState(true);
  const [capOne, setCapOne] = useState(true);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!window.api?.paths) return;
      const def = await window.api.paths.get('downloads');
      setOutputDir(def);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // Try to auto-locate ffmpeg via preload helper
      try {
        const located = await window.api?.bin?.locate?.('ffmpeg');
        if (located && !ffmpegPath) {
          // yt-dlp accepts dir or full path; if it's an exe path, keep as is.
          setFfmpegPath(located);
          return;
        }
      } catch {}
      // Fallback for Windows to your provided common path
      const isWin = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);
      if (isWin && !ffmpegPath) {
        setFfmpegPath('C:\\Program Files\\ffmpeg-master-latest-win64-gpl-shared\\bin');
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.api?.yt?.onProgress) return () => {};
    const off = window.api.yt.onProgress((e: JobEvent) => {
      if (typeof e.percent === 'number') setPercent(e.percent);
      if (e.text) setLog((l) => [...l.slice(-400), e.text.trim()]);
      if (e.done) {
        setLog((l) => [...l, `Done (code ${e.code})`]);
        setCurrentJobId(null);
      }
      if (e.error) setLog((l) => [...l, `Error: ${e.error}`]);
    });
    return () => off();
  }, []);

  const check = async () => {
    setChecking(true);
    if (!window.api?.yt) { setCheckResult('Preload bridge unavailable'); return; }
    const res = await window.api.yt.check(ytdlpPath || undefined);
    setChecking(false);
    if (res.ok) setCheckResult(`yt-dlp OK — version ${res.version}`);
    else setCheckResult(`yt-dlp not found: ${res.error ?? 'unknown error'}`);
  };

  const start = async () => {
    setLog([]);
    setPercent(undefined);
    if (!url || !outputDir) {
      setLog((l) => [...l, 'URL and Output Directory are required.']);
      return;
    }
    if (!window.api?.yt) { setLog((l) => [...l, 'Preload bridge unavailable']); return; }
    const r = await window.api.yt.download({ url, format, outputDir, ytDlpPath: ytdlpPath || undefined, ffmpegPath: ffmpegPath || undefined });
    setLog((l) => [...l, `Job ${r.id} started…`]);
  };

  const pickDefaultDownloads = async () => {
    if (!window.api?.paths) return;
    const dir = await window.api.paths.get('downloads');
    setOutputDir(dir);
  };

  const chooseFolder = async () => {
    if (!window.api?.dialog) { setLog((l) => [...l, 'Folder picker unavailable']); return; }
    const p = await window.api.dialog.pickDir();
    if (p) setOutputDir(p);
  };

  const beginDownload = async () => {
    setLog([]);
    setPercent(undefined);
    if (!url || !outputDir) {
      setLog((l) => [...l, 'URL and Output Directory are required.']);
      return;
    }
    if (!window.api?.yt) { setLog((l) => [...l, 'Preload bridge unavailable']); return; }
    const r = await window.api.yt.download({
      url,
      format,
      outputDir,
      ytDlpPath: ytdlpPath || undefined,
      ffmpegPath: ffmpegPath || undefined,
      singleOnly,
      maxDownloads: capOne ? 1 : undefined,
    });
    setCurrentJobId(r.id);
    setLog((l) => [...l, `Job ${r.id} started…`]);
  };

  return (
    <div className="panel">
      <h3>YouTube Downloader (yt-dlp)</h3>
      <div style={{ fontSize: 12, color: '#93a4c0', marginBottom: 8 }}>
        Requires yt-dlp installed and available on PATH or specify its full path below. Ensure use complies with local laws and site ToS.
      </div>
      <div className="col" style={{ gap: 8 }}>
        <input placeholder="Video/Playlist URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="row">
          <select value={format} onChange={(e) => setFormat(e.target.value as 'mp3' | 'mp4')}>
            <option value="mp3">MP3 (audio)</option>
            <option value="mp4">MP4 (video)</option>
          </select>
          <input placeholder="Output directory" value={outputDir} onChange={(e) => setOutputDir(e.target.value)} style={{ flex: 1 }} />
          <button onClick={chooseFolder}>Choose…</button>
          <button onClick={pickDefaultDownloads} disabled={!window.api?.paths}>Default Downloads</button>
        </div>
        <div className="row">
          <input placeholder="Optional yt-dlp path (leave empty to use PATH)" value={ytdlpPath} onChange={(e) => setYtdlpPath(e.target.value)} style={{ flex: 1 }} />
          <button onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Check yt-dlp'}</button>
          <div style={{ fontSize: 12, color: '#93a4c0', alignSelf: 'center' }}>{checkResult}</div>
        </div>
        <div className="row">
          <input placeholder="Optional ffmpeg path (needed for MP3)" value={ffmpegPath} onChange={(e) => setFfmpegPath(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div className="row">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={singleOnly} onChange={(e) => setSingleOnly(e.target.checked)} />
            Only this video (ignore playlists)
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={capOne} onChange={(e) => setCapOne(e.target.checked)} />
            Cap to 1 item
          </label>
        </div>
        <div className="row">
          <button className="primary" onClick={beginDownload}>Download</button>
          <button className="danger" onClick={() => (currentJobId && window.api?.yt?.kill ? window.api.yt.kill(currentJobId) : undefined)} disabled={!currentJobId}>Kill Process</button>
        </div>
        <div className="panel" style={{ maxHeight: 220, overflow: 'auto' }}>
          <div style={{ marginBottom: 6 }}>{typeof percent === 'number' ? `Progress: ${percent.toFixed(1)}%` : 'Progress: n/a'}</div>
          <pre className="diff">{log.join('\n')}</pre>
        </div>
        <div style={{ fontSize: 12, color: '#93a4c0' }}>
          Tips: On Windows, place yt-dlp.exe in a folder on PATH (or set its path above). For MP3 extraction, install ffmpeg and set its path or add it to PATH.
        </div>
      </div>
    </div>
  );
}
