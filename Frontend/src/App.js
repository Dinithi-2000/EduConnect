import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

// Team's components
import Navbar from './components/Navbar';

// Team's pages
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';

// Kuppi module pages
import SessionList from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';
import MySessions from './pages/MySessions';
import Profile from './pages/Profile';
import CreateSession from './pages/CreateSession';
import VisionBoard from './pages/VisionBoard';

// Auth context
import { AuthProvider, useAuth } from './context/AuthContext';

// Route guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  return user ? children : <Login />;
};

const TutorRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'tutor' ? children : <SessionList />;
};

function AppContent() {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <div className="App">
      {!isDashboard && <Navbar />}
      <Routes>
        {/* Team's routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Kuppi module routes */}
        <Route path="/sessions" element={<PrivateRoute><SessionList /></PrivateRoute>} />
        <Route path="/sessions/:id" element={<PrivateRoute><SessionDetail /></PrivateRoute>} />
        <Route path="/my-sessions" element={<PrivateRoute><MySessions /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/vision-board" element={<PrivateRoute><VisionBoard /></PrivateRoute>} />
        <Route path="/create-session" element={<PrivateRoute><TutorRoute><CreateSession /></TutorRoute></PrivateRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;