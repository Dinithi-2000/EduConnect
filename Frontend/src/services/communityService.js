import api from './api';

// Get all posts
export const getPosts = async (filters = {}) => {
  try {
    const response = await api.get('/community/posts', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get single post
export const getPostById = async (id) => {
  try {
    const response = await api.get(`/community/posts/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Create post
export const createPost = async (postData) => {
  try {
    const response = await api.post('/community/posts', postData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update post
export const updatePost = async (id, postData) => {
  try {
    const response = await api.put(`/community/posts/${id}`, postData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete post
export const deletePost = async (id) => {
  try {
    const response = await api.delete(`/community/posts/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Add reply to post
export const addReply = async (id, content) => {
  try {
    const response = await api.post(`/community/posts/${id}/reply`, { content });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Flag post
export const flagPost = async (id, reason) => {
  try {
    const response = await api.post(`/community/posts/${id}/flag`, { reason });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Approve flagged post
export const approveFlaggedPost = async (id) => {
  try {
    const response = await api.post(`/community/posts/${id}/approve`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Remove post
export const removePost = async (id) => {
  try {
    const response = await api.post(`/community/posts/${id}/remove`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get admin stats
export const getAdminStats = async () => {
  try {
    const response = await api.get('/community/admin/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Upvote post
export const upvotePost = async (id, userId) => {
  try {
    const response = await api.post(`/community/posts/${id}/upvote`, { userId });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
