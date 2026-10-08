import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import './Auth.css';
import axios from 'axios';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    
    try {
      await axios.put(
        'http://localhost:5000/api/auth/change-password',
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMsg({ text: 'Password changed successfully', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to change password', type: 'error' });
    }
  };

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="auth-title" style={{ marginBottom: 0 }}>Admin Portal</h2>
          <button onClick={handleLogout} className="auth-button" style={{ width: 'auto', background: '#ef4444', padding: '8px 16px' }}>
            Logout
          </button>
        </div>

        <div style={{ marginBottom: '24px', background: '#f3f4f6', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: '#111827' }}>Admin Profile</h3>
          <p style={{ color: '#4b5563', margin: '8px 0' }}><strong>Name:</strong> {user.fullName}</p>
          <p style={{ color: '#4b5563', margin: '8px 0' }}><strong>Phone:</strong> {user.phone}</p>
          <p style={{ color: '#4b5563', margin: '8px 0' }}>
            <strong>Role:</strong> {user.role} {user.position && `(${user.position})`}
          </p>
        </div>

        {msg.text && (
          <div className="auth-error" style={{ background: msg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: msg.type === 'success' ? '#22c55e' : '#ef4444' }}>
            {msg.text}
          </div>
        )}

        {!isChangingPassword ? (
          <button onClick={() => setIsChangingPassword(true)} className="auth-button" style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6' }}>
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword}>
            <h3 style={{ color: '#111827', marginBottom: '16px' }}>Change Password</h3>
            <div className="auth-form-group">
              <label className="auth-label">Current Password</label>
              <input
                type="password"
                className="auth-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="auth-form-group">
              <label className="auth-label">New Password</label>
              <input
                type="password"
                className="auth-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="auth-button">
                Update Password
              </button>
              <button type="button" onClick={() => setIsChangingPassword(false)} className="auth-button" style={{ background: 'transparent', border: '1px solid #9ca3af', color: '#4b5563' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
