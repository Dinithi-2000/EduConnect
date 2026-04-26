import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CourseDetails.css';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('materials');

  // Mock data for the course
  const course = {
    id: courseId,
    title: 'Data Structures and Algorithms',
    instructor: 'Dr. Smith',
    progress: 45,
    image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&q=80',
    accent: '#3b82f6',
    description: 'Learn the fundamentals of data structures and algorithms, including arrays, linked lists, trees, graphs, and sorting algorithms.'
  };

  const materials = [
    { id: 1, title: 'Introduction to Arrays', type: 'PDF', size: '2.4 MB', date: 'Oct 12' },
    { id: 2, title: 'Linked Lists Cheatsheet', type: 'Doc', size: '1.1 MB', date: 'Oct 15' },
    { id: 3, title: 'Midterm Past Paper 2023', type: 'PDF', size: '4.5 MB', date: 'Oct 20' },
    { id: 4, title: 'Binary Trees Presentation', type: 'Slides', size: '8.2 MB', date: 'Oct 25' }
  ];

  const qaThreads = [
    { id: 1, author: 'Alice', question: 'How does quicksort pivot selection affect performance?', answers: 3, time: '2 hours ago' },
    { id: 2, author: 'Bob', question: 'Difference between a hash map and a hash set?', answers: 1, time: '5 hours ago' },
    { id: 3, author: 'Charlie', question: 'Can someone explain AVL tree rotations?', answers: 0, time: '1 day ago' }
  ];

  return (
    <div className="course-details-container">
      {/* Background shapes for glassmorphism */}
      <div className="bg-shape detail-shape-1"></div>
      <div className="bg-shape detail-shape-2"></div>

      {/* Navigation Header */}
      <nav className="detail-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <span className="back-icon">←</span> Back to Courses
        </button>
      </nav>

      {/* Course Header Banner */}
      <header className="course-banner">
        <div className="banner-overlay"></div>
        <img src={course.image} alt={course.title} className="banner-image" />
        <div className="banner-content">
          <span className="banner-badge">Enrolled</span>
          <h1 className="banner-title">{course.title}</h1>
          <p className="banner-instructor">Instructor: {course.instructor}</p>
          <p className="banner-desc">{course.description}</p>
          
          <div className="banner-progress">
            <div className="progress-text">
              <span>Overall Progress</span>
              <span>{course.progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${course.progress}%`, background: course.accent }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="course-main">
        {/* Tabs */}
        <div className="tabs-container glass-panel">
          <button 
            className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            📚 Study Materials
          </button>
          <button 
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            🤖 AI Chat Session
          </button>
          <button 
            className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            ❓ Q & A Session
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content glass-panel">
          
          {/* Study Materials Tab */}
          {activeTab === 'materials' && (
            <div className="materials-section animate-fade">
              <h2 className="section-title">Course Library</h2>
              <div className="materials-grid">
                {materials.map(mat => (
                  <div key={mat.id} className="material-card">
                    <div className="material-icon">
                      {mat.type === 'PDF' ? '📄' : mat.type === 'Slides' ? '📊' : '📝'}
                    </div>
                    <div className="material-info">
                      <h4 className="material-title">{mat.title}</h4>
                      <p className="material-meta">{mat.type} • {mat.size} • {mat.date}</p>
                    </div>
                    <button className="download-btn">Download</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Chat Session Tab */}
          {activeTab === 'chat' && (
            <div className="chat-section animate-fade">
              <div className="chat-header">
                <h2 className="section-title">AI Course Assistant</h2>
                <span className="online-status">● Online</span>
              </div>
              <div className="chat-window">
                <div className="chat-message bot">
                  <div className="msg-avatar">🤖</div>
                  <div className="msg-bubble">
                    Hello! I'm your AI tutor for {course.title}. How can I help you today?
                  </div>
                </div>
                <div className="chat-message user">
                  <div className="msg-bubble">
                    Can you explain Big O notation?
                  </div>
                </div>
                <div className="chat-message bot">
                  <div className="msg-avatar">🤖</div>
                  <div className="msg-bubble">
                    Of course! Big O notation is used to describe the performance or complexity of an algorithm...
                  </div>
                </div>
              </div>
              <div className="chat-input-area">
                <input type="text" placeholder="Ask a question about the course..." className="chat-input" />
                <button className="chat-send-btn">Send</button>
              </div>
            </div>
          )}

          {/* Q&A Session Tab */}
          {activeTab === 'qa' && (
            <div className="qa-section animate-fade">
              <div className="qa-header">
                <h2 className="section-title">Student Q&A</h2>
                <button className="ask-btn">+ Ask Question</button>
              </div>
              <div className="qa-list">
                {qaThreads.map(thread => (
                  <div key={thread.id} className="qa-thread">
                    <div className="qa-votes">
                      <button className="vote-btn">▲</button>
                      <span>{Math.floor(Math.random() * 10)}</span>
                    </div>
                    <div className="qa-content">
                      <h4 className="qa-question">{thread.question}</h4>
                      <p className="qa-meta">Posted by {thread.author} • {thread.time}</p>
                    </div>
                    <div className="qa-stats">
                      <span className="answer-count {thread.answers > 0 ? 'answered' : ''}">
                        {thread.answers} answers
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default CourseDetails;
