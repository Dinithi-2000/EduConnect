import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  deleteAdminContactMessage,
  getAdminContactMessages,
  replyToContactMessage,
} from '../../services/contactService';
import { API_URL } from '../../services/api';
import './AdminContactManagement.css';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');

const AdminContactManagement = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState('');

  const selectedMessage = useMemo(
    () => messages.find((entry) => entry._id === selectedId) || null,
    [messages, selectedId]
  );

  const metrics = useMemo(() => {
    const open = messages.filter((entry) => entry.status === 'open').length;
    const replied = messages.filter((entry) => entry.status === 'replied').length;
    const withAttachment = messages.filter((entry) => Array.isArray(entry.attachments) && entry.attachments.length > 0).length;
    return { total: messages.length, open, replied, withAttachment };
  }, [messages]);

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

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAdminContactMessages({
        status: statusFilter,
        search,
        limit: 250,
      });
      const nextData = response?.data || [];
      setMessages(nextData);

      if (!nextData.length) {
        setSelectedId('');
        setReplyDraft('');
        return;
      }

      const stillSelected = nextData.some((entry) => entry._id === selectedId);
      const nextSelected = stillSelected ? selectedId : nextData[0]._id;
      setSelectedId(nextSelected);

      const selectedEntry = nextData.find((entry) => entry._id === nextSelected);
      setReplyDraft(selectedEntry?.adminReply?.message || '');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load contact messages.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedId, statusFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    loadMessages();
  }, [isAdmin, loadMessages]);

  useEffect(() => {
    if (!selectedMessage) {
      setReplyDraft('');
      return;
    }
    setReplyDraft(selectedMessage.adminReply?.message || '');
  }, [selectedMessage]);

  const handleSelectForReply = (messageId) => {
    setSelectedId(messageId);
    const replySection = document.getElementById('contact-reply-workspace');
    if (replySection) {
      replySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage) return;
    const trimmed = String(replyDraft || '').trim();
    if (!trimmed) {
      setNotice('Reply cannot be empty.');
      return;
    }

    try {
      setSending(true);
      setNotice('');
      await replyToContactMessage(selectedMessage._id, trimmed);
      setNotice('Reply sent successfully.');
      await loadMessages();
    } catch (err) {
      setNotice(err?.response?.data?.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(`Delete the message "${entry.subject}" from ${entry.name}?`);
    if (!confirmed) return;

    try {
      setDeletingId(entry._id);
      setNotice('');
      await deleteAdminContactMessage(entry._id);

      if (selectedId === entry._id) {
        setSelectedId('');
        setReplyDraft('');
      }

      setNotice('Message deleted successfully.');
      await loadMessages();
    } catch (err) {
      setNotice(err?.response?.data?.message || 'Failed to delete message.');
    } finally {
      setDeletingId('');
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout activeSection="Contact Us Management">
        <div className="admin-contact-page">
          <div className="management-card">
            <h2>Restricted Access</h2>
            <p>Only admin or teacher roles can manage contact requests.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="Contact Us Management">
      <div className="admin-contact-page">
        <section className="admin-contact-head">
          <div>
            <h1>Contact Us Management</h1>
            <p>Review student requests, reply from one workspace, or remove outdated messages.</p>
          </div>
          <div className="admin-contact-metrics">
            <article><strong>{metrics.total}</strong><span>Total</span></article>
            <article><strong>{metrics.open}</strong><span>Open</span></article>
            <article><strong>{metrics.replied}</strong><span>Replied</span></article>
            <article><strong>{metrics.withAttachment}</strong><span>With Files</span></article>
          </div>
        </section>

        <section className="admin-contact-toolbar">
          <input
            type="text"
            placeholder="Search by name, email, subject..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="replied">Replied</option>
          </select>
        </section>

        {notice && <p className="management-note">{notice}</p>}

        <section className="management-card table-card">
          <div className="card-title-row">
            <h2>Message Table</h2>
            <span>{messages.length} records</span>
          </div>

          {loading && <p className="contact-muted">Loading messages...</p>}
          {!loading && error && <p className="contact-error">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <p className="contact-muted">No contact messages found.</p>
          )}

          {!loading && !error && messages.length > 0 && (
            <div className="table-scroll-wrap">
              <table className="contact-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Attachments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((entry) => {
                    const attachmentCount = Array.isArray(entry.attachments) ? entry.attachments.length : 0;
                    const isReplied = entry.status === 'replied';
                    return (
                      <tr key={entry._id} className={entry._id === selectedId ? 'active-row' : ''}>
                        <td>
                          <button
                            type="button"
                            className="subject-link-btn"
                            onClick={() => setSelectedId(entry._id)}
                          >
                            {entry.subject}
                          </button>
                        </td>
                        <td>
                          <div className="student-cell">
                            <strong>{entry.name}</strong>
                            <small>{entry.email}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`table-status-pill ${entry.status}`}>{entry.status}</span>
                        </td>
                        <td>{formatDateTime(entry.createdAt)}</td>
                        <td>{attachmentCount}</td>
                        <td>
                          <div className="action-row">
                            <button
                              type="button"
                              className={`action-btn ${isReplied ? 'view' : 'reply'}`}
                              onClick={() => handleSelectForReply(entry._id)}
                            >
                              {isReplied ? 'View Reply' : 'Reply'}
                            </button>
                            <button
                              type="button"
                              className="action-btn delete"
                              onClick={() => handleDelete(entry)}
                              disabled={deletingId === entry._id}
                            >
                              {deletingId === entry._id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section id="contact-reply-workspace" className="management-card reply-card">
          <h2>Reply Workspace</h2>
          {!selectedMessage && <p className="contact-muted">Select a message from the table to reply.</p>}

          {selectedMessage && (
            <>
              <div className="reply-meta-grid">
                <div>
                  <span>From</span>
                  <strong>{selectedMessage.name} ({selectedMessage.email})</strong>
                </div>
                <div>
                  <span>Submitted</span>
                  <strong>{formatDateTime(selectedMessage.createdAt)}</strong>
                </div>
                <div>
                  <span>Subject</span>
                  <strong>{selectedMessage.subject}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong className="status-text">{selectedMessage.status}</strong>
                </div>
              </div>

              {Array.isArray(selectedMessage.attachments) && selectedMessage.attachments.length > 0 && (
                <div className="attachment-box">
                  <span>Student Attachments</span>
                  <ul>
                    {selectedMessage.attachments.map((file, idx) => (
                      <li key={`${selectedMessage._id}-attachment-${idx}`}>
                        <a href={getAttachmentUrl(file.url)} target="_blank" rel="noreferrer">
                          {file.originalName || `Attachment ${idx + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="message-body-box">
                <span>Student Message</span>
                <p>{selectedMessage.message}</p>
              </div>

              <label className="reply-label">
                Reply
                <textarea
                  rows={7}
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder="Type your response to the student"
                />
              </label>

              <button
                type="button"
                className="reply-btn"
                onClick={handleSendReply}
                disabled={sending || !String(replyDraft || '').trim()}
              >
                {sending
                  ? (selectedMessage?.status === 'replied' ? 'Updating Reply...' : 'Sending Reply...')
                  : (selectedMessage?.status === 'replied' ? 'Update Reply' : 'Send Reply')}
              </button>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminContactManagement;
