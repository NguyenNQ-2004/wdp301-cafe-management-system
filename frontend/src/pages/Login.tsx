import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import useAuthStore from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  return <AuthModal isOpen onClose={() => { if (!useAuthStore.getState().user) navigate('/'); }} onLoginSuccess={account => {
    useAuthStore.getState().login(account);
    navigate(account.role === 'ADMIN' ? '/admin' : account.role === 'STAFF' ? account.position === 'BARISTA' ? '/barista' : account.position === 'SHIPPER' ? '/delivery' : '/cashier' : '/profile');
  }} />;
}
