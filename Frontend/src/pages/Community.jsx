import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import './CommunityBoard.css';
import CommunityPostCard from './community/components/CommunityPostCard';
import CreatePostModal from './community/components/CreatePostModal';
import AdminPanel from './community/components/AdminPanel';
import { getPosts, getAdminStats } from '../services/communityService';
import { useAuth } from '../context/AuthContext';

const postTypeEmojis = {
  'lost-item': '🔍',
  'found-item': '✅',
  'announcement': '📢',
  'event': '🎉',
  'help-request': '🆘',
  'idea-tip': '💡'
};

const postTypeLabels = {
  'lost-item': 'Lost Item',
  'found-item': 'Found Item',
  'announcement': 'Announcement',
  'event': 'Event',
  'help-request': 'Help Request',
  'idea-tip': 'Idea / Tip'
};

const CommunityBoard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const communityInsights = useMemo(() => {
    const lostFoundCount = posts.filter(
      (post) => post.type === 'lost-item' || post.type === 'found-item'
    ).length;
    const announcementsCount = posts.filter(
      (post) => post.type === 'announcement' || post.type === 'event'
    ).length;
    const engagementCount = posts.reduce((total, post) => {
      return total + (post.upvotes || 0) + (post.replies?.length || 0);
    }, 0);

    return {
      total: posts.length,
      lostFound: lostFoundCount,
      announcements: announcementsCount,
      engagement: engagementCount,
    };
  }, [posts]);

  useEffect(() => {
    fetchPosts();
    if (user?.role === 'admin') {
      fetchAdminStats();
    }
  }, [selectedType, searchQuery, user]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const filters = {};
      if (selectedType !== 'all') filters.type = selectedType;
      if (searchQuery) filters.search = searchQuery;
      filters.limit = 50;

      const response = await getPosts(filters);
      setPosts(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load posts. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await getAdminStats();
      setAdminStats(response.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  };

  const handlePostCreated = () => {
    setShowCreateModal(false);
    fetchPosts();
  };

  const handlePostUpdated = () => {
    fetchPosts();
    if (user?.role === 'admin') {
      fetchAdminStats();
    }
  };

  return (
    <DashboardLayout activeSection="Community">
      <div className={`community-board ${darkMode ? 'dark' : ''}`}>
        {/* Header Section */}
        <div className="community-header">
          <div className="header-content">
            <h1>🏠 Student Community Board</h1>
            <p>A university-wide notice board — post lost items, found items, events & campus notices</p>
          </div>
          <div className="header-actions">
            <button
              className="btn-theme-toggle"
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              className="btn-create-post"
              onClick={() => setShowCreateModal(true)}
            >
              ＋ Create Post
            </button>
          </div>
        </div>

        {/* Insight Cards */}
        <div className="community-insights">
          <div className="insight-card">
            <span className="insight-label">Visible Posts</span>
            <span className="insight-value">{communityInsights.total}</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Lost / Found</span>
            <span className="insight-value">{communityInsights.lostFound}</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Events / Notices</span>
            <span className="insight-value">{communityInsights.announcements}</span>
          </div>
          <div className="insight-card highlight">
            <span className="insight-label">Total Engagement</span>
            <span className="insight-value">{communityInsights.engagement}</span>
          </div>
        </div>

        {/* Quick Stats */}
        {user?.role === 'admin' && adminStats && (
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{adminStats.totalPosts}</span>
              <span className="stat-label">Total Posts</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{adminStats.activePosts}</span>
              <span className="stat-label">Active Posts</span>
            </div>
            <div className="stat-box flagged">
              <span className="stat-number">{adminStats.flaggedPosts}</span>
              <span className="stat-label">Flagged Posts</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{adminStats.removedPosts}</span>
              <span className="stat-label">Removed Posts</span>
            </div>
            <button 
              className="btn-admin-panel"
              onClick={() => setShowAdminPanel(!showAdminPanel)}
            >
              ⚙️ Admin Panel
            </button>
          </div>
        )}

        {/* Category Filters */}
        <div className="filter-section">
          <div className="filter-tags">
            <button 
              className={`filter-btn ${selectedType === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedType('all')}
            >
              All
            </button>
            {Object.entries(postTypeLabels).map(([key, label]) => (
              <button
                key={key}
                className={`filter-btn ${selectedType === key ? 'active' : ''}`}
                onClick={() => setSelectedType(key)}
              >
                {postTypeEmojis[key]} {label}
              </button>
            ))}
          </div>

          <div className="search-area">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Admin Panel */}
        {showAdminPanel && user?.role === 'admin' && (
          <AdminPanel 
            onPostUpdated={handlePostUpdated}
            onClose={() => setShowAdminPanel(false)}
          />
        )}

        {/* Posts Grid */}
        <div className="posts-section">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading community posts...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <span>⚠️</span>
              <p>{error}</p>
              <button className="btn-retry" onClick={fetchPosts}>Retry</button>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <h3>No posts yet</h3>
              <p>Be the first to share something with the community!</p>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                ＋ Create First Post
              </button>
            </div>
          ) : (
            <div className="posts-grid">
              {posts.map((post) => (
                <CommunityPostCard 
                  key={post._id} 
                  post={post}
                  isAdmin={user?.role === 'admin'}
                  onPostUpdated={handlePostUpdated}
                  emoji={postTypeEmojis[post.type]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Post Modal */}
        {showCreateModal && (
          <CreatePostModal 
            onClose={() => setShowCreateModal(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default CommunityBoard;
