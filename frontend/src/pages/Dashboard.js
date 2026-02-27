import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="dashboard">
      <h1>Welcome to Your Dashboard, {user?.name}!</h1>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Profile Information</h3>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </div>
        <div className="dashboard-card">
          <h3>My Courses</h3>
          <p>You haven't enrolled in any courses yet.</p>
          <button className="btn btn-primary">Browse Courses</button>
        </div>
        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          <p>No recent activity to display.</p>
        </div>
        {user?.role === 'teacher' && (
          <div className="dashboard-card">
            <h3>Create Course</h3>
            <p>Share your knowledge with students.</p>
            <button className="btn btn-primary">Create New Course</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
