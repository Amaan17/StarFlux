import React, { useEffect, useState } from 'react';

export function Clock({ large = false, center = false }: { large?: boolean; center?: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: center ? 'center' : undefined }}>
      <div style={{ fontSize: large ? 56 : 24, fontWeight: 800, letterSpacing: large ? 1 : 0 }}>{time}</div>
      <div style={{ fontSize: large ? 14 : 12, color: '#93a4c0' }}>{date}</div>
    </div>
  );
}
