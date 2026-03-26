import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Team's Pages
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';
import StudentDashboard from './pages/StudentDashboard';

// Quiz & Mock Exam System
import QuizList from './pages/quiz/QuizList';
import QuizBuilder from './pages/quiz/QuizBuilder';
import QuizAttempt from './pages/quiz/QuizAttempt';
import QuizResults from './pages/quiz/QuizResults';
import ProgressDashboard from './pages/quiz/ProgressDashboard';
import PremiumQuizzes from './pages/quiz/PremiumQuizzes';
import CommunityBoard from './pages/Community';
import CourseManager from './pages/course/CourseManager';

// Kuppi Module Pages
import SessionList from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';
import EditSession from './pages/EditSession';
import MySessions from './pages/MySessions';
import Profile from './pages/Profile';
import CreateSession from './pages/CreateSession';
import VisionBoard from './pages/VisionBoard';

const DASHBOARD_PATHS = ['/', '/courses', '/quizzes', '/progress', '/community', '/premium'];

// Protected Route Wrapper
const ProtectedRoute = ({ element }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="spinner"></div>
    </div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return element;
};

// Tutor/Teacher/Admin Route Guard
const TutorRoute = ({ element }) => {
  const { user } = useAuth();
  const isTutor = user?.role === 'tutor' || user?.role === 'teacher' || user?.role === 'admin';
  return isTutor ? element : <Navigate to="/sessions" replace />;
};

// Role-based dashboard route
const DashboardRoute = () => {
  const { user } = useAuth();
  return user?.role === 'student' ? <StudentDashboard /> : <Home />;
};

function AppContent() {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );
  const isAuth = ['/login', '/register', '/forgot-password'].includes(location.pathname)
    || location.pathname.startsWith('/reset-password/');

  return (
    <div className="App">
      {!isDashboard && !isAuth && <Navbar />}
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Main dashboard */}
        <Route path="/" element={<ProtectedRoute element={<DashboardRoute />} />} />
        <Route path="/student-dashboard" element={<ProtectedRoute element={<StudentDashboard />} />} />
        <Route path="/about" element={<About />} />

        {/* Quiz & Mock Exam System */}
        <Route path="/courses" element={<ProtectedRoute element={<CourseManager />} />} />
        <Route path="/quizzes" element={<ProtectedRoute element={<QuizList />} />} />
        <Route path="/quizzes/create" element={<ProtectedRoute element={<QuizBuilder />} />} />
        <Route path="/quizzes/:id/edit" element={<ProtectedRoute element={<QuizBuilder />} />} />
        <Route path="/quizzes/:id/attempt" element={<ProtectedRoute element={<QuizAttempt />} />} />
        <Route path="/quizzes/results/:attemptId" element={<ProtectedRoute element={<QuizResults />} />} />
        <Route path="/progress" element={<ProtectedRoute element={<ProgressDashboard />} />} />
        <Route path="/premium" element={<ProtectedRoute element={<PremiumQuizzes />} />} />

        {/* Community Board */}
        <Route path="/community" element={<ProtectedRoute element={<CommunityBoard />} />} />

        {/* Kuppi Module Routes */}
        <Route path="/sessions" element={<ProtectedRoute element={<SessionList />} />} />
        <Route path="/sessions/:id" element={<ProtectedRoute element={<SessionDetail />} />} />
        <Route path="/sessions/:id/edit" element={<ProtectedRoute element={<TutorRoute element={<EditSession />} />} />} />
        <Route path="/my-sessions" element={<ProtectedRoute element={<MySessions />} />} />
        <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
        <Route path="/vision-board" element={<ProtectedRoute element={<VisionBoard />} />} />
        <Route path="/create-session" element={<ProtectedRoute element={<TutorRoute element={<CreateSession />} />} />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}

export default App;