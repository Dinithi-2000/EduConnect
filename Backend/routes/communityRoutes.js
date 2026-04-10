const express = require('express');
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  addReply,
  flagPost,
  approveFlaggedPost,
  removePost,
  getStats,
  upvotePost
} = require('../controllers/communityController');
const { uploadCommunityImage } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);
router.post('/posts/:id/upvote', upvotePost);

// User routes
router.post('/posts', uploadCommunityImage.any(), createPost);
router.post('/posts/:id/reply', addReply);
router.put('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);

// Admin routes
router.post('/posts/:id/flag', flagPost);
router.post('/posts/:id/approve', approveFlaggedPost);
router.post('/posts/:id/remove', removePost);
router.get('/admin/stats', getStats);

module.exports = router;
