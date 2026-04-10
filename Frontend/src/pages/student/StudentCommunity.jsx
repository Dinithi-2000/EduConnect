import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatWidget from '../../components/AIChatWidget';
import { createPost, getPosts, upvotePost } from '../../services/communityService';
import { useAuth } from '../../context/AuthContext';
import '../StudentDashboard.css';
import './StudentCommunity.css';

const SETTINGS_STORAGE_KEY = 'student-settings-preferences';
const THEME_STORAGE_KEY = 'student-theme-mode';

const CATEGORY_MAP = {
  'lost-item': 'Lost & Found',
  'found-item': 'Lost & Found',
  announcement: 'Announcements',
  event: 'Campus Events',
  'help-request': 'Support',
  'idea-tip': 'Academic Tips'
};

const POST_MEDIA_IMAGES = [
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1515165562835-c4c18810f46a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494173853739-c21f58b16055?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529336953121-a0ceea6548bb?auto=format&fit=crop&w=1200&q=80'
];

const CATEGORY_CARDS = [
  { key: 'announcement', label: 'Hashtags', subtitle: 'Topics and conversations', icon: '#' },
  { key: 'event', label: 'Trending & Hot', subtitle: 'Campus events and updates', icon: '🔥' },
  { key: 'help-request', label: 'Study Support', subtitle: 'Peer help and exam prep', icon: '🧠' },
  { key: 'lost-found', label: 'Lost & Found', subtitle: 'Report and recover quickly', icon: '🎒' }
];

const getPostMediaImages = (post, index) => {
  const uploadedImages = [
    ...(Array.isArray(post.imageUrls) ? post.imageUrls : []),
    ...(post.imageUrl ? [post.imageUrl] : [])
  ].filter(Boolean);

  if (uploadedImages.length > 0) return uploadedImages.slice(0, 3);

  const seed = String(post?._id || post?.title || index || 0);
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return [
    POST_MEDIA_IMAGES[hash % POST_MEDIA_IMAGES.length],
    POST_MEDIA_IMAGES[(hash + 2) % POST_MEDIA_IMAGES.length],
    POST_MEDIA_IMAGES[(hash + 4) % POST_MEDIA_IMAGES.length]
  ];
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
    contactInfo: '',
    eventDate: '',
    eventTime: ''
  });
  const [postErrors, setPostErrors] = useState({});
  const [postNotice, setPostNotice] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = rawSettings ? JSON.parse(rawSettings) : null;
      if (parsed && typeof parsed.darkMode === 'boolean') return parsed.darkMode ? 'dark' : 'light';
    } catch {
      // Ignore malformed storage values.
    }
    return 'light';
  });

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const visiblePosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const bySearch = posts.filter((post) => {
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
    const flagged = posts.filter((post) => post.isFlagged || post.flagged).length;
    const engagementRate = total > 0
      ? Math.round(
          (posts.reduce((sum, post) => sum + (Array.isArray(post.upvotes) ? post.upvotes.length : Number(post.upvotes || 0)), 0) /
            Math.max(total, 1)) *
            10
        ) / 10
      : 0;

    return { total, activeAuthors, flagged, engagementRate };
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

  const suggestedCreators = useMemo(() => {
    const authorMap = posts.reduce((acc, post) => {
      const name = post.authorName || 'Community Member';
      if (name.toLowerCase() === displayName.toLowerCase()) return acc;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(authorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        followers: `${(count * 0.7 + 1.4).toFixed(1)}k followers`
      }));
  }, [posts, displayName]);

  const categoryCards = useMemo(() => {
    return CATEGORY_CARDS.map((card) => {
      if (card.key === 'lost-found') {
        return { ...card, count: typeCounts['lost-item'] + typeCounts['found-item'] };
      }
      return { ...card, count: typeCounts[card.key] || 0 };
    });
  }, [typeCounts]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
    setPostForm((prev) => ({ ...prev, [field]: value }));
    setPostErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      setPostNotice('Only image files are allowed.');
    }

    const nextImages = [...selectedImages, ...imageFiles].slice(0, 5);
    setSelectedImages(nextImages);

    if (selectedImages.length + imageFiles.length > 5) {
      setPostNotice('You can upload up to 5 images per post.');
    }

    event.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const validatePostForm = () => {
    const title = String(postForm.title || '').trim();
    const description = String(postForm.description || '').trim();
    const location = String(postForm.location || '').trim();
    const contactInfo = String(postForm.contactInfo || '').trim();
    const category = String(postForm.category || '').trim();
    const eventDate = String(postForm.eventDate || '').trim();
    const eventTime = String(postForm.eventTime || '').trim();

    const errors = {};
    if (!title) errors.title = 'Post title is required.';
    else if (title.length < 3) errors.title = 'Title must be at least 3 characters.';

    if (!description) errors.description = 'Post description is required.';
    else if (description.length < 10) errors.description = 'Description must be at least 10 characters.';

    if (!category) errors.category = 'Please select a category.';
    if (category === 'event' && !eventDate) errors.eventDate = 'Event date is required for events.';
    if (category === 'event' && !eventTime) errors.eventTime = 'Event time is required for events.';
    if (location && location.length < 2) errors.location = 'Location must be at least 2 characters.';
    if (contactInfo && contactInfo.length < 5) errors.contactInfo = 'Contact info looks too short.';
    if (selectedImages.length > 5) errors.images = 'You can upload up to 5 images.';

    setPostErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      payload: {
        title,
        description,
        type: category,
        category: CATEGORY_MAP[category] || 'General',
        tags: String(postForm.tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        location,
        contactInfo,
        eventDate,
        eventTime
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
      if (validation.payload.eventDate) formData.append('eventDate', validation.payload.eventDate);
      if (validation.payload.eventTime) formData.append('eventTime', validation.payload.eventTime);
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });
      await createPost(formData);
      setPostForm({
        title: '',
        description: '',
        category: 'announcement',
        tags: '',
        location: '',
        contactInfo: '',
        eventDate: '',
        eventTime: ''
      });
      setSelectedImages([]);
      setPostErrors({});
      setPostNotice('Post published successfully.');
      await fetchPosts();
    } catch (err) {
      setPostNotice(err?.message || 'Unable to publish your post right now.');
    } finally {
      setPosting(false);
    }
  };

  const sidebarItems = [
    { icon: '▦', label: 'Dashboard', route: '/student-dashboard' },
    { icon: '🎓', label: 'My Courses', route: '/student/my-courses' },
    { icon: '📚', label: 'Course & Contents', route: '/student/courses' },
    { icon: '📝', label: 'Quiz & Mock Exams', route: '/student/quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions', route: '/sessions' },
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

  const isDarkMode = themeMode === 'dark';

  return (
    <div className={`student-v2-shell student-community-shell ${isDarkMode ? 'theme-dark' : ''}`}>
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
            <button
              type="button"
              className="ghost-icon"
              aria-label="Theme"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={handleToggleTheme}
            >
              {isDarkMode ? '☀' : '◐'}
            </button>
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
          <section className="community-top-grid">
            <section className="post-composer-card large">
              <form className="composer-form" onSubmit={handleCreatePost} noValidate>
                <div className="composer-header">
                  <h3>Create a New Post</h3>
                  <small>Share announcements, events, study requests, or lost and found updates.</small>
                </div>

                <div className="composer-row">
                  <div className="composer-avatar">{initials[0] || 'S'}</div>
                  <div className="composer-fields">
                    <input
                      value={postForm.title}
                      onChange={(event) => handlePostFieldChange('title', event.target.value)}
                      placeholder="Give your post a title"
                      aria-invalid={Boolean(postErrors.title)}
                    />
                    {postErrors.title && <small className="composer-error">{postErrors.title}</small>}
                    <textarea
                      value={postForm.description}
                      onChange={(event) => handlePostFieldChange('description', event.target.value)}
                      placeholder="Start a post ..."
                      rows={4}
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
                      <option value="event">Event</option>
                      <option value="lost-item">Lost Item</option>
                      <option value="found-item">Found Item</option>
                      <option value="help-request">Study Help</option>
                      <option value="idea-tip">Tips & Ideas</option>
                    </select>
                    <input
                      value={postForm.tags}
                      onChange={(event) => handlePostFieldChange('tags', event.target.value)}
                      placeholder="Tags (optional)"
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

                  {postForm.category === 'event' && (
                    <div className="composer-field-grid event-meta-grid">
                      <input
                        type="date"
                        value={postForm.eventDate || ''}
                        onChange={(event) => handlePostFieldChange('eventDate', event.target.value)}
                        title="Event date"
                        aria-label="Event date"
                        aria-invalid={Boolean(postErrors.eventDate)}
                      />
                      <input
                        type="time"
                        value={postForm.eventTime || ''}
                        onChange={(event) => handlePostFieldChange('eventTime', event.target.value)}
                        title="Event time"
                        aria-label="Event time"
                        aria-invalid={Boolean(postErrors.eventTime)}
                      />
                    </div>
                  )}

                  <div className="composer-image-upload">
                    <label htmlFor="community-images">Attach images (up to 5)</label>
                    <input
                      id="community-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelection}
                    />
                    {selectedImages.length > 0 && (
                      <div className="composer-image-list">
                        {selectedImages.map((file, index) => (
                          <button
                            key={`${file.name}-${index}`}
                            type="button"
                            className="composer-image-chip"
                            onClick={() => handleRemoveImage(index)}
                            title="Remove image"
                          >
                            <span>{file.name}</span>
                            <strong>✕</strong>
                          </button>
                        ))}
                      </div>
                    )}
                    {(postErrors.images || postErrors.eventDate || postErrors.eventTime) && (
                      <small className="composer-error">
                        {postErrors.images || postErrors.eventDate || postErrors.eventTime}
                      </small>
                    )}
                  </div>

                  <button type="submit" disabled={posting}>
                    {posting ? 'Publishing...' : 'Publish Post'}
                  </button>
                </div>
                {postNotice && (
                  <div className={`composer-notice ${Object.keys(postErrors).length ? 'error' : 'success'}`}>
                    {postNotice}
                  </div>
                )}
              </form>
            </section>

            <section className="community-profile-card">
              <p className="greeting">Hello {displayName.split(' ')[0]} 🌼</p>
              <h2>{displayName}</h2>
              <div className="profile-stats-row">
                <div>
                  <small>posts</small>
                  <strong>{metrics.total}</strong>
                </div>
                <div>
                  <small>active</small>
                  <strong>{metrics.activeAuthors}</strong>
                </div>
                <div>
                  <small>engagement</small>
                  <strong>{metrics.engagementRate}%</strong>
                </div>
              </div>
            </section>
          </section>

          <section className="community-grid">
            <div className="community-main-column">
              <section className="student-community-toolbar">
                <div className="type-tabs">
                  <button type="button" className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All</button>
                  <button type="button" className={typeFilter === 'lost-found' ? 'active' : ''} onClick={() => setTypeFilter('lost-found')}>
                    Lost & Found ({typeCounts['lost-item'] + typeCounts['found-item']})
                  </button>
                  <button type="button" className={typeFilter === 'announcement' ? 'active' : ''} onClick={() => setTypeFilter('announcement')}>
                    Announcements ({typeCounts.announcement})
                  </button>
                  <button type="button" className={typeFilter === 'event' ? 'active' : ''} onClick={() => setTypeFilter('event')}>
                    Events ({typeCounts.event})
                  </button>
                  <button type="button" className={typeFilter === 'help-request' ? 'active' : ''} onClick={() => setTypeFilter('help-request')}>
                    Study Support ({typeCounts['help-request']})
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
                  {visiblePosts.slice(0, 16).map((post, index) => (
                    <article key={post._id} className="post-card">
                      <div className="post-author-row">
                        <div className="post-avatar">{String(post.authorName || 'S').charAt(0)}</div>
                        <div>
                          <strong>{post.authorName || 'Community Member'}</strong>
                          <small>{new Date(post.createdAt).toLocaleString()}</small>
                        </div>
                        <span className="post-chip">{CATEGORY_MAP[post.type] || 'General'}</span>
                      </div>

                      <h3>{post.title}</h3>
                      <p>{post.description}</p>

                      {(post.type === 'event' && (post.eventDate || post.eventTime)) && (
                        <p className="post-event-meta">
                          📅 {post.eventDate ? new Date(post.eventDate).toLocaleDateString() : 'Date TBD'}
                          {' • '}
                          ⏰ {post.eventTime || 'Time TBD'}
                        </p>
                      )}

                      <div className="post-media-grid" aria-hidden="true">
                        {getPostMediaImages(post, index).map((image, mediaIndex) => (
                          <div key={`${post._id || index}-media-${mediaIndex}`} className={`post-media-item media-${mediaIndex + 1}`}>
                            <img src={image} alt="" loading="lazy" />
                          </div>
                        ))}
                      </div>

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
                <div className="side-card-head">
                  <h3>Suggestions</h3>
                  <button type="button">See all</button>
                </div>
                {suggestedCreators.length > 0 ? (
                  <ul>
                    {suggestedCreators.map((creator) => (
                      <li key={creator.name}>
                        <div>
                          <span>{creator.name}</span>
                          <small>{creator.followers}</small>
                        </div>
                        <button type="button" className="follow-btn">Follow</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No suggestions yet.</p>
                )}
              </section>

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

              <section className="side-card categories-card">
                <h3>Categories</h3>
                <ul>
                  {categoryCards.map((card) => (
                    <li key={card.key} className={`category-item ${card.key}`}>
                      <div className="category-chip">{card.icon}</div>
                      <div>
                        <span>{card.label}</span>
                        <small>{card.subtitle}</small>
                      </div>
                      <strong>{card.count}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="side-card compact-metrics">
                <h3>Board Snapshot</h3>
                <ul>
                  <li>
                    <span>Total Posts</span>
                    <small>{metrics.total.toLocaleString()}</small>
                  </li>
                  <li>
                    <span>Flagged Items</span>
                    <small>{metrics.flagged}</small>
                  </li>
                  <li>
                    <span>Recent Events</span>
                    <small>{typeCounts.event}</small>
                  </li>
                  <li>
                    <span>Study Requests</span>
                    <small>{typeCounts['help-request']}</small>
                  </li>
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
