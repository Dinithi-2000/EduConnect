import api from './api';

// ─── Quiz CRUD ────────────────────────────────────────────────────────────────

// Get all active quizzes (with optional filters)
export const getQuizzes = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/quizzes${params ? `?${params}` : ''}`);
  return response.data;
};

// Get single quiz by ID
export const getQuizById = async (id) => {
  const response = await api.get(`/quizzes/${id}`);
  return response.data;
};

// Create quiz (admin/teacher)
export const createQuiz = async (quizData) => {
  const response = await api.post('/quizzes', quizData);
  return response.data;
};

// Update quiz
export const updateQuiz = async (id, quizData) => {
  const response = await api.put(`/quizzes/${id}`, quizData);
  return response.data;
};

// Delete quiz
export const deleteQuiz = async (id) => {
  const response = await api.delete(`/quizzes/${id}`);
  return response.data;
};

// ─── Attempts & Progress ──────────────────────────────────────────────────────

// Submit a quiz attempt
export const submitAttempt = async (quizId, attemptData) => {
  const response = await api.post(`/quizzes/${quizId}/attempt`, attemptData);
  return response.data;
};

// Get single attempt result by attempt ID
export const getAttemptById = async (attemptId) => {
  const response = await api.get(`/quizzes/attempts/${attemptId}`);
  return response.data;
};

// Get logged-in student's progress
export const getMyProgress = async () => {
  const response = await api.get('/quizzes/progress/me');
  return response.data;
};

// Get admin analytics for a specific quiz
export const getQuizAnalytics = async (quizId) => {
  const response = await api.get(`/quizzes/${quizId}/analytics`);
  return response.data;
};
