import { useContext, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { PageRoute } from '../types';
import { InterfaceContext } from '../interface/LiveProvider';
import '../interface/storefront.css';
interface HeaderProps { currentRoute: PageRoute; onNavigate: (route: PageRoute) => void; cartCount: number; onOpenAuth: () => void; onSearch?: (query: string) => void; user?: { fullName: string; role?: string; position?: string } | null; onLogout?: () => void }
const AuthLinks = () => <><Link to="/login" className="font-semibold text-primary">Đăng nhập</Link><Link to="/register" className="rounded-full bg-primary px-3 py-2 font-semibold text-white">Đăng ký</Link></>;
export const Header = ({ currentRoute, onNavigate, cartCount, onOpenAuth, onSearch, user = null, onLogout }: HeaderProps) => {
  const store = useContext(InterfaceContext);
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => { setCategoriesOpen(false); setAccountOpen(false); }, [location.key]);
  useEffect(() => { const close = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) { setCategoriesOpen(false); setAccountOpen(false); } }; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setCategoriesOpen(false); setAccountOpen(false); } }; document.addEventListener('click', close); document.addEventListener('keydown', escape); return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', escape); }; }, []);
  const submit = (event: FormEvent) => { event.preventDefault(); if (onSearch) onSearch(search.trim()); else onNavigate('menu'); };
  const categories = store?.db.categories.filter(category => category.status === 'ACTIVE') || [];
  return <header className="swp-header" ref={root}><div className="swp-header-main">
    <button className="swp-brand" onClick={() => onNavigate('home')} aria-label="Trang chủ Aura Café"><span className="material-symbols-outlined">local_cafe</span><div className="text-left"><strong>Aura Café</strong><small>Specialty Coffee</small></div></button>
    <form role="search" className="swp-header-search" onSubmit={submit}><input type="search" aria-label="Tìm món trong thực đơn" placeholder="Xin chào, bạn cần tìm gì?" value={search} onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Tìm kiếm"><span className="material-symbols-outlined text-xl">search</span></button></form>
    <div className="swp-header-actions"><button className="swp-header-cart" onClick={() => onNavigate('cart')} aria-label={`Giỏ hàng ${cartCount} món`}><span className="material-symbols-outlined">shopping_bag</span><b>{cartCount}</b></button>
    {user ? <><div className="relative"><button onClick={() => setAccountOpen(value => !value)} aria-label={`Tài khoản ${user.fullName}`} aria-expanded={accountOpen} className="flex items-center gap-1"><span className="material-symbols-outlined">account_circle</span><span className="hidden max-w-28 truncate sm:block">{user.fullName}</span><span className="material-symbols-outlined text-base">expand_more</span></button><div className="swp-user-menu" hidden={!accountOpen}><strong>{user.fullName}</strong><Link to="/profile">Hồ sơ & Điểm tích luỹ</Link><Link to="/orders">Đơn hàng của tôi</Link><Link to="/feedback">Phản ánh & Khiếu nại</Link>{user.role === 'ADMIN' && <Link to="/admin">Quản trị hệ thống</Link>}{user.role === 'STAFF' && <button onClick={onOpenAuth}>Màn hình nhân viên</button>}<button onClick={onLogout}>Đăng xuất</button></div></div><button aria-label="Đăng xuất" title="Đăng xuất" onClick={onLogout}><span className="material-symbols-outlined text-xl">logout</span></button></> : <div aria-label="Tài khoản khách hàng" className="flex items-center gap-3"><AuthLinks /></div>}
    </div></div>
    <nav className="swp-header-secondary" aria-label="Điều hướng cửa hàng"><div className="swp-header-secondary-inner"><button aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen(value => !value)}><span className="material-symbols-outlined text-xl">menu</span>Danh mục sản phẩm</button><Link className={currentRoute === 'menu' ? 'active' : ''} to="/menu">Menu & Đồ uống</Link><Link className={currentRoute === 'feedback' ? 'active' : ''} to="/feedback">Liên hệ & Góp ý</Link><Link to="/profile"><span className="material-symbols-outlined text-xl">stars</span>Thành viên Aura</Link>
    {categoriesOpen && <div className="swp-header-dropdown">{categories.map(category => <Link key={category.id} to={'/menu?category=' + encodeURIComponent(store!.rawId(category.id))}><img src={category.image_url || '/cafe-placeholder.svg'} alt="" /><span>{category.name}</span></Link>)}<Link to="/menu">Tất cả thực đơn</Link></div>}
    </div></nav></header>;
};
