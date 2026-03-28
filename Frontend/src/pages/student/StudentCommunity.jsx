import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatWidget from '../../components/AIChatWidget';
import { createPost, getPosts, upvotePost } from '../../services/communityService';
import { useAuth } from '../../context/AuthContext';
import '../StudentDashboard.css';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    category: 'announcement',
    tags: '',
    location: '',
    contactInfo: ''
  });
  const [postErrors, setPostErrors] = useState({});
  const [postNotice, setPostNotice] = useState('');
  const [posting, setPosting] = useState(false);

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
    const bySearch = posts.filter((post) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const haystack = `${post.title || ''} ${post.description || ''} ${post.authorName || ''}`.toLowerCase();
      return haystack.includes(query);
    });

    if (typeFilter === 'all') return bySearch;
    if (typeFilter === 'lost-found') {
      return bySearch.filter((post) => ['lost-item', 'found-item'].includes(post.type));
    }

    return bySearch.filter((post) => post.type === typeFilter);
  }, [posts, searchQuery, typeFilter]);

  const metrics = useMemo(() => {
    const total = posts.length;
    const activeAuthors = new Set(visiblePosts.map((post) => post.authorName || post.author || 'anonymous')).size;
    const flagged = posts.filter((post) => post.isFlagged).length;
    const engagementRate = total > 0
      ? Math.round(
          (posts.reduce((sum, post) => sum + (Array.isArray(post.upvotes) ? post.upvotes.length : Number(post.upvotes || 0)), 0) /
            Math.max(total, 1)) *
            10
        ) / 10
      : 0;

    return {
      total,
      activeAuthors,
      flagged,
      engagementRate
    };
  }, [posts, visiblePosts]);

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

  const trendingTopics = useMemo(() => {
    const topicMap = {};
    posts.forEach((post) => {
      const tags = String(post.description || '').match(/#[A-Za-z0-9_]+/g) || [];
      tags.forEach((tag) => {
        topicMap[tag] = (topicMap[tag] || 0) + 1;
      });
    });

    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => ({ tag, count }));
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

  const handlePostFieldChange = (field, value) => {
    setPostForm((prev) => ({
      ...prev,
      [field]: value
    }));

    setPostErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validatePostForm = () => {
    const title = String(postForm.title || '').trim();
    const description = String(postForm.description || '').trim();
    const location = String(postForm.location || '').trim();
    const contactInfo = String(postForm.contactInfo || '').trim();
    const category = String(postForm.category || '').trim();

    const errors = {};

    if (!title) {
      errors.title = 'Post title is required.';
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters.';
    }

    if (!description) {
      errors.description = 'Post description is required.';
    } else if (description.length < 10) {
      errors.description = 'Description must be at least 10 characters.';
    }

    if (!category) {
      errors.category = 'Please select a category.';
    }

    if (location && location.length < 2) {
      errors.location = 'Location must be at least 2 characters.';
    }

    if (contactInfo && contactInfo.length < 5) {
      errors.contactInfo = 'Contact info looks too short.';
    }

    setPostErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      payload: {
        title,
        description,
        type: category,
        category: categoryMap[category] || 'General',
        tags: String(postForm.tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        location,
        contactInfo
      }
    };
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    setPostNotice('');

    const validation = validatePostForm();
    if (!validation.isValid) {
      setPostNotice('Please fix the highlighted fields before posting.');
      return;
    }

    try {
      setPosting(true);
      const formData = new FormData();
      formData.append('title', validation.payload.title);
      formData.append('description', validation.payload.description);
      formData.append('type', validation.payload.type);
      formData.append('category', validation.payload.category);
      formData.append('tags', JSON.stringify(validation.payload.tags));
      formData.append('location', validation.payload.location);
      formData.append('contactInfo', validation.payload.contactInfo);
      await createPost(formData);
      setPostForm({
        title: '',
        description: '',
        category: 'announcement',
        tags: '',
        location: '',
        contactInfo: ''
      });
      setPostErrors({});
      setPostNotice('Post published successfully.');
      await fetchPosts();
    } catch (err) {
      setPostNotice(err?.message || 'Unable to publish your post right now.');
    } finally {
      setPosting(false);
    }
  };

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard' },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses' },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/student/courses' },
    { icon: '💬', label: 'Community Board', route: '/student/community', active: true },
    { icon: '📈', label: 'Progress Analytics', route: '/student/progress' },
    { icon: '👑', label: 'Premium', route: '/student/premium' },
    { icon: '🤖', label: 'AI Chatbot', action: () => setChatOpenSignal((prev) => prev + 1) },
    { icon: '⚙', label: 'Settings', route: '/settings' }
  ];

  const handleSidebarAction = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    navigate(item.route);
  };

  return (
    <div className="student-v2-shell student-community-shell">
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
      </aside>

      <main className="student-v2-main student-community-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search for posts, topics, people..."
              aria-label="Search community posts"
            />
          </div>

          <div className="student-v2-tools">
            <button type="button" className="ghost-icon" aria-label="Theme">◐</button>
            <button type="button" className="ghost-icon" aria-label="Notifications">🔔</button>
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

        <div className="student-community-page">
          <section className="student-community-head">
            <h1>Community Board</h1>
            <p>Share, discover, and stay connected with your campus.</p>
          </section>

          <section className="student-community-stats">
            <article className="community-stat-card">
              <span>Total Posts</span>
              <strong>{metrics.total.toLocaleString()}</strong>
            </article>
            <article className="community-stat-card">
              <span>Active Students</span>
              <strong>{metrics.activeAuthors.toLocaleString()}</strong>
            </article>
            <article className="community-stat-card">
              <span>Flagged Items</span>
              <strong>{metrics.flagged}</strong>
            </article>
            <article className="community-stat-card">
              <span>Engagement Rate</span>
              <strong>{metrics.engagementRate}%</strong>
            </article>
          </section>

          <section className="community-grid">
            <div className="community-main-column">
              <section className="post-composer-card">
                <form className="composer-form" onSubmit={handleCreatePost} noValidate>
                <div className="composer-row">
                  <div className="composer-avatar">{initials[0] || 'S'}</div>
                  <div className="composer-fields">
                    <input
                      value={postForm.title}
                      onChange={(event) => handlePostFieldChange('title', event.target.value)}
                      placeholder="Post title"
                      aria-invalid={Boolean(postErrors.title)}
                    />
                    {postErrors.title && <small className="composer-error">{postErrors.title}</small>}
                    <textarea
                      value={postForm.description}
                      onChange={(event) => handlePostFieldChange('description', event.target.value)}
                      placeholder="What's on your mind?"
                      rows={3}
                      aria-invalid={Boolean(postErrors.description)}
                    />
                    {postErrors.description && <small className="composer-error">{postErrors.description}</small>}
                  </div>
                </div>
                <div className="composer-actions">
                  <div className="composer-field-grid">
                    <select
                      value={postForm.category}
                      onChange={(event) => handlePostFieldChange('category', event.target.value)}
                      aria-label="Select post category"
                      aria-invalid={Boolean(postErrors.category)}
                    >
                      <option value="announcement">Announcements</option>
                      <option value="event">Events</option>
                      <option value="lost-item">Lost Item</option>
                      <option value="found-item">Found Item</option>
                      <option value="help-request">Study Groups</option>
                      <option value="idea-tip">Tips</option>
                    </select>
                    <input
                      value={postForm.tags}
                      onChange={(event) => handlePostFieldChange('tags', event.target.value)}
                      placeholder="Tags (comma separated, optional)"
                    />
                    <input
                      value={postForm.location}
                      onChange={(event) => handlePostFieldChange('location', event.target.value)}
                      placeholder="Location (optional)"
                      aria-invalid={Boolean(postErrors.location)}
                    />
                    <input
                      value={postForm.contactInfo}
                      onChange={(event) => handlePostFieldChange('contactInfo', event.target.value)}
                      placeholder="Contact info (optional)"
                      aria-invalid={Boolean(postErrors.contactInfo)}
                    />
                  </div>
                  <button type="submit" disabled={posting}>
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
                {postNotice && (
                  <div className={`composer-notice ${Object.keys(postErrors).length ? 'error' : 'success'}`}>
                    {postNotice}
                  </div>
                )}
                </form>
              </section>

              <section className="student-community-toolbar">
                <div className="type-tabs">
                  <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All</button>
                  <button className={typeFilter === 'lost-found' ? 'active' : ''} onClick={() => setTypeFilter('lost-found')}>
                    Lost & Found ({typeCounts['lost-item'] + typeCounts['found-item']})
                  </button>
                  <button className={typeFilter === 'announcement' ? 'active' : ''} onClick={() => setTypeFilter('announcement')}>
                    Announcements ({typeCounts.announcement})
                  </button>
                  <button className={typeFilter === 'event' ? 'active' : ''} onClick={() => setTypeFilter('event')}>
                    Events ({typeCounts.event})
                  </button>
                  <button className={typeFilter === 'help-request' ? 'active' : ''} onClick={() => setTypeFilter('help-request')}>
                    Study Groups ({typeCounts['help-request']})
                  </button>
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
                  {visiblePosts.slice(0, 16).map((post) => (
                    <article key={post._id} className="post-card">
                      <div className="post-author-row">
                        <div className="post-avatar">{String(post.authorName || 'S').charAt(0)}</div>
                        <div>
                          <strong>{post.authorName || 'Community Member'}</strong>
                          <small>{new Date(post.createdAt).toLocaleString()}</small>
                        </div>
                        <span className="post-chip">{categoryMap[post.type] || 'General'}</span>
                      </div>

                      <h3>{post.title}</h3>
                      <p>{post.description}</p>

                      <div className="post-meta">
                        <button type="button" onClick={() => handleUpvote(post._id)}>
                          ❤ {(Array.isArray(post.upvotes) ? post.upvotes.length : Number(post.upvotes || 0))}
                        </button>
                        <span>{Array.isArray(post.replies) ? post.replies.length : Number(post.replyCount || 0)} comments</span>
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </div>

            <aside className="community-side-column">
              <section className="side-card">
                <h3>Trending Topics</h3>
                {trendingTopics.length > 0 ? (
                  <ul>
                    {trendingTopics.map((topic) => (
                      <li key={topic.tag}>
                        <span>{topic.tag}</span>
                        <small>{topic.count} posts</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No trending hashtags yet.</p>
                )}
              </section>

              <section className="side-card">
                <h3>Upcoming Campus Events</h3>
                <ul>
                  {posts
                    .filter((post) => post.type === 'event')
                    .slice(0, 3)
                    .map((eventPost) => (
                      <li key={eventPost._id}>
                        <span>{eventPost.title}</span>
                        <small>{new Date(eventPost.createdAt).toLocaleDateString()}</small>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="side-card">
                <h3>Helpful Links</h3>
                <ul>
                  <li><span>Campus Map</span></li>
                  <li><span>Mental Health Support</span></li>
                  <li><span>IT Support Portal</span></li>
                </ul>
              </section>
            </aside>
          </section>
        </div>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-community',
            user: {
              id: user?._id,
              name: user?.name,
              role: user?.role
            }
          }}
          openSignal={chatOpenSignal}
        />
      </main>
    </div>
  );
};

export default StudentCommunity;
