import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const canCreateSession = user?.role === 'tutor' || user?.role === 'teacher' || user?.role === 'admin';

	const handleLogout = () => {
		logout();
		navigate('/login');
	};

	return (
		<nav className="kuppi-navbar">
			<div className="kuppi-navbar-inner">
				<Link to="/" className="kuppi-brand">
					<span>🎓</span>
					<span>EduConnect</span>
				</Link>

				<div className="kuppi-nav-links">
					<NavLink to="/sessions" className={({ isActive }) => `kuppi-nav-link${isActive ? ' active' : ''}`}>
						Sessions
					</NavLink>
					<NavLink to="/my-sessions" className={({ isActive }) => `kuppi-nav-link${isActive ? ' active' : ''}`}>
						My Sessions
					</NavLink>
					{canCreateSession && (
						<NavLink to="/create-session" className={({ isActive }) => `kuppi-nav-link${isActive ? ' active' : ''}`}>
							Create Session
						</NavLink>
					)}
					<NavLink to="/vision-board" className={({ isActive }) => `kuppi-nav-link${isActive ? ' active' : ''}`}>
						Vision Board
					</NavLink>
				</div>

				<div className="kuppi-nav-actions">
					<span className="badge badge-blue">{user?.role || 'guest'}</span>
					<button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
						Logout
					</button>
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
