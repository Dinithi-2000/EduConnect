import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../services/api';
import {
  addContent,
  addModule,
  createCourse,
  deleteContent,
  deleteCourse,
  deleteModule,
  getCourses,
  updateContent,
  updateCourse,
  updateModule,
  uploadModuleImage,
  uploadModulePdf,
  uploadModuleVideo
} from '../../services/courseService';
import './CourseManager.css';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const CONTENT_TYPES = ['LectureVideo', 'LecturePDF', 'ShortNote', 'Video', 'PDF', 'Image', 'Article', 'Link', 'Quiz'];
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const parseFaqLines = (text) => {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [questionPart, ...answerParts] = line.split('|');
      return {
        question: String(questionPart || '').trim(),
        answer: String(answerParts.join('|') || '').trim()
      };
    })
    .filter((item) => item.question && item.answer);
};

const stringifyFaqLines = (faqs = []) => {
  return (Array.isArray(faqs) ? faqs : [])
    .map((item) => `${item.question || ''} | ${item.answer || ''}`)
    .join('\n');
};

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidResourceUrl = (value) => {
  const input = String(value || '').trim();
  if (!input) return false;
  if (input.startsWith('/')) return true;
  if (input.startsWith('data:image/')) return true;
  return isValidHttpUrl(input);
};

const CourseManager = () => {
  const { user } = useAuth();
  const currentRole = String(user?.role || '').toLowerCase();
  const isManager = ['admin', 'teacher'].includes(currentRole);
  const pageTitle = isManager ? 'Course Management' : 'My Courses';

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [publishFilter, setPublishFilter] = useState('all');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [uploadingModuleId, setUploadingModuleId] = useState('');
  const [thumbnailDropActive, setThumbnailDropActive] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [modalModules, setModalModules] = useState([{ title: '', description: '' }]);
  const [toasts, setToasts] = useState([]);
  const [modalSaving, setModalSaving] = useState(false);
  const [editDialog, setEditDialog] = useState({
    open: false,
    type: 'course',
    courseId: '',
    moduleId: '',
    contentId: '',
    form: {}
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: '',
    courseId: '',
    moduleId: '',
    contentId: '',
    name: ''
  });

  const showToast = (message, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const [expandedModuleTools, setExpandedModuleTools] = useState({});
  const [completedContent, setCompletedContent] = useState({});
  const [courseForm, setCourseForm] = useState({
    title: '',
    subject: '',
    level: 'Beginner',
    initialModuleTitle: '',
    initialLectureVideoUrl: '',
    description: '',
    faqText: '',
    thumbnailUrl: '',
    isPublished: false
  });
  const [initialLecturePdfFile, setInitialLecturePdfFile] = useState(null);
  const [initialLectureVideoFile, setInitialLectureVideoFile] = useState(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const filteredCourses = useMemo(() => {
    const byLevel = (course) => levelFilter === 'All' || course.level === levelFilter;
    const byPublish = (course) => {
      if (publishFilter === 'all') return true;
      if (publishFilter === 'published') return !!course.isPublished;
      if (publishFilter === 'draft') return !course.isPublished;
      return true;
    };

    const list = courses.filter((course) => byLevel(course) && byPublish(course));

    const sorted = [...list];
    if (sortBy === 'title-asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'title-desc') {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'modules-desc') {
      sorted.sort((a, b) => (b.modules?.length || 0) - (a.modules?.length || 0));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return sorted;
  }, [courses, levelFilter, publishFilter, sortBy]);

  const filteredCount = filteredCourses.length;

  const courseProgress = useMemo(() => {
    if (!selectedCourse) return { total: 0, done: 0, percent: 0 };

    const contents = (selectedCourse.modules || []).flatMap((module) => module.contents || []);
    const total = contents.length;
    const done = contents.filter((content) => completedContent[content._id]).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }, [selectedCourse, completedContent]);

  const getProgressStorageKey = () => {
    const userKey = user?._id || user?.id || 'guest';
    return `course-progress-${userKey}-${selectedCourseId || 'none'}`;
  };

  useEffect(() => {
    if (!selectedCourseId) {
      setCompletedContent({});
      return;
    }

    try {
      const saved = localStorage.getItem(getProgressStorageKey());
      setCompletedContent(saved ? JSON.parse(saved) : {});
    } catch {
      setCompletedContent({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, user?._id, user?.id]);

  useEffect(() => {
    if (!selectedCourseId) return;
    try {
      localStorage.setItem(getProgressStorageKey(), JSON.stringify(completedContent));
    } catch {
      // Ignore storage failures
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedContent, selectedCourseId, user?._id, user?.id]);
  const courseInsights = useMemo(() => {
    const published = courses.filter((course) => course.isPublished).length;
    const totalModules = courses.reduce(
      (sum, course) => sum + (course.modules?.length || 0),
      0
    );
    return {
      total: courses.length,
      published,
      drafts: Math.max(courses.length - published, 0),
      totalModules
    };
  }, [courses]);

  const recentInventoryRows = useMemo(() => {
    const courseRows = courses.map((course) => {
      const modules = course.modules || [];
      const lectureCount = modules.reduce((sum, module) => sum + ((module.contents || []).length), 0);
      return {
        rowId: `course-${course._id}`,
        type: 'course',
        name: course.title,
        parentCourse: '-',
        contains: `${modules.length} modules / ${lectureCount} lectures`,
        structure: 'Course -> Modules -> Lectures',
        status: course.isPublished ? 'published' : 'draft',
        updatedAt: course.updatedAt || course.createdAt,
        courseId: course._id,
        courseData: course
      };
    });

    const moduleRows = courses.flatMap((course) =>
      (course.modules || []).map((module) => ({
        rowId: `module-${module._id}`,
        type: 'module',
        name: module.title,
        parentCourse: course.title,
        contains: `${(module.contents || []).length} lectures`,
        structure: 'Module inside Course',
        status: course.isPublished ? 'published' : 'draft',
        updatedAt: module.updatedAt || module.createdAt || course.updatedAt || course.createdAt,
        courseId: course._id,
        moduleData: {
          ...module,
          courseId: course._id,
          courseTitle: course.title,
          coursePublished: Boolean(course.isPublished)
        }
      }))
    );

    return [...courseRows, ...moduleRows]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 18);
  }, [courses]);

  const filteredInventoryRows = useMemo(() => {
    if (inventoryTypeFilter === 'all') return recentInventoryRows;
    return recentInventoryRows.filter((row) => row.type === inventoryTypeFilter);
  }, [recentInventoryRows, inventoryTypeFilter]);
  const moduleFileInputRefs = useRef({});
  const moduleImageInputRefs = useRef({});
  const thumbnailFileInputRef = useRef(null);
  const initialLecturePdfInputRef = useRef(null);
  const initialLectureVideoInputRef = useRef(null);

  const getContentUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
    return `${API_ORIGIN}/${url}`;
  };

  const getThumbnailUrl = (url) => {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('data:image/')) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
    return `${API_ORIGIN}/${value}`;
  };

  const updateThumbnailUrl = (value) => {
    setCourseForm((prev) => ({ ...prev, thumbnailUrl: value }));
  };

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleThumbnailFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please drop or upload an image file for thumbnail.', 'warning');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      updateThumbnailUrl(dataUrl);
    } catch {
      showToast('Unable to read image file. Please try another one.', 'error');
    }
  };

  const handleThumbnailDragOver = (event) => {
    event.preventDefault();
    setThumbnailDropActive(true);
  };

  const handleThumbnailDragLeave = () => {
    setThumbnailDropActive(false);
  };

  const handleThumbnailDrop = async (event) => {
    event.preventDefault();
    setThumbnailDropActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      await handleThumbnailFile(droppedFile);
      return;
    }

    const droppedText =
      event.dataTransfer.getData('text/uri-list') ||
      event.dataTransfer.getData('text/plain');

    if (droppedText && /^https?:\/\//i.test(droppedText.trim())) {
      updateThumbnailUrl(droppedText.trim());
    }
  };

  const handleThumbnailPickerChange = async (event) => {
    const file = event.target.files?.[0];
    await handleThumbnailFile(file);
    event.target.value = '';
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getCourses(search ? { search } : {});
      const items = res.data || [];
      setCourses(items);
      if (items.length && !selectedCourseId) {
        setSelectedCourseId(items[0]._id);
      }
      if (selectedCourseId && !items.find((item) => item._id === selectedCourseId)) {
        setSelectedCourseId(items[0]?._id || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const title = String(courseForm.title || '').trim();
    const subject = String(courseForm.subject || '').trim();
    const level = String(courseForm.level || 'Beginner');
    const initialModuleTitle = String(courseForm.initialModuleTitle || '').trim();
    const initialLectureVideoUrl = String(courseForm.initialLectureVideoUrl || '').trim();
    const description = String(courseForm.description || '').trim();
    const faqText = String(courseForm.faqText || '').trim();
    const thumbnailUrl = String(courseForm.thumbnailUrl || '').trim();

    if (!title) {
      showToast('Course title is required.', 'warning');
      return;
    }

    if (!subject) {
      showToast('Subject is required.', 'warning');
      return;
    }

    if (!LEVELS.includes(level)) {
      showToast('Please select a valid level.', 'warning');
      return;
    }

    if (initialLectureVideoUrl && !isValidHttpUrl(initialLectureVideoUrl)) {
      showToast('Initial lecture video URL must start with http:// or https://', 'warning');
      return;
    }

    if (thumbnailUrl && !isValidResourceUrl(thumbnailUrl)) {
      showToast('Thumbnail must be a valid image URL or uploaded image.', 'warning');
      return;
    }

    if ((initialLecturePdfFile || initialLectureVideoFile || initialLectureVideoUrl) && !initialModuleTitle) {
      showToast('Add an initial module title before attaching initial lecture files or video URL.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await createCourse({
        title,
        subject,
        level,
        description,
        thumbnailUrl,
        isPublished: courseForm.isPublished,
        faqs: parseFaqLines(faqText)
      });
      let latestCourse = res.data;

      if (initialModuleTitle) {
        const moduleRes = await addModule(latestCourse._id, {
          title: initialModuleTitle,
          description: ''
        });
        latestCourse = moduleRes.data;

        if (initialLecturePdfFile) {
          const sortedModules = (latestCourse.modules || [])
            .slice()
            .sort((a, b) => (b.order || 0) - (a.order || 0));
          const createdModule = sortedModules[0];

          if (createdModule?._id) {
            const formData = new FormData();
            formData.append('file', initialLecturePdfFile);
            formData.append('title', initialLecturePdfFile.name.replace(/\.pdf$/i, ''));
            formData.append('isPreview', 'false');

            const uploadRes = await uploadModulePdf(latestCourse._id, createdModule._id, formData);
            latestCourse = uploadRes.data;
          }
        }

        if (initialLectureVideoFile) {
          const sortedModules = (latestCourse.modules || [])
            .slice()
            .sort((a, b) => (b.order || 0) - (a.order || 0));
          const createdModule = sortedModules[0];

          if (createdModule?._id) {
            const formData = new FormData();
            formData.append('file', initialLectureVideoFile);
            formData.append('title', initialLectureVideoFile.name.replace(/\.[^/.]+$/i, ''));
            formData.append('isPreview', 'false');

            const uploadRes = await uploadModuleVideo(latestCourse._id, createdModule._id, formData);
            latestCourse = uploadRes.data;
          }
        }

        if (initialLectureVideoUrl) {
          const sortedModules = (latestCourse.modules || [])
            .slice()
            .sort((a, b) => (b.order || 0) - (a.order || 0));
          const createdModule = sortedModules[0];

          if (createdModule?._id) {
            const addVideoRes = await addContent(latestCourse._id, createdModule._id, {
              title: 'Lecture Recording',
              contentType: 'LectureVideo',
              url: initialLectureVideoUrl,
              textContent: '',
              isPreview: false
            });
            latestCourse = addVideoRes.data;
          }
        }
      }

      setCourses((prev) => [latestCourse, ...prev.filter((item) => item._id !== latestCourse._id)]);
      setSelectedCourseId(latestCourse._id);
      setCourseForm({
        title: '',
        subject: '',
        level: 'Beginner',
        initialModuleTitle: '',
        initialLectureVideoUrl: '',
        description: '',
        faqText: '',
        thumbnailUrl: '',
        isPublished: false
      });
      setInitialLecturePdfFile(null);
      setInitialLectureVideoFile(null);
      setShowCreateForm(false);
      setShowAdvancedCreate(false);
      if (initialLecturePdfInputRef.current) {
        initialLecturePdfInputRef.current.value = '';
      }
      if (initialLectureVideoInputRef.current) {
        initialLectureVideoInputRef.current.value = '';
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create course.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (course) => {
    try {
      const res = await updateCourse(course._id, { isPublished: !course.isPublished });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update course publish status.', 'error');
    }
  };

  const openCourseEditDialog = (course) => {
    setEditDialog({
      open: true,
      type: 'course',
      courseId: course._id,
      moduleId: '',
      contentId: '',
      form: {
        title: course.title || '',
        subject: course.subject || '',
        level: course.level || 'Beginner',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl || '',
        faqText: stringifyFaqLines(course.faqs || [])
      }
    });
  };

  const openModuleEditDialog = (module, courseId) => {
    setEditDialog({
      open: true,
      type: 'module',
      courseId,
      moduleId: module._id,
      contentId: '',
      form: {
        title: module.title || '',
        description: module.description || '',
        faqText: stringifyFaqLines(module.faqs || [])
      }
    });
  };

  const openContentEditDialog = (content, moduleId, courseId) => {
    setEditDialog({
      open: true,
      type: 'content',
      courseId,
      moduleId,
      contentId: content._id,
      form: {
        title: content.title || '',
        contentType: content.contentType || 'Video',
        url: content.url || '',
        textContent: content.textContent || ''
      }
    });
  };

  const openDeleteDialog = (payload) => {
    setDeleteDialog({
      open: true,
      type: payload.type,
      courseId: payload.courseId || '',
      moduleId: payload.moduleId || '',
      contentId: payload.contentId || '',
      name: payload.name || ''
    });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: 'course', courseId: '', moduleId: '', contentId: '', form: {} });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, type: '', courseId: '', moduleId: '', contentId: '', name: '' });
  };

  const handleEditDialogChange = (key, value) => {
    setEditDialog((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));
  };

  const submitEditDialog = async () => {
    try {
      setModalSaving(true);

      if (editDialog.type === 'course') {
        const title = String(editDialog.form.title || '').trim();
        const subject = String(editDialog.form.subject || '').trim();
        const level = String(editDialog.form.level || 'Beginner').trim();
        const description = String(editDialog.form.description || '').trim();
        const thumbnailUrl = String(editDialog.form.thumbnailUrl || '').trim();
        const faqText = String(editDialog.form.faqText || '');

        if (!title) {
          showToast('Course title is required.', 'warning');
          return;
        }
        if (!subject) {
          showToast('Subject is required.', 'warning');
          return;
        }
        if (!LEVELS.includes(level)) {
          showToast('Invalid level value.', 'warning');
          return;
        }
        if (thumbnailUrl && !isValidResourceUrl(thumbnailUrl)) {
          showToast('Thumbnail must be a valid image URL or uploaded image data URL.', 'warning');
          return;
        }

        const res = await updateCourse(editDialog.courseId, {
          title,
          subject,
          level,
          description,
          thumbnailUrl,
          faqs: parseFaqLines(faqText)
        });
        const updated = res.data;
        setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      }

      if (editDialog.type === 'module') {
        const title = String(editDialog.form.title || '').trim();
        const description = String(editDialog.form.description || '').trim();
        const faqText = String(editDialog.form.faqText || '');

        if (!title) {
          showToast('Module title is required.', 'warning');
          return;
        }

        const res = await updateModule(editDialog.courseId, editDialog.moduleId, {
          title,
          description,
          faqs: parseFaqLines(faqText)
        });
        const updated = res.data;
        setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        setSelectedCourseId(editDialog.courseId);
      }

      if (editDialog.type === 'content') {
        const title = String(editDialog.form.title || '').trim();
        const contentType = String(editDialog.form.contentType || '').trim();
        const url = String(editDialog.form.url || '').trim();
        const textContent = String(editDialog.form.textContent || '');

        if (!title) {
          showToast('Content title is required.', 'warning');
          return;
        }
        if (!contentType || !CONTENT_TYPES.includes(contentType)) {
          showToast('Invalid content type.', 'warning');
          return;
        }
        if (url && !isValidResourceUrl(url)) {
          showToast('Content URL must be a valid URL.', 'warning');
          return;
        }

        const res = await updateContent(editDialog.courseId, editDialog.moduleId, editDialog.contentId, {
          title,
          contentType,
          url,
          textContent
        });
        const updated = res.data;
        setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        setSelectedCourseId(editDialog.courseId);
      }

      closeEditDialog();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save changes.', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const confirmDeleteDialog = async () => {
    try {
      setModalSaving(true);

      if (deleteDialog.type === 'course') {
        await deleteCourse(deleteDialog.courseId);
        setCourses((prev) => prev.filter((item) => item._id !== deleteDialog.courseId));
        if (selectedCourseId === deleteDialog.courseId) {
          setSelectedCourseId('');
        }
      }

      if (deleteDialog.type === 'module') {
        const res = await deleteModule(deleteDialog.courseId, deleteDialog.moduleId);
        const updated = res.data;
        setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        setSelectedCourseId(deleteDialog.courseId);
      }

      if (deleteDialog.type === 'content') {
        const res = await deleteContent(deleteDialog.courseId, deleteDialog.moduleId, deleteDialog.contentId);
        const updated = res.data;
        setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      }

      closeDeleteDialog();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete item.', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const handleEditCourse = (course) => {
    openCourseEditDialog(course);
  };

  const handleDeleteCourse = (course) => {
    openDeleteDialog({ type: 'course', courseId: course._id, name: course.title });
  };

  const handleAddModule = async () => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('Module title');
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      showToast('Module title is required.', 'warning');
      return;
    }

    const description = window.prompt('Module description (optional)') || '';
    const faqText = window.prompt('Module FAQs (optional, one per line: question | answer)') || '';

    try {
      const res = await addModule(selectedCourse._id, {
        title,
        description,
        faqs: parseFaqLines(faqText)
      });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add module.', 'error');
    }
  };

  const handleEditModule = (module) => {
    if (!selectedCourse) return;
    openModuleEditDialog(module, selectedCourse._id);
  };

  const handleDeleteModule = (module) => {
    if (!selectedCourse) return;
    openDeleteDialog({ type: 'module', courseId: selectedCourse._id, moduleId: module._id, name: module.title });
  };

  const handleEditModuleFromRow = (moduleRow) => {
    openModuleEditDialog(moduleRow, moduleRow.courseId);
  };

  const handleDeleteModuleFromRow = (moduleRow) => {
    openDeleteDialog({ type: 'module', courseId: moduleRow.courseId, moduleId: moduleRow._id, name: moduleRow.title });
  };

  const handleAddContent = async (module) => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('Content title');
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      showToast('Content title is required.', 'warning');
      return;
    }

    const contentTypeInput = window.prompt(
      `Content type (${CONTENT_TYPES.join(', ')})`,
      'Video'
    );
    const contentType = String(contentTypeInput || '').trim();

    if (!contentType || !CONTENT_TYPES.includes(contentType)) {
      showToast('Invalid content type.', 'warning');
      return;
    }

    const url = String(window.prompt('Content URL (optional)') || '').trim();
    if (url && !isValidResourceUrl(url)) {
      showToast('Content URL must be a valid URL.', 'warning');
      return;
    }
    const textContent = window.prompt('Text content (optional)') || '';

    try {
      const res = await addContent(selectedCourse._id, module._id, {
        title,
        contentType,
        url,
        textContent,
        isPreview: false
      });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add content item.', 'error');
    }
  };

  const handleEditContent = (module, content) => {
    if (!selectedCourse) return;
    openContentEditDialog(content, module._id, selectedCourse._id);
  };

  const handleDeleteContent = (module, content) => {
    if (!selectedCourse) return;
    openDeleteDialog({
      type: 'content',
      courseId: selectedCourse._id,
      moduleId: module._id,
      contentId: content._id,
      name: content.title
    });
  };

  const openPdfPicker = (moduleId) => {
    const input = moduleFileInputRefs.current[moduleId];
    if (input) {
      input.click();
    }
  };

  const openImagePicker = (moduleId) => {
    const input = moduleImageInputRefs.current[moduleId];
    if (input) {
      input.click();
    }
  };

  const handlePdfUpload = async (module, event) => {
    if (!selectedCourse) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingModuleId(module._id);
      const titleInput = window.prompt('PDF title (optional)', file.name.replace(/\.pdf$/i, ''));
      const title = String(titleInput || file.name).trim() || file.name;
      const isPreview = window.confirm('Should this PDF be preview-accessible for students?');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('isPreview', String(isPreview));

      const res = await uploadModulePdf(selectedCourse._id, module._id, formData);
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to upload module PDF.', 'error');
    } finally {
      setUploadingModuleId('');
      event.target.value = '';
    }
  };

  const handleImageUpload = async (module, event) => {
    if (!selectedCourse) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingModuleId(module._id);
      const defaultTitle = file.name.replace(/\.[^/.]+$/i, '');
      const titleInput = window.prompt('Image title (optional)', defaultTitle);
      const title = String(titleInput || defaultTitle).trim() || defaultTitle;
      const isPreview = window.confirm('Should this image be preview-accessible for students?');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('isPreview', String(isPreview));

      const res = await uploadModuleImage(selectedCourse._id, module._id, formData);
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to upload module image.', 'error');
    } finally {
      setUploadingModuleId('');
      event.target.value = '';
    }
  };

  const handleAddUrlContent = async (module) => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('URL content title');
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      showToast('URL content title is required.', 'warning');
      return;
    }

    const urlInput = window.prompt('Paste content URL (http/https)');
    const url = String(urlInput || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      showToast('Please provide a valid URL starting with http:// or https://', 'warning');
      return;
    }

    const contentTypeInput = window.prompt('Content type for URL (Link, Video, Article)', 'Link') || 'Link';
    const contentType = String(contentTypeInput || 'Link').trim();
    if (!CONTENT_TYPES.includes(contentType)) {
      showToast('Invalid content type for URL content.', 'warning');
      return;
    }

    try {
      const res = await addContent(selectedCourse._id, module._id, {
        title,
        contentType,
        url: url.trim(),
        textContent: '',
        isPreview: false
      });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add URL content item.', 'error');
    }
  };

  const toggleContentComplete = (contentId) => {
    setCompletedContent((prev) => ({
      ...prev,
      [contentId]: !prev[contentId]
    }));
  };

  const toggleModuleTools = (moduleId) => {
    setExpandedModuleTools((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleContinueLearning = () => {
    if (!selectedCourse) return;

    const orderedContents = (selectedCourse.modules || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .flatMap((module) =>
        (module.contents || [])
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
      );

    if (orderedContents.length === 0) {
      showToast('No learning content is available yet for this course.', 'info');
      return;
    }

    const firstIncomplete = orderedContents.find((content) => !completedContent[content._id]);

    if (!firstIncomplete) {
      showToast('Great work! You have completed all available content in this course.', 'info');
      return;
    }

    if (firstIncomplete.url) {
      window.open(getContentUrl(firstIncomplete.url), '_blank', 'noopener,noreferrer');
      return;
    }

    showToast(`Next item: ${firstIncomplete.title}`, 'info');
  };

  const resetFilters = async () => {
    setSearch('');
    setLevelFilter('All');
    setPublishFilter('all');
    setSortBy('newest');

    try {
      setLoading(true);
      setError('');
      const res = await getCourses();
      const items = res.data || [];
      setCourses(items);
      if (items.length && !selectedCourseId) {
        setSelectedCourseId(items[0]._id);
      }
      if (selectedCourseId && !items.find((item) => item._id === selectedCourseId)) {
        setSelectedCourseId(items[0]?._id || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reset filters.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout activeSection="Course & Content Management">
      <div className="course-page">
        <div className="course-head">
          <div>
            <h1>{pageTitle}</h1>
            <p className="course-head-sub">{isManager ? 'Manage courses, modules & content.' : 'Browse published courses.'}</p>
          </div>
          <button className="btn-refresh" onClick={loadCourses} title="Refresh courses">↻ Refresh</button>
        </div>

        <div className="course-insights">
          <div className="insight-card">
            <span className="insight-label">Total Courses</span>
            <span className="insight-value">{courseInsights.total}</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Published</span>
            <span className="insight-value">{courseInsights.published}</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Drafts</span>
            <span className="insight-value">{courseInsights.drafts}</span>
          </div>
          <div className="insight-card highlight">
            <span className="insight-label">Total Modules</span>
            <span className="insight-value">{courseInsights.totalModules}</span>
          </div>
        </div>

        <div className="course-grid">
          <section className="course-sidebar">
            <div className="sidebar-title">
              <h3>Filters</h3>
              <button className="btn-clear-filters" onClick={resetFilters}>Reset</button>
            </div>

            <div className="search-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCourses()}
                placeholder="🔍  Search courses…"
              />
            </div>

            <div className="sidebar-controls">
              <div className="level-filter-row">
                <span className="control-label">Level</span>
                <div className="level-pills">
                  {['All', ...LEVELS].map((level) => (
                    <button
                      key={level}
                      className={`small-pill ${levelFilter === level ? 'active' : ''}`}
                      onClick={() => setLevelFilter(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="publish-filter-row">
                <button
                  className={`small-pill ${publishFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPublishFilter('all')}
                >
                  All
                </button>
                <button
                  className={`small-pill ${publishFilter === 'published' ? 'active' : ''}`}
                  onClick={() => setPublishFilter('published')}
                >
                  Published
                </button>
                <button
                  className={`small-pill ${publishFilter === 'draft' ? 'active' : ''}`}
                  onClick={() => setPublishFilter('draft')}
                >
                  Drafts
                </button>
              </div>

              <div className="sort-row">
                <span className="control-label">Sort</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="modules-desc">Most Modules</option>
                </select>
              </div>
            </div>

            {loading ? <p>Loading courses...</p> : null}
            {error ? <p className="err-text">{error}</p> : null}

            <div className="list-head">
              <p className="list-title">Recent Courses</p>
              <span className="list-count">{filteredCount} shown</span>
            </div>

            <div className="course-list">
              {filteredCourses.map((course) => (
                <button
                  key={course._id}
                  className={`course-item ${selectedCourseId === course._id ? 'active' : ''}`}
                  onClick={() => setSelectedCourseId(course._id)}
                >
                  {course.thumbnailUrl ? (
                    <div
                      className="course-item-thumb"
                      style={{ backgroundImage: `url(${getThumbnailUrl(course.thumbnailUrl)})` }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="course-item-title">{course.title}</div>
                  <div className="course-item-meta">{course.subject} • {course.level}</div>
                  <span className={`pill ${course.isPublished ? 'ok' : 'draft'}`}>
                    {course.isPublished ? 'Published' : 'Draft'}
                  </span>
                </button>
              ))}
              {!loading && filteredCourses.length === 0 ? (
                <div className="empty-inline">No courses found. Try another search.</div>
              ) : null}
            </div>
          </section>

          <section className="course-main">
            <div className={`course-main-grid ${isManager ? 'has-create-pane' : ''}`}>

              {isManager && (
                <div className="modal-trigger-bar">
                  <button
                    className="btn-create-toggle btn-new-course"
                    onClick={() => {
                      setShowCreateForm(true);
                      setShowAdvancedCreate(false);
                      setCourseForm({ title: '', subject: '', level: 'Beginner', initialModuleTitle: '', initialLectureVideoUrl: '', description: '', faqText: '', thumbnailUrl: '', isPublished: false });
                      setModalModules([{ title: '', description: '' }]);
                      setInitialLecturePdfFile(null);
                      setInitialLectureVideoFile(null);
                    }}
                  >
                    + New Course
                  </button>
                </div>
              )}

              <div className="course-detail-pane">
                {!selectedCourse && !loading ? (
                  <div className="empty-box">Select a course from the left panel.</div>
                ) : null}

                {selectedCourse && (
                  <div className="course-detail">
                    <div className="detail-head">
                      <div>
                        <h2>{selectedCourse.title}</h2>
                        <p>{selectedCourse.subject} • {selectedCourse.level}</p>
                        <div className="selected-meta">
                          <span className={`pill ${selectedCourse.isPublished ? 'ok' : 'draft'}`}>
                            {selectedCourse.isPublished ? 'Published' : 'Draft'}
                          </span>
                          <span className="meta-chip">{(selectedCourse.modules || []).length} modules</span>
                        </div>
                      </div>
                      {isManager && (
                        <div className="detail-actions">
                          <button className="btn-icon btn-edit" onClick={() => handleEditCourse(selectedCourse)} title="Edit course" aria-label="Edit course">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M3 17.25V21h3.75L18.81 8.94l-3.75-3.75L3 17.25z" fill="currentColor" />
                              <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.13-1.13z" fill="currentColor" />
                            </svg>
                          </button>
                          <button className="btn-icon btn-publish" onClick={() => togglePublish(selectedCourse)} title={selectedCourse.isPublished ? 'Unpublish' : 'Publish'}>
                            {selectedCourse.isPublished ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0-2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" fill="currentColor" />
                                <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 5h2v5h-2zm0 7h2v3h-2z" fill="currentColor" />
                              </svg>
                            )}
                          </button>
                          <button className="btn-icon danger btn-delete" onClick={() => handleDeleteCourse(selectedCourse)} title="Delete course" aria-label="Delete course">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" fill="currentColor" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedCourse.thumbnailUrl ? (
                      <div
                        className="course-detail-thumb"
                        style={{ backgroundImage: `url(${getThumbnailUrl(selectedCourse.thumbnailUrl)})` }}
                        aria-label="Course thumbnail"
                      />
                    ) : null}

                    <p className="desc">{selectedCourse.description || 'No description added yet.'}</p>

                    <div className="progress-card">
                      <div className="progress-head">
                        <h3>Learning Progress</h3>
                        <span>{courseProgress.done}/{courseProgress.total} items completed</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${courseProgress.percent}%` }}></div>
                      </div>
                      <div className="progress-actions">
                        <p className="progress-note">{courseProgress.percent}% complete</p>
                        <button className="btn-continue" onClick={handleContinueLearning}>
                          Continue Learning
                        </button>
                      </div>
                    </div>

                    <div className="module-head">
                      <h3>Modules</h3>
                      {isManager && <button className="btn-add" onClick={handleAddModule}>Add Module</button>}
                    </div>

                    <div className="module-list">
                      {(selectedCourse.modules || []).map((module) => (
                        <div key={module._id} className="module-card">
                          <div className="module-top">
                            <div>
                              <h4>{module.order}. {module.title}</h4>
                              <p>{module.description || 'No description.'}</p>
                            </div>
                            {isManager && (
                              <div className="module-actions">
                                <button
                                  className="btn-icon btn-secondary module-more-btn"
                                  onClick={() => toggleModuleTools(module._id)}
                                  title="Module actions"
                                >
                                  {expandedModuleTools[module._id] ? '✕' : '⋯'}
                                </button>
                              </div>
                            )}

                            {isManager && expandedModuleTools[module._id] ? (
                              <div className="module-actions-advanced">
                                <button className="btn-sm btn-add" onClick={() => handleAddContent(module)} title="Add content">+ Content</button>
                                <button className="btn-sm btn-edit" onClick={() => handleEditModule(module)} title="Edit module">✎ Edit</button>
                                <button
                                  className="btn-sm btn-upload"
                                  onClick={() => openPdfPicker(module._id)}
                                  disabled={uploadingModuleId === module._id}
                                  title="Upload PDF"
                                >
                                  {uploadingModuleId === module._id ? '…' : '📄 PDF'}
                                </button>
                                <button
                                  className="btn-sm btn-upload"
                                  onClick={() => openImagePicker(module._id)}
                                  disabled={uploadingModuleId === module._id}
                                  title="Upload Image"
                                >
                                  {uploadingModuleId === module._id ? '…' : '🖼 Image'}
                                </button>
                                <button className="btn-sm btn-add" onClick={() => handleAddUrlContent(module)} title="Add URL">🔗 URL</button>
                                <button className="btn-sm danger btn-delete" onClick={() => handleDeleteModule(module)} title="Delete module">🗑 Delete</button>
                              </div>
                            ) : null}
                          </div>

                          <input
                            ref={(el) => { moduleFileInputRefs.current[module._id] = el; }}
                            type="file"
                            accept="application/pdf,.pdf"
                            style={{ display: 'none' }}
                            onChange={(event) => handlePdfUpload(module, event)}
                          />
                          <input
                            ref={(el) => { moduleImageInputRefs.current[module._id] = el; }}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(event) => handleImageUpload(module, event)}
                          />

                          {isManager ? (
                            <div className="uploaded-items-table-wrap">
                              {(module.contents || []).length > 0 ? (
                                <table className="uploaded-items-table">
                                  <thead>
                                    <tr>
                                      <th>Item</th>
                                      <th>Type</th>
                                      <th>Source</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(module.contents || []).map((content) => (
                                      <tr key={content._id}>
                                        <td>
                                          {content.url ? (
                                            <a
                                              href={getContentUrl(content.url)}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="content-link"
                                              title="Open content"
                                            >
                                              {content.order}. {content.title}
                                            </a>
                                          ) : (
                                            <strong>{content.order}. {content.title}</strong>
                                          )}
                                        </td>
                                        <td>{content.contentType}</td>
                                        <td className="content-source-cell">{content.url || 'Uploaded / internal file'}</td>
                                        <td>
                                          <div className="uploaded-items-actions">
                                            <button className="btn-edit" onClick={() => handleEditContent(module, content)}>Edit</button>
                                            <button className="danger btn-delete" onClick={() => handleDeleteContent(module, content)}>Delete</button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-inline">No uploaded items yet.</div>
                              )}
                            </div>
                          ) : (
                            <div className="content-list">
                              {(module.contents || []).map((content) => (
                                <div key={content._id} className="content-item">
                                  <div className="content-main">
                                    <label className="complete-toggle" title="Mark as completed">
                                      <input
                                        type="checkbox"
                                        checked={!!completedContent[content._id]}
                                        onChange={() => toggleContentComplete(content._id)}
                                      />
                                      <span className="check-indicator"></span>
                                    </label>
                                    <div>
                                      {content.url ? (
                                        <a
                                          href={getContentUrl(content.url)}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="content-link"
                                          title="Open content"
                                        >
                                          {content.order}. {content.title}
                                        </a>
                                      ) : (
                                        <strong>{content.order}. {content.title}</strong>
                                      )}
                                      <p>{content.contentType}{content.url ? ` • ${content.url}` : ''}</p>
                                    </div>
                                  </div>
                                  <span className="preview-tag">{content.isPreview ? 'Preview' : 'Locked'}</span>
                                </div>
                              ))}
                              {(!module.contents || module.contents.length === 0) ? (
                                <div className="empty-inline">No content items yet.</div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                      {(selectedCourse.modules || []).length === 0 ? (
                        <div className="empty-inline">No modules yet.</div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {isManager ? (
          <section className="course-inventory-section">
            <div className="course-inventory-head">
              <h3>Recent Course & Module Inventory</h3>
              <span>{filteredInventoryRows.length} items</span>
            </div>
            <div className="course-inventory-grid">
              <div className="inventory-table-wrap">
                <div className="inventory-table-head">
                  <h4>Recent Items</h4>
                  <div className="inventory-type-filter" role="group" aria-label="Inventory type filter">
                    <button
                      type="button"
                      className={`small-pill ${inventoryTypeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setInventoryTypeFilter('all')}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`small-pill ${inventoryTypeFilter === 'course' ? 'active' : ''}`}
                      onClick={() => setInventoryTypeFilter('course')}
                    >
                      Course
                    </button>
                    <button
                      type="button"
                      className={`small-pill ${inventoryTypeFilter === 'module' ? 'active' : ''}`}
                      onClick={() => setInventoryTypeFilter('module')}
                    >
                      Module
                    </button>
                  </div>
                </div>
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Parent Course</th>
                      <th>Contains</th>
                      <th>Structure</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventoryRows.map((row) => (
                      <tr key={row.rowId}>
                        <td>{row.type === 'course' ? 'Course' : 'Module'}</td>
                        <td>{row.name}</td>
                        <td>{row.parentCourse}</td>
                        <td>{row.contains}</td>
                        <td>{row.structure}</td>
                        <td>
                          <span className={`inventory-status ${row.status}`}>
                            {row.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <div className="inventory-actions">
                            <button className="btn-add" onClick={() => setSelectedCourseId(row.courseId)}>Open</button>
                            {row.type === 'course' ? (
                              <>
                                <button className="btn-edit" onClick={() => handleEditCourse(row.courseData)}>Edit</button>
                                <button className="danger btn-delete" onClick={() => handleDeleteCourse(row.courseData)}>Delete</button>
                              </>
                            ) : (
                              <>
                                <button className="btn-edit" onClick={() => handleEditModuleFromRow(row.moduleData)}>Edit</button>
                                <button className="danger btn-delete" onClick={() => handleDeleteModuleFromRow(row.moduleData)}>Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredInventoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="inventory-empty">No recent inventory items.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {/* ── Edit Dialog ── */}
      {editDialog.open ? (
        <div className="cm-modal-overlay" onClick={closeEditDialog}>
          <div className="cm-modal cm-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <div>
                <h2 className="cm-modal-title">
                  {editDialog.type === 'course' ? 'Edit Course' : editDialog.type === 'module' ? 'Edit Module' : 'Edit Content'}
                </h2>
                <p className="cm-modal-sub">Update details and save your changes.</p>
              </div>
              <button className="cm-modal-close" onClick={closeEditDialog}>✕</button>
            </div>

            <div className="cm-modal-body cm-action-body">
              {editDialog.type === 'course' ? (
                <div className="cm-fields">
                  <div className="cm-field cm-field-full">
                    <label>Course Title</label>
                    <input value={editDialog.form.title || ''} onChange={(e) => handleEditDialogChange('title', e.target.value)} />
                  </div>
                  <div className="cm-field">
                    <label>Subject</label>
                    <input value={editDialog.form.subject || ''} onChange={(e) => handleEditDialogChange('subject', e.target.value)} />
                  </div>
                  <div className="cm-field">
                    <label>Level</label>
                    <select value={editDialog.form.level || 'Beginner'} onChange={(e) => handleEditDialogChange('level', e.target.value)}>
                      {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>Description</label>
                    <textarea rows={3} value={editDialog.form.description || ''} onChange={(e) => handleEditDialogChange('description', e.target.value)} />
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>Thumbnail URL</label>
                    <input value={editDialog.form.thumbnailUrl || ''} onChange={(e) => handleEditDialogChange('thumbnailUrl', e.target.value)} />
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>FAQs (question | answer per line)</label>
                    <textarea rows={4} value={editDialog.form.faqText || ''} onChange={(e) => handleEditDialogChange('faqText', e.target.value)} />
                  </div>
                </div>
              ) : null}

              {editDialog.type === 'module' ? (
                <div className="cm-fields">
                  <div className="cm-field cm-field-full">
                    <label>Module Title</label>
                    <input value={editDialog.form.title || ''} onChange={(e) => handleEditDialogChange('title', e.target.value)} />
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>Description</label>
                    <textarea rows={3} value={editDialog.form.description || ''} onChange={(e) => handleEditDialogChange('description', e.target.value)} />
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>FAQs (question | answer per line)</label>
                    <textarea rows={4} value={editDialog.form.faqText || ''} onChange={(e) => handleEditDialogChange('faqText', e.target.value)} />
                  </div>
                </div>
              ) : null}

              {editDialog.type === 'content' ? (
                <div className="cm-fields">
                  <div className="cm-field cm-field-full">
                    <label>Content Title</label>
                    <input value={editDialog.form.title || ''} onChange={(e) => handleEditDialogChange('title', e.target.value)} />
                  </div>
                  <div className="cm-field">
                    <label>Content Type</label>
                    <select value={editDialog.form.contentType || 'Video'} onChange={(e) => handleEditDialogChange('contentType', e.target.value)}>
                      {CONTENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="cm-field">
                    <label>Content URL</label>
                    <input value={editDialog.form.url || ''} onChange={(e) => handleEditDialogChange('url', e.target.value)} />
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>Text Content</label>
                    <textarea rows={4} value={editDialog.form.textContent || ''} onChange={(e) => handleEditDialogChange('textContent', e.target.value)} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="cm-modal-footer">
              <button type="button" className="cm-btn-cancel" onClick={closeEditDialog}>Cancel</button>
              <button type="button" className="cm-btn-submit" onClick={submitEditDialog} disabled={modalSaving}>
                {modalSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteDialog.open ? (
        <div className="cm-modal-overlay" onClick={closeDeleteDialog}>
          <div className="cm-modal cm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <div>
                <h2 className="cm-modal-title">Confirm Delete</h2>
                <p className="cm-modal-sub">This action cannot be undone.</p>
              </div>
              <button className="cm-modal-close" onClick={closeDeleteDialog}>✕</button>
            </div>

            <div className="cm-modal-body cm-confirm-body">
              <p>
                Are you sure you want to delete
                <strong>{` ${deleteDialog.name || 'this item'}`}</strong>?
              </p>
            </div>

            <div className="cm-modal-footer">
              <button type="button" className="cm-btn-cancel" onClick={closeDeleteDialog}>Cancel</button>
              <button type="button" className="cm-btn-submit cm-btn-danger" onClick={confirmDeleteDialog} disabled={modalSaving}>
                {modalSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Create Course Modal ── */}
      {showCreateForm && (
        <div className="cm-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <div>
                <h2 className="cm-modal-title">✦ Create New Course</h2>
                <p className="cm-modal-sub">Fill in the details below. You can always edit later.</p>
              </div>
              <button className="cm-modal-close" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>

            <form className="cm-modal-body" onSubmit={async (e) => {
              e.preventDefault();
              const titleVal = String(courseForm.title || '').trim();
              const subjectVal = String(courseForm.subject || '').trim();
              const levelVal = String(courseForm.level || 'Beginner');
              if (!titleVal) { showToast('Course title is required.', 'warning'); return; }
              if (!subjectVal) { showToast('Subject is required.', 'warning'); return; }
              if (!LEVELS.includes(levelVal)) { showToast('Please select a valid level.', 'warning'); return; }

              try {
                setSaving(true);
                // courseService already unwraps response.data, so result IS the {success, data} object
                const res = await createCourse({
                  title: titleVal,
                  subject: subjectVal,
                  level: levelVal,
                  description: String(courseForm.description || '').trim(),
                  thumbnailUrl: String(courseForm.thumbnailUrl || '').trim(),
                  isPublished: courseForm.isPublished,
                  faqs: parseFaqLines(courseForm.faqText)
                });
                let latest = res.data;  // res = {success, data: course}

                const validModules = modalModules.filter((m) => String(m.title || '').trim());
                for (const mod of validModules) {
                  const mr = await addModule(latest._id, {
                    title: String(mod.title).trim(),
                    description: String(mod.description || '').trim()
                  });
                  latest = mr.data;  // mr = {success, data: updatedCourse}
                }

                setCourses((prev) => [latest, ...prev.filter((c) => c._id !== latest._id)]);
                setSelectedCourseId(latest._id);
                setCourseForm({ title: '', subject: '', level: 'Beginner', initialModuleTitle: '', initialLectureVideoUrl: '', description: '', faqText: '', thumbnailUrl: '', isPublished: false });
                setModalModules([{ title: '', description: '' }]);
                setShowCreateForm(false);
              } catch (err) {
                showToast(err?.response?.data?.message || err?.message || 'Failed to create course.', 'error');
              } finally {
                setSaving(false);
              }
            }}>

              {/* ── Section 1: Course Info ── */}
              <div className="cm-section">
                <p className="cm-section-label">📚 Course Details</p>
                <div className="cm-fields">
                  <div className="cm-field cm-field-full">
                    <label>Course Title <span className="cm-req">*</span></label>
                    <input
                      required
                      minLength={3}
                      value={courseForm.title}
                      onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Introduction to Python"
                    />
                  </div>
                  <div className="cm-field">
                    <label>Subject <span className="cm-req">*</span></label>
                    <input
                      required
                      minLength={2}
                      value={courseForm.subject}
                      onChange={(e) => setCourseForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                  <div className="cm-field">
                    <label>Level</label>
                    <select
                      value={courseForm.level}
                      onChange={(e) => setCourseForm((prev) => ({ ...prev, level: e.target.value }))}
                    >
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>Description</label>
                    <textarea
                      value={courseForm.description}
                      onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="What will students learn?"
                      rows={3}
                    />
                  </div>
                  <div className="cm-field cm-field-full">
                    <label>Thumbnail URL</label>
                    <div className="cm-thumb-row">
                      <input
                        value={courseForm.thumbnailUrl}
                        onChange={(e) => updateThumbnailUrl(e.target.value)}
                        placeholder="https://…  or upload below"
                        type="text"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={thumbnailFileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleThumbnailPickerChange}
                      />
                      <button type="button" className="btn-upload-thumb" onClick={() => thumbnailFileInputRef.current?.click()}>📁 Upload</button>
                    </div>
                    {courseForm.thumbnailUrl && (
                      <img src={courseForm.thumbnailUrl} alt="preview" className="cm-thumb-preview" />
                    )}
                  </div>
                  <div className="cm-field cm-field-full cm-publish-row">
                    <label className="cm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={courseForm.isPublished}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                      />
                      <span>Publish immediately</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Modules ── */}
              <div className="cm-section">
                <div className="cm-section-head">
                  <p className="cm-section-label">🗂 Modules</p>
                  <button
                    type="button"
                    className="btn-sm btn-add cm-add-module-btn"
                    onClick={() => setModalModules((prev) => [...prev, { title: '', description: '' }])}
                  >
                    + Add Module
                  </button>
                </div>

                <div className="cm-modules-list">
                  {modalModules.map((mod, idx) => (
                    <div key={idx} className="cm-module-row">
                      <div className="cm-module-num">{idx + 1}</div>
                      <div className="cm-module-fields">
                        <input
                          value={mod.title}
                          onChange={(e) => {
                            const next = [...modalModules];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setModalModules(next);
                          }}
                          placeholder={`Module ${idx + 1} title`}
                        />
                        <input
                          value={mod.description}
                          onChange={(e) => {
                            const next = [...modalModules];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setModalModules(next);
                          }}
                          placeholder="Description (optional)"
                        />
                      </div>
                      {modalModules.length > 1 && (
                        <button
                          type="button"
                          className="cm-module-remove"
                          onClick={() => setModalModules((prev) => prev.filter((_, i) => i !== idx))}
                          title="Remove module"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Footer buttons ── */}
              <div className="cm-modal-footer">
                <button type="button" className="cm-btn-cancel" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button
                  type="submit"
                  className="cm-btn-submit"
                  disabled={saving}
                >
                  {saving ? '⏳ Creating…' : '🚀 Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast Notifications ── */}
      {toasts.length > 0 && (
        <div className="cm-toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`cm-toast cm-toast-${toast.type}`}>
              <span className="cm-toast-icon">
                {toast.type === 'error' ? '✖' : toast.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span className="cm-toast-msg">{toast.message}</span>
              <button className="cm-toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">✕</button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CourseManager;
