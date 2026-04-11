import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaHeart, FaLightbulb, FaThumbsUp } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';
import AIChatWidget from '../../components/AIChatWidget';
import NotificationBell from '../../components/NotificationBell';
import { buildStudentSidebarItems } from '../../utils/studentSidebar';
import { API_URL } from '../../services/api';
import { getCourses } from '../../services/courseService';
import { trackStudyActivity } from '../../services/notificationService';
import { createStudyItem, deleteStudyItem, getStudyItems } from '../../services/studyItemService';
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

const getCourseThumbnailUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('data:image/')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${apiOrigin}${url}`;
  return `${apiOrigin}/${url}`;
};

const getCourseBanner = (course, index) => {
  const thumbnail = getCourseThumbnailUrl(course?.thumbnailUrl);
  if (thumbnail) return thumbnail;

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

  const courseThumbnail = getCourseThumbnailUrl(course?.thumbnailUrl);
  if (courseThumbnail) return courseThumbnail;

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
  const [overviewFilterTab, setOverviewFilterTab] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortMode, setSortMode] = useState('default');
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
  const [highlightDraft, setHighlightDraft] = useState('');
  const [commentNotice, setCommentNotice] = useState(null);
  const [noteNotice, setNoteNotice] = useState(null);
  const [studyItems, setStudyItems] = useState([]);
  const [studyLoading, setStudyLoading] = useState(false);
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
  const lessonTextRef = useRef(null);

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
    localStorage.setItem(noteReactionsStorageKey, JSON.stringify(noteReactionsMap));
  }, [noteReactionsMap, noteReactionsStorageKey]);

  useEffect(() => {
    let mounted = true;

    const loadStudyItems = async () => {
      if (!selectedCourseId) return;
      try {
        setStudyLoading(true);
        const response = await getStudyItems({ courseId: selectedCourseId });
        if (!mounted) return;
        setStudyItems(response?.data || []);
      } catch {
        if (!mounted) return;
        setStudyItems([]);
      } finally {
        if (mounted) setStudyLoading(false);
      }
    };

    loadStudyItems();
    return () => {
      mounted = false;
    };
  }, [selectedCourseId]);

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

  const bookmarkedCourseIds = useMemo(() => {
    const ids = studyItems
      .filter((item) => {
        if (item.type !== 'bookmark') return false;
        if (item.targetType === 'course') return true;
        return !item.targetType && item.courseId && !item.moduleId && !item.contentId;
      })
      .map((item) => String(item.targetId || item.courseId || ''))
      .filter(Boolean);

    return new Set(ids);
  }, [studyItems]);

  const filteredCourses = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    const searchFiltered = courses.filter((course) => {
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

    const tabFiltered = (() => {
      if (overviewFilterTab === 'enrolled') {
        return searchFiltered.filter((course) => enrolledCourseIds.includes(course._id));
      }
      if (overviewFilterTab === 'bookmarked') {
        return searchFiltered.filter((course) => bookmarkedCourseIds.has(String(course._id)));
      }
      return searchFiltered;
    })();

    const levelFiltered = levelFilter === 'all'
      ? tabFiltered
      : tabFiltered.filter((course) => String(course.level || '').toLowerCase() === levelFilter.toLowerCase());

    const sorted = [...levelFiltered];
    if (sortMode === 'modules-desc') {
      sorted.sort((a, b) => (b.modules?.length || 0) - (a.modules?.length || 0));
    } else if (sortMode === 'modules-asc') {
      sorted.sort((a, b) => (a.modules?.length || 0) - (b.modules?.length || 0));
    } else if (sortMode === 'lectures-desc') {
      const lectureCount = (c) => (c.modules || []).reduce((s, m) => s + (m.contents?.length || 0), 0);
      sorted.sort((a, b) => lectureCount(b) - lectureCount(a));
    } else if (sortMode === 'lectures-asc') {
      const lectureCount = (c) => (c.modules || []).reduce((s, m) => s + (m.contents?.length || 0), 0);
      sorted.sort((a, b) => lectureCount(a) - lectureCount(b));
    } else if (sortMode === 'az') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortMode === 'za') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    return sorted;
  }, [courses, searchQuery, overviewFilterTab, enrolledCourseIds, bookmarkedCourseIds, levelFilter, sortMode]);

  const overviewTabCounts = useMemo(() => ({
    all: courses.length,
    enrolled: courses.filter((course) => enrolledCourseIds.includes(course._id)).length,
    bookmarked: courses.filter((course) => bookmarkedCourseIds.has(String(course._id))).length
  }), [courses, enrolledCourseIds, bookmarkedCourseIds]);

  const courseStats = useMemo(() => {
    const totalModules = courses.reduce((s, c) => s + (c.modules?.length || 0), 0);
    const totalLectures = courses.reduce((s, c) =>
      s + (c.modules || []).reduce((ms, m) => ms + (m.contents?.length || 0), 0), 0);
    const levels = [...new Set(courses.map((c) => c.level).filter(Boolean))];
    return { totalModules, totalLectures, levels };
  }, [courses]);

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

  const savedNotesForActiveContent = useMemo(() => {
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) return [];
    return studyItems.filter(
      (item) =>
        item.type === 'note'
        && String(item.courseId) === String(selectedCourse._id)
        && String(item.moduleId) === String(activeModule._id)
        && String(item.contentId) === String(activeContent._id)
    );
  }, [studyItems, selectedCourse?._id, activeModule?._id, activeContent?._id]);

  const highlightsForActiveContent = useMemo(() => {
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) return [];
    return studyItems.filter(
      (item) =>
        item.type === 'highlight'
        && String(item.courseId) === String(selectedCourse._id)
        && String(item.moduleId) === String(activeModule._id)
        && String(item.contentId) === String(activeContent._id)
    );
  }, [studyItems, selectedCourse?._id, activeModule?._id, activeContent?._id]);

  const bookmarkForActiveContent = useMemo(() => {
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) return null;
    return studyItems.find(
      (item) =>
        item.type === 'bookmark'
        && String(item.courseId) === String(selectedCourse._id)
        && String(item.moduleId) === String(activeModule._id)
        && String(item.contentId) === String(activeContent._id)
    ) || null;
  }, [studyItems, selectedCourse?._id, activeModule?._id, activeContent?._id]);

  const libraryItemsForCourse = useMemo(() => {
    if (!selectedCourse?._id) return [];
    return studyItems.filter((item) => String(item.courseId) === String(selectedCourse._id));
  }, [studyItems, selectedCourse?._id]);

  const courseBookmarksByCourseId = useMemo(() => {
    const map = new Map();
    studyItems.forEach((item) => {
      if (item.type !== 'bookmark') return;
      const isCourseLevel = !item.moduleId && !item.contentId;
      if (!isCourseLevel) return;
      map.set(String(item.courseId), item);
    });
    return map;
  }, [studyItems]);

  const moduleBookmarksByModuleId = useMemo(() => {
    const map = new Map();
    studyItems.forEach((item) => {
      if (item.type !== 'bookmark') return;
      if (item.targetType !== 'module') return;
      if (!item.targetId) return;
      map.set(String(item.targetId), item);
    });
    return map;
  }, [studyItems]);

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
      const added = enrollCourseLocally(course._id);
      if (added) {
        showCommentNotice('success', 'Enrolled successfully. Redirecting to My Courses...');
      }
      navigate('/student/my-courses', { state: { newlyEnrolledCourseId: course._id } });
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

    createStudyItem({
      type: 'note',
      courseId: selectedCourse._id,
      moduleId: activeModule._id,
      contentId: activeContent._id,
      title: activeContent?.title || activeModule?.title || 'Lesson Note',
      text
    })
      .then((response) => {
        if (response?.data) {
          setStudyItems((prev) => [response.data, ...prev]);
        }
        setNoteDraft('');
        setNoteNotice({ type: 'success', message: 'Note saved successfully.' });
      })
      .catch(() => {
        setNoteNotice({ type: 'error', message: 'Failed to save note. Please try again.' });
      });
  };

  const handleSaveHighlight = async () => {
    const excerpt = String(highlightDraft || '').trim();
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) {
      setNoteNotice({ type: 'error', message: 'Open a lesson resource before highlighting.' });
      return;
    }

    if (!excerpt) {
      setNoteNotice({ type: 'error', message: 'Add highlighted text first.' });
      return;
    }

    try {
      const response = await createStudyItem({
        type: 'highlight',
        courseId: selectedCourse._id,
        moduleId: activeModule._id,
        contentId: activeContent._id,
        title: activeContent?.title || 'Lesson Highlight',
        excerpt,
        text: excerpt,
        highlightMeta: { color: '#fff59d' }
      });
      if (response?.data) {
        setStudyItems((prev) => [response.data, ...prev]);
      }
      setHighlightDraft('');
      setNoteNotice({ type: 'success', message: 'Highlight saved.' });
    } catch {
      setNoteNotice({ type: 'error', message: 'Unable to save highlight right now.' });
    }
  };

  const handleCaptureLessonSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = String(selection.toString() || '').replace(/\s+/g, ' ').trim();
    if (selectedText.length < 3) return;

    const lessonElement = lessonTextRef.current;
    if (!lessonElement) return;

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    const isWithinLesson =
      (anchorNode && lessonElement.contains(anchorNode))
      || (focusNode && lessonElement.contains(focusNode));

    if (!isWithinLesson) return;

    setHighlightDraft(selectedText);
    setWorkspaceTab('notes');
    setNoteNotice({ type: 'success', message: 'Selected text captured. Save it as a highlight from Notes.' });
  };

  const handleToggleBookmark = async () => {
    if (!selectedCourse?._id || !activeModule?._id || !activeContent?._id) return;

    try {
      if (bookmarkForActiveContent?._id) {
        await deleteStudyItem(bookmarkForActiveContent._id);
        setStudyItems((prev) => prev.filter((item) => item._id !== bookmarkForActiveContent._id));
        setNoteNotice({ type: 'success', message: 'Bookmark removed.' });
      } else {
        const response = await createStudyItem({
          type: 'bookmark',
          targetType: 'content',
          targetId: activeContent._id,
          courseId: selectedCourse._id,
          moduleId: activeModule._id,
          contentId: activeContent._id,
          title: activeContent?.title || activeModule?.title || 'Bookmarked lesson'
        });
        if (response?.data) {
          setStudyItems((prev) => [response.data, ...prev]);
        }
        setNoteNotice({ type: 'success', message: 'Bookmarked for quick revision.' });
      }
    } catch {
      setNoteNotice({ type: 'error', message: 'Bookmark action failed.' });
    }
  };

  const handleToggleCourseBookmark = async (course) => {
    const existing = courseBookmarksByCourseId.get(String(course?._id));

    try {
      if (existing?._id) {
        await deleteStudyItem(existing._id);
        setStudyItems((prev) => prev.filter((item) => item._id !== existing._id));
        setNoteNotice({ type: 'success', message: 'Course bookmark removed.' });
        return;
      }

      const response = await createStudyItem({
        type: 'bookmark',
        targetType: 'course',
        targetId: course._id,
        courseId: course._id,
        title: course?.title || 'Bookmarked course'
      });

      if (response?.data) {
        setStudyItems((prev) => [response.data, ...prev]);
      }
      setNoteNotice({ type: 'success', message: 'Course bookmarked.' });
    } catch {
      setNoteNotice({ type: 'error', message: 'Unable to update course bookmark.' });
    }
  };

  const handleToggleModuleBookmark = async (course, module) => {
    const existing = moduleBookmarksByModuleId.get(String(module?._id));

    try {
      if (existing?._id) {
        await deleteStudyItem(existing._id);
        setStudyItems((prev) => prev.filter((item) => item._id !== existing._id));
        setNoteNotice({ type: 'success', message: 'Module bookmark removed.' });
        return;
      }

      const response = await createStudyItem({
        type: 'bookmark',
        targetType: 'module',
        targetId: module._id,
        courseId: course._id,
        moduleId: module._id,
        title: `${course?.title || 'Course'} - ${module?.title || 'Module'}`
      });

      if (response?.data) {
        setStudyItems((prev) => [response.data, ...prev]);
      }
      setNoteNotice({ type: 'success', message: 'Module bookmarked.' });
    } catch {
      setNoteNotice({ type: 'error', message: 'Unable to update module bookmark.' });
    }
  };

  const handleExportNotesPdf = () => {
    const notes = libraryItemsForCourse.filter((item) => item.type === 'note' || item.type === 'highlight');
    if (!notes.length) {
      setNoteNotice({ type: 'error', message: 'No notes or highlights available to export.' });
      return;
    }

    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(16);
    doc.text(`Study Notes - ${selectedCourse?.title || 'Course'}`, 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Student: ${displayName}`, 14, y);
    y += 7;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 10;

    notes.forEach((item, index) => {
      const line = `${index + 1}. [${item.type.toUpperCase()}] ${item.title || 'Study item'}`;
      const body = item.text || item.excerpt || '';
      const wrappedHeader = doc.splitTextToSize(line, 180);
      const wrappedBody = doc.splitTextToSize(body, 180);

      if (y > 260) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(11);
      doc.text(wrappedHeader, 14, y);
      y += wrappedHeader.length * 5;
      doc.setFontSize(10);
      doc.text(wrappedBody, 16, y);
      y += wrappedBody.length * 5 + 4;
    });

    doc.save(`study-notes-${new Date().toISOString().slice(0, 10)}.pdf`);
    setNoteNotice({ type: 'success', message: 'PDF exported successfully.' });
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

          {viewMode === 'overview' ? (
            <>
              {/* ── Stats top bar ── */}
              <div className="sc-stats-bar">
                <div className="sc-stat-card">
                  <span className="sc-stat-icon">📚</span>
                  <div>
                    <p className="sc-stat-value">{overviewTabCounts.all}</p>
                    <p className="sc-stat-label">Total Courses</p>
                  </div>
                </div>
                <div className="sc-stat-card accent-green">
                  <span className="sc-stat-icon">✅</span>
                  <div>
                    <p className="sc-stat-value">{overviewTabCounts.enrolled}</p>
                    <p className="sc-stat-label">Enrolled</p>
                  </div>
                </div>
                <div className="sc-stat-card accent-yellow">
                  <span className="sc-stat-icon">⭐</span>
                  <div>
                    <p className="sc-stat-value">{overviewTabCounts.bookmarked}</p>
                    <p className="sc-stat-label">Bookmarked</p>
                  </div>
                </div>
                <div className="sc-stat-card accent-purple">
                  <span className="sc-stat-icon">🗂</span>
                  <div>
                    <p className="sc-stat-value">{courseStats.totalModules}</p>
                    <p className="sc-stat-label">Total Modules</p>
                  </div>
                </div>
                <div className="sc-stat-card accent-blue">
                  <span className="sc-stat-icon">🎬</span>
                  <div>
                    <p className="sc-stat-value">{courseStats.totalLectures}</p>
                    <p className="sc-stat-label">Total Lectures</p>
                  </div>
                </div>
              </div>

              {/* ── Tab + Filter bar ── */}
              <div className="sc-filter-bar">
                <div className="course-overview-tabs" role="tablist" aria-label="Course overview filters">
                  <button
                    type="button"
                    className={`course-overview-tab ${overviewFilterTab === 'all' ? 'active' : ''}`}
                    onClick={() => setOverviewFilterTab('all')}
                  >
                    All <span>{overviewTabCounts.all}</span>
                  </button>
                  <button
                    type="button"
                    className={`course-overview-tab ${overviewFilterTab === 'enrolled' ? 'active' : ''}`}
                    onClick={() => setOverviewFilterTab('enrolled')}
                  >
                    Enrolled <span>{overviewTabCounts.enrolled}</span>
                  </button>
                  <button
                    type="button"
                    className={`course-overview-tab ${overviewFilterTab === 'bookmarked' ? 'active' : ''}`}
                    onClick={() => setOverviewFilterTab('bookmarked')}
                  >
                    Bookmarked <span>{overviewTabCounts.bookmarked}</span>
                  </button>
                </div>

                <div className="sc-controls">
                  <select
                    className="sc-select"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    aria-label="Filter by level"
                  >
                    <option value="all">All Levels</option>
                    {courseStats.levels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>

                  <select
                    className="sc-select"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    aria-label="Sort courses"
                  >
                    <option value="default">Default Order</option>
                    <option value="az">A → Z</option>
                    <option value="za">Z → A</option>
                    <option value="modules-desc">Most Modules</option>
                    <option value="modules-asc">Fewest Modules</option>
                    <option value="lectures-desc">Most Lectures</option>
                    <option value="lectures-asc">Fewest Lectures</option>
                  </select>

                  {(levelFilter !== 'all' || sortMode !== 'default') && (
                    <button
                      type="button"
                      className="sc-reset-btn"
                      onClick={() => { setLevelFilter('all'); setSortMode('default'); }}
                      title="Clear filters"
                    >
                      ✕ Clear
                    </button>
                  )}

                  <span className="sc-result-count">{filteredCourses.length} result{filteredCourses.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </>
          ) : null}

          {loading ? (
            <div className="state-box">Loading courses...</div>
          ) : error ? (
            <div className="state-box error">{error}</div>
          ) : courses.length === 0 ? (
            <div className="state-box">No courses found. Please check back later.</div>
          ) : viewMode === 'overview' ? (
            filteredCourses.length === 0 ? (
              <div className="state-box">
                {overviewFilterTab === 'bookmarked' && 'No bookmarked courses yet. Tap the star icon on a course card. '}
                {overviewFilterTab === 'enrolled' && 'No enrolled courses in this filter. '}
                {searchQuery
                  ? `No results found for "${searchQuery}". Try a course title, subject, or module name.`
                  : 'No courses available for the selected tab.'}
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
                        className={`course-bookmark-btn ${courseBookmarksByCourseId.has(String(course._id)) ? 'active' : ''}`}
                        onClick={() => handleToggleCourseBookmark(course)}
                        title={courseBookmarksByCourseId.has(String(course._id)) ? 'Remove course bookmark' : 'Bookmark this course'}
                      >
                        {courseBookmarksByCourseId.has(String(course._id)) ? '★' : '☆'}
                      </button>
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
                      const isModuleBookmarked = moduleBookmarksByModuleId.has(String(module._id));
                      return (
                        <div key={module._id} className="overview-module-row">
                          <button
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
                        </div>
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
                    <div className="lesson-heading-actions">
                      <button
                        type="button"
                        className={`bookmark-btn ${bookmarkForActiveContent ? 'active' : ''}`}
                        onClick={handleToggleBookmark}
                        title={bookmarkForActiveContent ? 'Remove bookmark' : 'Bookmark this lesson'}
                      >
                        {bookmarkForActiveContent ? '★' : '☆'}
                      </button>
                      <button type="button" className="share-btn">↗</button>
                    </div>
                  </div>
                  <p
                    ref={lessonTextRef}
                    className="lesson-description selectable"
                    onMouseUp={handleCaptureLessonSelection}
                  >
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
                      <div className="notes-actions-row">
                        <button
                          type="button"
                          className="notes-save-btn secondary"
                          onClick={() => navigate('/student/study-library')}
                        >
                          Open Study Library
                        </button>
                        <button type="button" className="notes-save-btn secondary" onClick={handleExportNotesPdf}>
                          Export Notes as PDF
                        </button>
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Capture your key ideas from this lesson..."
                        rows={6}
                      />
                      <button type="button" className="notes-save-btn" onClick={handleSaveNotes}>Save Note</button>

                      <textarea
                        value={highlightDraft}
                        onChange={(event) => setHighlightDraft(event.target.value)}
                        placeholder="Paste or type an important excerpt to save as highlight..."
                        rows={3}
                      />
                      <button type="button" className="notes-save-btn secondary" onClick={handleSaveHighlight}>Save Highlight</button>

                      {noteNotice && (
                        <div className={`comment-notice ${noteNotice.type}`}>
                          {noteNotice.message}
                        </div>
                      )}

                      {studyLoading ? <div className="empty-inline">Loading study materials...</div> : null}

                      {highlightsForActiveContent.length > 0 && (
                        <div className="saved-note-preview">
                          <strong>Saved Highlights ({highlightsForActiveContent.length})</strong>
                          <div className="saved-notes-list">
                            {highlightsForActiveContent.map((item) => (
                              <article key={item._id} className="saved-note-item highlight-item">
                                <p>{item.excerpt || item.text}</p>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {savedNotesForActiveContent.length > 0 && (
                        <div className="saved-note-preview">
                          <strong>Saved Notes ({savedNotesForActiveContent.length})</strong>
                          <div className="saved-notes-list">
                            {savedNotesForActiveContent.map((note) => {
                              const reactions = getNoteReactions(note._id);
                              return (
                                <article key={note._id} className="saved-note-item">
                                  <p>{note.text}</p>
                                  <div className="saved-note-reactions" role="group" aria-label="React to saved note">
                                    <button
                                      type="button"
                                      className={`note-reaction-btn ${reactions.like ? 'active' : ''}`}
                                      onClick={() => handleToggleNoteReaction(note._id, 'like')}
                                      aria-pressed={reactions.like}
                                    >
                                      <FaThumbsUp aria-hidden="true" />
                                      Helpful
                                    </button>
                                    <button
                                      type="button"
                                      className={`note-reaction-btn ${reactions.love ? 'active' : ''}`}
                                      onClick={() => handleToggleNoteReaction(note._id, 'love')}
                                      aria-pressed={reactions.love}
                                    >
                                      <FaHeart aria-hidden="true" />
                                      Love
                                    </button>
                                    <button
                                      type="button"
                                      className={`note-reaction-btn ${reactions.idea ? 'active' : ''}`}
                                      onClick={() => handleToggleNoteReaction(note._id, 'idea')}
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

                      {libraryItemsForCourse.length > 0 && (
                        <div className="saved-note-preview">
                          <strong>Personal Study Materials Library ({libraryItemsForCourse.length})</strong>
                          <div className="saved-notes-list">
                            {libraryItemsForCourse.slice(0, 8).map((item) => (
                              <article key={item._id} className="saved-note-item">
                                <small className="library-pill">{item.type}</small>
                                <p>{item.title || item.text || item.excerpt}</p>
                              </article>
                            ))}
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
