import React, { useState } from 'react';

import { ColorPicker } from './color-picker';
import { YouTube } from './youtube';
import { Launchers } from './launchers';
import { Shortcuts } from './shortcuts';
import { Notes } from './notes';
import { TextCompare } from './text-compare';
import Space from './space';
import { Images } from './images';

import { ToolTile } from '../components/ToolTile';
import { Modal } from '../components/Modal';
import { Clock } from '../components/Clock';
import { QuickButtons } from '../components/QuickButtons';

export function Dashboard() {
  const [open, setOpen] = useState<
    | null
    | 'color'
    | 'yt'
    | 'launchers'
    | 'shortcuts'
    | 'notes'
    | 'compare'
    | 'space'
    | 'images'
  >(null);

  return (
    <>
      <div className="panel" style={{ marginBottom: 12, paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textAlign: 'center', fontWeight: 800, letterSpacing: 1 }}>StarFlux</div>
          <Clock large center />
          <div style={{ marginTop: 8 }}>
            <QuickButtons />
          </div>
        </div>
      </div>

      <div className="tiles">
        <ToolTile icon="CLR" title="Color Picker" blurb="Pick colors and copy HEX/RGB/HSL." onOpen={() => setOpen('color')} />
        <ToolTile icon="YT" title="YouTube DL" blurb="Download as MP3/MP4 with yt-dlp." onOpen={() => setOpen('yt')} />
        <ToolTile icon="LCH" title="Launchers" blurb="Open URLs and file paths; bind shortcuts." onOpen={() => setOpen('launchers')} />
        <ToolTile icon="SC" title="Shortcuts" blurb="Register OS-level accelerators for quick actions." onOpen={() => setOpen('shortcuts')} />
        <ToolTile icon="NOTE" title="Notes" blurb="Rich text notes with autosave and list view." onOpen={() => setOpen('notes')} />
        <ToolTile icon="DIFF" title="Text Compare" blurb="Compare two texts side-by-side." onOpen={() => setOpen('compare')} />
        <ToolTile icon="DISK" title="Disk Usage" blurb="Scan a folder and visualize large items." onOpen={() => setOpen('space')} />
        <ToolTile icon="IMG" title="Image Holder" blurb="Pin images; copy / download / delete." onOpen={() => setOpen('images')} />
      </div>

      <Modal open={open === 'color'} onClose={() => setOpen(null)} title="Color Picker">
        <ColorPicker />
      </Modal>
      <Modal open={open === 'yt'} onClose={() => setOpen(null)} title="YouTube Downloader">
        <YouTube />
      </Modal>
      <Modal open={open === 'launchers'} onClose={() => setOpen(null)} title="Launchers">
        <Launchers />
      </Modal>
      <Modal open={open === 'shortcuts'} onClose={() => setOpen(null)} title="Global Shortcuts">
        <Shortcuts />
      </Modal>
      <Modal open={open === 'notes'} onClose={() => setOpen(null)} title="Notes">
        <Notes />
      </Modal>
      <Modal open={open === 'compare'} onClose={() => setOpen(null)} title="Text Compare">
        <TextCompare />
      </Modal>
      <Modal open={open === 'space'} onClose={() => setOpen(null)} title="Disk Usage">
        <Space />
      </Modal>
      <Modal open={open === 'images'} onClose={() => setOpen(null)} title="Image Holder">
        <Images />
      </Modal>
    </>
  );
}
