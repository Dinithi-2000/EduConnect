import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import SessionList from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';
import MySessions from './pages/MySessions';
import Profile from './pages/Profile';
import CreateSession from './pages/CreateSession';

// Components
import Navbar from './components/Navbar';

// Route guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner spinner-dark" style={{ width: 40, height: 40 }} /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/sessions" replace />;
};

const TutorRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'tutor' ? children : <Navigate to="/sessions" replace />;
};

const Layout = ({ children }) => (
  <>
    <Navbar />
    <main style={{ paddingTop: '72px', minHeight: '100vh' }}>
      {children}
    </main>
  </>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Private */}
      <Route path="/sessions" element={<PrivateRoute><Layout><SessionList /></Layout></PrivateRoute>} />
      <Route path="/sessions/:id" element={<PrivateRoute><Layout><SessionDetail /></Layout></PrivateRoute>} />
      <Route path="/my-sessions" element={<PrivateRoute><Layout><MySessions /></Layout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
      <Route path="/create-session" element={<PrivateRoute><TutorRoute><Layout><CreateSession /></Layout></TutorRoute></PrivateRoute>} />

      {/* Redirect root */}
      <Route path="/" element={<Navigate to="/sessions" replace />} />
      <Route path="*" element={<Navigate to="/sessions" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
