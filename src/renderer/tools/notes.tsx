import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

type NoteMeta = { id: string; title: string; updatedAt: number };

export function Notes() {
  const [list, setList] = useState<NoteMeta[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ autolink: false, openOnClick: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: 'Start typing…' }),
    ],
    content,
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
  });

  const activeTitle = useMemo(() => {
    const m = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (m) return m[1].replace(/<[^>]+>/g, '').trim();
    const text = content.replace(/<[^>]+>/g, ' ').trim();
    return text.split(/\s+/).slice(0, 8).join(' ') || 'Untitled';
  }, [content]);

  const reload = async () => {
    const items = await window.api.notes.list();
    setList(items);
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (active !== null) {
        setSaving(true);
        const html = editor?.getHTML() ?? content;
        const { id } = await window.api.notes.save({ id: active, content: html });
        setSaving(false);
        if (id !== active) setActive(id);
        reload();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [content, active]);

  const createNew = async () => {
    const tpl = '<h1>New Note</h1><p></p>';
    const { id } = await window.api.notes.save({ content: tpl });
    setActive(id);
    setContent(tpl);
    editor?.commands.setContent(tpl);
    reload();
  };

  const loadNote = async (id: string) => {
    setActive(id);
    const n = await window.api.notes.get(id);
    const html = n?.content ?? '';
    setContent(html);
    editor?.commands.setContent(html);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await window.api.notes.delete(id);
    if (active === id) { setActive(null); setContent(''); editor?.commands.clearContent(); }
    reload();
  };

  return (
    <div className="panel">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>Notes</h3>
        <div style={{ fontSize: 12, color: '#93a4c0' }}>{saving ? 'Saving…' : ''}</div>
      </div>
      <div className="split" style={{ minHeight: 420 }}>
        <div className="col">
          <div className="row gap-sm">
            <button className="primary" onClick={createNew}>New</button>
            <button onClick={reload}>Refresh</button>
          </div>
          <div className="list" style={{ marginTop: 8 }}>
            {list.map((n) => (
              <div key={n.id} className="list-item" onClick={() => loadNote(n.id)} style={{ cursor: 'pointer' }}>
                <div>
                  <div>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#93a4c0' }}>{new Date(n.updatedAt).toLocaleString()}</div>
                </div>
                <div>
                  <button className="danger" onClick={(e) => { e.stopPropagation(); remove(n.id); }}>Delete</button>
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="list-item">No notes yet.</div>}
          </div>
        </div>
        <div className="col">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <label>Editor</label>
            <div style={{ fontSize: 12, color: '#93a4c0' }}>{active ? activeTitle : 'No note selected'}</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
            <button onClick={() => editor?.chain().focus().toggleUnderline().run()}>Underline</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
            <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
            <button onClick={() => {
              const sel = window.getSelection();
              let r: Range | null = null;
              if (sel && sel.rangeCount > 0) r = sel.getRangeAt(0).cloneRange();
              setSavedRange(r);
              setLinkUrl('https://');
              setLinkOpen(true);
            }}>Link</button>
            <button onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().setParagraph().run()}>Clear</button>
          </div>
          <div className="rt-editor" style={{ minHeight: 360 }}>
            <EditorContent editor={editor} />
          </div>

          <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Insert Link">
            <div className="col" style={{ gap: 8 }}>
              <input autoFocus placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setLinkOpen(false)}>Cancel</button>
                <button className="primary" onClick={() => {
                  if (!linkUrl) { setLinkOpen(false); return; }
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  if (savedRange) sel?.addRange(savedRange);
                  editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl, target: '_blank', rel: 'noopener noreferrer' }).run();
                  setContent(editor?.getHTML() || '');
                  setLinkOpen(false);
                }}>Insert</button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}

