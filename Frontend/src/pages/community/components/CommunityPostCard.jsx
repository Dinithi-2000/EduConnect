import React, { useState } from 'react';
import { flagPost, removePost, approveFlaggedPost, deletePost, upvotePost, addReply } from '../../../services/communityService';
import { useAuth } from '../../../context/AuthContext';
import '../../CommunityBoard.css';

const CommunityPostCard = ({ post, isAdmin, onPostUpdated, emoji }) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const currentUserId = user?._id || user?.id;
  const hasUserVoted = Array.isArray(post.upvotedBy)
    ? post.upvotedBy.some((voterId) => String(voterId) === String(currentUserId))
    : false;

  const handleFlag = async () => {
    if (!flagReason.trim()) {
      alert('Please provide a reason for flagging');
      return;
    }
    try {
      await flagPost(post._id, flagReason);
      setShowFlagModal(false);
      setFlagReason('');
      onPostUpdated();
    } catch (error) {
      console.error('Error flagging post:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await approveFlaggedPost(post._id);
      onPostUpdated();
    } catch (error) {
      console.error('Error approving post:', error);
    }
  };

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove this post?')) {
      try {
        await removePost(post._id);
        onPostUpdated();
      } catch (error) {
        console.error('Error removing post:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(post._id);
        onPostUpdated();
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    setIsReplying(true);
    try {
      await addReply(post._id, replyText);
      setReplyText('');
      onPostUpdated();
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpvote = async () => {
    if (!currentUserId) {
      alert('Please login to vote.');
      return;
    }

    if (hasUserVoted) {
      return;
    }

    try {
      await upvotePost(post._id, currentUserId);
      onPostUpdated();
    } catch (error) {
      const message = error?.message || 'Error upvoting post';
      if (message.toLowerCase().includes('already upvoted')) {
        alert('You can only vote once for this post.');
      }
      console.error('Error upvoting post:', error);
    }
  };

  return (
    <div className={`post-card ${post.flagged ? 'flagged' : ''}`}>
      <div className="post-header">
        <div className="post-type-badge">
          {emoji}
        </div>
        <div className="post-title-section">
          <h3 className="post-title">{post.title}</h3>
          <div className="post-meta">
            <span className="author">By {post.authorName}</span>
            <span className="date">• {new Date(post.createdAt).toLocaleDateString()}</span>
            {post.location && <span className="location">📍 {post.location}</span>}
          </div>
        </div>
        {post.flagged && (
          <div className="flag-badge">⚠️ Flagged</div>
        )}
      </div>

      <div className="post-body">
        <p className="post-description">{post.description}</p>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="post" className="post-image" />
        )}
      </div>

      <div className="post-tags">
        {post.tags && post.tags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>

      <div className="post-footer">
        <div className="post-actions">
          <button
            className={`action-btn ${hasUserVoted ? 'action-btn-voted' : ''}`}
            onClick={handleUpvote}
            disabled={hasUserVoted}
            title={hasUserVoted ? 'You have already voted' : 'Upvote this post'}
          >
            {hasUserVoted ? '✅ Upvoted' : '👍 Upvote'} ({post.upvotes || 0})
          </button>
          <button className="action-btn" onClick={() => setShowReplies(!showReplies)}>
            💬 Reply ({post.replies?.length || 0})
          </button>
          <button className="action-btn" onClick={() => setShowFlagModal(true)}>
            🚩 Flag
          </button>
        </div>

        {isAdmin && (
          <div className="admin-actions">
            {post.flagged ? (
              <>
                <button className="btn-approve" onClick={handleApprove}>
                  ✓ Approve
                </button>
                <button className="btn-remove" onClick={handleRemove}>
                  ✕ Remove
                </button>
              </>
            ) : (
              <button className="btn-flag-admin" onClick={() => setShowFlagModal(true)}>
                🚩 Flag
              </button>
            )}
          </div>
        )}
      </div>

      {/* Replies Section */}
      {showReplies && (
        <div className="replies-section">
          <div className="replies-list">
            {post.replies && post.replies.length > 0 ? (
              post.replies.map((reply) => (
                <div key={reply.id} className="reply-item">
                  <div className="reply-author">{reply.authorName}</div>
                  <div className="reply-content">{reply.content}</div>
                  <div className="reply-time">
                    {new Date(reply.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-replies">No replies yet</p>
            )}
          </div>

          <form className="reply-form" onSubmit={handleAddReply}>
            <input
              type="text"
              placeholder="Add a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="reply-input"
            />
            <button 
              type="submit" 
              className="btn-send"
              disabled={isReplying}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="modal-overlay" onClick={() => setShowFlagModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Flag this post</h3>
            <textarea
              placeholder="Reason for flagging..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="flag-textarea"
              rows="4"
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowFlagModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleFlag}>
                Flag Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPostCard;
