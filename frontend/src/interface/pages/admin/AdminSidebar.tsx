import type { PageRoute } from '../../types';
import { AdminSidebar as SharedAdminSidebar } from '../../../pages/admin/AdminSidebar';

interface AdminSidebarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (message: string) => void;
}

export const AdminSidebar = ({ currentRoute }: AdminSidebarProps) => (
  <SharedAdminSidebar currentRoute={currentRoute} />
);