export interface PurchaseIngredient { _id: string; name: string; unit: string }
export interface PurchaseLine { ingredient: string; quantity: number | ''; inputUnit: string; totalCost: number | '' }

// K-PN: purchaseUnits — Liệt kê các đơn vị mua có thể quy đổi về đơn vị kho.
export function purchaseUnits(unit: string) {
  if (['gram', 'g'].includes(unit)) return [{ label: unit, factor: 1 }, { label: 'kg', factor: 1000 }];
  if (unit === 'kg') return [{ label: 'kg', factor: 1 }, { label: 'gram', factor: 0.001 }];
  if (unit === 'ml') return [{ label: 'ml', factor: 1 }, { label: 'lít', factor: 1000 }];
  if (['lít', 'l', 'liter'].includes(unit)) return [{ label: unit, factor: 1 }, { label: 'ml', factor: 0.001 }];
  return [{ label: unit, factor: 1 }];
}
// K-PN: newPurchaseLine — Tạo dòng nhập với nguyên liệu và đơn vị mặc định.
export const newPurchaseLine = (ingredient: PurchaseIngredient): PurchaseLine => ({ ingredient: ingredient._id, quantity: '', inputUnit: ingredient.unit, totalCost: '' });

// K-PN: purchaseQuantity — Quy đổi số lượng nhập về đơn vị kho.
export function purchaseQuantity(line: PurchaseLine, ingredient: PurchaseIngredient) {
  const unit = purchaseUnits(ingredient.unit).find(option => option.label === line.inputUnit);
  return unit ? Math.round(Number(line.quantity) * unit.factor * 1e9) / 1e9 : 0;
}

// K-PN: purchaseItemsPayload — Chuẩn bị danh sách dòng đã quy đổi và tổng tiền để gửi API.
export function purchaseItemsPayload(lines: PurchaseLine[], ingredients: PurchaseIngredient[]) {
  if (!lines.length || lines.length > 100) throw new Error('Phiếu nhập phải có từ 1 đến 100 dòng nguyên liệu.');
  const errors: string[] = [];
  const selected = new Set<string>();
  const payload = lines.map((line, index) => {
    const ingredient = ingredients.find(row => row._id === line.ingredient);
    const row = `Dòng ${index + 1}${ingredient ? ` (${ingredient.name})` : ''}`;
    if (!ingredient) errors.push(`${row}: Vui lòng chọn nguyên liệu.`);
    if (ingredient && selected.has(ingredient._id)) errors.push(`${row}: Nguyên liệu đã có trong phiếu. Mỗi nguyên liệu chỉ được chọn một lần.`);
    if (ingredient) selected.add(ingredient._id);
    const quantity = ingredient ? purchaseQuantity(line, ingredient) : 0;
    if (ingredient && !purchaseUnits(ingredient.unit).some(unit => unit.label === line.inputUnit)) errors.push(`${row}: Đơn vị mua không hợp lệ cho nguyên liệu này.`);
    if (typeof line.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0.001 || quantity > Number.MAX_SAFE_INTEGER) errors.push(`${row}: Số lượng nhập phải từ 0.001 và nằm trong giới hạn số hợp lệ.`);
    if (line.totalCost === '' || !Number.isSafeInteger(line.totalCost) || line.totalCost < 0) errors.push(`${row}: Tổng tiền phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.`);
    return { ingredient: line.ingredient, quantity, totalCost: Number(line.totalCost) };
  });
  if (payload.reduce((sum, line) => sum + line.totalCost, 0) > Number.MAX_SAFE_INTEGER) errors.push('Tổng tiền phiếu nhập vượt quá giới hạn số hợp lệ. Vui lòng giảm tổng tiền các dòng.');
  if (errors.length) throw new Error(errors.join('\n'));
  return payload;
}
