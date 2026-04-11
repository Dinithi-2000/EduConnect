import api from './api';

const COURSE_CACHE_PREFIX = 'course-list-cache:';
const COURSE_CACHE_TTL_MS = 2 * 60 * 1000;
const inFlightCourseRequests = new Map();

const normalizeFilters = (filters = {}) => {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
};

const createCacheKey = (filters = {}) => {
  const normalized = normalizeFilters(filters);
  return `${COURSE_CACHE_PREFIX}${JSON.stringify(normalized)}`;
};

const readCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.data) return null;
    if (Date.now() - parsed.timestamp > COURSE_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Ignore quota or serialization issues.
  }
};

export const invalidateCoursesCache = () => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(COURSE_CACHE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage access failures.
  }
};

export const getCourses = async (filters = {}, options = {}) => {
  const { forceRefresh = false } = options;
  const cacheKey = createCacheKey(filters);

  if (!forceRefresh) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }

  if (inFlightCourseRequests.has(cacheKey)) {
    return inFlightCourseRequests.get(cacheKey);
  }

  const request = (async () => {
    const params = new URLSearchParams(normalizeFilters(filters)).toString();
    const response = await api.get(`/courses${params ? `?${params}` : ''}`);
    writeCache(cacheKey, response.data);
    return response.data;
  })();

  inFlightCourseRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inFlightCourseRequests.delete(cacheKey);
  }
};

export const getCourseById = async (id) => {
  const response = await api.get(`/courses/${id}`);
  return response.data;
};

export const createCourse = async (payload) => {
  const response = await api.post('/courses', payload);
  invalidateCoursesCache();
  return response.data;
};

export const updateCourse = async (id, payload) => {
  const response = await api.put(`/courses/${id}`, payload);
  invalidateCoursesCache();
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/courses/${id}`);
  invalidateCoursesCache();
  return response.data;
};

export const addModule = async (courseId, payload) => {
  const response = await api.post(`/courses/${courseId}/modules`, payload);
  invalidateCoursesCache();
  return response.data;
};

export const updateModule = async (courseId, moduleId, payload) => {
  const response = await api.put(`/courses/${courseId}/modules/${moduleId}`, payload);
  invalidateCoursesCache();
  return response.data;
};

export const deleteModule = async (courseId, moduleId) => {
  const response = await api.delete(`/courses/${courseId}/modules/${moduleId}`);
  invalidateCoursesCache();
  return response.data;
};

export const addContent = async (courseId, moduleId, payload) => {
  const response = await api.post(`/courses/${courseId}/modules/${moduleId}/contents`, payload);
  invalidateCoursesCache();
  return response.data;
};

export const updateContent = async (courseId, moduleId, contentId, payload) => {
  const response = await api.put(`/courses/${courseId}/modules/${moduleId}/contents/${contentId}`, payload);
  invalidateCoursesCache();
  return response.data;
};

export const deleteContent = async (courseId, moduleId, contentId) => {
  const response = await api.delete(`/courses/${courseId}/modules/${moduleId}/contents/${contentId}`);
  invalidateCoursesCache();
  return response.data;
};

export const uploadModulePdf = async (courseId, moduleId, formData) => {
  const response = await api.post(`/courses/${courseId}/modules/${moduleId}/upload-pdf`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  invalidateCoursesCache();
  return response.data;
};

export const uploadModuleImage = async (courseId, moduleId, formData) => {
  const response = await api.post(`/courses/${courseId}/modules/${moduleId}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  invalidateCoursesCache();
  return response.data;
};

export const uploadModuleVideo = async (courseId, moduleId, formData) => {
  const response = await api.post(`/courses/${courseId}/modules/${moduleId}/upload-video`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  invalidateCoursesCache();
  return response.data;
};
