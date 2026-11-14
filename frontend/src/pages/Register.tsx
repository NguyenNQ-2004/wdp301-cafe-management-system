import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import useAuthStore from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  return <AuthModal isOpen initialTab="register" onClose={() => { if (!useAuthStore.getState().user) navigate('/'); }} onLoginSuccess={account => {
    useAuthStore.getState().login(account);
    navigate('/profile');
  }} />;
}
