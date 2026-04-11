import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import AIChatWidget from '../../components/AIChatWidget';
import { buildStudentSidebarItems } from '../../utils/studentSidebar';
import { API_URL } from '../../services/api';
import { deleteStudyItem, getPublishedStudyMaterials, getStudyItems } from '../../services/studyItemService';
import '../StudentDashboard.css';
import './StudentStudyLibrary.css';

const THEME_STORAGE_KEY = 'student-theme-mode';
const API_ORIGIN = String(API_URL || '').replace(/\/api\/?$/, '');

const formatBytes = (size) => {
  const value = Number(size || 0);
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeLabel = (material) => {
  const mime = String(material?.fileMimeType || '').toLowerCase();
  const fileName = String(material?.fileName || '').toLowerCase();

  if (mime.includes('pdf') || fileName.endsWith('.pdf')) return 'PDF';
  if (mime.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'WORD';
  return 'FILE';
};

const resolveMaterialUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
};

const StudentStudyLibrary = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [items, setItems] = useState([]);
  const [adminMaterials, setAdminMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [bookmarkScope, setBookmarkScope] = useState('all');
  const [search, setSearch] = useState('');
  const [themeMode, setThemeMode] = useState(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'dark' ? 'dark' : 'light';
  });

  const isDarkMode = themeMode === 'dark';

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebarItems = buildStudentSidebarItems('Study Library', () => setChatOpenSignal((prev) => prev + 1));

  useEffect(() => {
    let mounted = true;

    const loadItems = async () => {
      try {
        setLoading(true);
        setError('');
        const [response, published] = await Promise.all([
          getStudyItems(),
          getPublishedStudyMaterials().catch(() => ({ data: [] }))
        ]);
        if (!mounted) return;
        setItems(response?.data || []);
        setAdminMaterials(published?.data || []);
      } catch {
        if (!mounted) return;
        setError('Failed to load your study materials.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadItems();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const filteredItems = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return items.filter((item) => {
      const typeOk = filterType === 'all' || item.type === filterType;
      if (!typeOk) return false;
      const scopeOk = bookmarkScope === 'all' || item.targetType === bookmarkScope;
      if (filterType === 'bookmark' && !scopeOk) return false;
      if (!q) return true;
      const haystack = `${item.title || ''} ${item.text || ''} ${item.excerpt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, filterType, bookmarkScope, search]);

  const stats = useMemo(() => {
    const note = items.filter((item) => item.type === 'note').length;
    const bookmark = items.filter((item) => item.type === 'bookmark').length;
    const highlight = items.filter((item) => item.type === 'highlight').length;
    return {
      total: items.length,
      note,
      bookmark,
      highlight
    };
  }, [items]);

  const handleDeleteItem = async (id) => {
    try {
      await deleteStudyItem(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch {
      setError('Unable to delete this study item right now.');
    }
  };

  const handleOpenBookmarkedItem = (item) => {
    if (item?.targetType === 'quiz') {
      navigate('/student/quizzes');
      return;
    }

    navigate('/student/courses', {
      state: {
        courseId: item?.courseId || null,
        moduleId: item?.moduleId || null,
        contentId: item?.contentId || null,
        openWorkspace: true
      }
    });
  };

  const getBookmarkScopeLabel = (item) => {
    const scope = String(item?.targetType || '').toLowerCase();
    if (scope === 'course') return 'Course';
    if (scope === 'module') return 'Module';
    if (scope === 'quiz') return 'Quiz';
    return 'Lesson';
  };

  const handleExportPdf = () => {
    if (!filteredItems.length) return;

    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(16);
    doc.text('My Study Library', 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Student: ${displayName}`, 14, y);
    y += 7;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 10;

    filteredItems.forEach((item, index) => {
      const header = `${index + 1}. [${String(item.type || '').toUpperCase()}] ${item.title || 'Study item'}`;
      const body = item.text || item.excerpt || '';
      const h = doc.splitTextToSize(header, 180);
      const b = doc.splitTextToSize(body, 180);

      if (y > 260) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(11);
      doc.text(h, 14, y);
      y += h.length * 5;
      doc.setFontSize(10);
      doc.text(b, 16, y);
      y += b.length * 5 + 4;
    });

    doc.save(`study-library-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSidebarAction = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    navigate(item.route);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`student-v2-shell student-library-shell ${isDarkMode ? 'theme-dark' : ''}`}>
      <aside className="student-v2-sidebar">
        <div className="student-v2-brand">
          <span className="brand-mark">E</span>
          <div className="brand-copy">
            <h1>EDUCONNECT</h1>
            <small>Academic Portal</small>
          </div>
        </div>

        <nav className="student-v2-nav" aria-label="Student navigation">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`student-v2-nav-item ${item.active ? 'active' : ''}`}
              onClick={() => handleSidebarAction(item)}
            >
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="student-v2-upgrade">
          <p>Unlock all features</p>
          <h3>Upgrade to Pro</h3>
          <button type="button" onClick={() => navigate('/student/premium')}>Upgrade Now</button>
        </div>

        <button type="button" className="student-v2-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="student-v2-main student-library-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes, bookmarks, highlights..."
              aria-label="Search study library"
            />
          </div>

          <div className="student-v2-tools">
            <button
              type="button"
              className="ghost-icon"
              aria-label="Theme"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={handleToggleTheme}
            >
              {isDarkMode ? '☀' : '◐'}
            </button>
            <NotificationBell />
            <button type="button" className="premium-pill" onClick={() => navigate('/student/premium')}>
              <span aria-hidden="true">👑</span>
              Premium
            </button>
            <div className="student-v2-profile-chip">
              <div className="student-v2-profile-text">
                <strong>{displayName}</strong>
                <small>{user?.email || 'Student account'}</small>
              </div>
              <div className="student-v2-profile-avatar">{initials}</div>
            </div>
          </div>
        </header>

        <section className="library-page">
          <div className="library-head">
            <div>
              <h1>Study Library</h1>
              <p>All your notes, bookmarks, and highlights in one place.</p>
            </div>
            <button type="button" className="export-btn" onClick={handleExportPdf} disabled={!filteredItems.length}>
              Export PDF
            </button>
          </div>

          <div className="library-stats-grid">
            <article><small>Total</small><strong>{stats.total}</strong></article>
            <article><small>Notes</small><strong>{stats.note}</strong></article>
            <article><small>Bookmarks</small><strong>{stats.bookmark}</strong></article>
            <article><small>Highlights</small><strong>{stats.highlight}</strong></article>
          </div>

          <div className="library-filter-row">
            <button type="button" className={filterType === 'all' ? 'active' : ''} onClick={() => { setFilterType('all'); setBookmarkScope('all'); }}>All</button>
            <button type="button" className={filterType === 'note' ? 'active' : ''} onClick={() => { setFilterType('note'); setBookmarkScope('all'); }}>Notes</button>
            <button type="button" className={filterType === 'bookmark' ? 'active' : ''} onClick={() => setFilterType('bookmark')}>Bookmarks</button>
            <button type="button" className={filterType === 'highlight' ? 'active' : ''} onClick={() => { setFilterType('highlight'); setBookmarkScope('all'); }}>Highlights</button>
          </div>

          {filterType === 'bookmark' ? (
            <div className="library-filter-row bookmark-scope-row">
              <button type="button" className={bookmarkScope === 'all' ? 'active' : ''} onClick={() => setBookmarkScope('all')}>All Bookmarks</button>
              <button type="button" className={bookmarkScope === 'course' ? 'active' : ''} onClick={() => setBookmarkScope('course')}>Courses</button>
              <button type="button" className={bookmarkScope === 'module' ? 'active' : ''} onClick={() => setBookmarkScope('module')}>Modules</button>
              <button type="button" className={bookmarkScope === 'content' ? 'active' : ''} onClick={() => setBookmarkScope('content')}>Lessons</button>
              <button type="button" className={bookmarkScope === 'quiz' ? 'active' : ''} onClick={() => setBookmarkScope('quiz')}>Quizzes</button>
            </div>
          ) : null}

          <div className="section-headline">
            <h2>My Saved Items</h2>
            <p>Quickly review your own notes, bookmarks, and highlights.</p>
          </div>

          {loading ? <div className="state-box">Loading study library...</div> : null}
          {!loading && error ? <div className="state-box error">{error}</div> : null}
          {!loading && !error && filteredItems.length === 0 ? <div className="state-box">No study materials found.</div> : null}

          {!loading && !error && filteredItems.length > 0 ? (
            <div className="library-list">
              {filteredItems.map((item) => (
                <article key={item._id} className="library-item-card">
                  <div className="library-item-head">
                    <span className={`type-pill ${item.type}`}>{item.type}</span>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                  <h3>{item.title || 'Study item'}</h3>
                  {item.type === 'bookmark' ? <small>Bookmarked: {getBookmarkScopeLabel(item)}</small> : null}
                  <p>{item.text || item.excerpt || 'No text available.'}</p>
                  <div className="library-item-actions">
                    {item.type === 'bookmark' ? (
                      <button type="button" className="open-item-btn" onClick={() => handleOpenBookmarkedItem(item)}>
                        Open
                      </button>
                    ) : null}
                    <button type="button" className="delete-item-btn" onClick={() => handleDeleteItem(item._id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="admin-materials-section">
            <div className="library-head admin-materials-head">
              <div>
                <h2>Admin Shared Materials</h2>
                <p>Past papers, short notes, and references added by admin.</p>
              </div>
            </div>

            {adminMaterials.length === 0 ? <div className="state-box">No admin materials published yet.</div> : null}

            {adminMaterials.length > 0 ? (
              <div className="library-list">
                {adminMaterials.map((material) => (
                  <article key={material._id} className="library-item-card admin-material-card">
                    <div className="library-item-head">
                      <span className={`type-pill ${material.materialType}`}>{material.materialType}</span>
                      <small>{new Date(material.createdAt).toLocaleString()}</small>
                    </div>
                    <h3>{material.title}</h3>
                    {material.fileUrl ? (
                      <div className="material-file-meta">
                        <span className={`file-type-pill ${getFileTypeLabel(material).toLowerCase()}`}>{getFileTypeLabel(material)}</span>
                        <span className="file-size-text">{formatBytes(material.fileSize)}</span>
                      </div>
                    ) : null}
                    <p>{material.description || 'No description provided.'}</p>
                    <div className="library-item-actions">
                      {material.linkUrl ? (
                        <button type="button" className="open-item-btn" onClick={() => window.open(material.linkUrl, '_blank', 'noopener,noreferrer')}>
                          Open Resource
                        </button>
                      ) : null}
                      {material.fileUrl ? (
                        <button
                          type="button"
                          className="open-item-btn"
                          onClick={() => window.open(resolveMaterialUrl(material.fileUrl), '_blank', 'noopener,noreferrer')}
                        >
                          Open File
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{ page: 'student-study-library' }}
          openSignal={chatOpenSignal}
        />
      </main>
    </div>
  );
};

export default StudentStudyLibrary;
