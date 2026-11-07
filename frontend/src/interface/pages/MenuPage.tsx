import { useEffect, useState } from 'react';
import { useDb } from '../data/DbContext';
import StorefrontProductCard from '../components/StorefrontProductCard';
import '../storefront.css';
interface Props { onSelectProduct: (id: number) => void; onCustomize?: (id: number) => void; searchFilter?: string; categoryFilter?: number; onFilter?: (category?: number, keyword?: string) => void }
export const MenuPage = ({ onSelectProduct, onCustomize, searchFilter = '', categoryFilter, onFilter }: Props) => {
  const { db } = useDb();
  const [category, setCategory] = useState<number | undefined>(categoryFilter);
  const [search, setSearch] = useState(searchFilter);
  const [keyword, setKeyword] = useState(searchFilter);
  useEffect(() => { setCategory(categoryFilter); }, [categoryFilter]);
  useEffect(() => { setSearch(searchFilter); setKeyword(searchFilter); }, [searchFilter]);
  const categories = db.categories.filter(item => item.status === 'ACTIVE');
  const available = db.products.filter(product => product.is_available && categories.some(item => item.id === product.category_id));
  const products = available.filter(product => (!category || product.category_id === category) && (!keyword.trim() || `${product.name} ${product.description || ''}`.toLocaleLowerCase('vi').includes(keyword.trim().toLocaleLowerCase('vi'))));
  const filter = (nextCategory?: number, nextSearch = search) => { setCategory(nextCategory); setKeyword(nextSearch); setSearch(nextSearch); onFilter?.(nextCategory, nextSearch); };
  return <div className="swp-storefront" style={{ background: '#f8fafc' }}><div className="swp-store-container"><div className="swp-menu-top"><div><h1>Menu & Đồ uống</h1><p>Khám phá {available.length} món ngon từ Aura Café</p></div><form className="swp-menu-search" role="search" onSubmit={event => { event.preventDefault(); filter(category); }}><span className="material-symbols-outlined text-stone-400">search</span><input aria-label="Tìm tên món" placeholder="Tìm tên món, trà, cà phê..." value={search} onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Tìm kiếm món"><span className="material-symbols-outlined">arrow_forward</span></button></form></div>
    <nav className="swp-menu-tabs" aria-label="Danh mục thực đơn"><button className={!category ? 'active' : ''} onClick={() => filter(undefined)}>Tất cả ({available.length})</button>{categories.map(item => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => filter(item.id)}>{item.name} ({available.filter(product => product.category_id === item.id).length})</button>)}</nav>
    {(category || keyword) && <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-stone-500"><span>Đang lọc:</span>{category && <button className="rounded-full border bg-white px-3 py-2" onClick={() => filter(undefined, keyword)}>Danh mục: {categories.find(item => item.id === category)?.name} ×</button>}{keyword && <button className="rounded-full border bg-white px-3 py-2" onClick={() => filter(category, '')}>Từ khóa: “{keyword}” ×</button>}<button className="font-semibold text-primary" onClick={() => filter(undefined, '')}>Xoá tất cả</button></div>}
    {products.length ? <div className="swp-products-grid">{products.map(product => <StorefrontProductCard key={product.id} product={product} category={categories.find(item => item.id === product.category_id)?.name || ''} onDetail={() => onSelectProduct(product.id)} onCustomize={() => (onCustomize || onSelectProduct)(product.id)} />)}</div> : <div className="swp-store-empty"><span className="material-symbols-outlined text-5xl">search_off</span><h2>Không tìm thấy món phù hợp</h2><p>Vui lòng thử tìm với từ khoá khác hoặc xem toàn bộ danh mục thực đơn.</p><button onClick={() => filter(undefined, '')}>Xem tất cả món</button></div>}
  </div></div>;
};
