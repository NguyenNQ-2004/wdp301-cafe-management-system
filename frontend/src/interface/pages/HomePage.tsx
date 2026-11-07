import { useEffect, useState } from 'react';
import type { PageRoute, Product } from '../types';
import { useDb } from '../data/DbContext';
import { fmtMoney, getSettingNumber } from '../data/dbUtils';
import StorefrontProductCard from '../components/StorefrontProductCard';
import '../storefront.css';
interface Props { onNavigate: (route: PageRoute) => void; onSelectProduct: (id: number) => void; onQuickAdd: (product: Product) => void; onSelectCategory?: (id: number) => void; onCustomize?: (id: number) => void }
export const HomePage = ({ onNavigate, onSelectProduct, onSelectCategory, onCustomize }: Props) => {
  const { db } = useDb();
  const categories = db.categories.filter(category => category.status === 'ACTIVE');
  const available = db.products.filter(product => product.is_available && categories.some(category => category.id === product.category_id));
  const products = [...available].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0) || a.id - b.id).slice(0, 4);
  const [slide, setSlide] = useState(0);
  const current = products.length ? slide % products.length : 0;
  useEffect(() => { if (products.length < 2) return; const timer = window.setInterval(() => setSlide(value => value + 1), 6000); return () => window.clearInterval(timer); }, [products.length]);
  const threshold = getSettingNumber(db, 'freeship_threshold', 150000);
  const perks = [['local_shipping', 'Miễn phí giao hàng', threshold === 0 ? 'Áp dụng cho mọi đơn giao hàng' : `Cho đơn từ ${fmtMoney(threshold)}`], ['payments', 'Phí giao hàng', `${fmtMoney(getSettingNumber(db, 'delivery_fee', 18000))} nếu đơn chưa đạt mức miễn phí`], ['schedule', 'Giao hàng dự kiến', `Khoảng ${getSettingNumber(db, 'delivery_minutes', 30)} phút sau khi xác nhận`], ['loyalty', 'Tích điểm Aura', `Mỗi ${getSettingNumber(db, 'points_step', 10)} điểm đổi ${fmtMoney(getSettingNumber(db, 'points_step_value', 2000))} ưu đãi`]];
  return <div className="swp-storefront"><div className="swp-store-container"><div className="swp-home-row">
    <aside className="swp-home-categories" id="homeCategories" aria-label="Danh mục sản phẩm">{categories.map(category => <button key={category.id} className="swp-home-category" onClick={() => onSelectCategory ? onSelectCategory(category.id) : onNavigate('menu')}><img src={category.image_url || '/cafe-placeholder.svg'} alt={category.name} /><span>{category.name}</span><small>{available.filter(product => product.category_id === category.id).length}</small></button>)}</aside>
    <section className="swp-banner" aria-label="Món nổi bật Aura">{products.length ? products.map((product, index) => <div key={product.id} className={`swp-banner-slide ${index === current ? 'active' : ''}`} aria-hidden={index !== current} style={{ backgroundImage: `url("${product.image_url || '/cafe-placeholder.svg'}")` }}><div className="swp-banner-copy"><span>{index === 0 ? 'Hương vị đặc trưng Aura' : 'Được khách hàng yêu thích'}</span><h1>{product.name}</h1><p>{product.description}</p><button onClick={() => onNavigate('menu')} tabIndex={index === current ? 0 : -1}>Khám phá menu</button></div></div>) : <div className="swp-banner-slide active"><div className="swp-banner-copy"><span>Chào mừng đến Aura Café</span><h1>Một chất phin, trọn vị thân quen</h1><p>Khám phá đồ uống và món ngon được chuẩn bị mỗi ngày.</p><button onClick={() => onNavigate('menu')}>Khám phá menu</button></div></div>}
    {products.length > 1 && <><button className="swp-banner-arrow prev" aria-label="Ảnh trước" onClick={() => setSlide(value => (value - 1 + products.length) % products.length)}>‹</button><button className="swp-banner-arrow next" aria-label="Ảnh tiếp theo" onClick={() => setSlide(value => value + 1)}>›</button><div className="swp-banner-dots" aria-label="Chọn ảnh">{products.map((product, index) => <button key={product.id} className={index === current ? 'active' : ''} aria-label={`Hiển thị ảnh ${index + 1}`} aria-pressed={index === current} onClick={() => setSlide(index)} />)}</div></>}
    </section></div>
    <section className="swp-perks" aria-label="Thông tin dịch vụ Aura">{perks.map(([icon, title, detail]) => <div className="swp-perk" key={title}><span className="material-symbols-outlined">{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>)}</section>
    <section aria-label="Sản phẩm được yêu thích"><div className="swp-products-heading"><div><small>Một chất phin từ Aura</small><h2>Sản phẩm được yêu thích</h2></div><button onClick={() => onNavigate('menu')}>Xem toàn bộ thực đơn ›</button></div><div className="swp-products-grid">{products.map(product => <StorefrontProductCard key={product.id} product={product} category={categories.find(category => category.id === product.category_id)?.name || ''} onDetail={() => onSelectProduct(product.id)} onCustomize={() => (onCustomize || onSelectProduct)(product.id)} />)}</div></section>
  </div></div>;
};
