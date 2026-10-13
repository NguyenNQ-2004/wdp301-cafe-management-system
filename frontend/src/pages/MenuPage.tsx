import { useEffect, useMemo, useState, type FC } from 'react';

interface MenuProduct {
  _id: string;
  name: string;
  basePrice: number;
  category?: { _id: string; name: string } | null;
  badge?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const MenuPage: FC = () => {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/products', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Không thể tải danh sách món từ máy chủ.');

        const data: MenuProduct[] = await response.json();
        setProducts(data.filter((product) => product.isAvailable !== false));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Đã xảy ra lỗi khi tải menu.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProducts();
    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category?.name).filter(Boolean))) as string[],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category?.name === selectedCategory;
      const matchesSearch = !query || [product.name, product.subtitle, product.description, product.category?.name]
        .some((value) => value?.toLocaleLowerCase('vi').includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  return (
    <main className="min-h-[70vh] bg-surface px-margin-lg py-space-xl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-space-lg">
          <p className="font-label-sm uppercase tracking-widest text-primary">Aura Café</p>
          <h1 className="mt-2 font-display-lg font-bold text-on-surface">Menu đồ uống & bánh</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Danh sách món được tải trực tiếp từ cơ sở dữ liệu của cửa hàng.
          </p>
        </header>

        <div className="mb-space-lg flex flex-col gap-space-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-space-xs" aria-label="Lọc theo danh mục">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-space-md py-space-xs text-sm ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface'}`}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-space-md py-space-xs text-sm ${selectedCategory === category ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface'}`}
              >
                {category}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm món..."
            aria-label="Tìm món trong menu"
            className="h-11 w-full rounded-lg border border-gray-300 bg-surface-container-lowest px-space-md text-on-surface sm:max-w-xs"
          />
        </div>

        {loading && <p className="py-space-xl text-center text-on-surface-variant">Đang tải menu...</p>}
        {!loading && error && (
          <div role="alert" className="rounded-xl bg-red-100 p-space-md text-red-900">
            {error} Hãy kiểm tra backend và kết nối cơ sở dữ liệu.
          </div>
        )}
        {!loading && !error && visibleProducts.length === 0 && (
          <p className="rounded-xl bg-surface-container-low p-space-lg text-center text-on-surface-variant">
            {products.length === 0 ? 'Chưa có món nào trong cơ sở dữ liệu.' : 'Không tìm thấy món phù hợp.'}
          </p>
        )}

        {!loading && !error && visibleProducts.length > 0 && (
          <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Danh sách món">
            {visibleProducts.map((product) => (
              <article key={product._id} className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                <div className="relative h-52 bg-surface-container">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-on-surface-variant">Chưa có hình ảnh</div>
                  )}
                  {product.badge && (
                    <span className="absolute left-3 top-3 rounded-md bg-primary px-space-sm py-1 text-xs font-semibold text-white">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="flex min-h-44 flex-col p-space-md">
                  <p className="text-sm text-secondary">{product.category?.name || 'Khác'}</p>
                  <h2 className="mt-1 font-headline-sm font-semibold text-on-surface">{product.name}</h2>
                  {(product.subtitle || product.description) && (
                    <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
                      {product.subtitle || product.description}
                    </p>
                  )}
                  <p className="mt-auto pt-space-md font-semibold text-primary">{formatPrice(product.basePrice)}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default MenuPage;
