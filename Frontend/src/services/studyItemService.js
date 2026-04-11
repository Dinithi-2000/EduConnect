import api, { API_URL } from './api';

const API_ORIGIN = String(API_URL || '').replace(/\/api\/?$/, '');

const normalizeMaterialFileUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
};

const normalizeMaterial = (item = {}) => ({
  ...item,
  fileUrl: normalizeMaterialFileUrl(item.fileUrl)
});

export const getStudyItems = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/study-items${params ? `?${params}` : ''}`);
  return response.data;
};

export const createStudyItem = async (payload) => {
  const response = await api.post('/study-items', payload);
  return response.data;
};

export const deleteStudyItem = async (id) => {
  const response = await api.delete(`/study-items/${id}`);
  return response.data;
};

export const getAdminStudyItems = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/study-items/admin/all${params ? `?${params}` : ''}`);
  return response.data;
};

export const getPublishedStudyMaterials = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/study-items/materials${params ? `?${params}` : ''}`);
  return {
    ...response.data,
    data: Array.isArray(response.data?.data)
      ? response.data.data.map(normalizeMaterial)
      : []
  };
};

export const createAdminStudyMaterial = async (payload) => {
  const hasFile = Boolean(payload?.materialFile);

  if (!hasFile) {
    const response = await api.post('/study-items/materials/admin', payload);
    return {
      ...response.data,
      data: response.data?.data ? normalizeMaterial(response.data.data) : response.data?.data
    };
  }

  const formData = new FormData();
  formData.append('title', String(payload.title || ''));
  formData.append('materialType', String(payload.materialType || 'past-paper'));
  formData.append('description', String(payload.description || ''));
  formData.append('linkUrl', String(payload.linkUrl || ''));
  formData.append('materialFile', payload.materialFile);

  const response = await api.post('/study-items/materials/admin', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return {
    ...response.data,
    data: response.data?.data ? normalizeMaterial(response.data.data) : response.data?.data
  };
};

export const updateAdminStudyMaterial = async (id, payload) => {
  const response = await api.put(`/study-items/materials/admin/${id}`, payload);
  return {
    ...response.data,
    data: response.data?.data ? normalizeMaterial(response.data.data) : response.data?.data
  };
};

export const deleteAdminStudyMaterial = async (id) => {
  const response = await api.delete(`/study-items/materials/admin/${id}`);
  return response.data;
};
