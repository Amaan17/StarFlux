StarFlux — Developer Productivity Desktop App (Electron)

This repo contains an Electron + Vite + React TypeScript app that hosts a toolbox of developer/productivity utilities behind a sidebar and command palette.

Included tools in the MVP:
- Text Compare: Side-by-side text diff.
- Notes: Markdown notes stored locally under the app data directory.
- Global Shortcuts: Register OS-level accelerators to trigger app actions.

Tech stack
- Electron (main, preload with secure IPC)
- Vite + React + TypeScript (renderer)
- Esbuild for main/preload bundling

Getting started
1) Install dependencies
   - Node.js 18+
   - Run: `npm install`

2) Start in development
   - `npm run dev`
   - This runs Vite (renderer) and esbuild watch (main/preload), then launches Electron.

3) Build production
   - `npm run build`
   - Then run packaged app via `npm run start:prod` (loads built index.html)

Data locations
- Notes are stored as Markdown files under: `<userData>/notes` (OS-specific Electron `app.getPath('userData')`).
- Shortcuts are stored in `<userData>/shortcuts.json`.

Security
- Renderer runs with `contextIsolation: true`, `nodeIntegration: false`.
- Only a minimal, validated IPC surface is exposed via `preload`.

Roadmap (suggested)
- Add HTTP client, JSON tools, clipboard history, image optimizer, QR tools, and optional YouTube (yt-dlp) integration with explicit user-provided binary.

License
- Private/Unlicensed by default — add your preferred license if needed.
