import api from './api';

export const submitContactMessage = async (payload) => {
  const formData = new FormData();
  const safePayload = payload || {};

  formData.append('name', String(safePayload.name || ''));
  formData.append('email', String(safePayload.email || ''));
  formData.append('subject', String(safePayload.subject || ''));
  formData.append('message', String(safePayload.message || ''));

  const attachments = Array.isArray(safePayload.attachments) ? safePayload.attachments : [];
  attachments.forEach((file) => {
    if (file) {
      formData.append('attachments', file);
    }
  });

  const response = await api.post('/contact', formData);
  return response.data;
};

export const getMyContactMessages = async () => {
  const response = await api.get('/contact/my');
  return response.data;
};

export const getAdminContactMessages = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.skip) {
    searchParams.set('skip', String(params.skip));
  }

  const query = searchParams.toString();
  const response = await api.get(`/contact/admin/messages${query ? `?${query}` : ''}`);
  return response.data;
};

export const replyToContactMessage = async (id, reply) => {
  const response = await api.put(`/contact/admin/messages/${id}/reply`, { reply });
  return response.data;
};

export const deleteAdminContactMessage = async (id) => {
  const response = await api.delete(`/contact/admin/messages/${id}`);
  return response.data;
};
