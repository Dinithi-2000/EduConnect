import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import './CommunityBoard.css';
import CreatePostModal from './community/components/CreatePostModal';
import {
  approveFlaggedPost,
  flagPost,
  getAdminStats,
  getPosts,
  removePost,
  updatePost
} from '../services/communityService';
import { useAuth } from '../context/AuthContext';

const categoryMap = {
  'lost-item': 'Lost & Found',
  'found-item': 'Lost & Found',
  announcement: 'Announcements',
  event: 'Campus Events',
  'help-request': 'Support',
  'idea-tip': 'Academic Tips'
};

const CommunityBoard = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(String(user?.role || '').toLowerCase());

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [windowDays, setWindowDays] = useState(30);
  const [moderationFilter, setModerationFilter] = useState('all');
  const [editingPost, setEditingPost] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    location: '',
    contactInfo: ''
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const filters = {
        limit: 100,
        search: searchQuery || undefined
      };
      const [postsRes, statsRes] = await Promise.all([
        getPosts(filters),
        isAdmin ? getAdminStats() : Promise.resolve({ data: null })
      ]);

      setPosts(postsRes.data || []);
      setAdminStats(statsRes.data || null);
    } catch (err) {
      setError('Failed to load community data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const visiblePosts = useMemo(() => {
    if (windowDays <= 0) return posts;
    const threshold = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    return posts.filter((post) => new Date(post.createdAt).getTime() >= threshold);
  }, [posts, windowDays]);

  const pulseBars = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, idx) => {
      const day = idx + 1;
      return { label: `D${day}`, value: 0 };
    });

    visiblePosts.forEach((post) => {
      const created = new Date(post.createdAt);
      const day = created.getDate();
      const slot = (day - 1) % 12;
      base[slot].value += 1;
    });

    const max = Math.max(...base.map((item) => item.value), 1);
    return base.map((item) => ({
      ...item,
      height: Math.max(24, Math.round((item.value / max) * 100))
    }));
  }, [visiblePosts]);

  const signalMetrics = useMemo(() => {
    const flagged = adminStats?.flaggedPosts || 0;
    const active = adminStats?.activePosts || 0;
    const postsPerDay = visiblePosts.length / Math.max(windowDays, 1);
    const engagementScore = Math.min(99, Math.max(18, Math.round(postsPerDay * 32 + active * 6 - flagged * 4 + 24)));
    const moderationHealth = Math.max(0, Math.min(100, 100 - flagged * 12));

    const firstHalf = pulseBars.slice(0, 6).reduce((sum, item) => sum + item.value, 0);
    const secondHalf = pulseBars.slice(6).reduce((sum, item) => sum + item.value, 0);
    const momentum = secondHalf - firstHalf;

    const trendPoints = pulseBars.map((bar) => ({
      ...bar,
      dot: Math.max(18, Math.round(bar.height * 0.9))
    }));

    return {
      engagementScore,
      moderationHealth,
      momentum,
      trendPoints,
      postsPerDay: Math.max(1, Math.round(postsPerDay))
    };
  }, [adminStats, pulseBars, visiblePosts.length, windowDays]);

  const managementCards = useMemo(() => {
    const counts = {
      lostFound: 0,
      announcements: 0,
      events: 0,
      tips: 0
    };

    visiblePosts.forEach((post) => {
      if (post.type === 'lost-item' || post.type === 'found-item') counts.lostFound += 1;
      if (post.type === 'announcement') counts.announcements += 1;
      if (post.type === 'event') counts.events += 1;
      if (post.type === 'idea-tip') counts.tips += 1;
    });

    return [
      { key: 'lostFound', title: 'Lost & Found', count: counts.lostFound, tone: 'blue' },
      { key: 'announcements', title: 'Announcements', count: counts.announcements, tone: 'red' },
      { key: 'events', title: 'Campus Events', count: counts.events, tone: 'green' },
      { key: 'tips', title: 'Academic Tips', count: counts.tips, tone: 'violet' }
    ];
  }, [visiblePosts]);

  const moderationRows = useMemo(() => {
    let list = [...visiblePosts];
    if (moderationFilter === 'flagged') list = list.filter((post) => post.flagged);
    if (moderationFilter === 'active') list = list.filter((post) => post.status === 'active' || !post.status);
    return list.slice(0, 8);
  }, [visiblePosts, moderationFilter]);

  const activityClusters = useMemo(() => {
    const bucket = {};
    visiblePosts.forEach((post) => {
      const key = categoryMap[post.type] || 'General';
      bucket[key] = (bucket[key] || 0) + 1;
    });

    return Object.entries(bucket)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [visiblePosts]);

  const handleModerationAction = async (post, action) => {
    if (!isAdmin) return;

    try {
      if (action === 'flag') {
        await flagPost(post._id, 'Flagged from Community Pulse moderation table');
      } else if (action === 'approve') {
        await approveFlaggedPost(post._id);
      } else if (action === 'remove') {
        await removePost(post._id);
      }
      await fetchAll();
    } catch {
      alert('Unable to process moderation action right now.');
    }
  };

  const openEditModal = (post) => {
    setEditError('');
    setEditingPost(post);
    setEditForm({
      title: post.title || '',
      description: post.description || '',
      category: post.category || categoryMap[post.type] || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      location: post.location || '',
      contactInfo: post.contactInfo || ''
    });
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditingPost(null);
    setEditError('');
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingPost?._id) return;

    const title = String(editForm.title || '').trim();
    const description = String(editForm.description || '').trim();

    if (!title || !description) {
      setEditError('Title and description are required.');
      return;
    }

    const tags = String(editForm.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      setEditSaving(true);
      setEditError('');

      await updatePost(editingPost._id, {
        title,
        description,
        category: String(editForm.category || '').trim(),
        tags,
        location: String(editForm.location || '').trim(),
        contactInfo: String(editForm.contactInfo || '').trim(),
        userId: user?._id,
        userRole: user?.role
      });

      await fetchAll();
      closeEditModal();
    } catch (error) {
      setEditError(error?.message || 'Unable to update this post right now.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <DashboardLayout activeSection="Community Management">
      <div className="community-pulse-page">
        <section className="pulse-head">
          <div>
            <h1>Community Pulse</h1>
            <p>Real-time visualization of engagement metrics and interaction velocity across campus channels.</p>
          </div>
          <div className="head-controls">
            <input
              className="community-search"
              placeholder="Search community data..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <div className="window-switch">
              <button className={windowDays === 7 ? 'active' : ''} onClick={() => setWindowDays(7)}>7 Days</button>
              <button className={windowDays === 30 ? 'active' : ''} onClick={() => setWindowDays(30)}>30 Days</button>
            </div>
          </div>
        </section>

        <section className="pulse-signal-card">
          <div className="signal-ring-wrap">
            <div className="signal-ring" style={{ '--score': signalMetrics.engagementScore }}>
              <strong>{signalMetrics.engagementScore}%</strong>
              <span>Engagement Score</span>
            </div>
            <p>Live confidence index based on post velocity, moderation pressure, and active thread participation.</p>
          </div>

          <div className="signal-grid">
            <article className="signal-chip">
              <span>Posts in Window</span>
              <strong>{visiblePosts.length}</strong>
              <small>{windowDays} day scope</small>
            </article>
            <article className="signal-chip">
              <span>Daily Throughput</span>
              <strong>{signalMetrics.postsPerDay}</strong>
              <small>posts / day</small>
            </article>
            <article className="signal-chip">
              <span>Moderation Health</span>
              <strong>{signalMetrics.moderationHealth}%</strong>
              <small>{signalMetrics.moderationHealth >= 70 ? 'Stable' : 'Needs review'}</small>
            </article>
            <article className="signal-chip">
              <span>Momentum</span>
              <strong>{signalMetrics.momentum >= 0 ? `+${signalMetrics.momentum}` : signalMetrics.momentum}</strong>
              <small>{signalMetrics.momentum >= 0 ? 'Rising trend' : 'Cooling trend'}</small>
            </article>
          </div>

          <div className="signal-trend">
            <h3>Pulse Trend</h3>
            <div className="trend-track">
              {signalMetrics.trendPoints.map((point) => (
                <div key={point.label} className="trend-point" style={{ '--dot': point.dot }}>
                  <span>{point.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hub-head">
          <h2>Management Hub</h2>
          <button className="new-announcement-btn" onClick={() => setShowCreateModal(true)}>+ New Announcement</button>
        </section>

        <section className="hub-grid">
          {managementCards.map((card) => (
            <article key={card.key} className={`hub-card ${card.tone}`}>
              <p>{card.title}</p>
              <h3>{card.count}</h3>
              <small>Active posts</small>
            </article>
          ))}
        </section>

        <section className="moderation-grid">
          <article className="moderation-panel">
            <div className="panel-head">
              <h2>Live Moderation</h2>
              <div className="moderation-filter">
                <button className={moderationFilter === 'all' ? 'active' : ''} onClick={() => setModerationFilter('all')}>All</button>
                <button className={moderationFilter === 'active' ? 'active' : ''} onClick={() => setModerationFilter('active')}>Active</button>
                <button className={moderationFilter === 'flagged' ? 'active' : ''} onClick={() => setModerationFilter('flagged')}>Flagged</button>
              </div>
            </div>

            {loading ? (
              <div className="state-box">Loading community feed...</div>
            ) : error ? (
              <div className="state-box error">{error}</div>
            ) : moderationRows.length === 0 ? (
              <div className="state-box">No posts found in this filter.</div>
            ) : (
              <div className="moderation-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Author</th>
                      <th>Content Preview</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moderationRows.map((post) => (
                      <tr key={post._id}>
                        <td>
                          <strong>{post.authorName || 'Unknown'}</strong>
                          <small>{new Date(post.createdAt).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <strong>{post.title}</strong>
                          <small>{String(post.description || '').slice(0, 60)}{String(post.description || '').length > 60 ? '...' : ''}</small>
                        </td>
                        <td>
                          <span className={`cat-chip ${post.type || 'announcement'}`}>{categoryMap[post.type] || 'General'}</span>
                        </td>
                        <td>
                          {isAdmin ? (
                            <div className="row-actions">
                              <button className="edit" onClick={() => openEditModal(post)}>Edit</button>
                              {post.flagged ? (
                                <button className="approve" onClick={() => handleModerationAction(post, 'approve')}>Approve</button>
                              ) : (
                                <button className="flag" onClick={() => handleModerationAction(post, 'flag')}>Flag</button>
                              )}
                              <button className="remove" onClick={() => handleModerationAction(post, 'remove')}>Remove</button>
                            </div>
                          ) : (
                            <span className="readonly-tag">View Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <aside className="clusters-panel">
            <h2>Activity Clusters</h2>
            <div className="clusters-list">
              {activityClusters.map((cluster) => (
                <div key={cluster.name} className="cluster-row">
                  <span>{cluster.name}</span>
                  <strong>{cluster.count} Active</strong>
                </div>
              ))}
              {activityClusters.length === 0 && <div className="state-box">No activity clusters yet.</div>}
            </div>

            <div className="alert-card">
              <p>Critical Alert</p>
              <small>Review flagged clusters and handle moderation queue promptly.</small>
            </div>
          </aside>
        </section>

        {showCreateModal && (
          <CreatePostModal
            onClose={() => setShowCreateModal(false)}
            onPostCreated={() => {
              setShowCreateModal(false);
              fetchAll();
            }}
          />
        )}

        {editingPost && (
          <div className="modal-overlay">
            <div className="modal-content edit-post-modal">
              <button className="modal-close" type="button" onClick={closeEditModal}>×</button>
              <h2>Edit Post</h2>
              <p>Update post details and save changes to the moderation feed.</p>

              {editError && <div className="error-message">{editError}</div>}

              <div className="create-post-form">
                <div className="form-group">
                  <label htmlFor="edit-title">Title</label>
                  <input
                    id="edit-title"
                    className="form-control"
                    value={editForm.title}
                    onChange={(event) => handleEditChange('title', event.target.value)}
                    placeholder="Post title"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-description">Description</label>
                  <textarea
                    id="edit-description"
                    className="form-control"
                    rows={5}
                    value={editForm.description}
                    onChange={(event) => handleEditChange('description', event.target.value)}
                    placeholder="Post description"
                  ></textarea>
                </div>

                <div className="type-specific-grid">
                  <div className="form-group">
                    <label htmlFor="edit-category">Category</label>
                    <input
                      id="edit-category"
                      className="form-control"
                      value={editForm.category}
                      onChange={(event) => handleEditChange('category', event.target.value)}
                      placeholder="Category"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-tags">Tags</label>
                    <input
                      id="edit-tags"
                      className="form-control"
                      value={editForm.tags}
                      onChange={(event) => handleEditChange('tags', event.target.value)}
                      placeholder="comma, separated, tags"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-location">Location</label>
                    <input
                      id="edit-location"
                      className="form-control"
                      value={editForm.location}
                      onChange={(event) => handleEditChange('location', event.target.value)}
                      placeholder="Location"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-contact">Contact Info</label>
                    <input
                      id="edit-contact"
                      className="form-control"
                      value={editForm.contactInfo}
                      onChange={(event) => handleEditChange('contactInfo', event.target.value)}
                      placeholder="Email or phone"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn-cancel" type="button" onClick={closeEditModal} disabled={editSaving}>Cancel</button>
                  <button className="btn-primary" type="button" onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CommunityBoard;
