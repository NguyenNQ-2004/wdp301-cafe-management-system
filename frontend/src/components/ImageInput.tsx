import { useRef, useState } from 'react';

export default function ImageInput({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  const [error, setError] = useState('');
  const generation = useRef(0);
  const update = (next: string) => { generation.current++; onChange(next); setError(''); };
  const select = (file?: File) => {
    if (!file) return;
    const current = ++generation.current;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Chọn ảnh JPG, PNG, WebP hoặc GIF.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Ảnh không được vượt quá 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (current === generation.current) { onChange(String(reader.result)); setError(''); } };
    reader.onerror = () => { if (current === generation.current) setError('Không đọc được ảnh. Vui lòng chọn lại.'); };
    reader.readAsDataURL(file);
  };
  return <div className="space-y-2">
    <input aria-label="Đường dẫn ảnh" type="text" className={className} value={value.startsWith('data:') ? '' : value} placeholder={value.startsWith('data:') ? 'Đã chọn ảnh từ máy tính' : 'https://example.com/image.jpg'} onChange={event => update(event.target.value)} />
    <input aria-label="Tải ảnh từ máy tính" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2" onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
    <p className="text-[11px] text-stone-500">Nhập URL hoặc tải ảnh JPG, PNG, WebP, GIF tối đa 2 MB.</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {value && <div className="flex items-center gap-3"><img src={value} alt="Ảnh xem trước" className="h-20 w-20 rounded-lg border border-stone-200 object-cover" /><button type="button" onClick={() => update('')} className="text-xs font-semibold text-red-700">Xóa ảnh</button></div>}
  </div>;
}
