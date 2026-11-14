import type { Product } from '../types';
import { fmtMoney } from '../data/dbUtils';
export default function StorefrontProductCard({ product, category, onDetail, onCustomize }: { product: Product; category: string; onDetail: () => void; onCustomize: () => void }) {
  return <article className="swp-product-card">
    <button type="button" className="swp-product-image" onClick={onDetail} aria-label={`Xem ${product.name}`}><img src={product.image_url || '/cafe-placeholder.svg'} alt={product.name} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/cafe-placeholder.svg'; }} /></button>
    <div className="swp-product-body"><span className="swp-product-category">{category}</span><h2><button onClick={onDetail}>{product.name}</button></h2><p className="swp-product-brief">{product.description || 'Đồ uống tinh hoa được tuyển chọn từ vùng nguyên liệu đặc sản.'}</p><div className="swp-product-footer"><strong>{fmtMoney(product.base_price)}</strong><button type="button" className="swp-add-circle" title="Tùy chọn & Thêm món" aria-label={`Tùy chọn và thêm ${product.name}`} onClick={onCustomize}><span className="material-symbols-outlined">add</span></button></div></div>
  </article>;
}
