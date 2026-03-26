import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getPosts, upvotePost } from '../../services/communityService';
import { useAuth } from '../../context/AuthContext';
import './StudentCommunity.css';

const categoryMap = {
  'lost-item': 'Lost & Found',
  'found-item': 'Lost & Found',
  announcement: 'Announcements',
  event: 'Campus Events',
  'help-request': 'Support',
  'idea-tip': 'Academic Tips'
};

const StudentCommunity = () => {
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [windowDays, setWindowDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getPosts({
        limit: 100,
        search: searchQuery || undefined
      });
      setPosts(response.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load student community data.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const visiblePosts = useMemo(() => {
    const threshold = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const byWindow = posts.filter((post) => new Date(post.createdAt).getTime() >= threshold);
    if (typeFilter === 'all') return byWindow;
    return byWindow.filter((post) => post.type === typeFilter);
  }, [posts, typeFilter, windowDays]);

  const metrics = useMemo(() => {
    const total = visiblePosts.length;
    const activeAuthors = new Set(visiblePosts.map((post) => post.authorName || post.author || 'anonymous')).size;
    const announcements = visiblePosts.filter((post) => post.type === 'announcement').length;
    const events = visiblePosts.filter((post) => post.type === 'event').length;

    return {
      total,
      activeAuthors,
      announcements,
      events,
      momentum: total >= 6 ? 'High' : total >= 3 ? 'Medium' : 'Low'
    };
  }, [visiblePosts]);

  const typeCounts = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        acc[post.type] = (acc[post.type] || 0) + 1;
        return acc;
      },
      {
        announcement: 0,
        event: 0,
        'lost-item': 0,
        'found-item': 0,
        'help-request': 0,
        'idea-tip': 0
      }
    );
  }, [posts]);

  const handleUpvote = async (postId) => {
    if (!userId) {
      alert('Please log in before voting.');
      return;
    }

    try {
      await upvotePost(postId, userId);
      await fetchPosts();
    } catch {
      alert('Unable to register your vote right now.');
    }
  };

  return (
    <DashboardLayout activeSection="Community" theme="light">
      <div className="student-community-page">
        <section className="student-community-head">
          <div>
            <h1>Student Community Hub</h1>
            <p>Discover announcements, events, and peer updates from your campus network.</p>
          </div>
          <div className="head-controls">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search community posts..."
            />
            <div className="window-switch">
              <button className={windowDays === 7 ? 'active' : ''} onClick={() => setWindowDays(7)}>7 Days</button>
              <button className={windowDays === 30 ? 'active' : ''} onClick={() => setWindowDays(30)}>30 Days</button>
            </div>
          </div>
        </section>

        <section className="student-community-stats">
          <article className="stat-card"><span>Posts in Window</span><strong>{metrics.total}</strong></article>
          <article className="stat-card"><span>Active Authors</span><strong>{metrics.activeAuthors}</strong></article>
          <article className="stat-card"><span>Announcements</span><strong>{metrics.announcements}</strong></article>
          <article className="stat-card"><span>Momentum</span><strong>{metrics.momentum}</strong></article>
        </section>

        <section className="student-community-toolbar">
          <div className="type-tabs">
            <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All ({posts.length})</button>
            <button className={typeFilter === 'announcement' ? 'active' : ''} onClick={() => setTypeFilter('announcement')}>Announcements ({typeCounts.announcement})</button>
            <button className={typeFilter === 'event' ? 'active' : ''} onClick={() => setTypeFilter('event')}>Events ({typeCounts.event})</button>
            <button className={typeFilter === 'help-request' ? 'active' : ''} onClick={() => setTypeFilter('help-request')}>Support ({typeCounts['help-request']})</button>
            <button className={typeFilter === 'idea-tip' ? 'active' : ''} onClick={() => setTypeFilter('idea-tip')}>Tips ({typeCounts['idea-tip']})</button>
          </div>
        </section>

        {loading ? (
          <div className="state-box">Loading community feed...</div>
        ) : error ? (
          <div className="state-box error">{error}</div>
        ) : visiblePosts.length === 0 ? (
          <div className="state-box">No posts found for the selected filters.</div>
        ) : (
          <section className="student-community-feed">
            {visiblePosts.slice(0, 24).map((post) => (
              <article key={post._id} className="post-card">
                <div className="post-top">
                  <span className="post-chip">{categoryMap[post.type] || 'General'}</span>
                  <small>{new Date(post.createdAt).toLocaleDateString()}</small>
                </div>

                <h3>{post.title}</h3>
                <p>{String(post.description || '').slice(0, 180)}{String(post.description || '').length > 180 ? '...' : ''}</p>

                <div className="post-meta">
                  <span>By {post.authorName || 'Community Member'}</span>
                  <span>
                    {(Array.isArray(post.upvotes) ? post.upvotes.length : Number(post.upvotes || 0))} likes
                  </span>
                </div>

                <div className="post-actions">
                  <button onClick={() => handleUpvote(post._id)}>Upvote</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentCommunity;
