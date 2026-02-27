import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to EduConnect</h1>
          <p>Empowering education through innovative technology</p>
          <div className="hero-buttons">
            <Link to="/courses" className="btn btn-primary btn-large">
              Explore Courses
            </Link>
            <Link to="/register" className="btn btn-secondary btn-large">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Why Choose EduConnect?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>📚 Quality Content</h3>
              <p>Access high-quality courses from expert instructors</p>
            </div>
            <div className="feature-card">
              <h3>🎓 Learn at Your Pace</h3>
              <p>Flexible learning schedule that fits your lifestyle</p>
            </div>
            <div className="feature-card">
              <h3>💡 Interactive Learning</h3>
              <p>Engage with interactive lessons and assessments</p>
            </div>
            <div className="feature-card">
              <h3>🤝 Community Support</h3>
              <p>Connect with fellow learners and instructors</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
