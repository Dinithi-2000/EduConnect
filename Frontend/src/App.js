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

// Pages
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
import PremiumManagement from './pages/admin/PremiumManagement';
import StudentManagement from './pages/admin/StudentManagement';
import AdminSettings from './pages/admin/AdminSettings';
import CommunityBoard from './pages/Community';
import CourseManager from './pages/course/CourseManager';
import StudentCourses from './pages/student/StudentCourses';
import StudentMyCourses from './pages/student/StudentMyCourses';
import StudentQuizzes from './pages/student/StudentQuizzes';
import StudentPremium from './pages/student/StudentPremium';
import StudentCommunity from './pages/student/StudentCommunity';
import StudentPaymentSuccess from './pages/student/StudentPaymentSuccess';
import StudentSettings from './pages/student/StudentSettings';

const DASHBOARD_PATHS = ['/', '/student-dashboard', '/courses', '/student/courses', '/student/my-courses', '/student-management', '/quizzes', '/student/quizzes', '/student/premium', '/student/payment-success', '/student/community', '/student/progress', '/progress', '/community', '/premium', '/premium-management', '/settings'];

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

const DashboardHomeRoute = () => {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  if (role === 'student') {
    return <Navigate to="/student-dashboard" replace />;
  }

  return <Home />;
};

const SettingsRoute = () => {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  if (role === 'admin' || role === 'teacher') {
    return <AdminSettings />;
  }

  return <StudentSettings />;
};

function AppContent() {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );
  const isAuth = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <div className="App">
      {!isDashboard && !isAuth && <Navbar />}
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Main dashboard */}
        <Route path="/" element={<ProtectedRoute element={<DashboardHomeRoute />} />} />
        <Route path="/student-dashboard" element={<ProtectedRoute element={<StudentDashboard />} />} />
        <Route path="/about" element={<About />} />

        {/* Quiz & Mock Exam System */}
        <Route path="/courses" element={<ProtectedRoute element={<CourseManager />} />} />
        <Route path="/student/my-courses" element={<ProtectedRoute element={<StudentMyCourses />} />} />
        <Route path="/student/courses" element={<ProtectedRoute element={<StudentCourses />} />} />
        <Route path="/student-management" element={<ProtectedRoute element={<StudentManagement />} />} />
        <Route path="/quizzes" element={<ProtectedRoute element={<QuizList />} />} />
        <Route path="/student/quizzes" element={<ProtectedRoute element={<StudentQuizzes />} />} />
        <Route path="/student/premium" element={<ProtectedRoute element={<StudentPremium />} />} />
        <Route path="/student/payment-success" element={<ProtectedRoute element={<StudentPaymentSuccess />} />} />
        <Route path="/student/community" element={<ProtectedRoute element={<StudentCommunity />} />} />
        <Route path="/quizzes/create" element={<ProtectedRoute element={<QuizBuilder />} />} />
        <Route path="/quizzes/:id/edit" element={<ProtectedRoute element={<QuizBuilder />} />} />
        <Route path="/quizzes/:id/attempt" element={<ProtectedRoute element={<QuizAttempt />} />} />
        <Route path="/quizzes/results/:attemptId" element={<ProtectedRoute element={<QuizResults />} />} />
        <Route path="/student/progress" element={<ProtectedRoute element={<ProgressDashboard />} />} />
        <Route path="/progress" element={<ProtectedRoute element={<ProgressDashboard />} />} />
        <Route path="/premium" element={<ProtectedRoute element={<PremiumQuizzes />} />} />
        <Route path="/premium-management" element={<ProtectedRoute element={<PremiumManagement />} />} />
        <Route path="/settings" element={<ProtectedRoute element={<SettingsRoute />} />} />

        {/* Community Board */}
        <Route path="/community" element={<ProtectedRoute element={<CommunityBoard />} />} />

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
