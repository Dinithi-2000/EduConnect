import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import './Home.css';

const Home = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users from API
    // fetchUsers();
    setLoading(false);
  }, []);

  
};

export default Home;
