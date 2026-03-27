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
  const [sortBy, setSortBy] = useState('newest');
  const [uploadingModuleId, setUploadingModuleId] = useState('');
  const [thumbnailDropActive, setThumbnailDropActive] = useState(false);
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
      alert('Please drop or upload an image file for thumbnail.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      updateThumbnailUrl(dataUrl);
    } catch {
      alert('Unable to read image file. Please try another one.');
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
      alert('Course title is required.');
      return;
    }

    if (!subject) {
      alert('Subject is required.');
      return;
    }

    if (!LEVELS.includes(level)) {
      alert('Please select a valid level.');
      return;
    }

    if (initialLectureVideoUrl && !isValidHttpUrl(initialLectureVideoUrl)) {
      alert('Initial lecture video URL must start with http:// or https://');
      return;
    }

    if (thumbnailUrl && !isValidResourceUrl(thumbnailUrl)) {
      alert('Thumbnail must be a valid image URL or uploaded image.');
      return;
    }

    if ((initialLecturePdfFile || initialLectureVideoFile || initialLectureVideoUrl) && !initialModuleTitle) {
      alert('Add an initial module title before attaching initial lecture files or video URL.');
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
      if (initialLecturePdfInputRef.current) {
        initialLecturePdfInputRef.current.value = '';
      }
      if (initialLectureVideoInputRef.current) {
        initialLectureVideoInputRef.current.value = '';
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create course.');
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
      alert(err?.response?.data?.message || 'Failed to update course publish status.');
    }
  };

  const handleEditCourse = async (course) => {
    const titleInput = window.prompt('Edit course title', course.title);
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      alert('Course title is required.');
      return;
    }

    const subjectInput = window.prompt('Edit subject', course.subject);
    if (subjectInput === null) return;
    const subject = String(subjectInput || '').trim();
    if (!subject) {
      alert('Subject is required.');
      return;
    }

    const levelInput = window.prompt(`Edit level (${LEVELS.join(', ')})`, course.level || 'Beginner');
    const level = String(levelInput || '').trim();
    if (!level || !LEVELS.includes(level)) {
      alert('Invalid level value.');
      return;
    }

    const description = window.prompt('Edit description', course.description || '') || '';
    const thumbnailUrl = (window.prompt('Edit thumbnail URL', course.thumbnailUrl || '') || '').trim();
    if (thumbnailUrl && !isValidResourceUrl(thumbnailUrl)) {
      alert('Thumbnail must be a valid image URL or uploaded image data URL.');
      return;
    }
    const faqText =
      window.prompt(
        'Course FAQs (one per line: question | answer)',
        stringifyFaqLines(course.faqs || [])
      ) || '';

    try {
      const res = await updateCourse(course._id, {
        title,
        subject,
        level,
        description,
        thumbnailUrl,
        faqs: parseFaqLines(faqText)
      });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update course.');
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete course "${course.title}"?`)) return;

    try {
      await deleteCourse(course._id);
      setCourses((prev) => prev.filter((item) => item._id !== course._id));
      if (selectedCourseId === course._id) {
        setSelectedCourseId('');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete course.');
    }
  };

  const handleAddModule = async () => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('Module title');
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      alert('Module title is required.');
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
      alert(err?.response?.data?.message || 'Failed to add module.');
    }
  };

  const handleEditModule = async (module) => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('Edit module title', module.title);
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      alert('Module title is required.');
      return;
    }

    const description = window.prompt('Edit module description', module.description || '') || '';
    const faqText =
      window.prompt(
        'Module FAQs (one per line: question | answer)',
        stringifyFaqLines(module.faqs || [])
      ) || '';

    try {
      const res = await updateModule(selectedCourse._id, module._id, {
        title,
        description,
        faqs: parseFaqLines(faqText)
      });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to edit module.');
    }
  };

  const handleDeleteModule = async (module) => {
    if (!selectedCourse) return;
    if (!window.confirm(`Delete module "${module.title}"?`)) return;

    try {
      const res = await deleteModule(selectedCourse._id, module._id);
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete module.');
    }
  };

  const handleAddContent = async (module) => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('Content title');
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      alert('Content title is required.');
      return;
    }

    const contentTypeInput = window.prompt(
      `Content type (${CONTENT_TYPES.join(', ')})`,
      'Video'
    );
    const contentType = String(contentTypeInput || '').trim();

    if (!contentType || !CONTENT_TYPES.includes(contentType)) {
      alert('Invalid content type.');
      return;
    }

    const url = String(window.prompt('Content URL (optional)') || '').trim();
    if (url && !isValidResourceUrl(url)) {
      alert('Content URL must be a valid URL.');
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
      alert(err?.response?.data?.message || 'Failed to add content item.');
    }
  };

  const handleEditContent = async (module, content) => {
    if (!selectedCourse) return;

    const titleInput = window.prompt('Edit content title', content.title);
    if (titleInput === null) return;
    const title = String(titleInput || '').trim();
    if (!title) {
      alert('Content title is required.');
      return;
    }

    const contentTypeInput = window.prompt(
      `Edit content type (${CONTENT_TYPES.join(', ')})`,
      content.contentType
    );
    const contentType = String(contentTypeInput || '').trim();

    if (!contentType || !CONTENT_TYPES.includes(contentType)) {
      alert('Invalid content type.');
      return;
    }

    const url = String(window.prompt('Edit content URL', content.url || '') || '').trim();
    if (url && !isValidResourceUrl(url)) {
      alert('Content URL must be a valid URL.');
      return;
    }
    const textContent = window.prompt('Edit text content', content.textContent || '') || '';

    try {
      const res = await updateContent(selectedCourse._id, module._id, content._id, {
        title,
        contentType,
        url,
        textContent
      });
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to edit content item.');
    }
  };

  const handleDeleteContent = async (module, content) => {
    if (!selectedCourse) return;
    if (!window.confirm(`Delete content "${content.title}"?`)) return;

    try {
      const res = await deleteContent(selectedCourse._id, module._id, content._id);
      const updated = res.data;
      setCourses((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete content item.');
    }
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
      alert(err?.response?.data?.message || 'Failed to upload module PDF.');
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
      alert(err?.response?.data?.message || 'Failed to upload module image.');
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
      alert('URL content title is required.');
      return;
    }

    const urlInput = window.prompt('Paste content URL (http/https)');
    const url = String(urlInput || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      alert('Please provide a valid URL starting with http:// or https://');
      return;
    }

    const contentTypeInput = window.prompt('Content type for URL (Link, Video, Article)', 'Link') || 'Link';
    const contentType = String(contentTypeInput || 'Link').trim();
    if (!CONTENT_TYPES.includes(contentType)) {
      alert('Invalid content type for URL content.');
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
      alert(err?.response?.data?.message || 'Failed to add URL content item.');
    }
  };

  const toggleContentComplete = (contentId) => {
    setCompletedContent((prev) => ({
      ...prev,
      [contentId]: !prev[contentId]
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
      alert('No learning content is available yet for this course.');
      return;
    }

    const firstIncomplete = orderedContents.find((content) => !completedContent[content._id]);

    if (!firstIncomplete) {
      alert('Great work! You have completed all available content in this course.');
      return;
    }

    if (firstIncomplete.url) {
      window.open(getContentUrl(firstIncomplete.url), '_blank', 'noopener,noreferrer');
      return;
    }

    alert(`Next item: ${firstIncomplete.title}`);
  };

  return (
    <DashboardLayout activeSection="My Courses">
      <div className="course-page">
        <div className="course-head">
          <div>
            <h1>{pageTitle}</h1>
            <p>{isManager ? 'Create courses, modules, and learning content.' : 'Browse available published courses.'}</p>
            <p className="role-note">
              Logged in role: <strong>{currentRole || 'unknown'}</strong>
              {!isManager ? ' (Admin/Teacher required for create, update, and delete actions)' : ''}
            </p>
          </div>
          <button className="btn-refresh" onClick={loadCourses}>Refresh</button>
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
            </div>

            <div className="search-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses"
              />
              <button className="btn-search" onClick={loadCourses}>Search</button>
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

            <p className="list-title">Recent Courses</p>

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
            {isManager && (
              <form className="course-create" onSubmit={handleCreateCourse}>
                <div className="create-head">
                  <h3>Create Course</h3>
                  <span className="create-plus">+</span>
                </div>
                <div className="form-grid">
                  <input
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Course title"
                    minLength={3}
                  />
                  <input
                    required
                    value={courseForm.subject}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="Subject"
                    minLength={2}
                  />
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, level: e.target.value }))}
                  >
                    {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                  <input
                    value={courseForm.initialModuleTitle}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, initialModuleTitle: e.target.value }))}
                    placeholder="Initial module title (optional)"
                  />
                  <input
                    value={courseForm.initialLectureVideoUrl}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, initialLectureVideoUrl: e.target.value }))}
                    placeholder="Initial lecture video URL (optional)"
                    type="url"
                  />
                  <input
                    ref={initialLecturePdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: 'none' }}
                    onChange={(event) => setInitialLecturePdfFile(event.target.files?.[0] || null)}
                  />
                  <input
                    ref={initialLectureVideoInputRef}
                    type="file"
                    accept="video/*,.mp4,.mov,.m4v,.webm,.avi,.mkv"
                    style={{ display: 'none' }}
                    onChange={(event) => setInitialLectureVideoFile(event.target.files?.[0] || null)}
                  />
                  <div className="initial-lecture-upload-row">
                    <span>
                      {initialLecturePdfFile
                        ? `Selected PDF: ${initialLecturePdfFile.name}`
                        : 'Initial lecture PDF (optional)'}
                    </span>
                    <button
                      type="button"
                      className="btn-upload-thumb"
                      onClick={() => initialLecturePdfInputRef.current?.click()}
                    >
                      Upload PDF
                    </button>
                  </div>
                  <div className="initial-video-upload-row">
                    <span>
                      {initialLectureVideoFile
                        ? `Selected video: ${initialLectureVideoFile.name}`
                        : 'Initial lecture recording file (optional)'}
                    </span>
                    <button
                      type="button"
                      className="btn-upload-thumb"
                      onClick={() => initialLectureVideoInputRef.current?.click()}
                    >
                      Upload Video
                    </button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={thumbnailFileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleThumbnailPickerChange}
                  />
                  <div
                    className={`thumbnail-dropzone ${thumbnailDropActive ? 'active' : ''}`}
                    onDragOver={handleThumbnailDragOver}
                    onDragEnter={handleThumbnailDragOver}
                    onDragLeave={handleThumbnailDragLeave}
                    onDrop={handleThumbnailDrop}
                  >
                    <div className="thumbnail-dropzone-row">
                      <input
                        value={courseForm.thumbnailUrl}
                        onChange={(e) => updateThumbnailUrl(e.target.value)}
                        placeholder="Thumbnail URL (optional)"
                        type="url"
                      />
                      <button
                        type="button"
                        className="btn-upload-thumb"
                        onClick={() => thumbnailFileInputRef.current?.click()}
                      >
                        Drag & Drop / Upload
                      </button>
                    </div>
                    <p>Drop image file or image URL here.</p>
                    {courseForm.thumbnailUrl ? (
                      <div className="thumbnail-preview-wrap">
                        <img src={courseForm.thumbnailUrl} alt="Thumbnail preview" className="thumbnail-preview" />
                      </div>
                    ) : null}
                  </div>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Course description"
                    rows={3}
                  />
                  <textarea
                    value={courseForm.faqText}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, faqText: e.target.value }))}
                    placeholder="Course FAQs (one per line: question | answer)"
                    rows={4}
                  />
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={courseForm.isPublished}
                      onChange={(e) => setCourseForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                    />
                    Publish immediately
                  </label>
                </div>
                <button className="btn-create" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Course'}</button>
              </form>
            )}

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
                      <button className="btn-edit" onClick={() => handleEditCourse(selectedCourse)}>Edit</button>
                      <button className="btn-publish" onClick={() => togglePublish(selectedCourse)}>
                        {selectedCourse.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="danger btn-delete" onClick={() => handleDeleteCourse(selectedCourse)}>Delete</button>
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
                            <button className="btn-edit" onClick={() => handleEditModule(module)}>Edit</button>
                            <button className="btn-add" onClick={() => handleAddContent(module)}>Add Content</button>
                            <button
                              className="btn-upload"
                              onClick={() => openPdfPicker(module._id)}
                              disabled={uploadingModuleId === module._id}
                            >
                              {uploadingModuleId === module._id ? 'Uploading...' : 'Upload PDF'}
                            </button>
                            <button
                              className="btn-upload"
                              onClick={() => openImagePicker(module._id)}
                              disabled={uploadingModuleId === module._id}
                            >
                              {uploadingModuleId === module._id ? 'Uploading...' : 'Upload Image'}
                            </button>
                            <button className="btn-add" onClick={() => handleAddUrlContent(module)}>
                              Add URL
                            </button>
                            <button className="danger btn-delete" onClick={() => handleDeleteModule(module)}>Delete</button>
                          </div>
                        )}
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
                            {isManager ? (
                              <div className="content-actions">
                                <button className="btn-edit" onClick={() => handleEditContent(module, content)}>Edit</button>
                                <button className="danger btn-delete" onClick={() => handleDeleteContent(module, content)}>Delete</button>
                              </div>
                            ) : (
                              <span className="preview-tag">{content.isPreview ? 'Preview' : 'Locked'}</span>
                            )}
                          </div>
                        ))}
                        {(!module.contents || module.contents.length === 0) ? (
                          <div className="empty-inline">No content items yet.</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {(selectedCourse.modules || []).length === 0 ? (
                    <div className="empty-inline">No modules yet.</div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseManager;
