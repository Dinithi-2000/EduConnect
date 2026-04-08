import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['admin', 'teacher'].includes(user?.role);
  const sessionsPath = user?.role === 'tutor' ? '/my-sessions' : '/sessions';

  const kpiCards = [
    {
      icon: '🤖',
      title: 'AI Chatbot Accuracy',
      value: '98.4%',
      delta: '+1.2% from last week'
    },
    {
      icon: '👥',
      title: 'Total Students',
      value: '12,842',
      delta: '+428 new registrations'
    },
    {
      icon: '📖',
      title: 'Active Courses',
      value: '156',
      delta: '12 recently updated'
    },
    {
      icon: '💵',
      title: 'Monthly Revenue',
      value: '$42,900',
      delta: '+18% increase'
    }
  ];

  const weeklyTraining = [
    { day: 'Mon', value: 42 },
    { day: 'Tue', value: 56 },
    { day: 'Wed', value: 52 },
    { day: 'Thu', value: 74 },
    { day: 'Fri', value: 62 },
    { day: 'Sat', value: 66 },
    { day: 'Sun', value: 80 }
  ];

  const upcomingSessions = [
    {
      title: 'Advanced Calculus',
      tutor: 'Dr. Jerome',
      time: '5:00 PM',
      status: 'Active'
    },
    {
      title: 'Data Structures',
      tutor: 'Anura Mahinda',
      time: '4:30 PM',
      status: 'Queued'
    }
  ];

  const systemLogs = [
    {
      title: 'New student cohort imported',
      time: '3 minutes ago'
    },
    {
      title: 'Chatbot model v2.1 deployed',
      time: '14 minutes ago'
    },
    {
      title: 'Backup completed successfully',
      time: '1 hour ago'
    }
  ];

  const courseRows = [
    {
      course: 'Quantum Physics 101',
      dept: 'Department of Science',
      enrollment: '1,240 students',
      completion: 86,
      status: 'Published'
    },
    {
      course: 'Digital Marketing Essentials',
      dept: 'Faculty of Management',
      enrollment: '3,412 students',
      completion: 62,
      status: 'Reviewing'
    },
    {
      course: 'UI/UX Design Masterclass',
      dept: 'Design Academy',
      enrollment: '920 students',
      completion: 92,
      status: 'Published'
    }
  ];

  return (
    <DashboardLayout activeSection="Dashboard">
      <div className="admin-dashboard">
        <section className="overview-head">
          <div>
            <h1>System Overview</h1>
            <p>{isAdmin ? 'Live Admin Terminal' : 'Instructor Overview'}</p>
          </div>
        </section>

        <section className="kpi-grid">
          {kpiCards.map((card) => (
            <article key={card.title} className="metric-card">
              <div className="metric-head">
                <span>{card.title}</span>
                <span className="metric-icon">{card.icon}</span>
              </div>
              <h2>{card.value}</h2>
              <small>{card.delta}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-main-grid">
          <article className="panel panel-training">
            <div className="panel-head">
              <div>
                <h3>AI Training Progress</h3>
                <p>Large Language Model fine-tuning cycles for Semester 2</p>
              </div>
              <div className="switch-buttons">
                <button>Daily</button>
                <button className="active">Weekly</button>
              </div>
            </div>

            <div className="training-bars">
              {weeklyTraining.map((item) => (
                <div className="bar-col" key={item.day}>
                  <div className="bar-shell">
                    <div
                      className={`bar-fill ${item.day === 'Thu' ? 'focus' : ''}`}
                      style={{ height: `${item.value}%` }}
                    ></div>
                  </div>
                  <span>{item.day}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="right-stack">
            <article className="panel panel-sessions">
              <div className="panel-head compact">
                <h3>Upcoming Kuppi Sessions</h3>
              </div>
              <div className="session-list">
                {upcomingSessions.map((session) => (
                  <div className="session-item" key={session.title}>
                    <div className="session-avatar">👨‍🏫</div>
                    <div className="session-details">
                      <p>{session.title}</p>
                      <small>
                        {session.tutor} • {session.time}
                      </small>
                    </div>
                    <span className={`session-status ${session.status.toLowerCase()}`}>{session.status}</span>
                  </div>
                ))}
              </div>
              <button className="outline-btn" onClick={() => navigate(sessionsPath)}>
                Manage All Sessions
              </button>
            </article>

            <article className="panel panel-logs">
              <div className="panel-head compact">
                <h3>System Log</h3>
              </div>
              <ul>
                {systemLogs.map((log) => (
                  <li key={log.title}>
                    <span className="dot"></span>
                    <div>
                      <p>{log.title}</p>
                      <small>{log.time}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </aside>
        </section>

        <section className="panel panel-table">
          <div className="panel-head">
            <h3>Course Management Overview</h3>
            <button className="outline-btn" onClick={() => navigate('/courses')}>
              Export Data
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Department</th>
                  <th>Enrollment</th>
                  <th>Completion Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {courseRows.map((row) => (
                  <tr key={row.course}>
                    <td>{row.course}</td>
                    <td>{row.dept}</td>
                    <td>{row.enrollment}</td>
                    <td>
                      <div className="progress-shell">
                        <div style={{ width: `${row.completion}%` }}></div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-chip ${row.status.toLowerCase()}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Home;
