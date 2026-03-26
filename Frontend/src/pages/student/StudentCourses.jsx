import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../services/api';
import { getCourses } from '../../services/courseService';
import './StudentCourses.css';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');

const StudentCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?._id || user?.id || 'guest';

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [completionMap, setCompletionMap] = useState({});

  const enrollmentStorageKey = `student-course-enrollments-${studentId}`;
  const progressStorageKey = `student-course-progress-${studentId}`;

  useEffect(() => {
    try {
      const savedEnrollments = localStorage.getItem(enrollmentStorageKey);
      setEnrolledIds(savedEnrollments ? JSON.parse(savedEnrollments) : []);
    } catch {
      setEnrolledIds([]);
    }

    try {
      const savedProgress = localStorage.getItem(progressStorageKey);
      setCompletionMap(savedProgress ? JSON.parse(savedProgress) : {});
    } catch {
      setCompletionMap({});
    }
  }, [enrollmentStorageKey, progressStorageKey]);

  useEffect(() => {
    localStorage.setItem(enrollmentStorageKey, JSON.stringify(enrolledIds));
  }, [enrolledIds, enrollmentStorageKey]);

  useEffect(() => {
    localStorage.setItem(progressStorageKey, JSON.stringify(completionMap));
  }, [completionMap, progressStorageKey]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getCourses();
        const items = response.data || [];
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

  const enrolledCourses = useMemo(() => {
    return courses.filter((course) => enrolledIds.includes(course._id));
  }, [courses, enrolledIds]);

  const getCourseProgress = (course) => {
    const contents = (course.modules || []).flatMap((module) => module.contents || []);
    const total = contents.length;
    const done = contents.filter((content) => completionMap?.[course._id]?.[content._id]).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  };

  const toggleEnrollment = (courseId) => {
    setEnrolledIds((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      }
      return [...prev, courseId];
    });
  };

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

  return (
    <DashboardLayout activeSection="My Courses" theme="light">
      <div className="student-courses-page">
        <div className="student-courses-header">
          <div>
            <h1>Student Courses</h1>
            <p>Enroll in available courses and access PDFs, notes, and video resources.</p>
          </div>
          <button className="progress-btn" onClick={() => navigate('/student/progress')}>
            View Progress
          </button>
        </div>

        <div className="student-course-stats">
          <div className="stat-card">
            <span>Total Courses</span>
            <strong>{courses.length}</strong>
          </div>
          <div className="stat-card">
            <span>Enrolled</span>
            <strong>{enrolledCourses.length}</strong>
          </div>
          <div className="stat-card">
            <span>Completed Items</span>
            <strong>
              {enrolledCourses.reduce((sum, course) => sum + getCourseProgress(course).done, 0)}
            </strong>
          </div>
        </div>

        {loading ? (
          <div className="state-box">Loading courses...</div>
        ) : error ? (
          <div className="state-box error">{error}</div>
        ) : (
          <div className="student-course-grid">
            <aside className="course-list-panel">
              <h3>Available Courses</h3>
              <div className="course-list">
                {courses.map((course) => {
                  const isEnrolled = enrolledIds.includes(course._id);
                  const progress = getCourseProgress(course);
                  return (
                    <div key={course._id} className={`course-list-item ${selectedCourseId === course._id ? 'active' : ''}`}>
                      <button className="course-select" onClick={() => setSelectedCourseId(course._id)}>
                        <strong>{course.title}</strong>
                        <span>{course.subject} • {course.level}</span>
                        <small>{progress.percent}% complete</small>
                      </button>
                      <button
                        className={`enroll-btn ${isEnrolled ? 'enrolled' : ''}`}
                        onClick={() => toggleEnrollment(course._id)}
                      >
                        {isEnrolled ? 'Unenroll' : 'Enroll'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </aside>

            <section className="course-detail-panel">
              {!selectedCourse ? (
                <div className="state-box">Select a course to view details.</div>
              ) : (
                <>
                  <div className="detail-top">
                    <h2>{selectedCourse.title}</h2>
                    <p>{selectedCourse.description || 'No description available.'}</p>
                    <div className="detail-meta">
                      <span>{selectedCourse.subject}</span>
                      <span>{selectedCourse.level}</span>
                      <span>{(selectedCourse.modules || []).length} modules</span>
                    </div>
                  </div>

                  {!enrolledIds.includes(selectedCourse._id) ? (
                    <div className="state-box">
                      Enroll in this course to track your progress and access materials.
                    </div>
                  ) : (
                    <div className="module-list">
                      {(selectedCourse.modules || []).map((module) => (
                        <div key={module._id} className="module-card">
                          <h4>{module.order}. {module.title}</h4>
                          <p>{module.description || 'No description.'}</p>

                          <div className="content-list">
                            {(module.contents || []).map((content) => (
                              <div key={content._id} className="content-row">
                                <label className="check-wrap">
                                  <input
                                    type="checkbox"
                                    checked={!!completionMap?.[selectedCourse._id]?.[content._id]}
                                    onChange={() => toggleContentComplete(selectedCourse._id, content._id)}
                                  />
                                  <span>Done</span>
                                </label>

                                <div className="content-main">
                                  <div className="content-title-row">
                                    <strong>{content.order}. {content.title}</strong>
                                    <span className="type-pill">{content.contentType}</span>
                                  </div>

                                  {content.url ? (
                                    <a href={buildContentUrl(content.url)} target="_blank" rel="noreferrer" className="content-link">
                                      Open Resource
                                    </a>
                                  ) : (
                                    <p className="content-note">{content.textContent || 'No link provided for this item.'}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {(module.contents || []).length === 0 && (
                              <div className="empty-inline">No materials uploaded yet.</div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(selectedCourse.modules || []).length === 0 && (
                        <div className="empty-inline">No modules available in this course.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentCourses;
