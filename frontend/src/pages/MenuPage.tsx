import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { formatVnd, shopApi } from '../lib/shopApi';
import type { CatalogProduct } from '../types/shop';

export default function MenuPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const addProduct = useCartStore((state) => state.addProduct);
  const search = params.get('search') || '';

  useEffect(() => {
    let active = true;
    shopApi<CatalogProduct[]>('/api/products')
      .then((data) => { if (active) setProducts(data.filter((item) => item.isAvailable !== false)); })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category?.name).filter((name): name is string => !!name))), [products]);
  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = category === 'all' || product.category?.name === category;
    const matchesSearch = `${product.name} ${product.description || ''} ${product.category?.name || ''}`.toLocaleLowerCase('vi')
      .includes(search.toLocaleLowerCase('vi'));
    return matchesCategory && matchesSearch;
  }), [products, category, search]);

  const add = (product: CatalogProduct) => {
    addProduct(product, sizes[product._id] || 'M');
    setNotice(`Đã thêm ${product.name} vào giỏ hàng.`);
    window.setTimeout(() => setNotice(''), 3500);
  };

  return (
    <div className="bg-[#fafafa] min-h-[calc(100vh-5rem)]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Thực đơn Aura Café</p>
            <h1 className="text-4xl font-bold text-slate-950 mt-2">Chọn món bạn yêu thích</h1>
            <p className="text-slate-600 mt-2">Cà phê, trà và bánh được chuẩn bị tươi mới cho từng đơn hàng.</p>
          </div>
          <button onClick={() => navigate('/cart')} className="rounded-xl bg-primary px-5 py-3 text-white font-semibold hover:brightness-95 flex items-center gap-2 self-start">
            <span className="material-symbols-outlined text-lg">shopping_bag</span>Xem giỏ hàng
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-7 flex flex-col md:flex-row gap-4">
          <label className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input aria-label="Tìm món" value={search} onChange={(event) => setParams(event.target.value ? { search: event.target.value } : {})}
              placeholder="Tìm cà phê, trà, bánh..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-11 pr-4 outline-none focus:border-primary" />
          </label>
          <select aria-label="Danh mục" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:border-primary">
            <option value="all">Tất cả danh mục</option>
            {categories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {notice && <div role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">{notice}</div>}
        {loading && <p className="text-slate-600">Đang tải thực đơn...</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="rounded-xl bg-white p-8 text-center text-slate-600">Không tìm thấy món phù hợp.</p>}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => {
            const options = Object.keys(product.variantsConfig?.sizes || {});
            const size = sizes[product._id] || 'M';
            const price = product.basePrice + (product.variantsConfig?.sizes?.[size] || 0);
            return <article key={product._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
              <div className="relative h-48 bg-slate-100">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-5xl">☕</div>}
                {product.badge && <span className="absolute top-3 left-3 rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-white">{product.badge}</span>}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{product.category?.name || 'Aura Café'}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{product.name}</h2>
                {product.description && <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.description}</p>}
                <div className="mt-auto pt-4">
                  {options.length > 1 && <div className="flex gap-2 mb-3" aria-label={`Chọn size cho ${product.name}`}>
                    {options.map((option) => <button key={option} onClick={() => setSizes((current) => ({ ...current, [product._id]: option }))}
                      className={`rounded-md px-3 py-1 text-sm font-semibold ${size === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>{option}</button>)}
                  </div>}
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-lg text-primary">{formatVnd(price)}</strong>
                    <button onClick={() => add(product)} className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">add</span>Thêm
                    </button>
                  </div>
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>
    </div>
  );
}
