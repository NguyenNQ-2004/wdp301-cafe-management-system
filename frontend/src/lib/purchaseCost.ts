export interface PurchaseIngredient { _id: string; name: string; unit: string }
export interface PurchaseLine { ingredient: string; quantity: number | ''; inputUnit: string; totalCost: number | '' }

export function purchaseUnits(unit: string) {
  if (['gram', 'g'].includes(unit)) return [{ label: unit, factor: 1 }, { label: 'kg', factor: 1000 }];
  if (unit === 'kg') return [{ label: 'kg', factor: 1 }, { label: 'gram', factor: 0.001 }];
  if (unit === 'ml') return [{ label: 'ml', factor: 1 }, { label: 'lít', factor: 1000 }];
  if (['lít', 'l', 'liter'].includes(unit)) return [{ label: unit, factor: 1 }, { label: 'ml', factor: 0.001 }];
  return [{ label: unit, factor: 1 }];
}
export const newPurchaseLine = (ingredient: PurchaseIngredient): PurchaseLine => ({ ingredient: ingredient._id, quantity: 1, inputUnit: ingredient.unit, totalCost: '' });

export function purchaseQuantity(line: PurchaseLine, ingredient: PurchaseIngredient) {
  const unit = purchaseUnits(ingredient.unit).find(option => option.label === line.inputUnit);
  return unit ? Math.round(Number(line.quantity) * unit.factor * 1e9) / 1e9 : 0;
}

export function purchaseItemsPayload(lines: PurchaseLine[], ingredients: PurchaseIngredient[]) {
  return lines.map(line => {
    const ingredient = ingredients.find(row => row._id === line.ingredient);
    if (!ingredient) throw new Error('Vui lòng chọn nguyên liệu.');
    const quantity = purchaseQuantity(line, ingredient);
    if (!Number.isFinite(quantity) || quantity < 0.001) throw new Error('Số lượng nhập phải lớn hơn 0.');
    if (line.totalCost === '' || !Number.isSafeInteger(line.totalCost) || line.totalCost < 0) throw new Error('Vui lòng nhập tổng tiền nguyên liệu bằng số nguyên không âm.');
    return { ingredient: line.ingredient, quantity, totalCost: line.totalCost };
  });
}
