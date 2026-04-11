import api from './api';

export const getNotifications = async () => {
  return {
    success: true,
    unreadCount: 0,
    notifications: [],
  };
};

export const markNotificationAsRead = async (id) => {
  return {
    success: true,
    notification: null,
  };
};

export const markAllNotificationsAsRead = async () => {
  return {
    success: true,
    message: 'Notifications are disabled.',
  };
};

export const deleteNotification = async (id) => {
  return {
    success: true,
    message: 'Notifications are disabled.',
  };
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
