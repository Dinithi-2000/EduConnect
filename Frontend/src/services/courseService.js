import api from './api';

export const getCourses = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/courses${params ? `?${params}` : ''}`);
  return response.data;
};

export const getCourseById = async (id) => {
  const response = await api.get(`/courses/${id}`);
  return response.data;
};

export const createCourse = async (payload) => {
  const response = await api.post('/courses', payload);
  return response.data;
};

export const updateCourse = async (id, payload) => {
  const response = await api.put(`/courses/${id}`, payload);
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

export const addModule = async (courseId, payload) => {
  const response = await api.post(`/courses/${courseId}/modules`, payload);
  return response.data;
};

export const updateModule = async (courseId, moduleId, payload) => {
  const response = await api.put(`/courses/${courseId}/modules/${moduleId}`, payload);
  return response.data;
};

export const deleteModule = async (courseId, moduleId) => {
  const response = await api.delete(`/courses/${courseId}/modules/${moduleId}`);
  return response.data;
};

export const addContent = async (courseId, moduleId, payload) => {
  const response = await api.post(`/courses/${courseId}/modules/${moduleId}/contents`, payload);
  return response.data;
};

export const updateContent = async (courseId, moduleId, contentId, payload) => {
  const response = await api.put(`/courses/${courseId}/modules/${moduleId}/contents/${contentId}`, payload);
  return response.data;
};

export const deleteContent = async (courseId, moduleId, contentId) => {
  const response = await api.delete(`/courses/${courseId}/modules/${moduleId}/contents/${contentId}`);
  return response.data;
};

export const uploadModulePdf = async (courseId, moduleId, formData) => {
  const response = await api.post(`/courses/${courseId}/modules/${moduleId}/upload-pdf`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};
