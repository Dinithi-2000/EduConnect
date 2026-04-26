import React, { useEffect, useRef, useState } from 'react';
import { getChatHistory, sendChatMessage } from '../services/aiService';
import { API_URL } from '../services/api';
import MyCourses from './MyCourses';
import './Home.css';

const Home = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hi Dinithi! I am your EduConnect AI tutor. Ask for study plans, quiz prep, or topic explanations.',
      createdAt: new Date().toISOString()
    }
  ]);
  const chatBottomRef = useRef(null);
  const studentId = 'student-dinithi';

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

  const quickPrompts = [
    'Create a 7-day exam study plan',
    'Explain binary search in simple words',
    'Give me 5 quiz questions on OOP'
  ];

  const studentContext = {
    currentCourse: 'Data Structures',
    recentActivities: ['Completed quiz: OOP Basics', 'Viewed Kuppi schedule', 'Reviewed lecture notes'],
    performanceSummary: 'Overall progress 85%, strongest area: OOP, needs practice: recursion'
  };

  const getOfflineFallback = (text) => {
    const input = text.toLowerCase();

    if (input.includes('binary search')) {
      return 'Binary search is a fast way to find a value in a sorted list:\n1. Check the middle item.\n2. If your target is smaller, search the left half.\n3. If larger, search the right half.\n4. Repeat until found.\nIt works in O(log n), so it is much faster than checking one by one.';
    }

    if (input.includes('oop') || input.includes('quiz')) {
      return 'Quick OOP quiz:\n1. What is encapsulation?\n2. Difference between abstraction and encapsulation?\n3. What is method overriding?\n4. Difference between interface and abstract class?\n5. Give a real-world inheritance example.\nSend your answers and I can mark them.';
    }

    return 'I am in offline tutor mode right now, but I can still help. Ask for a study plan, a concept explanation, or quick quiz questions.';
  };

  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const hydrateHistory = async () => {
      try {
        const response = await getChatHistory(studentId);
        const items = response?.data || [];
        if (items.length) {
          setChatMessages(
            items.map((item) => ({
              id: item.id,
              role: item.role,
              content: item.content,
              createdAt: item.createdAt
            }))
          );
        }
      } catch {
        // Keep local welcome message when history fetch is unavailable.
      }
    };

    hydrateHistory();
  }, []);

  const getHistoryPayload = (messages) => {
    return messages.map((item) => ({ role: item.role, content: item.content }));
  };

  const clearConversation = () => {
    setChatMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'New session started. Tell me what you want to learn and I will help you with a focused plan.',
        createdAt: new Date().toISOString()
      }
    ]);
    setChatInput('');
    setChatSuggestions([]);
  };

  const handleSendMessage = async (messageOverride) => {
    const outgoingText = (messageOverride ?? chatInput).trim();
    if (!outgoingText || isTyping) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: outgoingText,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(
        outgoingText,
        getHistoryPayload(updatedMessages),
        studentContext,
        studentId
      );
      const botMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response?.reply || 'I could not generate a response right now.',
        createdAt: new Date().toISOString()
      };
      setChatMessages((prev) => [...prev, botMessage]);
      setChatSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
    } catch (error) {
      const status = error?.response?.status;
      const cannotReachApi = !error?.response;
      const errorNote = cannotReachApi
        ? `I could not reach the API at ${API_URL}. Start backend server (npm run dev in Backend) or set REACT_APP_API_URL correctly.`
        : `The API returned status ${status}.`;

      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: `${getOfflineFallback(outgoingText)}\n\n${errorNote}`,
          createdAt: new Date().toISOString()
        }
      ]);
      setChatSuggestions([]);
    } finally {
      setIsTyping(false);
    }
  };

  const onChatSubmit = (event) => {
    event.preventDefault();
    handleSendMessage();
  };

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
          <button
            type="button"
            className={`nav-item nav-chat-trigger ${isChatOpen ? 'active' : ''}`}
            onClick={() => setIsChatOpen((prev) => !prev)}
          >
            <span className="nav-icon">🤖</span>
            <span className="nav-label">AI Chatbot</span>
          </button>
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
        {activeNav === 'Dashboard' && (
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
                <button type="button" className="view-all-link">View All</button>
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
        )}

        {/* My Courses Content */}
        {activeNav === 'My Courses' && <MyCourses />}
      </main>

      {/* Chat Button */}
      {isChatOpen && (
        <section className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-title-group">
              <h3>EduConnect AI</h3>
              <span className="chat-status">Online tutor</span>
            </div>
            <div className="chat-header-actions">
              <button type="button" className="chat-control-btn" onClick={clearConversation}>
                Clear
              </button>
              <button
                type="button"
                className="chat-control-btn close"
                onClick={() => setIsChatOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <article key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="chat-bubble">{msg.content}</div>
                <span className="chat-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </article>
            ))}

            {isTyping && (
              <article className="chat-message assistant typing">
                <div className="chat-bubble typing-bubble">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </article>
            )}

            <div ref={chatBottomRef} />
          </div>

          <div className="chat-quick-prompts">
            {(chatSuggestions.length ? chatSuggestions : quickPrompts).map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="prompt-chip"
                onClick={() => handleSendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={onChatSubmit}>
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask anything about your studies..."
              className="chat-input"
              disabled={isTyping}
            />
            <button type="submit" className="chat-send-btn" disabled={isTyping || !chatInput.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button className="chat-fab" onClick={() => setIsChatOpen((prev) => !prev)}>
        {isChatOpen ? '✕' : '💬'}
      </button>
    </div>
  );
};

export default Home;
