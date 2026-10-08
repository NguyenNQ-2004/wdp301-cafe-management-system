import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import './Auth.css';
import axios from 'axios';

const testAccounts = [
  { role: 'Admin', phone: '0900000001' },
  { role: 'Barista', phone: '0900000002' },
  { role: 'Cashier', phone: '0900000003' },
  { role: 'Customer', phone: '0900000004' },
];

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleTestLogin = (testPhone: string) => {
    setPhone(testPhone);
    setPassword('123456');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/login', {
        phone,
        password,
      });
      login(data);
      if (data.role === 'ADMIN') navigate('/admin');
      else if (data.position === 'CASHIER') navigate('/cashier');
      else if (data.position === 'BARISTA') navigate('/barista');
      else if (data.role === 'CUSTOMER') navigate('/customer');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        
        {/* Quick Test Accounts */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '10px', textAlign: 'center' }}>Test Accounts (Password: 123456)</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {testAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleTestLogin(acc.phone)}
                style={{
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#1f2937'
                }}
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <p className="auth-link-text">
          Don't have an account? <Link to="/register" className="auth-link">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
