import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeVars = {
  bg: string; panel: string; muted: string; fg: string; accent: string; accent2: string; danger: string;
};

const defaultTheme: ThemeVars = {
  bg: '#0b1220', panel: '#121a2b', muted: '#93a4c0', fg: '#e6eefc', accent: '#6aa0ff', accent2: '#38d39f', danger: '#ff5566',
};

type ThemeContextType = {
  theme: ThemeVars;
  setTheme: (t: ThemeVars) => void;
  apply: () => void;
  preset: string;
  setPreset: (p: string) => void;
};

const ThemeCtx = createContext<ThemeContextType | null>(null);

function applyCssVars(t: ThemeVars) {
  const root = document.documentElement;
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--panel', t.panel);
  root.style.setProperty('--muted', t.muted);
  root.style.setProperty('--fg', t.fg);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-2', t.accent2);
  root.style.setProperty('--danger', t.danger);
}

const PRESETS: Record<string, ThemeVars> = {
  Dark: defaultTheme,
  Light: { bg: '#f7f9fc', panel: '#ffffff', muted: '#64748b', fg: '#0f172a', accent: '#2563eb', accent2: '#10b981', danger: '#ef4444' },
  Solarized: { bg: '#002b36', panel: '#073642', muted: '#93a1a1', fg: '#eee8d5', accent: '#268bd2', accent2: '#2aa198', danger: '#dc322f' },
  Nord: { bg: '#2e3440', panel: '#3b4252', muted: '#88c0d0', fg: '#e5e9f0', accent: '#81a1c1', accent2: '#a3be8c', danger: '#bf616a' },
  Dracula: { bg: '#282a36', panel: '#1f2130', muted: '#bd93f9', fg: '#f8f8f2', accent: '#50fa7b', accent2: '#8be9fd', danger: '#ff5555' },
  OneDark: { bg: '#21252b', panel: '#282c34', muted: '#9da5b4', fg: '#e6e6e6', accent: '#61afef', accent2: '#98c379', danger: '#e06c75' },
  Gruvbox: { bg: '#282828', panel: '#3c3836', muted: '#bdae93', fg: '#ebdbb2', accent: '#fabd2f', accent2: '#b8bb26', danger: '#fb4934' },
  Catppuccin: { bg: '#1e1e2e', panel: '#181825', muted: '#b4befe', fg: '#cdd6f4', accent: '#89b4fa', accent2: '#a6e3a1', danger: '#f38ba8' },
};

const LS_KEY_THEME = 'starflux.theme';
const LS_KEY_PRESET = 'starflux.themePreset';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeVars>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_THEME) || ''); } catch { return defaultTheme; }
  });
  const [preset, setPreset] = useState<string>(() => localStorage.getItem(LS_KEY_PRESET) || 'Dark');

  useEffect(() => { applyCssVars(theme); }, [theme]);
  useEffect(() => { try { localStorage.setItem(LS_KEY_THEME, JSON.stringify(theme)); } catch {} }, [theme]);
  useEffect(() => { try { localStorage.setItem(LS_KEY_PRESET, preset); } catch {} }, [preset]);

  const apply = () => applyCssVars(theme);

  const value = useMemo(() => ({ theme, setTheme, apply, preset, setPreset }), [theme, preset]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('ThemeProvider missing');
  return ctx;
}

export function getPreset(name: string): ThemeVars {
  return PRESETS[name] || defaultTheme;
}

export const THEME_PRESETS = Object.keys(PRESETS);
