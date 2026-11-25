import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let vite, forms, purchases, shop;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  forms = await vite.ssrLoadModule('/src/lib/formValidation.ts');
  purchases = await vite.ssrLoadModule('/src/lib/purchaseCost.ts');
  shop = await vite.ssrLoadModule('/src/lib/shopApi.ts');
});
after(async () => { await vite?.close(); });

const employee = () => ({ fullName: 'Nguyễn Văn An', phone: '0901234567', email: 'an@example.com', password: 'Password123', baseSalary: '5000000', hireDate: '2026-11-25' });
test('Employee form reports each wrong field together, with the actual password rule', () => {
  const errors = forms.validateEmployeeForm({ ...employee(), fullName: 'An123', phone: '123abc', email: 'an@', password: 'password', baseSalary: '', hireDate: '2026-02-30' }, true);
  assert.deepEqual(Object.keys(errors).sort(), ['baseSalary', 'email', 'fullName', 'hireDate', 'password', 'phone']);
  assert.match(errors.fullName, /Họ tên/);
  assert.match(errors.phone, /9 đến 15 chữ số/);
  assert.match(errors.password, /chữ cái và một chữ số/);
  assert.match(errors.baseSalary, /Lương cơ bản/);
  assert.match(errors.hireDate, /Ngày vào làm/);
});
test('A blank employee password preserves it only while editing; Unicode passwords use bytes', () => {
  assert.equal(forms.validateEmployeeForm({ ...employee(), password: '' }, false).password, undefined);
  assert.match(forms.validateEmployeeForm({ ...employee(), password: '' }, true).password, /nhập mật khẩu/);
  assert.match(forms.validateEmployeeForm({ ...employee(), password: 'é'.repeat(36) + '1' }, true).password, /72 byte/);
  assert.deepEqual(forms.validateEmployeeForm(employee(), true), {});
});
test('Customer form retains an optional email and distinguishes phone, points and password errors', () => {
  const valid = { fullName: 'Trần Văn Bình', phone: '0902345678', email: '', password: 'ValidPass123', birthday: '', address: '', initialPoints: 0 };
  assert.deepEqual(forms.validateCustomerForm(valid), {});
  const errors = forms.validateCustomerForm({ ...valid, phone: '12345', email: 'invalid', password: '12345678', initialPoints: -1 });
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'initialPoints', 'password', 'phone']);
  assert.match(errors.initialPoints, /Điểm khởi tạo/);
});
test('API field errors replace a generic message without dropping other invalid fields', async () => {
  const data = { message: 'Vui lòng kiểm tra dữ liệu', errors: { phone: 'Số điện thoại phải có từ 9 đến 15 chữ số.', email: 'Email này đã được sử dụng.' } };
  assert.equal(forms.apiErrorMessage(data, 'Lỗi'), Object.values(data.errors).join('\n'));
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(data), { status: 400, headers: { 'Content-Type': 'application/json' } });
  try {
    await assert.rejects(shop.shopApi('/api/users', { method: 'POST', body: {} }), error => {
      assert.equal(error.status, 400);
      assert.match(error.message, /Số điện thoại/);
      assert.match(error.message, /Email này đã/);
      assert.deepEqual(error.data.errors, data.errors);
      return true;
    });
  } finally { globalThis.fetch = original; }
});
test('API error messages ignore malformed error payloads and retain the useful fallback', () => {
  assert.equal(forms.apiErrorMessage({ errors: { phone: {}, email: null }, message: 500 }, 'Không thể lưu dữ liệu.'), 'Không thể lưu dữ liệu.');
  assert.equal(forms.apiErrorMessage({ message: 'Phí giao hàng không hợp lệ.' }, 'Lỗi'), 'Phí giao hàng không hợp lệ.');
});
const ingredients = [{ _id: 'milk', name: 'Sữa tươi', unit: 'ml' }, { _id: 'tea', name: 'Trà', unit: 'g' }];
test('Product validation names invalid price, size and topping rows without silently dropping them', () => {
  const errors = forms.validateProductForm({ name: '', base_price: '', sizes: [{ name: 'M', delta: 0 }, { name: 'M', delta: -1 }], toppings: [{ name: '', price: 1.5 }] });
  assert.ok(errors.some(message => /Tên sản phẩm/.test(message)));
  assert.ok(errors.some(message => /Giá bán/.test(message)));
  assert.ok(errors.some(message => /Size dòng 2: Tên size đã có/.test(message)));
  assert.ok(errors.some(message => /Size dòng 2: Phụ thu/.test(message)));
  assert.ok(errors.some(message => /Topping dòng 1: Tên topping/.test(message)));
  assert.ok(errors.some(message => /Topping dòng 1: Giá topping/.test(message)));
  assert.deepEqual(forms.validateProductForm({ name: 'Cà phê', base_price: 30000, sizes: [{ name: 'M', delta: 0 }], toppings: [] }), []);
});
test('Purchase reports all invalid rows with ingredient names, rather than a generic save error', () => {
  assert.throws(() => purchases.purchaseItemsPayload([
    { ingredient: 'milk', quantity: 0, inputUnit: 'ml', totalCost: '' },
    { ingredient: 'tea', quantity: 1, inputUnit: 'ml', totalCost: -1 }
  ], ingredients), error => {
    assert.match(error.message, /Dòng 1 \(Sữa tươi\): Số lượng/);
    assert.match(error.message, /Dòng 1 \(Sữa tươi\): Tổng tiền/);
    assert.match(error.message, /Dòng 2 \(Trà\): Đơn vị/);
    assert.match(error.message, /Dòng 2 \(Trà\): Tổng tiền/);
    return true;
  });
});
test('Purchase blocks duplicate ingredients, missing choices and unsafe totals before sending', () => {
  const line = { ingredient: 'milk', quantity: 1, inputUnit: 'ml', totalCost: 1000 };
  assert.throws(() => purchases.purchaseItemsPayload([line, line], ingredients), /Dòng 2.*đã có trong phiếu/);
  assert.throws(() => purchases.purchaseItemsPayload([{ ...line, ingredient: '' }], ingredients), /Dòng 1: Vui lòng chọn nguyên liệu/);
  assert.throws(() => purchases.purchaseItemsPayload([{ ...line, totalCost: Number.MAX_SAFE_INTEGER }, { ...line, ingredient: 'tea', inputUnit: 'g', totalCost: 1 }], ingredients), /Tổng tiền phiếu nhập vượt/);
});
