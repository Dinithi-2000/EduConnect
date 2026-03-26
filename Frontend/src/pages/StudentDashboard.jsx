import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import AIChatWidget from '../components/AIChatWidget';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [upcomingClasses, setUpcomingClasses] = useState([
    {
      id: 1,
      course: 'Data Structures',
      time: 'Today, 4:00 PM',
      duration: '1 hour',
      instructor: 'John Doe'
    },
    {
      id: 2,
      course: 'Advanced Mathematics',
      time: 'Tomorrow, 10:00 AM',
      duration: '1.5 hours',
      instructor: 'Jane Smith'
    },
    {
      id: 3,
      course: 'Web Development',
      time: 'Friday, 2:00 PM',
      duration: '2 hours',
      instructor: 'Mike Johnson'
    }
  ]);

  const [recentQuizzes, setRecentQuizzes] = useState([
    {
      id: 1,
      title: 'Data Structures: Arrays & Lists',
      score: 85,
      total: 100,
      date: '2 days ago',
      status: 'completed'
    },
    {
      id: 2,
      title: 'Calculus: Derivatives',
      score: 92,
      total: 100,
      date: '1 week ago',
      status: 'completed'
    },
    {
      id: 3,
      title: 'HTML/CSS Basics',
      score: 0,
      total: 100,
      date: 'Not started',
      status: 'pending'
    }
  ]);

  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageScore: 87,
    quizzesCompleted: 12,
    coursesEnrolled: 4,
    studyStreak: 7
  });

  const [studyGoals, setStudyGoals] = useState([
    'Complete Data Structures course by next month',
    'Achieve 90% average across all quizzes',
    'Participate in community discussions daily'
  ]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigateToQuizzes = () => {
    navigate('/student/quizzes');
  };

  const handleNavigateToCourses = () => {
    navigate('/student/courses');
  };

  return (
    <div className="student-dashboard">
      <Navbar />
      
      <div className="dashboard-container">
        {/* Sidebar Navigation */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-profile">
            <div className="profile-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="profile-info">
              <h3>{user?.name || 'Student'}</h3>
              <p>{user?.email}</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <Link to="/student-dashboard" className="nav-item active">
              <span className="nav-icon">📊</span>
              Dashboard
            </Link>
            <Link to="/student/courses" className="nav-item">
              <span className="nav-icon">📚</span>
              Courses
            </Link>
            <Link to="/student/quizzes" className="nav-item">
              <span className="nav-icon">✏️</span>
              Quizzes
            </Link>
            <Link to="/student/progress" className="nav-item">
              <span className="nav-icon">📈</span>
              Progress
            </Link>
            <Link to="/student/premium" className="nav-item">
              <span className="nav-icon">👑</span>
              Premium
            </Link>
            <Link to="/student/community" className="nav-item">
              <span className="nav-icon">💬</span>
              Community
            </Link>
          </nav>

          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
              <p>Here's your learning overview for today</p>
            </div>
            <div className="header-actions">
              <button className="btn-primary" onClick={handleNavigateToQuizzes}>
                Start Quiz
              </button>
              <button className="btn-secondary" onClick={handleNavigateToCourses}>
                Browse Courses
              </button>
            </div>
          </div>

          {/* Performance Metrics */}
          <section className="metrics-section">
            <h2>Your Performance</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">🎯</div>
                <div className="metric-content">
                  <h3>{performanceMetrics.averageScore}%</h3>
                  <p>Average Score</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">✅</div>
                <div className="metric-content">
                  <h3>{performanceMetrics.quizzesCompleted}</h3>
                  <p>Quizzes Completed</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">📚</div>
                <div className="metric-content">
                  <h3>{performanceMetrics.coursesEnrolled}</h3>
                  <p>Courses Enrolled</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">🔥</div>
                <div className="metric-content">
                  <h3>{performanceMetrics.studyStreak}</h3>
                  <p>Day Study Streak</p>
                </div>
              </div>
            </div>
          </section>

          <div className="dashboard-content-grid">
            {/* Upcoming Classes */}
            <section className="upcoming-section">
              <div className="section-header">
                <h2>Upcoming Kuppi Sessions</h2>
                <Link to="/student/courses" className="view-all">View All →</Link>
              </div>
              <div className="upcoming-list">
                {upcomingClasses.map((classItem) => (
                  <div key={classItem.id} className="upcoming-card">
                    <div className="upcoming-left">
                      <div className="course-badge">{classItem.course.substring(0, 2)}</div>
                      <div className="upcoming-details">
                        <h4>{classItem.course}</h4>
                        <p className="instructor">{classItem.instructor}</p>
                      </div>
                    </div>
                    <div className="upcoming-right">
                      <span className="time">{classItem.time}</span>
                      <span className="duration">{classItem.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Quizzes */}
            <section className="quizzes-section">
              <div className="section-header">
                <h2>Recent Quizzes</h2>
                <Link to="/student/quizzes" className="view-all">View All →</Link>
              </div>
              <div className="quizzes-list">
                {recentQuizzes.map((quiz) => (
                  <div key={quiz.id} className="quiz-card">
                    <div className="quiz-info">
                      <h4>{quiz.title}</h4>
                      {quiz.status === 'completed' ? (
                        <div className="quiz-score">
                          <span className="score-badge">{quiz.score}/{quiz.total}</span>
                          <span className="date">{quiz.date}</span>
                        </div>
                      ) : (
                        <div className="quiz-pending">
                          <span className="status-badge pending">{quiz.status}</span>
                          <span className="date">{quiz.date}</span>
                        </div>
                      )}
                    </div>
                    {quiz.status === 'completed' && (
                      <div className="quiz-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${(quiz.score / quiz.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Study Goals */}
          <section className="goals-section">
            <div className="section-header">
              <h2>Study Goals</h2>
            </div>
            <div className="goals-list">
              {studyGoals.map((goal, index) => (
                <div key={index} className="goal-item">
                  <input type="checkbox" id={`goal-${index}`} />
                  <label htmlFor={`goal-${index}`}>{goal}</label>
                </div>
              ))}
            </div>
          </section>

          {/* AI Chat Widget */}
          <AIChatWidget />
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
