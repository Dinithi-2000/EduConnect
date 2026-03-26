import api from './api';

export const sendChatMessage = async (message, history = [], context = {}, studentId = 'guest-student') => {
  const payload = {
    message,
    history: history.slice(-10),
    context,
    studentId
  };

  const response = await api.post('/ai/chat', payload);
  return response.data;
};

export const getChatHistory = async (studentId = 'guest-student') => {
  const response = await api.get(`/ai/history/${studentId}`);
  return response.data;
};
