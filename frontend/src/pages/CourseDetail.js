import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { courseService } from '../services/courseService';
import './CourseDetail.css';

const CourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const data = await courseService.getCourse(id);
      setCourse(data.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load course details');
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!course) return <div className="alert alert-error">Course not found</div>;

  return (
    <div className="course-detail">
      <div className="course-header">
        <img
          src={course.thumbnail || 'https://via.placeholder.com/800x400'}
          alt={course.title}
          className="course-banner"
        />
        <div className="course-header-content">
          <h1>{course.title}</h1>
          <p className="course-instructor">
            Instructor: {course.instructor?.name || 'Unknown'}
          </p>
          <div className="course-badges">
            <span className="badge">{course.level}</span>
            <span className="badge">{course.category}</span>
            <span className="badge">{course.duration} hours</span>
          </div>
        </div>
      </div>

      <div className="course-body">
        <div className="course-description">
          <h2>About This Course</h2>
          <p>{course.description}</p>
        </div>

        <div className="course-enroll">
          <button className="btn btn-primary btn-large">Enroll Now</button>
          <p className="enrolled-count">
            {course.students?.length || 0} students enrolled
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
