import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const isAdmin = ['admin', 'teacher'].includes(user?.role);

  const kpiCards = [
    {
      icon: '📚',
      title: 'Active Courses',
      value: '18',
      delta: '+3 this month'
    },
    {
      icon: '📝',
      title: 'Published Quizzes',
      value: '42',
      delta: '+7 this week'
    },
    {
      icon: '👥',
      title: 'Community Posts',
      value: '126',
      delta: '+19 today'
    },
    {
      icon: '💳',
      title: 'Premium Revenue',
      value: '$1,260',
      delta: '+14% vs last month'
    }
  ];

  const weeklyPerformance = [
    { day: 'Mon', value: 58 },
    { day: 'Tue', value: 72 },
    { day: 'Wed', value: 64 },
    { day: 'Thu', value: 86 },
    { day: 'Fri', value: 78 },
    { day: 'Sat', value: 70 },
    { day: 'Sun', value: 82 }
  ];

  const recentActivities = [
    {
      badge: 'Quiz',
      title: 'Advanced React Patterns was published',
      time: '12 minutes ago'
    },
    {
      badge: 'Payment',
      title: '4 premium quiz purchases completed',
      time: '48 minutes ago'
    },
    {
      badge: 'Community',
      title: 'New moderation queue has 3 flagged posts',
      time: '1 hour ago'
    },
    {
      badge: 'Course',
      title: 'Data Structures module 5 was updated',
      time: '2 hours ago'
    }
  ];

  const priorityItems = [
    { text: 'Review premium quiz approval queue', level: 'high' },
    { text: 'Respond to 6 community reports', level: 'medium' },
    { text: 'Publish weekly instructor summary', level: 'low' }
  ];

  return (
    <DashboardLayout activeSection="Dashboard">
      <div className="admin-dashboard">
        <section className="admin-hero">
          <div className="hero-copy">
            <span className="hero-role">{isAdmin ? 'Admin Control Center' : 'Instructor Workspace'}</span>
            <h1>Welcome back, {firstName}</h1>
            <p>
              Monitor platform health, publish premium quizzes, and keep your learning community active with
              one streamlined dashboard.
            </p>
            <div className="hero-actions">
              <button className="hero-btn primary" onClick={() => navigate('/quizzes/create')}>
                Create New Quiz
              </button>
              <button className="hero-btn" onClick={() => navigate('/premium')}>
                Manage Premium
              </button>
              <button className="hero-btn ghost" onClick={() => navigate('/progress')}>
                Open Reports
              </button>
            </div>
          </div>
          <div className="hero-panel">
            <p className="panel-title">System Pulse</p>
            <div className="pulse-item">
              <span>Course Completion Trend</span>
              <strong>+8.2%</strong>
            </div>
            <div className="pulse-item">
              <span>Premium Conversion</span>
              <strong>12.4%</strong>
            </div>
            <div className="pulse-item">
              <span>Community Response Time</span>
              <strong>18 min</strong>
            </div>
          </div>
        </section>

        <section className="kpi-grid">
          {kpiCards.map((card) => (
            <article key={card.title} className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon">{card.icon}</span>
                <span className="kpi-delta">{card.delta}</span>
              </div>
              <h3>{card.value}</h3>
              <p>{card.title}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card performance-card">
            <div className="card-head">
              <h2>Weekly Performance</h2>
              <button onClick={() => navigate('/progress')}>View Reports</button>
            </div>
            <div className="bars-wrap">
              {weeklyPerformance.map((point) => (
                <div key={point.day} className="bar-unit">
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${point.value}%` }}></div>
                  </div>
                  <span>{point.day}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card activity-card">
            <div className="card-head">
              <h2>Recent Activity</h2>
              <button onClick={() => navigate('/community')}>Go Community</button>
            </div>
            <ul className="activity-list">
              {recentActivities.map((activity, idx) => (
                <li key={`${activity.badge}-${idx}`}>
                  <span className="activity-badge">{activity.badge}</span>
                  <div>
                    <p>{activity.title}</p>
                    <small>{activity.time}</small>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="dashboard-card priorities-card">
            <div className="card-head">
              <h2>Priority Queue</h2>
              <button onClick={() => navigate('/quizzes')}>Review</button>
            </div>
            <div className="priority-list">
              {priorityItems.map((item) => (
                <div key={item.text} className={`priority-item ${item.level}`}>
                  <span className="dot"></span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card quick-actions-card">
            <h2>Quick Actions</h2>
            <div className="quick-grid">
              <button onClick={() => navigate('/courses')}>Update Courses</button>
              <button onClick={() => navigate('/quizzes')}>Review Quizzes</button>
              <button onClick={() => navigate('/premium')}>Premium Catalog</button>
              <button onClick={() => navigate('/community')}>Moderate Posts</button>
            </div>
          </article>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Home;
