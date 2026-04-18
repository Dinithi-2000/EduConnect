import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import NotificationBell from '../../components/NotificationBell';
import { buildStudentSidebarItems } from '../../utils/studentSidebar';
import { getMyContactMessages, submitContactMessage } from '../../services/contactService';
import { API_URL } from '../../services/api';
import '../StudentDashboard.css';
import './StudentContactUs.css';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'doc', 'docx', 'txt', 'ppt', 'pptx'];

const StudentContactUs = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebarItems = buildStudentSidebarItems('Contact Us', () => setChatOpenSignal((prev) => prev + 1));

  const repliedCount = useMemo(
    () => messages.filter((entry) => entry.status === 'replied').length,
    [messages]
  );
  const openCount = useMemo(
    () => messages.filter((entry) => entry.status === 'open').length,
    [messages]
  );
  const filteredMessages = useMemo(() => {
    if (historyFilter === 'all') return messages;
    return messages.filter((entry) => entry.status === historyFilter);
  }, [messages, historyFilter]);

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString();
  };

  const getAttachmentUrl = (url) => {
    const value = String(url || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${apiOrigin}${value}`;
    return `${apiOrigin}/${value}`;
  };

  const formatAttachmentSize = (size = 0) => {
    const safeSize = Number(size || 0);
    if (safeSize < 1024) return `${safeSize} B`;
    if (safeSize < 1024 * 1024) return `${(safeSize / 1024).toFixed(1)} KB`;
    return `${(safeSize / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentChange = (event) => {
    const pickedFiles = Array.from(event.target.files || []);
    if (!pickedFiles.length) return;

    const existing = [...attachments];
    const seen = new Set(existing.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
    const accepted = [];

    for (const file of pickedFiles) {
      if (existing.length + accepted.length >= MAX_ATTACHMENTS) {
        break;
      }

      const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
        setNotice('Only image files and documents (PDF, DOC/DOCX, PPT/PPTX, TXT) are allowed.');
        setNoticeType('error');
        continue;
      }

      if (Number(file.size || 0) > MAX_ATTACHMENT_SIZE) {
        setNotice('Each attachment must be 10MB or smaller.');
        setNoticeType('error');
        continue;
      }

      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue;
      seen.add(key);
      accepted.push(file);
    }

    if (accepted.length) {
      setAttachments((prev) => [...prev, ...accepted]);
      setNotice('');
      setNoticeType('success');
    }

    if (existing.length + accepted.length >= MAX_ATTACHMENTS) {
      setNotice(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
      setNoticeType('error');
    }

    event.target.value = '';
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
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

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getMyContactMessages();
      setMessages(response?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load contact history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      setNotice('Subject and message are required.');
      setNoticeType('error');
      return;
    }

    try {
      setSubmitting(true);
      setNotice('');
      setNoticeType('success');
      const response = await submitContactMessage({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        attachments,
      });

      if (response?.data) {
        setMessages((prev) => [response.data, ...prev]);
      }
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
      setAttachments([]);
      setNotice('Your message was sent to the admin team.');
      setNoticeType('success');
    } catch (err) {
      setNotice(err?.response?.data?.message || 'Failed to send your message.');
      setNoticeType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="student-v2-shell student-contact-shell">
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

      <main className="student-v2-main student-contact-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input type="text" placeholder="Search support topics..." aria-label="Search support topics" />
          </div>

          <div className="student-v2-tools">
            <button type="button" className="ghost-icon" aria-label="Theme">◐</button>
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

        <section className="student-contact-page">
          <div className="contact-hero">
            <div>
              <h1>Contact Us</h1>
              <p>Need help with courses, billing, or account issues? Send us a message and we will reply here.</p>
            </div>
            <div className="contact-hero-stats">
              <article>
                <h3>{messages.length}</h3>
                <span>Total Requests</span>
              </article>
              <article>
                <h3>{openCount}</h3>
                <span>Open</span>
              </article>
              <article>
                <h3>{repliedCount}</h3>
                <span>Replied</span>
              </article>
            </div>
          </div>

          <div className="contact-grid">
            <article className="contact-card form-card">
              <h2>New Message</h2>
              <p className="form-intro">Share what happened, where it happened, and what outcome you expect.</p>
              <form onSubmit={handleSubmit}>
                <div className="contact-row-2">
                  <label>
                    Name
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Your name"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="your@email.com"
                    />
                  </label>
                </div>
                <label>
                  Subject
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Briefly describe your issue"
                    maxLength={180}
                  />
                  <span className="field-helper">{form.subject.length}/180</span>
                </label>
                <label>
                  Message
                  <textarea
                    rows={6}
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Provide full details to help us respond quickly"
                    maxLength={5000}
                  />
                  <span className="field-helper">{form.message.length}/5000</span>
                </label>
                <label>
                  Attach Files (optional)
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentChange}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.txt,.ppt,.pptx"
                  />
                  <span className="field-helper">Up to 5 files, each max 10MB</span>
                </label>
                {attachments.length > 0 && (
                  <div className="attachment-list" role="list" aria-label="Selected attachments">
                    {attachments.map((file, index) => (
                      <div className="attachment-chip" key={`${file.name}-${file.size}-${file.lastModified}`} role="listitem">
                        <span>{file.name} ({formatAttachmentSize(file.size)})</span>
                        <button type="button" onClick={() => handleRemoveAttachment(index)} aria-label={`Remove ${file.name}`}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {notice && <p className={`contact-note ${noticeType === 'error' ? 'contact-error' : 'contact-success'}`}>{notice}</p>}
                <button type="submit" disabled={submitting || !form.subject.trim() || !form.message.trim()}>
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </article>

            <article className="contact-card history-card">
              <div className="history-title-row">
                <h2>Your Requests</h2>
                <div className="history-filter-row" role="tablist" aria-label="Filter requests">
                  <button
                    type="button"
                    className={historyFilter === 'all' ? 'active' : ''}
                    onClick={() => setHistoryFilter('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={historyFilter === 'open' ? 'active' : ''}
                    onClick={() => setHistoryFilter('open')}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={historyFilter === 'replied' ? 'active' : ''}
                    onClick={() => setHistoryFilter('replied')}
                  >
                    Replied
                  </button>
                </div>
              </div>
              {loading && <p className="contact-muted">Loading contact history...</p>}
              {!loading && error && <p className="contact-note contact-error">{error}</p>}
              {!loading && !error && filteredMessages.length === 0 && (
                <p className="contact-muted">No messages yet. Your submitted requests will appear here.</p>
              )}
              <div className="history-list">
                {filteredMessages.map((entry) => (
                  <div className="history-item" key={entry._id}>
                    <div className="history-head">
                      <h3>{entry.subject}</h3>
                      <span className={`contact-status-pill ${entry.status}`}>{entry.status}</span>
                    </div>
                    <span className="message-type-label">Your message</span>
                    <p>{entry.message}</p>
                    {Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                      <div className="history-attachments">
                        <span>Attachments</span>
                        <ul>
                          {entry.attachments.map((file, idx) => (
                            <li key={`${entry._id}-file-${idx}`}>
                              <a href={getAttachmentUrl(file.url)} target="_blank" rel="noreferrer">
                                {file.originalName || `Attachment ${idx + 1}`}
                              </a>
                              <small>{formatAttachmentSize(file.size)}</small>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <small>{formatDateTime(entry.createdAt)}</small>
                    {entry.adminReply?.message && (
                      <div className="admin-reply-box">
                        <strong>Admin Reply</strong>
                        <p>{entry.adminReply.message}</p>
                        <small>{formatDateTime(entry.adminReply.repliedAt)}</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>

      <AIChatWidget
        darkMode={false}
        studentId={user?._id || user?.id || 'guest-student'}
        context={{ currentCourse: 'Contact Us' }}
        openSignal={chatOpenSignal}
      />
    </div>
  );
};

export default StudentContactUs;
