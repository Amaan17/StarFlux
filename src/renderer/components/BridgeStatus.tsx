import React, { useEffect, useState } from 'react';

type BridgeState = {
  api: boolean;
  notes: boolean;
  shortcuts: boolean;
  paths: boolean;
  dialog: boolean;
  yt: boolean;
  launchers: boolean;
};

function readState(): BridgeState {
  const api: any = (window as any).api;
  return {
    api: !!api,
    notes: !!api?.notes,
    shortcuts: !!api?.shortcuts,
    paths: !!api?.paths,
    dialog: !!api?.dialog,
    yt: !!api?.yt,
    launchers: !!api?.launchers,
  };
}

export function BridgeStatus() {
  const [state, setState] = useState<BridgeState>(() => readState());

  useEffect(() => {
    const id = setInterval(() => setState(readState()), 1000);
    return () => clearInterval(id);
  }, []);

  const allOk = Object.values(state).every(Boolean);
  const missing = Object.entries(state)
    .filter(([k, v]) => !v)
    .map(([k]) => k)
    .filter((k) => k !== 'api');

  return (
    <div className="status-chip" title={missing.length ? `Missing: ${missing.join(', ')}` : 'All bridges OK'}>
      <span className={`dot ${allOk ? 'ok' : 'bad'}`} />
      <span>{`Bridge: ${allOk ? 'Ready' : 'Partial'}`}</span>
      <button className="link" onClick={() => window.location.reload()} style={{ marginLeft: 8 }}>Reload</button>
    </div>
  );
}

