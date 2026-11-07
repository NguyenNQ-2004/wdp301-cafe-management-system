const pending = new Set();
function lockOrder(id) {
  const key = String(id);
  if (pending.has(key)) throw Object.assign(new Error('Đơn hàng đang được cập nhật. Vui lòng thử lại.'), { status: 409 });
  pending.add(key);
  return () => pending.delete(key);
}
module.exports = { lockOrder };
