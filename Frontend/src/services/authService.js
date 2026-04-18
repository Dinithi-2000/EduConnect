import api from './api';

// Login user
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Register user
export const registerUser = async (name, email, password, role) => {
  const response = await api.post('/auth/register', { name, email, password, role });
  return response.data;
};

// Get current user profile
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
