import api from './api';

// Register user
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/users/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

// Request password reset link
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

// Get current user (based on token)
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/users/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all users
export const getUsers = async () => {
  try {
    const response = await api.get('/users', { timeout: 20000 });
    return response.data;
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    const shouldRetry = !error?.response && (
      code === 'ERR_NETWORK'
      || code === 'ECONNRESET'
      || code === 'ECONNABORTED'
      || message.includes('ERR_CONNECTION_RESET')
      || message.toLowerCase().includes('network error')
    );

    if (shouldRetry) {
      try {
        const retryResponse = await api.get('/users', { timeout: 20000 });
        return retryResponse.data;
      } catch (retryError) {
        console.error('Error fetching users (retry failed):', retryError);
        throw retryError;
      }
    }

    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get single user by ID
export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Create new user
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
