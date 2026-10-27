const { normalizeCartItems } = require('./cartItems');

// POS may contain the same product/size with different sugar, ice or toppings.
async function normalizeCounterItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 50) throw new Error('Đơn phải có từ 1 đến 50 dòng món.');
  const bases = new Map();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dòng món không hợp lệ.');
    const customization = raw.customization || {};
    if (typeof customization !== 'object' || Array.isArray(customization)
      || Object.keys(customization).some(key => !['size', 'sugar', 'ice', 'note', 'topping'].includes(key))) throw new Error('Tùy chọn món không hợp lệ.');
    const size = String(raw.size || customization.size || 'M');
    if (raw.size && customization.size && raw.size !== customization.size) throw new Error('Size món không khớp tùy chọn.');
    bases.set(`${raw.productId}:${size}`, { productId: raw.productId, size, quantity: 1 });
  }
  const normalized = await normalizeCartItems([...bases.values()]);
  const byKey = new Map(normalized.map(item => [`${item.product._id}:${item.size}`, item]));
  return rawItems.map(raw => {
    const options = raw.customization || {};
    const size = String(raw.size || options.size || 'M');
    const base = byKey.get(`${String(raw.productId).toLowerCase()}:${size}`);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Số lượng mỗi dòng phải từ 1 đến 99.');
    if (options.sugar !== undefined && !['0%', '30%', '50%', '70%', '100%'].includes(options.sugar)) throw new Error('Mức đường không hợp lệ.');
    if (options.ice !== undefined && !['Không đá', 'Ít đá', 'Đá chuẩn'].includes(options.ice)) throw new Error('Mức đá không hợp lệ.');
    if (options.note !== undefined && (typeof options.note !== 'string' || options.note.trim().length > 300)) throw new Error('Ghi chú món phải có tối đa 300 ký tự.');
    const toppings = options.topping || [];
    if (!Array.isArray(toppings) || toppings.length > 20 || toppings.some(name => typeof name !== 'string') || new Set(toppings).size !== toppings.length) throw new Error('Danh sách topping không hợp lệ.');
    let toppingPrice = 0;
    for (const name of toppings) {
      const catalogToppings = base.product.variantsConfig?.toppings;
      const topping = Array.isArray(catalogToppings) ? catalogToppings.find(item => item.name === name) : undefined;
      if (!topping || !Number.isSafeInteger(topping.price) || topping.price < 0) throw new Error('Topping không còn khả dụng hoặc giá không hợp lệ.');
      toppingPrice += topping.price;
    }
    const customization = { size, ...(options.sugar !== undefined ? { sugar: options.sugar } : {}), ...(options.ice !== undefined ? { ice: options.ice } : {}),
      ...(options.note?.trim() ? { note: options.note.trim() } : {}), ...(toppings.length ? { topping: toppings } : {}) };
    const unitPrice = base.unitPrice + toppingPrice;
    if (!Number.isSafeInteger(unitPrice) || !Number.isSafeInteger(unitPrice * quantity)) throw new Error('Giá món không hợp lệ.');
    return { ...base, quantity, customization, unitPrice };
  });
}

module.exports = { normalizeCounterItems };
