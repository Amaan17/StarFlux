export {};

declare global {
  interface Window {
    api: {
      notes: {
        list: () => Promise<{ id: string; title: string; updatedAt: number }[]>;
        get: (id: string) => Promise<{ id: string; content: string } | null>;
        save: (payload: { id?: string; content: string }) => Promise<{ id: string }>;
        delete: (id: string) => Promise<boolean>;
      };
      shortcuts: {
        list: () => Promise<{ id: string; accelerator: string; action: string }[]>;
        register: (
          payload: { accelerator: string; action: string }
        ) => Promise<{ id: string; accelerator: string; action: string }>;
        unregister: (id: string) => Promise<boolean>;
        clear: () => Promise<boolean>;
        onFired: (cb: (data: { id: string; action: string }) => void) => () => void;
      };
      openExternal: (url: string) => void;
      openPath: (p: string) => void;
      paths: {
        get: (key: 'downloads' | 'userData') => Promise<string>;
      };
      dialog: {
        pickDir: () => Promise<string | null>;
      };
      bin: {
        locate: (name: string) => Promise<string | null>;
      };
      du: {
        scan: (opts: { root: string; maxEntries?: number; minSizeBytes?: number }) => Promise<{ path: string; name: string; size: number; isDir: boolean; children?: any[] }>;
        onProgress: (cb: (p: { files: number; dirs: number; bytes: number; hint?: string }) => void) => () => void;
        onReset: (cb: () => void) => () => void;
        onChild: (cb: (child: { path: string; name: string; size: number; isDir: boolean }) => void) => () => void;
      };
      yt: {
        check: (ytDlpPath?: string) => Promise<{ ok: boolean; version?: string; error?: string }>;
        download: (req: { url: string; format: 'mp3' | 'mp4'; outputDir: string; ytDlpPath?: string; ffmpegPath?: string; singleOnly?: boolean; maxDownloads?: number }) => Promise<{ id: string; success: boolean; code: number | null }>;
        kill: (id: string) => Promise<boolean>;
        onProgress: (
          cb: (e: { id: string; text?: string; percent?: number; done?: boolean; code?: number; error?: string }) => void
        ) => () => void;
      };
      launchers: {
        list: () => Promise<{ id: string; name: string; kind: 'url' | 'path'; target: string }[]>;
        add: (p: { name: string; kind: 'url' | 'path'; target: string }) => Promise<{ id: string; name: string; kind: 'url' | 'path'; target: string }>;
        remove: (id: string) => Promise<boolean>;
        open: (id: string) => Promise<boolean>;
      };
      images: {
        list: () => Promise<{ id: string; name: string; path: string; size: number; addedAt: number }[]>;
        addDataUrl: (payload: { name?: string; dataUrl: string }) => Promise<any>;
        addCopy: (srcPath: string) => Promise<any>;
        addByUrl: (url: string) => Promise<any>;
        remove: (id: string) => Promise<boolean>;
        getPath: (id: string) => Promise<string | null>;
        getDataUrl: (id: string) => Promise<string | null>;
        copyToClipboard: (id: string) => Promise<boolean>;
        saveAs: (id: string) => Promise<boolean>;
      };
      capture: {
        getPrimaryScreenSourceId: () => Promise<string | null>;
        listScreens: () => Promise<{ id: string; name: string; displayId: string | null; thumbnail: string | null }[]>;
      };
    };
  }
}
