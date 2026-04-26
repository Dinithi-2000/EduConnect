import React from 'react';
import './MyCourses.css';

const MyCourses = () => {
  const courses = [
    {
      id: 1,
      title: 'Advanced Data Structures & Algorithms',
      instructor: 'Dr. Smith',
      progress: 75,
      totalModules: 12,
      completedModules: 9,
      nextTopic: 'Graph Traversal',
      image: 'url(/images/course_dsa.png)',
    },
    {
      id: 2,
      title: 'Machine Learning Fundamentals',
      instructor: 'Prof. Andrew',
      progress: 40,
      totalModules: 10,
      completedModules: 4,
      nextTopic: 'Logistic Regression',
      image: 'url(/images/course_ml.png)',
    },
    {
      id: 3,
      title: 'Web Development with React',
      instructor: 'Sarah Jenkins',
      progress: 90,
      totalModules: 15,
      completedModules: 13,
      nextTopic: 'State Management with Redux',
      image: 'url(/images/course_webdev.png)',
    },
    {
      id: 4,
      title: 'Database Management Systems',
      instructor: 'Dr. Lee',
      progress: 25,
      totalModules: 8,
      completedModules: 2,
      nextTopic: 'Normalization Forms',
      image: 'url(/images/course_ml.png)',
    },
    {
      id: 5,
      title: 'Software Engineering Principles',
      instructor: 'Prof. Davis',
      progress: 100,
      totalModules: 10,
      completedModules: 10,
      nextTopic: 'Course Completed',
      image: 'url(/images/course_dsa.png)',
    },
  ];

  return (
    <div className="my-courses-container">
      <div className="my-courses-header">
        <div>
          <h1 className="my-courses-title">My Learning Journey</h1>
          <p className="my-courses-subtitle">Continue where you left off and achieve your goals.</p>
        </div>
        <div className="my-courses-filter">
          <button className="filter-btn active">All Courses</button>
          <button className="filter-btn">In Progress</button>
          <button className="filter-btn">Completed</button>
        </div>
      </div>

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <div className="course-card-image" style={{ backgroundImage: course.image, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="course-progress-badge">
                {course.progress === 100 ? 'Completed' : 'In Progress'}
              </div>
            </div>
            
            <div className="course-card-content">
              <h3 className="course-title">{course.title}</h3>
              <p className="course-instructor">👨‍🏫 {course.instructor}</p>
              
              <div className="course-progress-section">
                <div className="progress-info">
                  <span className="progress-text">Progress</span>
                  <span className="progress-percentage">{course.progress}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className={`progress-bar-fill ${course.progress === 100 ? 'completed' : ''}`} 
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
                <p className="modules-text">
                  {course.completedModules} / {course.totalModules} modules completed
                </p>
              </div>

              <div className="course-card-footer">
                <div className="next-topic">
                  <span className="topic-label">Next: </span>
                  <span className="topic-name">{course.nextTopic}</span>
                </div>
                <button className={`continue-btn ${course.progress === 100 ? 'review' : ''}`}>
                  {course.progress === 100 ? 'Review' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCourses;
