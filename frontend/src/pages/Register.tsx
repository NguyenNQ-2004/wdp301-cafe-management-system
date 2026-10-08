import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import './Auth.css';
import axios from 'axios';

const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER', 'STAFF', 'ADMIN'

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        fullName,
        phone,
        password,
        role: role === 'BARISTA' || role === 'CASHIER' ? 'STAFF' : role,
        position: (role === 'BARISTA' || role === 'CASHIER') ? role : undefined,
      };

      const { data } = await axios.post('http://localhost:5000/api/auth/register', payload);
      login(data);
      if (data.role === 'ADMIN') navigate('/admin');
      else if (data.position === 'CASHIER') navigate('/cashier');
      else if (data.position === 'BARISTA') navigate('/barista');
      else if (data.role === 'CUSTOMER') navigate('/customer');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-label">Full Name</label>
            <input
              type="text"
              className="auth-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter your name"
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Phone Number</label>
            <input
              type="text"
              className="auth-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="Enter your phone number"
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
            />
          </div>
          
          <div className="auth-form-group">
            <label className="auth-label">Register As</label>
            <select 
              className="auth-select" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="CUSTOMER">Customer</option>
              <option value="CASHIER">Cashier (Staff)</option>
              <option value="BARISTA">Barista (Staff)</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        <p className="auth-link-text">
          Already have an account? <Link to="/login" className="auth-link">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
