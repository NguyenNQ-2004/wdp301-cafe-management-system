const mongoose = require('mongoose');
const Product = require('../models/Product');

const normalizeCartItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length > 50) {
    throw new Error('Giỏ hàng không hợp lệ hoặc vượt quá 50 món.');
  }

  const ids = rawItems.map((item) => item?.productId);
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error('Mã sản phẩm không hợp lệ.');
  }

  const products = await Product.find({ _id: { $in: ids }, isAvailable: true });
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const normalized = [];
  const seen = new Set();

  for (const raw of rawItems) {
    const product = byId.get(String(raw.productId));
    if (!product) throw new Error('Một sản phẩm không còn được bán.');
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('Số lượng mỗi món phải từ 1 đến 99.');
    }

    const sizes = product.variantsConfig?.sizes;
    const size = String(raw.size || 'M');
    if (sizes && !Object.prototype.hasOwnProperty.call(sizes, size)) {
      throw new Error(`Size ${size} không có cho ${product.name}.`);
    }
    if (!sizes && size !== 'M') {
      throw new Error(`${product.name} không có lựa chọn size ${size}.`);
    }

    const key = `${product._id}:${size}`;
    if (seen.has(key)) throw new Error('Giỏ hàng có món trùng lặp.');
    seen.add(key);

    const modifier = sizes ? Number(sizes[size]) : 0;
    if (!Number.isFinite(modifier) || modifier < 0) throw new Error('Giá size không hợp lệ.');
    if (!Number.isInteger(product.basePrice) || product.basePrice < 0 || !Number.isInteger(modifier)) {
      throw new Error(`Giá của ${product.name} không hợp lệ.`);
    }
    normalized.push({
      product,
      quantity,
      size,
      checked: raw.checked !== false,
      unitPrice: product.basePrice + modifier
    });
  }

  return normalized;
};

module.exports = { normalizeCartItems };
