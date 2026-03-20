import api from './api';

export const sendChatMessage = async (message, history = []) => {
  const payload = {
    message,
    history: history.slice(-10)
  };

  const response = await api.post('/ai/chat', payload);
  return response.data;
};
