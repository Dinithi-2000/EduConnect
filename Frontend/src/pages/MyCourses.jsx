import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyCourses.css';

const MyCourses = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const courses = [
    {
      id: 1,
      title: 'Data Structures and Algorithms',
      instructor: 'Dr. Smith',
      progress: 45,
      totalModules: 12,
      completedModules: 5,
      image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',
      status: 'In Progress',
      color: '#3b82f6',
      accent: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      lastAccessed: '2 days ago'
    },
    {
      id: 2,
      title: 'Advanced Mathematics',
      instructor: 'Prof. Johnson',
      progress: 15,
      totalModules: 10,
      completedModules: 1,
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
      status: 'In Progress',
      color: '#10b981',
      accent: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      lastAccessed: '1 week ago'
    },
    {
      id: 3,
      title: 'Molecular Biology',
      instructor: 'Dr. Williams',
      progress: 100,
      totalModules: 8,
      completedModules: 8,
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80',
      status: 'Completed',
      color: '#8b5cf6',
      accent: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      lastAccessed: 'Just now'
    },
    {
      id: 4,
      title: 'Introduction to Psychology',
      instructor: 'Dr. Davis',
      progress: 0,
      totalModules: 6,
      completedModules: 0,
      image: 'https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe?w=800&q=80',
      status: 'Not Started',
      color: '#f59e0b',
      accent: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      lastAccessed: 'Never'
    }
  ];

  const filteredCourses = courses.filter(course => {
    const matchesFilter = filter === 'All' || course.status === filter;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="modern-courses-container">
      {/* Decorative Background Elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>

      <header className="modern-header">
        <div className="header-content">
          <h1 className="hero-title">My Learning Journey</h1>
          <p className="hero-subtitle">Pick up where you left off and discover new skills.</p>
        </div>
        
        <div className="controls-bar">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search your courses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="course-search-input"
            />
          </div>
          
          <div className="modern-filters">
            {['All', 'In Progress', 'Completed', 'Not Started'].map(f => (
              <button
                key={f}
                className={`pill-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="modern-grid">
        {filteredCourses.map((course, index) => (
          <div 
            key={course.id} 
            className="glass-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="card-image-wrapper">
              <img src={course.image} alt={course.title} className="card-image" />
              <div className="card-image-overlay" style={{ background: course.accent }}></div>
              <span className="status-pill" style={{ color: course.color }}>
                <span className="dot" style={{ backgroundColor: course.color }}></span>
                {course.status}
              </span>
              <button className="glass-play-btn">
                <span className="play-icon">▶</span>
              </button>
            </div>
            
            <div className="card-body">
              <div className="card-meta">
                <span className="instructor">👨‍🏫 {course.instructor}</span>
                <span className="last-accessed">🕒 {course.lastAccessed}</span>
              </div>
              
              <h3 className="card-title">{course.title}</h3>
              
              <div className="progress-wrapper">
                <div className="progress-labels">
                  <span className="progress-percentage" style={{ color: course.color }}>
                    {course.progress}%
                  </span>
                  <span className="progress-fraction">
                    {course.completedModules}/{course.totalModules}
                  </span>
                </div>
                <div className="track-bg">
                  <div 
                    className="track-fill" 
                    style={{ 
                      width: `${course.progress}%`,
                      background: course.accent,
                      boxShadow: `0 0 10px ${course.color}80`
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="card-footer">
                <button 
                  className="action-btn" 
                  onClick={() => navigate(`/course/${course.id}`)}
                  style={{ 
                    background: course.progress === 0 ? 'rgba(59, 130, 246, 0.1)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: course.progress === 0 ? '#3b82f6' : '#fff',
                    border: course.progress === 0 ? '1px solid rgba(59, 130, 246, 0.4)' : 'none'
                  }}
                >
                  {course.progress === 0 ? 'Start Learning' : course.progress === 100 ? 'Review Course' : 'Continue Learning'}
                </button>
                <button 
                  className="chat-toggle-btn"
                  onClick={() => navigate(`/course/${course.id}`)}
                  title="Course Details & Chat"
                >
                  💬
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No courses found</h3>
          <p>Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
