import { contextBridge, ipcRenderer, desktopCapturer, nativeImage } from 'electron';

const api = {
  notes: {
    list: () => ipcRenderer.invoke('notes:list') as Promise<{ id: string; title: string; updatedAt: number }[]>,
    get: (id: string) => ipcRenderer.invoke('notes:get', id) as Promise<{ id: string; content: string } | null>,
    save: (payload: { id?: string; content: string }) => ipcRenderer.invoke('notes:save', payload) as Promise<{ id: string }>,
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id) as Promise<boolean>,
  },
  shortcuts: {
    list: () => ipcRenderer.invoke('shortcuts:list') as Promise<{ id: string; accelerator: string; action: string }[]>,
    register: (payload: { accelerator: string; action: string }) =>
      ipcRenderer.invoke('shortcuts:register', payload) as Promise<{ id: string; accelerator: string; action: string }>,
    unregister: (id: string) => ipcRenderer.invoke('shortcuts:unregister', id) as Promise<boolean>,
    clear: () => ipcRenderer.invoke('shortcuts:clear') as Promise<boolean>,
    onFired: (cb: (data: { id: string; action: string }) => void) => {
      const listener = (_e: unknown, data: { id: string; action: string }) => cb(data);
      ipcRenderer.on('shortcuts:fired', listener);
      return () => ipcRenderer.removeListener('shortcuts:fired', listener);
    },
  },
  openExternal: (url: string) => ipcRenderer.send('openExternal', url),
  openPath: (p: string) => ipcRenderer.send('openPath', p),
  paths: {
    get: (key: 'downloads' | 'userData') => ipcRenderer.invoke('paths:get', key) as Promise<string>,
  },
  dialog: {
    pickDir: () => ipcRenderer.invoke('dialog:pickDir') as Promise<string | null>,
  },
  bin: {
    locate: (name: string) => ipcRenderer.invoke('bin:locate', name) as Promise<string | null>,
  },
  du: {
    scan: (opts: { root: string; maxEntries?: number; minSizeBytes?: number }) =>
      ipcRenderer.invoke('du:scan', opts) as Promise<{ path: string; name: string; size: number; isDir: boolean; children?: any[] }>,
    onProgress: (cb: (p: { files: number; dirs: number; bytes: number; hint?: string }) => void) => {
      const fn = (_: unknown, data: any) => cb(data);
      ipcRenderer.on('du:progress', fn);
      return () => ipcRenderer.removeListener('du:progress', fn);
    },
    onReset: (cb: () => void) => {
      const fn = () => cb();
      ipcRenderer.on('du:reset', fn as any);
      return () => ipcRenderer.removeListener('du:reset', fn as any);
    },
    onChild: (cb: (child: { path: string; name: string; size: number; isDir: boolean }) => void) => {
      const fn = (_: unknown, data: any) => cb(data);
      ipcRenderer.on('du:child', fn);
      return () => ipcRenderer.removeListener('du:child', fn);
    },
  },
  images: {
    list: () => ipcRenderer.invoke('images:list') as Promise<{ id: string; name: string; path: string; size: number; addedAt: number }[]>,
    addDataUrl: (payload: { name?: string; dataUrl: string }) => ipcRenderer.invoke('images:addDataUrl', payload),
    addCopy: (srcPath: string) => ipcRenderer.invoke('images:addCopy', srcPath),
    addByUrl: (url: string) => ipcRenderer.invoke('images:addByUrl', url),
    remove: (id: string) => ipcRenderer.invoke('images:delete', id) as Promise<boolean>,
    getPath: (id: string) => ipcRenderer.invoke('images:getPath', id) as Promise<string | null>,
    getDataUrl: (id: string) => ipcRenderer.invoke('images:getDataUrl', id) as Promise<string | null>,
    copyToClipboard: (id: string) => ipcRenderer.invoke('images:copyToClipboard', id) as Promise<boolean>,
    saveAs: (id: string) => ipcRenderer.invoke('images:saveAs', id) as Promise<boolean>,
  },
  yt: {
    check: (ytDlpPath?: string) => ipcRenderer.invoke('yt:check', ytDlpPath) as Promise<{ ok: boolean; version?: string; error?: string }>,
    download: (req: { url: string; format: 'mp3' | 'mp4'; outputDir: string; ytDlpPath?: string; ffmpegPath?: string; singleOnly?: boolean; maxDownloads?: number }) =>
      ipcRenderer.invoke('yt:download', req) as Promise<{ id: string; success: boolean; code: number | null }>,
    kill: (id: string) => ipcRenderer.invoke('yt:kill', id) as Promise<boolean>,
    onProgress: (cb: (e: { id: string; text?: string; percent?: number; done?: boolean; code?: number; error?: string }) => void) => {
      const fn = (_: unknown, data: any) => cb(data);
      ipcRenderer.on('yt:progress', fn);
      return () => ipcRenderer.removeListener('yt:progress', fn);
    },
  },
  launchers: {
    list: () => ipcRenderer.invoke('launchers:list') as Promise<{ id: string; name: string; kind: 'url' | 'path'; target: string }[]>,
    add: (p: { name: string; kind: 'url' | 'path'; target: string }) =>
      ipcRenderer.invoke('launchers:add', p) as Promise<{ id: string; name: string; kind: 'url' | 'path'; target: string }>,
    remove: (id: string) => ipcRenderer.invoke('launchers:remove', id) as Promise<boolean>,
    open: (id: string) => ipcRenderer.invoke('launchers:open', id) as Promise<boolean>,
  },
  capture: {
    getPrimaryScreenSourceId: async () => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        return sources && sources.length > 0 ? sources[0].id : null;
      } catch {
        return null;
      }
    },
    listScreens: async () => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 400, height: 300 } });
        return sources.map(s => ({
          id: s.id,
          name: s.name,
          displayId: (s as any).display_id || null,
          thumbnail: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : null,
        }));
      } catch {
        return [] as any[];
      }
    },
  },
} as const;

declare global {
  interface Window {
    api: typeof api;
  }
}

contextBridge.exposeInMainWorld('api', api);
