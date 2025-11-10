import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BridgeStatus } from './components/BridgeStatus';
import { Dashboard } from './tools/dashboard';
import { ThemeProvider } from './state/theme';
import { Customizer } from './components/Customizer';

export default function App() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const off = window.api?.shortcuts?.onFired
      ? window.api.shortcuts.onFired(({ action }) => {
          setToast(`Shortcut action: ${action}`);
          setTimeout(() => setToast(null), 2000);
        })
      : () => {};
    return () => {
      off();
    };
  }, []);

  return (
    <ThemeProvider>
      <div className="app" style={{ gridTemplateColumns: '1fr' }}>
        <main className="content">
          <React.Suspense fallback={<div className="panel">Loading…</div>}>
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          </React.Suspense>
        </main>
        <Customizer />
        {toast && <div className="toast">{toast}</div>}
        <BridgeStatus />
      </div>
    </ThemeProvider>
  );
}
