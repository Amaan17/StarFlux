import React from 'react';
import { TextCompare } from './text-compare';
import { Notes } from './notes';
import { Shortcuts } from './shortcuts';
import { YouTube } from './youtube';
import { Launchers } from './launchers';
import { ColorPicker } from './color-picker';
import { Images } from './images';

export type ToolId = 'text-compare' | 'notes' | 'shortcuts' | 'youtube' | 'launchers' | 'color-picker' | 'images';

export type Tool = {
  id: ToolId;
  title: string;
  component: React.FC;
};

export const tools: Tool[] = [
  { id: 'text-compare', title: 'Text Compare', component: TextCompare },
  { id: 'notes', title: 'Notes', component: Notes },
  { id: 'shortcuts', title: 'Global Shortcuts', component: Shortcuts },
  { id: 'youtube', title: 'YouTube Downloader', component: YouTube },
  { id: 'launchers', title: 'Launchers', component: Launchers },
  { id: 'color-picker', title: 'Color Picker', component: ColorPicker },
  { id: 'images', title: 'Image Holder', component: Images },
];
