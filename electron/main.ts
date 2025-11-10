import { app, BrowserWindow, ipcMain, globalShortcut, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { clipboard, nativeImage } from 'electron';

const isDev = !!process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function getPreloadPath() {
  // dist/main/main.js -> ../preload/preload.js
  return path.join(__dirname, '../preload/preload.js');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#111827',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => (mainWindow = null));

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const fileIndex = path.join(__dirname, '../renderer/index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  if (isDev) {
    // If dev but env var missing, still try dev server first, then file.
    try {
      await mainWindow.loadURL(devUrl);
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      return;
    } catch {}
  }

  await mainWindow.loadFile(fileIndex);
}

// Notes storage (Markdown files under userData/notes)
const notesDir = () => path.join(app.getPath('userData'), 'notes');

async function ensureNotesDir() {
  const dir = notesDir();
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

type NoteMeta = { id: string; title: string; updatedAt: number };

async function listNotes(): Promise<NoteMeta[]> {
  await ensureNotesDir();
  const dir = notesDir();
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.html')));
  const byId = new Map<string, { name: string; stat: { mtimeMs: number } }>();
  for (const e of files) {
    const id = e.name.replace(/\.(md|html)$/i, '');
    const full = path.join(dir, e.name);
    const stat = await fs.stat(full);
    const prev = byId.get(id);
    if (!prev || stat.mtimeMs > prev.stat.mtimeMs) byId.set(id, { name: e.name, stat });
  }
  const notes = await Promise.all(
    Array.from(byId.entries()).map(async ([id, info]) => {
      const full = path.join(dir, info.name);
      const content = await fs.readFile(full, 'utf8');
      let title = 'Untitled';
      if (info.name.endsWith('.html')) {
        const m = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (m) {
          title = m[1].replace(/<[^>]+>/g, '').trim() || 'Untitled';
        } else {
          title = content.replace(/<[^>]+>/g, ' ').split(/\s+/).slice(0, 8).join(' ').trim() || 'Untitled';
        }
      } else {
        title = (content.split(/\r?\n/).find((l) => l.trim().length > 0) || 'Untitled').replace(/^#\s*/, '');
      }
      return { id, title, updatedAt: info.stat.mtimeMs } as NoteMeta;
    })
  );
  // Sort desc by updatedAt
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  return notes;
}

async function getNote(id: string): Promise<{ id: string; content: string } | null> {
  const fileHtml = path.join(notesDir(), `${id}.html`);
  const fileMd = path.join(notesDir(), `${id}.md`);
  const file = existsSync(fileHtml) ? fileHtml : existsSync(fileMd) ? fileMd : null;
  if (!file) return null;
  const content = await fs.readFile(file, 'utf8');
  return { id, content };
}

async function saveNote(payload: { id?: string; content: string }): Promise<{ id: string }> {
  await ensureNotesDir();
  const id = payload.id || randomUUID();
  const file = path.join(notesDir(), `${id}.html`);
  await fs.writeFile(file, payload.content ?? '', 'utf8');
  return { id };
}

async function deleteNote(id: string): Promise<boolean> {
  const fileHtml = path.join(notesDir(), `${id}.html`);
  const fileMd = path.join(notesDir(), `${id}.md`);
  let removed = false;
  if (existsSync(fileHtml)) { await fs.unlink(fileHtml); removed = true; }
  if (existsSync(fileMd)) { await fs.unlink(fileMd); removed = true; }
  return removed;
}

// Shortcuts storage
const shortcutsFile = () => path.join(app.getPath('userData'), 'shortcuts.json');
type Shortcut = { id: string; accelerator: string; action: string };
let shortcuts: Shortcut[] = [];
// Launchers storage
const launchersFile = () => path.join(app.getPath('userData'), 'launchers.json');
type Launcher = { id: string; name: string; kind: 'url' | 'path'; target: string };
let launchers: Launcher[] = [];

async function loadShortcuts() {
  const file = shortcutsFile();
  try {
    const raw = await fs.readFile(file, 'utf8');
    shortcuts = JSON.parse(raw);
  } catch {
    shortcuts = [];
  }
}

async function saveShortcuts() {
  const file = shortcutsFile();
  await fs.writeFile(file, JSON.stringify(shortcuts, null, 2), 'utf8');
}

function registerAllShortcuts() {
  if (!mainWindow) return;
  for (const sc of shortcuts) {
    try {
      globalShortcut.register(sc.accelerator, () => {
        // Handle built-in/open actions
        if (sc.action === 'show-command-palette') {
          mainWindow?.webContents.send('shortcuts:fired', { id: sc.id, action: sc.action });
          return;
        }
        if (sc.action === 'focus-notes') {
          mainWindow?.webContents.send('shortcuts:fired', { id: sc.id, action: sc.action });
          return;
        }
        if (sc.action.startsWith('open-url:')) {
          const url = sc.action.slice('open-url:'.length);
          shell.openExternal(url);
          return;
        }
        if (sc.action.startsWith('open-path:')) {
          const p = sc.action.slice('open-path:'.length);
          shell.openPath(p);
          return;
        }
        if (sc.action.startsWith('launcher:')) {
          const id = sc.action.slice('launcher:'.length);
          const l = launchers.find((x) => x.id === id);
          if (l) {
            if (l.kind === 'url') shell.openExternal(l.target);
            else shell.openPath(l.target);
          }
          return;
        }
        // Fallback: notify renderer
        mainWindow?.webContents.send('shortcuts:fired', { id: sc.id, action: sc.action });
      });
    } catch {
      // ignore invalid accelerators
    }
  }
}

function unregisterAllShortcuts() {
  globalShortcut.unregisterAll();
}

app.on('ready', async () => {
  await createWindow();
  await loadShortcuts();
  await loadLaunchers();
  registerAllShortcuts();
});

app.on('will-quit', () => {
  unregisterAllShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC wiring
ipcMain.handle('notes:list', async () => listNotes());
ipcMain.handle('notes:get', async (_e, id: string) => getNote(id));
ipcMain.handle('notes:save', async (_e, payload: { id?: string; content: string }) => saveNote(payload));
ipcMain.handle('notes:delete', async (_e, id: string) => deleteNote(id));

ipcMain.handle('shortcuts:list', async () => shortcuts);
ipcMain.handle('shortcuts:register', async (_e, payload: { accelerator: string; action: string }) => {
  const sc: Shortcut = { id: randomUUID(), ...payload };
  shortcuts.push(sc);
  await saveShortcuts();
  unregisterAllShortcuts();
  registerAllShortcuts();
  return sc;
});
ipcMain.handle('shortcuts:unregister', async (_e, id: string) => {
  shortcuts = shortcuts.filter((s) => s.id !== id);
  await saveShortcuts();
  unregisterAllShortcuts();
  registerAllShortcuts();
  return true;
});
ipcMain.handle('shortcuts:clear', async () => {
  shortcuts = [];
  await saveShortcuts();
  unregisterAllShortcuts();
  return true;
});

ipcMain.on('openExternal', (_e, target: string) => {
  shell.openExternal(target);
});
ipcMain.on('openPath', (_e, p: string) => {
  shell.openPath(p);
});

// Paths utility
ipcMain.handle('paths:get', async (_e, key: 'downloads' | 'userData') => {
  return app.getPath(key);
});

// YouTube (yt-dlp) integration
type YtDownloadReq = {
  url: string;
  format: 'mp3' | 'mp4';
  outputDir: string;
  ytDlpPath?: string;
  ffmpegPath?: string;
  singleOnly?: boolean; // add --no-playlist
  maxDownloads?: number; // add --max-downloads N
};

const ytProcs = new Map<string, import('node:child_process').ChildProcess>();

function resolveYtDlpPath(custom?: string) {
  if (custom && existsSync(custom)) return custom;
  // Try common local locations first (project root / app path)
  const candidates: string[] = [];
  const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  try {
    candidates.push(path.join(process.cwd(), binName));
  } catch {}
  try {
    candidates.push(path.join(app.getAppPath(), binName));
  } catch {}
  for (const c of candidates) {
    try { if (existsSync(c)) return c; } catch {}
  }
  // Fallback to PATH resolution by name
  return binName;
}

ipcMain.handle('yt:check', async (_e, ytDlpPath?: string) => {
  return new Promise<{ ok: boolean; version?: string; error?: string }>((resolve) => {
    try {
      const bin = resolveYtDlpPath(ytDlpPath);
      const p = spawn(bin, ['--version']);
      let out = '';
      let err = '';
      p.stdout.on('data', (d) => (out += String(d)));
      p.stderr.on('data', (d) => (err += String(d)));
      p.on('error', (e) => resolve({ ok: false, error: e.message }));
      p.on('close', (code) => {
        if (code === 0) resolve({ ok: true, version: out.trim() });
        else resolve({ ok: false, error: err.trim() || `exit ${code}` });
      });
    } catch (e: any) {
      resolve({ ok: false, error: e?.message || 'unknown error' });
    }
  });
});

ipcMain.handle('yt:download', async (_e, req: YtDownloadReq) => {
  const id = randomUUID();
  const bin = resolveYtDlpPath(req.ytDlpPath);
  const args: string[] = [];
  if (req.format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3');
  } else if (req.format === 'mp4') {
    args.push('-f', 'mp4');
  }
  if (req.singleOnly) {
    args.push('--no-playlist');
  }
  if (typeof req.maxDownloads === 'number' && req.maxDownloads > 0) {
    args.push('--max-downloads', String(req.maxDownloads));
  }
  if (req.ffmpegPath && req.ffmpegPath.trim().length > 0) {
    args.push('--ffmpeg-location', req.ffmpegPath);
  }
  // Output template to chosen dir
  const template = path.join(req.outputDir, '%(title)s.%(ext)s');
  args.push('-o', template, req.url);

  const win = mainWindow;
  if (!win) throw new Error('No window');

  const proc = spawn(bin, args, { windowsHide: true });
  ytProcs.set(id, proc);
  const send = (payload: any) => win.webContents.send('yt:progress', { id, ...payload });
  proc.stdout.on('data', (d) => {
    const text = String(d);
    // try to parse percentage
    const m = text.match(/\[download\]\s+(\d+\.?\d*)%/);
    send({ text, percent: m ? parseFloat(m[1]) : undefined });
  });
  proc.stderr.on('data', (d) => send({ text: String(d) }));
  return await new Promise<{ id: string; success: boolean; code: number | null }>((resolve) => {
    proc.on('close', (code) => {
      send({ done: true, code });
      ytProcs.delete(id);
      resolve({ id, success: code === 0, code });
    });
    proc.on('error', (e) => {
      send({ error: e.message });
      ytProcs.delete(id);
      resolve({ id, success: false, code: null });
    });
  });
});

ipcMain.handle('yt:kill', async (_e, id: string) => {
  const proc = ytProcs.get(id);
  if (!proc) return false;
  try {
    // Try graceful first
    proc.kill();
    setTimeout(() => {
      if (!proc.killed) {
        try {
          if (process.platform === 'win32' && proc.pid) {
            spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F']);
          }
        } catch {}
      }
    }, 500);
    return true;
  } catch {
    return false;
  } finally {
    ytProcs.delete(id);
  }
});

ipcMain.handle('dialog:pickDir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// Launchers IPC
async function loadLaunchers() {
  const file = launchersFile();
  try {
    const raw = await fs.readFile(file, 'utf8');
    launchers = JSON.parse(raw);
  } catch {
    launchers = [];
  }
}

async function saveLaunchers() {
  await fs.writeFile(launchersFile(), JSON.stringify(launchers, null, 2), 'utf8');
}

ipcMain.handle('launchers:list', async () => launchers);
ipcMain.handle('launchers:add', async (_e, payload: { name: string; kind: 'url' | 'path'; target: string }) => {
  const item: Launcher = { id: randomUUID(), ...payload };
  launchers.push(item);
  await saveLaunchers();
  return item;
});
ipcMain.handle('launchers:remove', async (_e, id: string) => {
  launchers = launchers.filter((x) => x.id !== id);
  await saveLaunchers();
  return true;
});
ipcMain.handle('launchers:open', async (_e, id: string) => {
  const l = launchers.find((x) => x.id === id);
  if (!l) return false;
  if (l.kind === 'url') await shell.openExternal(l.target);
  else await shell.openPath(l.target);
  return true;
});
// Binary locator (ffmpeg, etc.)
ipcMain.handle('bin:locate', async (_e, bin: string) => {
  return await new Promise<string | null>((resolve) => {
    try {
      const cmd = process.platform === 'win32' ? 'where' : 'which';
      const p = spawn(cmd, [bin], { windowsHide: true });
      let out = '';
      p.stdout.on('data', (d) => (out += String(d)));
      p.on('error', () => resolve(null));
      p.on('close', (code) => {
        if (code === 0) {
          const first = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
          resolve(first || null);
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
});
// Disk usage scan (simplified SpaceSniffer-like)
type DuOptions = { root: string; maxEntries?: number; minSizeBytes?: number };
type DuEntry = { path: string; name: string; size: number; isDir: boolean; children?: DuEntry[] };

async function duScan(opts: DuOptions): Promise<DuEntry> {
  const maxEntries = Math.max(1, Math.min(200000, opts.maxEntries ?? 200000));
  const minSizeBytes = Math.max(0, opts.minSizeBytes ?? 0);
  let budget = maxEntries;
  let filesScanned = 0;
  let dirsScanned = 0;
  let bytesTotal = 0;
  let lastEmit = Date.now();
  function emitProgress(hint?: string) {
    const now = Date.now();
    if (!mainWindow) return;
    if (hint || now - lastEmit > 200) {
      lastEmit = now;
      mainWindow.webContents.send('du:progress', {
        files: filesScanned,
        dirs: dirsScanned,
        bytes: bytesTotal,
        hint,
      });
    }
  }

  async function statSafe(p: string) {
    try { return await fs.stat(p); } catch { return null; }
  }

  async function walk(dir: string): Promise<DuEntry> {
    const st = await statSafe(dir);
    const node: DuEntry = { path: dir, name: path.basename(dir) || dir, size: 0, isDir: !!st?.isDirectory() };
    if (!st) return node;
    if (!st.isDirectory()) { node.size = st.size; filesScanned++; bytesTotal += st.size; emitProgress(); return node; }
    let total = 0;
    let children: DuEntry[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          const child = await walk(p);
          total += child.size;
          dirsScanned++;
          if (budget > 0) { children.push(child); budget--; }
        } else {
          const stc = await statSafe(p);
          const sz = stc?.size || 0;
          total += sz;
          filesScanned++;
          bytesTotal += sz;
          if (sz >= minSizeBytes && budget > 0) { children.push({ path: p, name: e.name, size: sz, isDir: false }); budget--; }
        }
        emitProgress(dir);
      }
    } catch {
      // ignore permission errors
    }
    children.sort((a, b) => b.size - a.size);
    node.children = children;
    node.size = total;
    return node;
  }

  const result = await walk(opts.root);
  emitProgress('done');
  return result;
}

ipcMain.handle('du:scan', async (_e, opts: DuOptions) => duScan(opts));

// Image holder storage
const imagesDir = () => path.join(app.getPath('userData'), 'images');
async function ensureImagesDir() {
  const dir = imagesDir();
  if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
}
function safeExtFromDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,/i);
  if (!m) return '.png';
  const subtype = m[2].toLowerCase();
  if (subtype === 'jpeg') return '.jpg';
  return `.${subtype}`;
}
ipcMain.handle('images:list', async () => {
  await ensureImagesDir();
  const dir = imagesDir();
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const items = await Promise.all(entries.filter(e => e.isFile()).map(async (e) => {
    const p = path.join(dir, e.name);
    const st = await fs.stat(p);
    return { id: path.parse(e.name).name, name: e.name, path: p, size: st.size, addedAt: st.mtimeMs };
  }));
  items.sort((a, b) => b.addedAt - a.addedAt);
  return items;
});
ipcMain.handle('images:addDataUrl', async (_e, payload: { name?: string; dataUrl: string }) => {
  await ensureImagesDir();
  const ext = safeExtFromDataUrl(payload.dataUrl);
  const id = randomUUID();
  const file = path.join(imagesDir(), `${id}${ext}`);
  const b64 = payload.dataUrl.split(',')[1] || '';
  const buf = Buffer.from(b64, 'base64');
  await fs.writeFile(file, buf);
  const st = await fs.stat(file);
  return { id, name: path.basename(file), size: st.size, addedAt: st.mtimeMs };
});
ipcMain.handle('images:addCopy', async (_e, srcPath: string) => {
  await ensureImagesDir();
  const ext = path.extname(srcPath) || '.png';
  const id = randomUUID();
  const dest = path.join(imagesDir(), `${id}${ext}`);
  await fs.copyFile(srcPath, dest);
  const st = await fs.stat(dest);
  return { id, name: path.basename(dest), size: st.size, addedAt: st.mtimeMs };
});
ipcMain.handle('images:delete', async (_e, id: string) => {
  const dir = imagesDir();
  const matches = (await fs.readdir(dir)).filter(n => n.startsWith(id + '.'));
  for (const n of matches) {
    const p = path.join(dir, n);
    try { await fs.unlink(p); } catch {}
  }
  return true;
});
ipcMain.handle('images:getPath', async (_e, id: string) => {
  const dir = imagesDir();
  const n = (await fs.readdir(dir)).find(n => n.startsWith(id + '.'));
  return n ? path.join(dir, n) : null;
});
function mimeFromExt(p: string) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}
ipcMain.handle('images:getDataUrl', async (_e, id: string) => {
  const dir = imagesDir();
  const n = (await fs.readdir(dir)).find(n => n.startsWith(id + '.'));
  if (!n) return null;
  const full = path.join(dir, n);
  try {
    const buf = await fs.readFile(full);
    const mime = mimeFromExt(full);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
});
ipcMain.handle('images:copyToClipboard', async (_e, id: string) => {
  const p = await ipcMain.emit; // no-op to satisfy linter
  const dir = imagesDir();
  const n = (await fs.readdir(dir)).find(n => n.startsWith(id + '.'));
  if (!n) return false;
  const full = path.join(dir, n);
  try {
    const img = nativeImage.createFromPath(full);
    clipboard.writeImage(img);
    return true;
  } catch { return false; }
});
ipcMain.handle('images:saveAs', async (_e, id: string) => {
  const dir = imagesDir();
  const n = (await fs.readdir(dir)).find(n => n.startsWith(id + '.'));
  if (!n) return false;
  const full = path.join(dir, n);
  const res = await dialog.showSaveDialog({ defaultPath: n });
  if (res.canceled || !res.filePath) return false;
  await fs.copyFile(full, res.filePath);
  return true;
});

ipcMain.handle('images:addByUrl', async (_e, url: string) => {
  await ensureImagesDir();
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    let ext = '.png';
    if (ct.includes('jpeg')) ext = '.jpg';
    else if (ct.includes('png')) ext = '.png';
    else if (ct.includes('webp')) ext = '.webp';
    else if (ct.includes('gif')) ext = '.gif';
    const id = randomUUID();
    const file = path.join(imagesDir(), `${id}${ext}`);
    await fs.writeFile(file, buf);
    const st = await fs.stat(file);
    return { id, name: path.basename(file), size: st.size, addedAt: st.mtimeMs };
  } catch (e) {
    throw new Error(`download failed: ${(e as Error).message}`);
  }
});

