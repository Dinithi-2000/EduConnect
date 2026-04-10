import api from './api';

export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/notifications/mark-all-read');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const trackStudyActivity = async (payload) => {
  const response = await api.post('/notifications/smart-reminder/activity', payload || {});
  return response.data;
};

export const getSmartReminderSettings = async () => {
  const response = await api.get('/notifications/smart-reminder/settings');
  return response.data;
};

export const updateSmartReminderSettings = async (payload) => {
  const response = await api.put('/notifications/smart-reminder/settings', payload || {});
  return response.data;
};

export const getSmartReminderInsights = async () => {
  const response = await api.get('/notifications/smart-reminder/insights');
  return response.data;
};

export const getAdminSmartReminderOverview = async () => {
  const response = await api.get('/notifications/smart-reminder/admin-overview');
  return response.data;
};
