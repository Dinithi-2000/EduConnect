import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaHeart, FaLightbulb, FaThumbsUp } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import NotificationBell from '../../components/NotificationBell';
import { buildStudentSidebarItems } from '../../utils/studentSidebar';
import { API_URL } from '../../services/api';
import { getCourses } from '../../services/courseService';
import { trackStudyActivity } from '../../services/notificationService';
import './StudentCourses.css';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');
const SETTINGS_STORAGE_KEY = 'student-settings-preferences';
const THEME_STORAGE_KEY = 'student-theme-mode';
const LEGACY_ENROLLMENT_KEY = 'student-course-enrollments';

const COURSE_BANNERS = [
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
];

const WORKSPACE_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1584697964358-3e14ca57658b?auto=format&fit=crop&w=1600&q=80',
];

const extractWeekNumber = (module, fallbackIndex = 0) => {
  const title = String(module?.title || '');
  const match = title.match(/week\s*(\d+)/i);
  if (match) return Number(match[1]);
  if (Number(module?.order) > 0) return Number(module.order);
  return fallbackIndex + 1;
};

const sortModulesByMode = (modules = [], mode = 'week') => {
  const list = modules.slice();
  if (mode === 'week') {
    return list.sort((a, b) => extractWeekNumber(a) - extractWeekNumber(b));
  }
  return list.sort((a, b) => (a.order || 0) - (b.order || 0));
};

const normalizeSavedNotesMap = (raw) => {
  if (!raw || typeof raw !== 'object') return {};

  const normalized = {};

  Object.entries(raw).forEach(([courseId, modules]) => {
    if (!modules || typeof modules !== 'object') return;
    normalized[courseId] = {};

    Object.entries(modules).forEach(([moduleId, contents]) => {
      if (!contents || typeof contents !== 'object') return;
      normalized[courseId][moduleId] = {};

      Object.entries(contents).forEach(([contentId, value]) => {
        if (Array.isArray(value)) {
          normalized[courseId][moduleId][contentId] = value
            .filter((note) => note && typeof note === 'object' && String(note.text || '').trim())
            .map((note) => ({
              id: note.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              text: String(note.text || '').trim(),
              createdAt: note.createdAt || null
            }));
          return;
        }

        // Backward compatibility: previous version stored a single string note.
        if (typeof value === 'string' && value.trim()) {
          normalized[courseId][moduleId][contentId] = [
            {
              id: `legacy-${contentId}`,
              text: value.trim(),
              createdAt: null
            }
          ];
          return;
        }

        normalized[courseId][moduleId][contentId] = [];
      });
    });
  });

  return normalized;
};

const getCourseBanner = (course, index) => {
  const seed = String(course?._id || course?.title || index || '0');
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COURSE_BANNERS[hash % COURSE_BANNERS.length];
};

const getWorkspaceHeroImage = ({ course, module, content }) => {
  const url = String(content?.url || '').trim();
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(url)) {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${apiOrigin}${url}`;
    return `${apiOrigin}/${url}`;
  }

  const seed = String(
    module?.title
      || content?.title
      || course?.title
      || course?.subject
      || course?._id
      || 'workspace'
  );
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return WORKSPACE_HERO_IMAGES[hash % WORKSPACE_HERO_IMAGES.length];
};

const StudentCourses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const studentId = user?._id || user?.id || 'guest';
  const [chatOpenSignal, setChatOpenSignal] = useState(0);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [completionMap, setCompletionMap] = useState({});
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;

      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = rawSettings ? JSON.parse(rawSettings) : null;
      if (parsed && typeof parsed.darkMode === 'boolean') {
        return parsed.darkMode ? 'dark' : 'light';
      }
    } catch {
      // Ignore malformed local storage values.
    }
    return 'light';
  });
  const [viewMode, setViewMode] = useState('overview');
  const [moduleOrderMode, setModuleOrderMode] = useState('week');
  const [workspaceTab, setWorkspaceTab] = useState('');
  const [discussionDraft, setDiscussionDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyValidationErrors, setReplyValidationErrors] = useState({});
  const [noteDraft, setNoteDraft] = useState('');
  const [commentNotice, setCommentNotice] = useState(null);
  const [noteNotice, setNoteNotice] = useState(null);
  const [savedNotesMap, setSavedNotesMap] = useState({});
  const [noteReactionsMap, setNoteReactionsMap] = useState({});
  const [discussionItems, setDiscussionItems] = useState([
    {
      id: 1,
      author: 'Sarah Chen',
      role: '4 hours ago',
      text: 'Can someone explain why the complexity of this reversal stays O(n) even with pointer updates?',
      likes: 12,
      replies: []
    },
    {
      id: 2,
      author: 'Alex Martin',
      role: '2 hours ago',
      text: 'Cycle detection clicked for me after drawing fast and slow pointers side by side.',
      likes: 7,
      replies: []
    }
  ]);
  const noticeTimerRef = useRef(null);
  const noteNoticeTimerRef = useRef(null);
  const lastActivityPingRef = useRef('');

  const progressStorageKey = `student-course-progress-${studentId}`;
  const enrollmentStorageKeys = useMemo(() => {
    const candidates = [user?._id, user?.id]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    if (!candidates.length) {
      return ['student-course-enrollments-guest', LEGACY_ENROLLMENT_KEY];
    }

    return Array.from(new Set([
      ...candidates.map((value) => `student-course-enrollments-${value}`),
      'student-course-enrollments-guest',
      LEGACY_ENROLLMENT_KEY
    ]));
  }, [user?._id, user?.id]);

  const enrollmentStorageKey = enrollmentStorageKeys[0];
  const notesStorageKey = `student-course-notes-${studentId}`;
  const noteReactionsStorageKey = `student-note-reactions-${studentId}`;

  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(progressStorageKey);
      setCompletionMap(savedProgress ? JSON.parse(savedProgress) : {});
    } catch {
      setCompletionMap({});
    }
  }, [progressStorageKey]);

  useEffect(() => {
    try {
      const keysToCheck = Array.from(new Set([...enrollmentStorageKeys, 'student-course-enrollments-guest', LEGACY_ENROLLMENT_KEY]));
      const merged = new Set();

      keysToCheck.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        parsed.forEach((courseId) => {
          if (courseId) merged.add(courseId);
        });
      });

      setEnrolledCourseIds(Array.from(merged));
    } catch {
      setEnrolledCourseIds([]);
    }
  }, [enrollmentStorageKeys]);

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(notesStorageKey);
      const parsed = savedNotes ? JSON.parse(savedNotes) : {};
      setSavedNotesMap(normalizeSavedNotesMap(parsed));
    } catch {
      setSavedNotesMap({});
    }
  }, [notesStorageKey]);

  useEffect(() => {
    try {
      const savedReactions = localStorage.getItem(noteReactionsStorageKey);
      setNoteReactionsMap(savedReactions ? JSON.parse(savedReactions) : {});
    } catch {
      setNoteReactionsMap({});
    }
  }, [noteReactionsStorageKey]);

  useEffect(() => {
    localStorage.setItem(progressStorageKey, JSON.stringify(completionMap));
  }, [completionMap, progressStorageKey]);

  useEffect(() => {
    const payload = JSON.stringify(enrolledCourseIds);
    enrollmentStorageKeys.forEach((key) => {
      localStorage.setItem(key, payload);
    });

    // Keep guest key synced for backward compatibility across prior sessions.
    localStorage.setItem('student-course-enrollments-guest', payload);
    localStorage.setItem(LEGACY_ENROLLMENT_KEY, payload);
  }, [enrolledCourseIds, enrollmentStorageKeys]);

  const persistEnrollmentIds = (nextIds) => {
    const payload = JSON.stringify(nextIds);
    enrollmentStorageKeys.forEach((key) => {
      localStorage.setItem(key, payload);
    });
    localStorage.setItem('student-course-enrollments-guest', payload);
    localStorage.setItem(LEGACY_ENROLLMENT_KEY, payload);
  };

  useEffect(() => {
    localStorage.setItem(notesStorageKey, JSON.stringify(savedNotesMap));
  }, [savedNotesMap, notesStorageKey]);

  useEffect(() => {
    localStorage.setItem(noteReactionsStorageKey, JSON.stringify(noteReactionsMap));
  }, [noteReactionsMap, noteReactionsStorageKey]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getCourses();
        const items = (response.data || []).map((course) => ({
          ...course,
          modules: (course.modules || [])
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((module) => ({
              ...module,
              contents: (module.contents || [])
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
            }))
        }));
        setCourses(items);
        if (items.length > 0) {
          setSelectedCourseId((prev) => prev || items[0]._id);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const selectedCourse = useMemo(() => {
    return courses.find((course) => course._id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const filteredCourses = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return courses;

    return courses.filter((course) => {
      const baseText = [
        course.title,
        course.subject,
        course.level,
        course.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (baseText.includes(query)) return true;

      return (course.modules || []).some((module) => {
        const moduleText = [module.title, module.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (moduleText.includes(query)) return true;

        return (module.contents || []).some((content) => {
          const contentText = [content.title, content.contentType, content.textContent]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return contentText.includes(query);
        });
      });
    });
  }, [courses, searchQuery]);

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const courseModules = useMemo(
    () => sortModulesByMode(selectedCourse?.modules || [], moduleOrderMode),
    [selectedCourse?.modules, moduleOrderMode]
  );

  const activeModule =
    courseModules.find((module) => module._id === selectedModuleId) ||
    courseModules[0] ||
    null;

  const activeContent =
    activeModule?.contents?.find((content) => content._id === selectedContentId) ||
    activeModule?.contents?.[0] ||
    null;

  const savedNotesForActiveContent =
    selectedCourse?._id && activeModule?._id && activeContent?._id
      ? savedNotesMap?.[selectedCourse._id]?.[activeModule._id]?.[activeContent._id] || []
      : [];

  useEffect(() => {
    if (!selectedCourse) {
      setSelectedModuleId('');
      setSelectedContentId('');
      return;
    }

    if (!courseModules.length) {
      setSelectedModuleId('');
      setSelectedContentId('');
      return;
    }

    const moduleStillExists = courseModules.some((module) => module._id === selectedModuleId);
    const nextModule = moduleStillExists
      ? courseModules.find((module) => module._id === selectedModuleId)
      : courseModules[0];

    if (!moduleStillExists) {
      setSelectedModuleId(nextModule._id);
    }

    const contentStillExists = (nextModule?.contents || []).some(
      (content) => content._id === selectedContentId
    );
    if (!contentStillExists) {
      setSelectedContentId(nextModule?.contents?.[0]?._id || '');
    }
  }, [selectedCourse, courseModules, selectedModuleId, selectedContentId]);

  const selectedCourseProgress = selectedCourse ? getCourseProgress(selectedCourse) : { total: 0, done: 0, percent: 0 };

  useEffect(() => {
    if (!user?._id && !user?.id) return;
    if (!selectedCourse?._id) return;
    if (!activeContent?._id) return;

    const fingerprint = [selectedCourse._id, activeContent._id, selectedCourseProgress.percent].join(':');
    if (lastActivityPingRef.current === fingerprint) return;

    const timer = setTimeout(async () => {
      try {
        await trackStudyActivity({
          courseId: selectedCourse._id,
          moduleId: activeModule?._id || null,
          contentId: activeContent._id,
          progressPercent: selectedCourseProgress.percent,
        });
        lastActivityPingRef.current = fingerprint;
      } catch {
        // Ignore tracking failures to keep learning flow uninterrupted.
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [
    user?._id,
    user?.id,
    selectedCourse?._id,
    activeModule?._id,
    activeContent?._id,
    selectedCourseProgress.percent,
  ]);

  const resourceItems = useMemo(() => {
    const source = activeModule?.contents || [];
    return source.slice(0, 2).map((content, index) => ({
      ...content,
      fallbackTag: index === 0 ? 'PDF / Notes' : 'Snippet / Link'
    }));
  }, [activeModule]);

  const faqItems = useMemo(() => {
    const normalize = (items = [], source = 'module') => {
      return (Array.isArray(items) ? items : [])
        .map((item) => ({
          question: String(item?.question || '').trim(),
          answer: String(item?.answer || '').trim(),
          source
        }))
        .filter((item) => item.question && item.answer);
    };

    const moduleFaqs = normalize(activeModule?.faqs || [], 'module');
    const courseFaqs = normalize(selectedCourse?.faqs || [], 'course');
    return [...moduleFaqs, ...courseFaqs];
  }, [activeModule?.faqs, selectedCourse?.faqs]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
      if (noteNoticeTimerRef.current) {
        clearTimeout(noteNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!noteNotice) return undefined;
    if (noteNoticeTimerRef.current) {
      clearTimeout(noteNoticeTimerRef.current);
    }

    noteNoticeTimerRef.current = setTimeout(() => {
      setNoteNotice(null);
    }, 2200);

    return () => {
      if (noteNoticeTimerRef.current) {
        clearTimeout(noteNoticeTimerRef.current);
      }
    };
  }, [noteNotice]);

  const sidebarItems = buildStudentSidebarItems('Course & Contents', () => setChatOpenSignal((prev) => prev + 1));

  const handleSidebarAction = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    navigate(item.route);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  function getCourseProgress(course) {
    const contents = (course.modules || []).flatMap((module) => module.contents || []);
    const total = contents.length;
    const done = contents.filter((content) => completionMap?.[course._id]?.[content._id]).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }

  const toggleContentComplete = (courseId, contentId) => {
    setCompletionMap((prev) => {
      const byCourse = prev[courseId] || {};
      return {
        ...prev,
        [courseId]: {
          ...byCourse,
          [contentId]: !byCourse[contentId]
        }
      };
    });
  };

  const buildContentUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${apiOrigin}${url}`;
    return `${apiOrigin}/${url}`;
  };

  const getModuleOrderLabel = (module, index) => {
    if (moduleOrderMode === 'week') {
      return `Week ${extractWeekNumber(module, index)}`;
    }
    return `Order ${module.order || index + 1}`;
  };

  const handleModuleSelect = (moduleId) => {
    setSelectedModuleId(moduleId);
    const firstContent = courseModules.find((module) => module._id === moduleId)?.contents?.[0] || null;
    setSelectedContentId(firstContent?._id || '');
  };

  const handleContentSelect = (content) => {
    setSelectedContentId(content._id);
  };

  const enrollCourseLocally = (courseId) => {
    if (!courseId) return false;
    if (enrolledCourseIds.includes(courseId)) return false;

    const nextIds = [...enrolledCourseIds, courseId];
    persistEnrollmentIds(nextIds);
    setEnrolledCourseIds(nextIds);
    return true;
  };

  const handleOpenModuleWorkspace = (course, moduleId) => {
    if (!enrolledCourseIds.includes(course._id)) {
      const added = enrollCourseLocally(course._id);
      if (added) {
        showCommentNotice('success', 'Enrolled successfully. Added to My Courses.');
      }
    }

    setSelectedCourseId(course._id);
    setSelectedModuleId(moduleId);
    const firstContent = (course.modules || []).find((module) => module._id === moduleId)?.contents?.[0] || null;
    setSelectedContentId(firstContent?._id || '');
    setWorkspaceTab('');
    setViewMode('workspace');
  };

  const handleOpenCourseWorkspace = (course) => {
    if (!course?._id) return;

    const orderedModules = sortModulesByMode(course.modules || [], moduleOrderMode);
    const firstModule = orderedModules[0] || null;

    setSelectedCourseId(course._id);
    if (firstModule?._id) {
      setSelectedModuleId(firstModule._id);
      setSelectedContentId(firstModule?.contents?.[0]?._id || '');
    }
    setWorkspaceTab('');
    setViewMode('workspace');
  };

  const handleEnrollOrOpen = (course) => {
    const isEnrolled = enrolledCourseIds.includes(course._id);

    if (!isEnrolled) {
      enrollCourseLocally(course._id);
      return;
    }

    handleOpenCourseWorkspace(course);
  };

  useEffect(() => {
    const incomingCourseId = location.state?.courseId;
    if (!incomingCourseId) return;

    const targetCourse = courses.find((course) => course._id === incomingCourseId);
    if (!targetCourse) return;

    setSelectedCourseId(targetCourse._id);
    if (location.state?.openWorkspace) {
      const orderedModules = sortModulesByMode(targetCourse.modules || [], moduleOrderMode);
      const firstModule = orderedModules[0];
      if (firstModule?._id) {
        handleOpenModuleWorkspace(targetCourse, firstModule._id);
      } else {
        setViewMode('workspace');
      }
    } else {
      setViewMode('overview');
    }
  }, [location.state, courses, moduleOrderMode]);

  const handleBreadcrumbCourseClick = () => {
    setViewMode('overview');
  };

  const handleBreadcrumbModuleClick = () => {
    const firstContent = activeModule?.contents?.[0] || null;
    setSelectedContentId(firstContent?._id || '');
  };

  const handleOpenCurrentResource = () => {
    if (!activeContent?.url) return;
    window.open(buildContentUrl(activeContent.url), '_blank', 'noopener,noreferrer');
  };

  const getContentTypeTag = (content) => {
    const type = String(content?.contentType || '').toLowerCase();
    if (type.includes('video')) return 'Video';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('quiz')) return 'Quiz';
    return content?.contentType || 'Resource';
  };

  const showCommentNotice = (type, message) => {
    setCommentNotice({ type, message });
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setCommentNotice(null);
    }, 2200);
  };

  const handlePostComment = () => {
    const text = discussionDraft.trim();
    if (!text) {
      showCommentNotice('error', 'Please type a comment first.');
      return;
    }

    setDiscussionItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: displayName,
        role: 'Just now',
        text,
        likes: 0,
        replies: []
      }
    ]);
    setDiscussionDraft('');
    showCommentNotice('success', 'Successfully posted.');
  };

  const handleReplyDraftChange = (messageId, value) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [messageId]: value
    }));

    if (String(value || '').trim()) {
      setReplyValidationErrors((prev) => {
        if (!prev[messageId]) return prev;
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  };

  const handlePostReply = (messageId) => {
    const text = String(replyDrafts[messageId] || '').trim();
    if (!text) {
      setReplyValidationErrors((prev) => ({
        ...prev,
        [messageId]: 'Reply cannot be empty.'
      }));
      showCommentNotice('error', 'Please type a reply first.');
      return;
    }

    setReplyValidationErrors((prev) => {
      if (!prev[messageId]) return prev;
      const next = { ...prev };
      delete next[messageId];
      return next;
    });

    const newReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author: displayName,
      role: 'Just now',
      text
    };

    setDiscussionItems((prev) =>
      prev.map((item) => {
        if (item.id !== messageId) return item;
        const currentReplies = Array.isArray(item.replies) ? item.replies : [];
        return {
          ...item,
          replies: [...currentReplies, newReply]
        };
      })
    );

    setReplyDrafts((prev) => ({
      ...prev,
      [messageId]: ''
    }));

    showCommentNotice('success', 'Reply posted.');
  };

  const handleSaveNotes = () => {
    const text = noteDraft.trim();
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) {
      setNoteNotice({ type: 'error', message: 'Open a lesson resource before saving notes.' });
      return;
    }

    if (!text) {
      setNoteNotice({ type: 'error', message: 'Please add a note first.' });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: new Date().toISOString()
    };

    setSavedNotesMap((prev) => {
      const byCourse = prev[selectedCourse._id] || {};
      const byModule = byCourse[activeModule._id] || {};
      const existingNotes = Array.isArray(byModule[activeContent._id])
        ? byModule[activeContent._id]
        : [];

      return {
        ...prev,
        [selectedCourse._id]: {
          ...byCourse,
          [activeModule._id]: {
            ...byModule,
            [activeContent._id]: [...existingNotes, newNote]
          }
        }
      };
    });

    setNoteDraft('');
    setNoteNotice({ type: 'success', message: 'Note saved successfully.' });
  };

  const getNoteReactions = (noteId) => {
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) {
      return { like: false, love: false, idea: false };
    }

    return (
      noteReactionsMap?.[selectedCourse._id]?.[activeModule._id]?.[activeContent._id]?.[noteId] || {
        like: false,
        love: false,
        idea: false
      }
    );
  };

  const handleToggleNoteReaction = (noteId, reactionKey) => {
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id || !savedNotesForActiveContent.length) {
      return;
    }

    setNoteReactionsMap((prev) => {
      const byCourse = prev[selectedCourse._id] || {};
      const byModule = byCourse[activeModule._id] || {};
      const byContent = byModule[activeContent._id] || {};
      const byNote = byContent[noteId] || { like: false, love: false, idea: false };

      return {
        ...prev,
        [selectedCourse._id]: {
          ...byCourse,
          [activeModule._id]: {
            ...byModule,
            [activeContent._id]: {
              ...byContent,
              [noteId]: {
                ...byNote,
                [reactionKey]: !byNote[reactionKey]
              }
            }
          }
        }
      };
    });
  };

  return (
    <div className={`student-v2-shell student-courses-shell ${isDarkMode ? 'theme-dark' : ''}`}>
      <aside className="student-v2-sidebar">
        <div className="student-v2-brand">
          <span className="brand-mark">E</span>
          <div className="brand-copy">
            <h1>EDUCONNECT</h1>
            <small>Academic Portal</small>
          </div>
        </div>

        <nav className="student-v2-nav" aria-label="Student navigation">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`student-v2-nav-item ${item.active ? 'active' : ''}`}
              onClick={() => handleSidebarAction(item)}
            >
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="student-v2-upgrade">
          <p>Unlock all features</p>
          <h3>Upgrade to Pro</h3>
          <button type="button" onClick={() => navigate('/student/premium')}>Upgrade Now</button>
        </div>

        <button type="button" className="student-v2-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="student-v2-main student-courses-main">
        <header className="student-v2-topbar">
          <div className="student-v2-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search courses, sessions, materials..."
              aria-label="Search courses, sessions, materials"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="student-v2-tools">
            <button
              type="button"
              className="ghost-icon"
              aria-label="Theme"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={handleToggleTheme}
            >
              {isDarkMode ? '☀' : '◐'}
            </button>
            <NotificationBell />
            <button type="button" className="premium-pill" onClick={() => navigate('/student/premium')}>
              <span aria-hidden="true">👑</span>
              Premium
            </button>
            <div className="student-v2-profile-chip">
              <div className="student-v2-profile-text">
                <strong>{displayName}</strong>
                <small>{user?.email || 'Student account'}</small>
              </div>
              <div className="student-v2-profile-avatar">{initials}</div>
            </div>
          </div>
        </header>

        <div className="student-courses-page">
          <div className="student-courses-header">
            <div>
              <h1>Course & Contents</h1>
              <p>Open lectures, notes, snippets, and collaborate with classmates in one workspace.</p>
            </div>
            <div className="module-order-wrap">
              <label htmlFor="module-order-select">Module order</label>
              <select
                id="module-order-select"
                className="module-order-select"
                value={moduleOrderMode}
                onChange={(event) => setModuleOrderMode(event.target.value)}
              >
                <option value="week">Week order</option>
                <option value="original">Original order</option>
              </select>
            </div>
            {viewMode === 'workspace' ? (
              <div className="course-header-actions">
                <button type="button" className="ghost-back-btn" onClick={() => setViewMode('overview')}>
                  ← All Courses
                </button>
                <select
                  className="course-switcher"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  aria-label="Select course"
                >
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>{course.title}</option>
                  ))}
                </select>
                <button className="progress-btn" onClick={() => navigate('/student/progress')}>
                  View Progress
                </button>
              </div>
            ) : (
              <button className="progress-btn" onClick={() => navigate('/student/progress')}>
                View Progress
              </button>
            )}
          </div>

          {loading ? (
            <div className="state-box">Loading courses...</div>
          ) : error ? (
            <div className="state-box error">{error}</div>
          ) : courses.length === 0 ? (
            <div className="state-box">No courses found. Please check back later.</div>
          ) : viewMode === 'overview' ? (
            filteredCourses.length === 0 ? (
              <div className="state-box">
                No results found for "{searchQuery}". Try a course title, subject, or module name.
              </div>
            ) : (
            <div className="courses-overview-grid">
              {filteredCourses.map((course, courseIndex) => (
                <article key={course._id} className="overview-course-card">
                  <div
                    className="overview-course-banner"
                    style={{ backgroundImage: `linear-gradient(135deg, rgba(24, 61, 156, 0.28), rgba(40, 131, 185, 0.2)), url(${getCourseBanner(course, courseIndex)})` }}
                  >
                    <span className="overview-course-badge">{(course.modules || []).length} modules</span>
                  </div>
                  {(() => {
                    const isEnrolled = enrolledCourseIds.includes(course._id);
                    return (
                  <div className="overview-course-head">
                    <div>
                      <h3>{course.title}</h3>
                      <p>{course.subject} • {course.level}</p>
                    </div>
                    <div className="overview-course-actions">
                      <button
                        type="button"
                        className={`enroll-btn ${isEnrolled ? 'enrolled open' : ''}`}
                        onClick={() => handleEnrollOrOpen(course)}
                      >
                        {isEnrolled ? 'Open' : 'Enroll'}
                      </button>
                    </div>
                  </div>
                    );
                  })()}

                  <p className="overview-course-description">{course.description || 'No description available.'}</p>

                  <div className="overview-module-list">
                    {sortModulesByMode(course.modules || [], moduleOrderMode).slice(0, 1).map((module, moduleIndex) => {
                      const isEnrolled = enrolledCourseIds.includes(course._id);
                      return (
                        <button
                          key={module._id}
                          type="button"
                          className="overview-module-item"
                          onClick={() => handleOpenModuleWorkspace(course, module._id)}
                        >
                          <div>
                            <strong>{module.title}</strong>
                            <small>{getModuleOrderLabel(module, moduleIndex)}</small>
                            <small>{(module.contents || []).length} content items</small>
                          </div>
                          <span>{isEnrolled ? 'Open →' : 'Enroll & Open'}</span>
                        </button>
                      );
                    })}

                    {(course.modules || []).length > 1 && (
                      <div className="overview-more-modules">
                        +{(course.modules || []).length - 1} more modules
                      </div>
                    )}

                    {(course.modules || []).length === 0 && (
                      <div className="empty-inline">No modules in this course yet.</div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            )
          ) : !selectedCourse ? (
            <div className="state-box">Select a course to open the workspace.</div>
          ) : (
            <>
            <div className="student-course-breadcrumbs">
              <button
                type="button"
                className="breadcrumb-link"
                onClick={handleBreadcrumbCourseClick}
              >
                {selectedCourse?.title || 'My Courses'}
              </button>
              <span>›</span>
              <button
                type="button"
                className="breadcrumb-link"
                onClick={handleBreadcrumbModuleClick}
              >
                {activeModule?.title || 'Course & Contents'}
              </button>
              <span>›</span>
              <strong>{activeContent?.title || 'Learning Workspace'}</strong>
            </div>

            <div className="course-content-workspace">
              <section className="course-workspace-main">
                <div className="lesson-hero">
                  <div
                    className="lesson-preview"
                    style={{
                      backgroundImage: `linear-gradient(135deg, rgba(11, 34, 87, 0.54), rgba(10, 48, 118, 0.46)), url(${getWorkspaceHeroImage({
                        course: selectedCourse,
                        module: activeModule,
                        content: activeContent,
                      })})`,
                    }}
                  >
                    <div className="lesson-preview-overlay">
                      <button type="button" className="play-btn" onClick={handleOpenCurrentResource}>▶</button>
                    </div>
                  </div>

                  <div className="lesson-heading-row">
                    <h2>{activeModule?.title || selectedCourse.title}</h2>
                    <button type="button" className="share-btn">↗</button>
                  </div>
                  <p className="lesson-description">
                    {activeContent?.textContent || selectedCourse.description || 'Explore complex operations and practical techniques in this lesson.'}
                  </p>

                  <div className="resource-cards">
                    {resourceItems.length === 0 ? (
                      <div className="empty-inline">No resources available yet for this module.</div>
                    ) : (
                      resourceItems.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          className={`resource-card ${selectedContentId === item._id ? 'active' : ''}`}
                          onClick={() => handleContentSelect(item)}
                        >
                          <span className="resource-icon">📄</span>
                          <div>
                            <strong>{item.title}</strong>
                            <small>{getContentTypeTag(item)} • {item.fallbackTag}</small>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="workspace-tabs">
                  <button
                    type="button"
                    className={`workspace-tab ${workspaceTab === 'discussion' ? 'active' : ''}`}
                    onClick={() => setWorkspaceTab('discussion')}
                  >
                    Community Discussion
                  </button>
                  <button
                    type="button"
                    className={`workspace-tab ${workspaceTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setWorkspaceTab('notes')}
                  >
                    Personal Notes
                  </button>
                  <button
                    type="button"
                    className={`workspace-tab ${workspaceTab === 'faq' ? 'active' : ''}`}
                    onClick={() => setWorkspaceTab('faq')}
                  >
                    FAQ
                  </button>
                </div>

                <div className="workspace-tab-panel">
                  {!workspaceTab && (
                    <div className="workspace-tab-placeholder">
                      Select a tab to view module activities.
                    </div>
                  )}

                  {workspaceTab === 'discussion' && (
                    <>
                      {discussionItems.map((item) => (
                        <article key={item.id} className="discussion-item">
                          <div className="discussion-avatar">{item.author.charAt(0)}</div>
                          <div className="discussion-body">
                            <strong>{item.author}</strong>
                            <small>{item.role}</small>
                            <p>{item.text}</p>
                            <span>{item.likes} likes</span>

                            <div className="discussion-replies">
                              {(item.replies || []).map((reply) => (
                                <div key={reply.id} className="discussion-reply-item">
                                  <div className="discussion-reply-avatar">{reply.author.charAt(0)}</div>
                                  <div className="discussion-reply-body">
                                    <strong>{reply.author}</strong>
                                    <small>{reply.role}</small>
                                    <p>{reply.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="discussion-reply-input-row">
                              <input
                                value={replyDrafts[item.id] || ''}
                                onChange={(event) => handleReplyDraftChange(item.id, event.target.value)}
                                placeholder="Reply to this message..."
                                aria-invalid={Boolean(replyValidationErrors[item.id])}
                              />
                              <button type="button" onClick={() => handlePostReply(item.id)}>Reply</button>
                            </div>
                            {replyValidationErrors[item.id] && (
                              <div className="discussion-reply-validation" role="alert">
                                {replyValidationErrors[item.id]}
                              </div>
                            )}
                          </div>
                        </article>
                      ))}

                      <div className="discussion-input-row">
                        <input
                          value={discussionDraft}
                          onChange={(event) => setDiscussionDraft(event.target.value)}
                          placeholder="Add a note or ask a question..."
                        />
                        <button type="button" onClick={handlePostComment}>Post Comment</button>
                      </div>
                      {commentNotice && (
                        <div className={`comment-notice ${commentNotice.type}`}>
                          {commentNotice.message}
                        </div>
                      )}
                    </>
                  )}

                  {workspaceTab === 'notes' && (
                    <div className="notes-panel">
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Capture your key ideas from this lesson..."
                        rows={6}
                      />
                      <button type="button" className="notes-save-btn" onClick={handleSaveNotes}>Save Note</button>
                      {noteNotice && (
                        <div className={`comment-notice ${noteNotice.type}`}>
                          {noteNotice.message}
                        </div>
                      )}
                      {savedNotesForActiveContent.length > 0 && (
                        <div className="saved-note-preview">
                          <strong>Saved Notes ({savedNotesForActiveContent.length})</strong>
                          <div className="saved-notes-list">
                            {savedNotesForActiveContent.map((note) => {
                              const reactions = getNoteReactions(note.id);
                              return (
                                <article key={note.id} className="saved-note-item">
                                  <p>{note.text}</p>
                                  <div className="saved-note-reactions" role="group" aria-label="React to saved note">
                                    <button
                                      type="button"
                                      className={`note-reaction-btn ${reactions.like ? 'active' : ''}`}
                                      onClick={() => handleToggleNoteReaction(note.id, 'like')}
                                      aria-pressed={reactions.like}
                                    >
                                      <FaThumbsUp aria-hidden="true" />
                                      Helpful
                                    </button>
                                    <button
                                      type="button"
                                      className={`note-reaction-btn ${reactions.love ? 'active' : ''}`}
                                      onClick={() => handleToggleNoteReaction(note.id, 'love')}
                                      aria-pressed={reactions.love}
                                    >
                                      <FaHeart aria-hidden="true" />
                                      Love
                                    </button>
                                    <button
                                      type="button"
                                      className={`note-reaction-btn ${reactions.idea ? 'active' : ''}`}
                                      onClick={() => handleToggleNoteReaction(note.id, 'idea')}
                                      aria-pressed={reactions.idea}
                                    >
                                      <FaLightbulb aria-hidden="true" />
                                      Insight
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {workspaceTab === 'faq' && (
                    <div className="faq-list">
                      {faqItems.length > 0 ? (
                        faqItems.map((item, index) => (
                          <article key={`${item.source}-${index}`}>
                            <strong>{item.question}</strong>
                            <p>{item.answer}</p>
                          </article>
                        ))
                      ) : (
                        <div className="empty-inline">
                          No FAQ items yet. Admin can add FAQs while creating or editing this course/module.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <aside className="course-content-panel">
                <div className="panel-head">
                  <h3>Course Content</h3>
                  <span>{selectedCourseProgress.percent}% Complete</span>
                </div>

                <div className="panel-modules">
                  {courseModules.map((module, index) => {
                    const moduleDone = (module.contents || []).filter(
                      (content) => completionMap?.[selectedCourse._id]?.[content._id]
                    ).length;
                    const moduleTotal = (module.contents || []).length;

                    return (
                          <div key={module._id} className={`panel-module ${selectedModuleId === module._id ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="module-head"
                              onClick={() => handleModuleSelect(module._id)}
                        >
                              <span>{module.title}</span>
                              <small>{getModuleOrderLabel(module, index)}</small>
                          <small>{moduleTotal ? `${moduleDone}/${moduleTotal}` : 'Empty'}</small>
                        </button>

                            {selectedModuleId === module._id && (
                          <div className="panel-content-list">
                            {(module.contents || []).map((content) => (
                              <button
                                type="button"
                                key={content._id}
                                className={`panel-content-item ${selectedContentId === content._id ? 'active' : ''}`}
                                onClick={() => handleContentSelect(content)}
                              >
                                <span>{content.order || 0}. {content.title}</span>
                                <small>{getContentTypeTag(content)}</small>
                              </button>
                            ))}

                            {(module.contents || []).length === 0 && (
                              <div className="empty-inline">No resources in this module.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {courseModules.length === 0 && (
                    <div className="empty-inline">No modules available in this course.</div>
                  )}
                </div>

                <button
                  type="button"
                  className="download-course-btn"
                  onClick={handleOpenCurrentResource}
                  disabled={!activeContent?.url}
                >
                  Open Selected Resource
                </button>
              </aside>
            </div>
            </>
          )}
        </div>

        <AIChatWidget
          studentId={user?._id || 'guest-student'}
          context={{
            page: 'student-courses',
            user: {
              id: user?._id,
              name: user?.name,
              role: user?.role
            }
          }}
          openSignal={chatOpenSignal}
        />
      </main>
    </div>
  );
};

export default StudentCourses;
