const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { optionText } = require('./optionText');

const normalizeCartItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length > 50) {
    throw new Error('Giỏ hàng không hợp lệ hoặc vượt quá 50 món.');
  }

  const ids = rawItems.map((item) => item?.productId);
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error('Mã sản phẩm không hợp lệ.');
  }

  const activeCategories = await Category.distinct('_id', { status: 'ACTIVE' });
  const products = await Product.find({ _id: { $in: ids }, isAvailable: true, category: { $in: activeCategories } });
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

    const options = raw.customization || {};
    if (typeof options !== 'object' || Array.isArray(options)) throw new Error('Tùy chọn món không hợp lệ.');
    const customization = { size };
    for (const field of ['sugar', 'ice', 'note']) {
      if (options[field] != null) {
        if (typeof options[field] !== 'string' || options[field].length > (field === 'note' ? 500 : 50)) throw new Error('Tùy chọn món không hợp lệ.');
        customization[field] = options[field].trim();
      }
    }
    const toppings = options.topping || [];
    if (!Array.isArray(toppings) || toppings.length > 20 || new Set(toppings).size !== toppings.length) throw new Error('Topping không hợp lệ.');
    let toppingPrice = 0;
    const canonicalToppings = [];
    for (const name of toppings) {
      if (typeof name !== 'string' || name.length > 500) throw new Error('Topping không hợp lệ.');
      const choices = product.variantsConfig?.toppings || [];
      const exact = choices.find(item => item.name === name);
      const matches = exact ? [exact] : choices.filter(item => optionText(item.name) === optionText(name));
      const topping = matches.length === 1 ? matches[0] : null;
      if (!topping || !Number.isSafeInteger(topping.price) || topping.price < 0) throw new Error('Topping không còn khả dụng.');
      if (canonicalToppings.includes(topping.name)) throw new Error('Topping không được trùng lặp.');
      canonicalToppings.push(topping.name);
      toppingPrice += topping.price;
    }
    if (canonicalToppings.length) customization.topping = canonicalToppings;
    const key = JSON.stringify([String(product._id), size, customization.sugar || '', customization.ice || '', customization.note || '', [...canonicalToppings].sort()]);
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
      customization,
      checked: raw.checked !== false,
      unitPrice: product.basePrice + modifier + toppingPrice
    });
  }

  return normalized;
};

module.exports = { normalizeCartItems };
