import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../services/api';
import {
  createAdminStudyMaterial,
  deleteAdminStudyMaterial,
  getAdminStudyItems,
  getPublishedStudyMaterials
} from '../../services/studyItemService';
import './AdminStudyMaterials.css';

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

const AdminStudyMaterials = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, note: 0, bookmark: 0, highlight: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [adminMaterials, setAdminMaterials] = useState([]);
  const [materialDraft, setMaterialDraft] = useState({
    title: '',
    materialType: 'past-paper',
    description: '',
    linkUrl: '',
    materialFile: null
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        setError('');
        const [response, materialResponse] = await Promise.all([
          getAdminStudyItems({ limit: 300 }),
          getPublishedStudyMaterials()
        ]);
        if (!mounted) return;
        setItems(response?.data || []);
        setSummary(response?.summary || { total: 0, note: 0, bookmark: 0, highlight: 0 });
        setAdminMaterials(materialResponse?.data || []);
      } catch {
        if (!mounted) return;
        setError('Failed to load study materials analytics.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const filteredItems = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return items.filter((item) => {
      const typeOk = typeFilter === 'all' || item.type === typeFilter;
      if (!typeOk) return false;
      if (!q) return true;

      const haystack = `${item.user?.name || ''} ${item.user?.email || ''} ${item.title || ''} ${item.text || ''} ${item.excerpt || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, typeFilter, search]);

  const handleExportCsv = () => {
    const header = ['Type', 'Student', 'Email', 'Title', 'Text', 'Created At'];
    const rows = filteredItems.map((item) => [
      item.type,
      item.user?.name || '',
      item.user?.email || '',
      item.title || '',
      item.text || item.excerpt || '',
      item.createdAt ? new Date(item.createdAt).toISOString() : ''
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `study-materials-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMaterialDraftChange = (key, value) => {
    setMaterialDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateMaterial = async () => {
    try {
      const response = await createAdminStudyMaterial(materialDraft);
      if (response?.data) {
        setAdminMaterials((prev) => [response.data, ...prev]);
      }
      setMaterialDraft({ title: '', materialType: 'past-paper', description: '', linkUrl: '', materialFile: null });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add study material.');
    }
  };

  const handleDeleteMaterial = async (id) => {
    try {
      await deleteAdminStudyMaterial(id);
      setAdminMaterials((prev) => prev.filter((item) => item._id !== id));
      setError('');
    } catch {
      setError('Failed to delete study material.');
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout activeSection="Study Materials">
        <div className="admin-study-page">
          <div className="study-state">Only admin and teacher roles can access study materials analytics.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="Study Materials">
      <div className="admin-study-page">
        <section className="admin-study-head">
          <div>
            <h1>Study Materials</h1>
            <p>Monitor notes, bookmarks, and highlights created by students.</p>
          </div>
          <button type="button" className="export-btn" onClick={handleExportCsv} disabled={!filteredItems.length}>
            Export CSV
          </button>
        </section>

        <section className="admin-material-compose">
          <div className="compose-head">
            <h2>Add Student Material</h2>
            <p>Publish past papers, short notes, and reference links for students.</p>
          </div>

          <div className="compose-grid">
            <input
              value={materialDraft.title}
              onChange={(event) => handleMaterialDraftChange('title', event.target.value)}
              placeholder="Title (e.g., 2025 A/L Biology Past Paper)"
              aria-label="Study material title"
            />

            <select
              value={materialDraft.materialType}
              onChange={(event) => handleMaterialDraftChange('materialType', event.target.value)}
              aria-label="Study material type"
            >
              <option value="past-paper">Past Paper</option>
              <option value="short-note">Short Note</option>
              <option value="reference">Reference</option>
            </select>

            <input
              value={materialDraft.linkUrl}
              onChange={(event) => handleMaterialDraftChange('linkUrl', event.target.value)}
              placeholder="Optional link URL (Google Drive, OneDrive, etc.)"
              aria-label="Study material link"
            />

            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => handleMaterialDraftChange('materialFile', event.target.files?.[0] || null)}
              aria-label="Upload PDF or Word file"
            />

            <textarea
              value={materialDraft.description}
              onChange={(event) => handleMaterialDraftChange('description', event.target.value)}
              placeholder="Short note or description..."
              rows={4}
              aria-label="Study material description"
            />

            <button type="button" className="publish-btn" onClick={handleCreateMaterial}>
              Publish Material
            </button>
          </div>

          <div className="published-materials">
            <h3>Published Materials</h3>
            {adminMaterials.length === 0 ? <div className="study-state">No published materials yet.</div> : null}
            {adminMaterials.map((material) => (
              <article key={material._id} className="published-item">
                <div>
                  <strong>{material.title}</strong>
                  <small>{String(material.materialType || '').replace('-', ' ')}</small>
                  {material.fileUrl ? (
                    <div className="material-file-meta">
                      <span className={`file-type-pill ${getFileTypeLabel(material).toLowerCase()}`}>{getFileTypeLabel(material)}</span>
                      <span className="file-size-text">{formatBytes(material.fileSize)}</span>
                    </div>
                  ) : null}
                  {material.description ? <p>{material.description}</p> : null}
                  {material.linkUrl ? <a href={material.linkUrl} target="_blank" rel="noreferrer">Open resource link</a> : null}
                  {material.fileUrl ? <a href={resolveMaterialUrl(material.fileUrl)} target="_blank" rel="noreferrer">Open uploaded file{material.fileName ? `: ${material.fileName}` : ''}</a> : null}
                </div>
                <button type="button" onClick={() => handleDeleteMaterial(material._id)}>Delete</button>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-study-metrics">
          <article><small>Total Items</small><strong>{summary.total}</strong></article>
          <article><small>Notes</small><strong>{summary.note}</strong></article>
          <article><small>Bookmarks</small><strong>{summary.bookmark}</strong></article>
          <article><small>Highlights</small><strong>{summary.highlight}</strong></article>
        </section>

        <section className="admin-study-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student, title, or content..."
            aria-label="Search study materials"
          />
          <div className="type-filters">
            <button type="button" className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All</button>
            <button type="button" className={typeFilter === 'note' ? 'active' : ''} onClick={() => setTypeFilter('note')}>Notes</button>
            <button type="button" className={typeFilter === 'bookmark' ? 'active' : ''} onClick={() => setTypeFilter('bookmark')}>Bookmarks</button>
            <button type="button" className={typeFilter === 'highlight' ? 'active' : ''} onClick={() => setTypeFilter('highlight')}>Highlights</button>
          </div>
        </section>

        {loading ? <div className="study-state">Loading study materials...</div> : null}
        {!loading && error ? <div className="study-state error">{error}</div> : null}
        {!loading && !error && filteredItems.length === 0 ? <div className="study-state">No matching study materials found.</div> : null}

        {!loading && !error && filteredItems.length > 0 ? (
          <section className="admin-study-table-wrap">
            <table className="admin-study-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Content</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.slice(0, 150).map((item) => (
                  <tr key={item._id}>
                    <td><span className={`type-pill ${item.type}`}>{item.type}</span></td>
                    <td>
                      <strong>{item.user?.name || 'Student'}</strong>
                      <small>{item.user?.email || ''}</small>
                    </td>
                    <td>{item.title || '-'}</td>
                    <td>{item.text || item.excerpt || '-'}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default AdminStudyMaterials;
