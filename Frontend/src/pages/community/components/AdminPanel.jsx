import React, { useState, useEffect } from 'react';
import { getPosts, removePost, approveFlaggedPost } from '../../../services/communityService';
import '../../CommunityBoard.css';

const AdminPanel = ({ onPostUpdated, onClose }) => {
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('flagged');

  useEffect(() => {
    fetchFlaggedPosts();
  }, [activeTab]);

  const fetchFlaggedPosts = async () => {
    try {
      setLoading(true);
      const response = await getPosts({ status: 'flagged', limit: 100 });
      setFlaggedPosts(response.data || []);
    } catch (error) {
      console.error('Error fetching flagged posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (postId) => {
    try {
      await approveFlaggedPost(postId);
      setFlaggedPosts(prev => prev.filter(p => p._id !== postId));
      onPostUpdated();
    } catch (error) {
      console.error('Error approving post:', error);
    }
  };

  const handleRemove = async (postId) => {
    if (window.confirm('Permanently remove this post?')) {
      try {
        await removePost(postId);
        setFlaggedPosts(prev => prev.filter(p => p._id !== postId));
        onPostUpdated();
      } catch (error) {
        console.error('Error removing post:', error);
      }
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Admin Moderation Panel</h2>
        <button onClick={onClose} className="btn-close">✕</button>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'flagged' ? 'active' : ''}`}
          onClick={() => setActiveTab('flagged')}
        >
          🚩 Flagged Posts ({flaggedPosts.length})
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : flaggedPosts.length === 0 ? (
          <div className="empty-state">
            <p>No flagged posts to review</p>
          </div>
        ) : (
          <div className="flagged-list">
            {flaggedPosts.map(post => (
              <div key={post._id} className="flagged-item">
                <div className="flagged-header">
                  <h4>{post.title}</h4>
                  <span className="flag-reason">Reason: {post.flagReason}</span>
                </div>
                <div className="flagged-body">
                  <p>{post.description}</p>
                  <div className="post-info">
                    <span>By {post.authorName}</span>
                    <span>• {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="admin-actions-row">
                  <button 
                    className="btn-approve"
                    onClick={() => handleApprove(post._id)}
                  >
                    ✓ Approve
                  </button>
                  <button 
                    className="btn-remove"
                    onClick={() => handleRemove(post._id)}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
