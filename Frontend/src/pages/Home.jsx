import React, { useState } from 'react';
import './Home.css';

const Home = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeNav, setActiveNav] = useState('Dashboard');

  const statsData = [
    {
      icon: '🎓',
      title: 'Enrolled Courses',
      value: '12',
      badge: '+2 new',
      badgeColor: '#10b981'
    },
    {
      icon: '🎥',
      title: 'Kuppi Sessions',
      value: '05',
      badge: 'Next: 2h',
      badgeColor: '#6366f1'
    },
    {
      icon: '📝',
      title: 'Quizzes Taken',
      value: '24',
      badge: '+15%',
      badgeColor: '#10b981'
    },
    {
      icon: '📊',
      title: 'Overall Progress',
      value: '85%',
      badge: '+5% week',
      badgeColor: '#10b981'
    }
  ];

  const weeklyData = [
    { day: 'Mon', value: 40 },
    { day: 'Tue', value: 65 },
    { day: 'Wed', value: 55 },
    { day: 'Thu', value: 85 },
    { day: 'Fri', value: 70 },
    { day: 'Sat', value: 50 },
    { day: 'Sun', value: 60 }
  ];

  const upcomingKuppi = [
    {
      icon: '💻',
      title: 'Data Structures',
      time: 'Today, 4:00 PM',
      color: '#dbeafe',
      iconBg: '#3b82f6'
    },
    {
      icon: '📐',
      title: 'Adv. Mathem...',
      time: 'Tomorrow, 10:00...',
      color: '#dcfce7',
      iconBg: '#22c55e'
    },
    {
      icon: '🧬',
      title: 'Molecular Bi...',
      time: 'Fri, 2:00 PM + Pr...',
      color: '#d1fae5',
      iconBg: '#10b981'
    }
  ];

  const navItems = [
    { icon: '📊', label: 'Dashboard' },
    { icon: '📚', label: 'My Courses' },
    { icon: '📝', label: 'Quizzes' },
    { icon: '🎥', label: 'Kuppi Sessions' },
    { icon: '👥', label: 'Community' },
    { icon: '📈', label: 'Analytics' }
  ];

  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EduConnect</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              onClick={() => setActiveNav(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="upgrade-section">
            <span className="upgrade-icon">👑</span>
            <span className="upgrade-text">Premium</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon">🤖</span>
            <span className="nav-label">AI Chatbot</span>
          </div>
          <div className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search for courses, quizzes, or students..."
              className="search-input"
            />
          </div>
          <div className="header-actions">
            <button className="icon-btn notification-btn">
              🔔
              <span className="notification-badge"></span>
            </button>
            <button
              className="icon-btn theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="user-profile">
              <img
                src="https://ui-avatars.com/api/?name=Dinithi+P&background=3b82f6&color=fff"
                alt="Dinithi P."
                className="user-avatar"
              />
              <span className="user-name">Dinithi P.</span>
              <span className="dropdown-icon">▼</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-text">
              <h1 className="welcome-title">Welcome back, Dinithi 👋</h1>
              <p className="welcome-subtitle">
                You've completed 85% of your weekly goals! Keep up the momentum, your
                next Kuppi session on "Data Structures" starts in 2 hours.
              </p>
            </div>
            <button className="resume-btn">
              <span className="play-icon">▶</span>
              Resume Learning
            </button>
          </section>

          {/* Stats Cards */}
          <section className="stats-grid">
            {statsData.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <h3 className="stat-title">{stat.title}</h3>
                  <p className="stat-value">{stat.value}</p>
                </div>
                <span className="stat-badge" style={{ backgroundColor: stat.badgeColor }}>
                  {stat.badge}
                </span>
              </div>
            ))}
          </section>

          {/* Charts and Upcoming Section */}
          <section className="content-grid">
            {/* Weekly Performance Chart */}
            <div className="chart-card">
              <div className="card-header">
                <h2 className="card-title">Weekly Performance</h2>
                <span className="week-label">This Week</span>
              </div>
              <div className="chart-container">
                {weeklyData.map((data, index) => (
                  <div key={index} className="chart-bar-wrapper">
                    <div className="chart-bar-container">
                      <div
                        className={`chart-bar ${data.day === 'Thu' ? 'active' : ''}`}
                        style={{ height: `${data.value}%` }}
                      >
                        {data.day === 'Thu' && <span className="bar-label">85%</span>}
                      </div>
                    </div>
                    <span className="chart-label">{data.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Kuppi */}
            <div className="upcoming-card">
              <div className="card-header">
                <h2 className="card-title">Upcoming Kuppi</h2>
                <a href="#" className="view-all-link">View All</a>
              </div>
              <div className="upcoming-list">
                {upcomingKuppi.map((item, index) => (
                  <div key={index} className="upcoming-item" style={{ backgroundColor: item.color }}>
                    <div className="upcoming-icon" style={{ backgroundColor: item.iconBg }}>
                      {item.icon}
                    </div>
                    <div className="upcoming-info">
                      <h4 className="upcoming-title">{item.title}</h4>
                      <p className="upcoming-time">{item.time}</p>
                    </div>
                    <button className="bell-icon">🔔</button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Section */}
          <section className="bottom-grid">
            {/* Recent Materials */}
            <div className="materials-card">
              <h2 className="card-title">Recent Materials</h2>
              <table className="materials-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>TYPE</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="material-name">
                        <span className="file-icon">📄</span>
                        Lecture_Notes_04.pdf
                      </div>
                    </td>
                    <td>Document</td>
                    <td>2 mins</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Community Highlights */}
            <div className="community-card">
              <h2 className="card-title">Community Highlights</h2>
              <div className="community-list">
                <div className="community-item">
                  <span className="community-badge lost">Lost & Found</span>
                  <span className="community-time">1h ago</span>
                </div>
                <div className="community-highlight">
                  <h4>Blue Water Bottle Found</h4>
                </div>
                <div className="community-item">
                  <span className="community-badge event">Event</span>
                  <span className="community-time">5h ago</span>
                </div>
                <div className="community-highlight">
                  <h4>Hackathon 2024</h4>
                  <p>Registration opens...</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Chat Button */}
      <button className="chat-fab">💬</button>
    </div>
  );
};

export default Home;
