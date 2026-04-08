import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'educonnect-digital-vision-board-notes-v1';
const IMAGE_STORAGE_KEY = 'educonnect-digital-vision-board-images-v1';
const THEME_STORAGE_KEY = 'educonnect-digital-vision-board-theme-v1';
const NOTE_WIDTH = 270;
const NOTE_MIN_HEIGHT = 220;
const IMAGE_WIDTH = 280;

const NOTE_COLORS = [
  '#FFF8A6',
  '#FFD3E2',
  '#CFFAFE',
  '#DCFCE7',
  '#E9D5FF',
  '#FED7AA',
  '#E2E8F0',
  '#FDE68A',
];

const createNote = (x = 30, y = 30) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: 'New Dream',
  body: 'Type your vision here...',
  color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
  x,
  y,
  isEditing: true,
  z: Date.now(),
});

const createImageItem = (src, name, x = 40, y = 40) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  src,
  name,
  x,
  y,
  z: Date.now(),
});

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read selected image file.'));
    reader.readAsDataURL(file);
  });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const defaultNotes = [
  {
    ...createNote(60, 120),
    title: 'Become Top Performer',
    body: 'Score above 85% this semester and complete all Kuppi sessions.',
    color: '#FFF8A6',
    isEditing: false,
  },
  {
    ...createNote(380, 90),
    title: 'Build Confidence',
    body: 'Ask 2 meaningful questions in every live class this month.',
    color: '#CFFAFE',
    isEditing: false,
  },
  {
    ...createNote(180, 360),
    title: 'Health + Study Balance',
    body: 'Sleep 7h daily and maintain a 90-minute deep study block each day.',
    color: '#DCFCE7',
    isEditing: false,
  },
];

const loadStoredArray = (key) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const loadStoredTheme = () => {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
  } catch {
    localStorage.removeItem(THEME_STORAGE_KEY);
    return 'dark';
  }
};

export default function VisionBoard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const boardRef = useRef(null);
  const boardCanvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const noteElementRefs = useRef({});
  const imageElementRefs = useRef({});
  const dragRef = useRef({
    noteId: null,
    itemType: 'note',
    pointerOffsetX: 0,
    pointerOffsetY: 0,
    dragging: false,
  });

  const [notes, setNotes] = useState(() => loadStoredArray(STORAGE_KEY) || defaultNotes);
  const [images, setImages] = useState(() => loadStoredArray(IMAGE_STORAGE_KEY) || []);
  const [themeMode, setThemeMode] = useState(() => loadStoredTheme());
  const [boardHeight, setBoardHeight] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const isDarkMode = themeMode === 'dark';
  const theme = isDarkMode
    ? {
        pageBackground:
          'radial-gradient(circle at 12% 8%, rgba(56, 189, 248, 0.28), transparent 38%), radial-gradient(circle at 88% 0%, rgba(168, 85, 247, 0.24), transparent 40%), linear-gradient(180deg, #0f172a, #111827 42%, #1e293b)',
        pageText: '#f8fafc',
        titleColor: '#ffffff',
        titleShadow: '0 1px 0 rgba(2, 6, 23, 0.7), 0 0 18px rgba(125, 211, 252, 0.2)',
        subtitle: '#cbd5e1',
        headerBorder: '1px solid rgba(148, 163, 184, 0.28)',
        headerBackground: 'linear-gradient(135deg, rgba(15, 23, 42, 0.76), rgba(30, 41, 59, 0.66))',
        boardBorder: '1px solid rgba(148, 163, 184, 0.26)',
        boardBackground: 'linear-gradient(145deg, rgba(2, 6, 23, 0.72), rgba(15, 23, 42, 0.6))',
        imageCardBackground: 'rgba(15, 23, 42, 0.8)',
        imageCardBorder: '1px solid rgba(148, 163, 184, 0.34)',
        imageCardText: '#e2e8f0',
        imagePreviewBackground: '#020617',
        controlBackground: 'rgba(15, 23, 42, 0.65)',
        controlText: '#e2e8f0',
        controlBorder: '1px solid rgba(148, 163, 184, 0.4)',
        modeButtonBackground: 'rgba(34, 197, 94, 0.2)',
        modeButtonText: '#dcfce7',
        modeButtonBorder: '1px solid rgba(134, 239, 172, 0.5)',
        pdfBackground: '#0f172a',
      }
    : {
        pageBackground:
          'radial-gradient(circle at 12% 8%, rgba(14, 165, 233, 0.16), transparent 40%), radial-gradient(circle at 88% 0%, rgba(244, 114, 182, 0.2), transparent 42%), linear-gradient(180deg, #f8fafc, #eef2ff 44%, #e2e8f0)',
        pageText: '#0f172a',
        titleColor: '#0f172a',
        titleShadow: 'none',
        subtitle: '#334155',
        headerBorder: '1px solid rgba(15, 23, 42, 0.15)',
        headerBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(241, 245, 249, 0.92))',
        boardBorder: '1px solid rgba(15, 23, 42, 0.18)',
        boardBackground: 'linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(226, 232, 240, 0.92))',
        imageCardBackground: 'rgba(255, 255, 255, 0.95)',
        imageCardBorder: '1px solid rgba(15, 23, 42, 0.2)',
        imageCardText: '#0f172a',
        imagePreviewBackground: '#f8fafc',
        controlBackground: 'rgba(226, 232, 240, 0.86)',
        controlText: '#0f172a',
        controlBorder: '1px solid rgba(15, 23, 42, 0.2)',
        modeButtonBackground: 'rgba(14, 116, 144, 0.18)',
        modeButtonText: '#0c4a6e',
        modeButtonBorder: '1px solid rgba(14, 116, 144, 0.35)',
        pdfBackground: '#f8fafc',
      };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images));
  }, [images]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!boardRef.current) return;

    const viewportHeight = boardRef.current.clientHeight;
    const farthestNoteEdge = notes.reduce((max, note) => {
      const noteEl = noteElementRefs.current[note.id];
      const noteHeight = noteEl?.offsetHeight || NOTE_MIN_HEIGHT;
      return Math.max(max, note.y + noteHeight);
    }, 0);

    const farthestImageEdge = images.reduce((max, image) => {
      const imageEl = imageElementRefs.current[image.id];
      const imageHeight = imageEl?.offsetHeight || 220;
      return Math.max(max, image.y + imageHeight);
    }, 0);

    const requiredHeight = Math.max(viewportHeight, farthestNoteEdge, farthestImageEdge) + 120;
    setBoardHeight((prev) => (prev === requiredHeight ? prev : requiredHeight));
  }, [notes, images]);

  useEffect(() => {
    const onMouseMove = (event) => {
      if (!dragRef.current.dragging || !dragRef.current.noteId || !boardRef.current || !boardCanvasRef.current) return;

      const viewportEl = boardRef.current;
      const canvasEl = boardCanvasRef.current;
      const viewportRect = viewportEl.getBoundingClientRect();
      const isImage = dragRef.current.itemType === 'image';
      const itemEl = isImage
        ? imageElementRefs.current[dragRef.current.noteId]
        : noteElementRefs.current[dragRef.current.noteId];
      const itemWidth = itemEl?.offsetWidth || (isImage ? IMAGE_WIDTH : NOTE_WIDTH);
      const itemHeight = itemEl?.offsetHeight || (isImage ? 220 : NOTE_MIN_HEIGHT);

      // Auto-scroll when dragging near viewport edges.
      const edgeThreshold = 72;
      const pointerYInViewport = event.clientY - viewportRect.top;
      let scrollDelta = 0;

      if (pointerYInViewport < edgeThreshold) {
        scrollDelta = -Math.ceil((edgeThreshold - pointerYInViewport) / 6) - 2;
      } else if (pointerYInViewport > viewportEl.clientHeight - edgeThreshold) {
        scrollDelta = Math.ceil((pointerYInViewport - (viewportEl.clientHeight - edgeThreshold)) / 6) + 2;
      }

      if (scrollDelta !== 0) {
        const maxScrollTop = Math.max(0, canvasEl.scrollHeight - viewportEl.clientHeight);
        const nextScrollTop = clamp(viewportEl.scrollTop + scrollDelta, 0, maxScrollTop);
        viewportEl.scrollTop = nextScrollTop;
      }

      const x = event.clientX - viewportRect.left - dragRef.current.pointerOffsetX;
      const y = event.clientY - viewportRect.top - dragRef.current.pointerOffsetY + viewportEl.scrollTop;

      const maxX = Math.max(0, viewportEl.clientWidth - itemWidth);
      const requiredHeight = y + itemHeight + 120;
      setBoardHeight((prev) => (requiredHeight > prev ? requiredHeight : prev));

      if (isImage) {
        setImages((prev) =>
          prev.map((image) =>
            image.id === dragRef.current.noteId
              ? {
                  ...image,
                  x: clamp(x, 0, maxX),
                  y: Math.max(0, y),
                }
              : image
          )
        );
      } else {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === dragRef.current.noteId
              ? {
                  ...note,
                  x: clamp(x, 0, maxX),
                  y: Math.max(0, y),
                }
              : note
          )
        );
      }
    };

    const onMouseUp = () => {
      dragRef.current.dragging = false;
      dragRef.current.noteId = null;
      dragRef.current.itemType = 'note';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const bringToFront = (noteId, itemType = 'note') => {
    const z = Date.now();
    if (itemType === 'image') {
      setImages((prev) => prev.map((image) => (image.id === noteId ? { ...image, z } : image)));
      return;
    }
    setNotes((prev) => prev.map((note) => (note.id === noteId ? { ...note, z } : note)));
  };

  const startDragging = (event, noteId, itemType = 'note') => {
    if (!boardRef.current) return;

    const target = event.target;
    if (target && target.closest('[data-no-drag="true"]')) return;

    const itemEl = itemType === 'image'
      ? imageElementRefs.current[noteId]
      : noteElementRefs.current[noteId];
    if (!itemEl) return;

    const noteRect = itemEl.getBoundingClientRect();
    dragRef.current.noteId = noteId;
    dragRef.current.itemType = itemType;
    dragRef.current.dragging = true;
    dragRef.current.pointerOffsetX = event.clientX - noteRect.left;
    dragRef.current.pointerOffsetY = event.clientY - noteRect.top;

    document.body.style.userSelect = 'none';
    bringToFront(noteId, itemType);
  };

  const handleAddNote = () => {
    const viewportEl = boardRef.current;
    const canvasEl = boardCanvasRef.current;
    const baseX = viewportEl ? viewportEl.clientWidth / 2 - NOTE_WIDTH / 2 : 30;
    const baseY = viewportEl
      ? viewportEl.scrollTop + viewportEl.clientHeight / 2 - NOTE_MIN_HEIGHT / 2
      : 30;

    const jitterX = Math.random() * 120 - 60;
    const jitterY = Math.random() * 80 - 40;

    const maxX = Math.max(0, (canvasEl?.offsetWidth || NOTE_WIDTH) - NOTE_WIDTH);
    const note = createNote(clamp(baseX + jitterX, 0, maxX), Math.max(0, baseY + jitterY));
    setNotes((prev) => [...prev, note]);
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const deleteImage = (id) => {
    setImages((prev) => prev.filter((image) => image.id !== id));
  };

  const updateNote = (id, patch) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...patch } : note)));
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const viewportEl = boardRef.current;
    const canvasWidth = boardCanvasRef.current?.offsetWidth || IMAGE_WIDTH;
    const baseX = viewportEl ? viewportEl.clientWidth / 2 - IMAGE_WIDTH / 2 : 40;
    const baseY = viewportEl ? viewportEl.scrollTop + 70 : 40;
    const maxX = Math.max(0, canvasWidth - IMAGE_WIDTH);

    const mappedImages = await Promise.all(
      files.map(async (file, index) => {
        const src = await fileToDataUrl(file);
        const jitterX = Math.random() * 120 - 60;
        const y = Math.max(0, baseY + index * 28);
        const x = clamp(baseX + jitterX, 0, maxX);
        return createImageItem(src, file.name, x, y);
      })
    );

    setImages((prev) => [...prev, ...mappedImages]);
    event.target.value = '';
  };

  const handleDownloadPdf = async () => {
    if (!boardCanvasRef.current || exportingPdf) return;

    setExportingPdf(true);
    try {
      const canvas = await html2canvas(boardCanvasRef.current, {
        useCORS: true,
        backgroundColor: theme.pdfBackground,
        scale: Math.max(2, window.devicePixelRatio || 1),
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const scaledImageHeight = (canvas.height * usableWidth) / canvas.width;
      let heightLeft = scaledImageHeight;
      let y = margin;

      pdf.addImage(imgData, 'PNG', margin, y, usableWidth, scaledImageHeight, undefined, 'FAST');
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        y = heightLeft - scaledImageHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, y, usableWidth, scaledImageHeight, undefined, 'FAST');
        heightLeft -= usableHeight;
      }

      pdf.save('vision-board.pdf');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleBackToDashboard = () => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'student') {
      navigate('/student-dashboard');
      return;
    }
    navigate('/');
  };

  return (
    <div
      className="vision-board-shell"
      style={{
        ...styles.pageShell,
        background: theme.pageBackground,
        color: theme.pageText,
      }}
    >
      <style>{responsiveCss}</style>

      <div
        className="vision-board-header"
        style={{
          ...styles.headerWrap,
          border: theme.headerBorder,
          background: theme.headerBackground,
        }}
      >
        <div>
          <h1 className="vision-board-title" style={{ ...styles.title, color: theme.titleColor, textShadow: theme.titleShadow }}>Digital Vision Board</h1>
          <p style={{ ...styles.subtitle, color: theme.subtitle }}>Drag your goals, color your energy, and keep your ambition in motion.</p>
        </div>
        <div style={styles.headerControls}>
          <button
            style={{
              ...styles.backBtn,
              background: theme.controlBackground,
              color: theme.controlText,
              border: theme.controlBorder,
            }}
            onClick={handleBackToDashboard}
          >
            {'<- Dashboard'}
          </button>
          <button
            style={{
              ...styles.modeBtn,
              background: theme.modeButtonBackground,
              color: theme.modeButtonText,
              border: theme.modeButtonBorder,
            }}
            onClick={handleToggleTheme}
          >
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button style={styles.downloadBtn} onClick={handleDownloadPdf} disabled={exportingPdf}>
            {exportingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            style={{
              ...styles.uploadBtn,
              background: theme.controlBackground,
              color: theme.controlText,
              border: theme.controlBorder,
            }}
            onClick={() => imageInputRef.current?.click()}
          >
            Add Images
          </button>
          <div style={styles.headerPill}>Notes: {notes.length} | Images: {images.length}</div>
          <input
            ref={imageInputRef}
            data-no-drag="true"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={styles.hiddenInput}
          />
        </div>
      </div>

      <div
        ref={boardRef}
        className="vision-board-area"
        style={{
          ...styles.boardViewport,
          border: theme.boardBorder,
          background: theme.boardBackground,
        }}
      >
        <div
          ref={boardCanvasRef}
          style={{
            ...styles.boardCanvas,
            minHeight: boardHeight || '100%',
          }}
        >
          <div style={styles.boardTexture} />

          {images.map((image) => (
            <article
              key={image.id}
              className="vision-image"
              ref={(el) => {
                if (el) imageElementRefs.current[image.id] = el;
              }}
              style={{
                ...styles.imageCard,
                background: theme.imageCardBackground,
                border: theme.imageCardBorder,
                color: theme.imageCardText,
                left: image.x,
                top: image.y,
                zIndex: image.z,
              }}
              onMouseDown={(event) => startDragging(event, image.id, 'image')}
              onClick={() => bringToFront(image.id, 'image')}
              title="Drag image"
            >
              <div style={styles.noteTopBar}>
                <div style={styles.dragHint}>Drag</div>
                <button
                  data-no-drag="true"
                  style={{ ...styles.smallAction, ...styles.deleteBtn }}
                  onClick={() => deleteImage(image.id)}
                >
                  Delete
                </button>
              </div>
              <div style={{ ...styles.imagePreviewWrap, background: theme.imagePreviewBackground }}>
                <img src={image.src} alt={image.name} style={styles.imagePreview} draggable={false} />
              </div>
            </article>
          ))}

          {notes.map((note) => (
            <article
              key={note.id}
              className="vision-note"
              ref={(el) => {
                if (el) noteElementRefs.current[note.id] = el;
              }}
              style={{
                ...styles.note,
                background: note.color,
                left: note.x,
                top: note.y,
                zIndex: note.z,
              }}
              onMouseDown={(event) => startDragging(event, note.id, 'note')}
              onClick={() => bringToFront(note.id, 'note')}
              title="Drag me"
            >
              <div style={styles.noteTopBar}>
                <div style={styles.dragHint}>Drag</div>
                <div style={styles.noteActions}>
                  <button
                    data-no-drag="true"
                    style={styles.smallAction}
                    onClick={() => updateNote(note.id, { isEditing: !note.isEditing })}
                  >
                    {note.isEditing ? 'Save' : 'Edit'}
                  </button>
                  <button
                    data-no-drag="true"
                    style={{ ...styles.smallAction, ...styles.deleteBtn }}
                    onClick={() => deleteNote(note.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {note.isEditing ? (
                <>
                  <input
                    data-no-drag="true"
                    style={styles.titleInput}
                    value={note.title}
                    onChange={(e) => updateNote(note.id, { title: e.target.value })}
                    placeholder="Note title"
                  />
                  <textarea
                    data-no-drag="true"
                    style={styles.bodyInput}
                    value={note.body}
                    onChange={(e) => updateNote(note.id, { body: e.target.value })}
                    placeholder="Write your note..."
                  />
                </>
              ) : (
                <>
                  <h3 style={styles.noteTitle}>{note.title || 'Untitled'}</h3>
                  <p style={styles.noteBody}>{note.body || 'No text yet.'}</p>
                </>
              )}

              <div data-no-drag="true" style={styles.paletteRow}>
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color}
                    data-no-drag="true"
                    onClick={() => updateNote(note.id, { color })}
                    style={{
                      ...styles.colorDot,
                      background: color,
                      border: note.color === color ? '2px solid #0f172a' : '2px solid rgba(15, 23, 42, 0.2)',
                    }}
                    title="Change color"
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <button className="vision-fab" style={styles.fab} onClick={handleAddNote} title="Add new note">
        +
      </button>
    </div>
  );
}

const responsiveCss = `
  @media (max-width: 900px) {
    .vision-note {
      width: 240px !important;
    }

    .vision-image {
      width: 240px !important;
    }
  }

  @media (max-width: 640px) {
    .vision-board-shell {
      padding: 16px !important;
    }

    .vision-board-header {
      gap: 10px !important;
      padding: 16px !important;
    }

    .vision-board-title {
      font-size: 26px !important;
    }

    .vision-board-area {
      min-height: 70vh !important;
    }

    .vision-note {
      width: 220px !important;
    }

    .vision-image {
      width: 220px !important;
    }

    .vision-fab {
      width: 58px !important;
      height: 58px !important;
      font-size: 34px !important;
      right: 20px !important;
      bottom: 20px !important;
    }
  }
`;

const styles = {
  pageShell: {
    minHeight: '100vh',
    padding: 24,
    background:
      'radial-gradient(circle at 12% 8%, rgba(56, 189, 248, 0.28), transparent 38%), radial-gradient(circle at 88% 0%, rgba(168, 85, 247, 0.24), transparent 40%), linear-gradient(180deg, #0f172a, #111827 42%, #1e293b)',
    color: '#f8fafc',
    position: 'relative',
  },
  headerWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 18,
    border: '1px solid rgba(148, 163, 184, 0.28)',
    borderRadius: 18,
    padding: 20,
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.76), rgba(30, 41, 59, 0.66))',
    backdropFilter: 'blur(4px)',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#cbd5e1',
    fontSize: 14,
  },
  headerPill: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #38bdf8, #a855f7)',
    color: '#f8fafc',
    fontWeight: 700,
    fontSize: 13,
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  uploadBtn: {
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.65)',
    color: '#e2e8f0',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  modeBtn: {
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  backBtn: {
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  downloadBtn: {
    border: '1px solid rgba(125, 211, 252, 0.55)',
    background: 'rgba(3, 105, 161, 0.5)',
    color: '#e0f2fe',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  hiddenInput: {
    display: 'none',
  },
  boardViewport: {
    position: 'relative',
    height: '74vh',
    borderRadius: 24,
    border: '1px solid rgba(148, 163, 184, 0.26)',
    background: 'linear-gradient(145deg, rgba(2, 6, 23, 0.72), rgba(15, 23, 42, 0.6))',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.35)',
  },
  boardCanvas: {
    position: 'relative',
    minHeight: '100%',
  },
  boardTexture: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)',
    backgroundSize: '34px 34px',
    pointerEvents: 'none',
  },
  note: {
    position: 'absolute',
    width: NOTE_WIDTH,
    minHeight: NOTE_MIN_HEIGHT,
    borderRadius: 14,
    border: '1px solid rgba(15, 23, 42, 0.22)',
    boxShadow: '0 16px 28px rgba(0, 0, 0, 0.22)',
    padding: 12,
    color: '#0f172a',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transform: 'rotate(-0.6deg)',
  },
  imageCard: {
    position: 'absolute',
    width: IMAGE_WIDTH,
    borderRadius: 14,
    border: '1px solid rgba(148, 163, 184, 0.34)',
    boxShadow: '0 16px 28px rgba(0, 0, 0, 0.26)',
    background: 'rgba(15, 23, 42, 0.8)',
    padding: 10,
    color: '#e2e8f0',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  imagePreviewWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: '#020617',
  },
  imagePreview: {
    display: 'block',
    width: '100%',
    maxHeight: 260,
    objectFit: 'cover',
  },
  noteTopBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dragHint: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(15, 23, 42, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  noteActions: {
    display: 'flex',
    gap: 6,
  },
  smallAction: {
    border: '1px solid rgba(15, 23, 42, 0.28)',
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#0f172a',
    borderRadius: 8,
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  deleteBtn: {
    color: '#b91c1c',
    borderColor: 'rgba(185, 28, 28, 0.34)',
  },
  titleInput: {
    width: '100%',
    borderRadius: 10,
    border: '1px solid rgba(15, 23, 42, 0.24)',
    padding: '8px 9px',
    fontSize: 15,
    fontWeight: 800,
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#0f172a',
    outline: 'none',
  },
  bodyInput: {
    width: '100%',
    minHeight: 90,
    borderRadius: 10,
    border: '1px solid rgba(15, 23, 42, 0.24)',
    padding: 10,
    fontSize: 14,
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#1e293b',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
  },
  noteTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    wordBreak: 'break-word',
  },
  noteBody: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: '#1f2937',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    flex: 1,
  },
  paletteRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 'auto',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
  },
  fab: {
    position: 'fixed',
    right: 28,
    bottom: 28,
    width: 66,
    height: 66,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: 38,
    lineHeight: 1,
    color: '#fff',
    background: 'linear-gradient(135deg, #2563eb, #9333ea)',
    boxShadow: '0 14px 30px rgba(37, 99, 235, 0.45)',
    zIndex: 50,
  },
};