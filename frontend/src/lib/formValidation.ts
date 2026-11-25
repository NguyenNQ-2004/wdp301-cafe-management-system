import { passwordError, validEmail, validFullName } from './authCredentials';

export type FieldErrors = Record<string, string>;
export function validateProductForm(form: { name: string; base_price: number | ''; sizes: { name: string; delta: number | '' }[]; toppings: { name: string; price: number | '' }[] }): string[] {
  const errors: string[] = [];
  if (!form.name.trim() || form.name.trim().length > 150) errors.push('Tên sản phẩm phải có từ 1 đến 150 ký tự.');
  if (!Number.isSafeInteger(form.base_price) || Number(form.base_price) < 0) errors.push('Giá bán phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.');
  if (!form.sizes.length) errors.push('Sản phẩm phải có ít nhất một size.');
  const sizes = new Set<string>();
  form.sizes.forEach((size, index) => {
    if (!size.name.trim()) errors.push(`Size dòng ${index + 1}: Vui lòng nhập tên size.`);
    if (sizes.has(size.name.trim())) errors.push(`Size dòng ${index + 1}: Tên size đã có trong danh sách.`);
    sizes.add(size.name.trim());
    if (!Number.isSafeInteger(size.delta) || Number(size.delta) < 0) errors.push(`Size dòng ${index + 1}: Phụ thu phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.`);
  });
  const toppings = new Set<string>();
  form.toppings.forEach((topping, index) => {
    const name = topping.name.trim();
    if (!name || name.length > 150) errors.push(`Topping dòng ${index + 1}: Tên topping phải có từ 1 đến 150 ký tự.`);
    const key = name.toLocaleLowerCase('vi');
    if (toppings.has(key)) errors.push(`Topping dòng ${index + 1}: Tên topping đã có trong danh sách.`);
    toppings.add(key);
    if (!Number.isSafeInteger(topping.price) || Number(topping.price) < 0) errors.push(`Topping dòng ${index + 1}: Giá topping phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.`);
  });
  return errors;
}
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function validateEmployeeForm(form: { fullName: string; phone: string; email: string; password: string; baseSalary: string; hireDate: string }, creating: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!validFullName(form.fullName)) errors.fullName = 'Họ tên phải có từ 1 đến 100 ký tự, chỉ gồm chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy.';
  if (!/^[0-9]{9,15}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại nhân viên phải có từ 9 đến 15 chữ số.';
  if (!validEmail(form.email.trim())) errors.email = 'Vui lòng nhập địa chỉ email đăng nhập hợp lệ.';
  if (!form.baseSalary.trim() || !Number.isSafeInteger(Number(form.baseSalary)) || Number(form.baseSalary) < 0) errors.baseSalary = 'Lương cơ bản phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.';
  if (creating || form.password) {
    const message = passwordError(form.password);
    if (message) errors.password = message;
  }
  if (form.hireDate && !validDate(form.hireDate)) errors.hireDate = 'Ngày vào làm không hợp lệ. Vui lòng chọn ngày thực tế.';
  return errors;
}

export function validateCustomerForm(form: { fullName: string; phone: string; email: string; password: string; birthday: string; address: string; initialPoints: number }): FieldErrors {
  const errors: FieldErrors = {};
  if (!validFullName(form.fullName)) errors.fullName = 'Họ tên khách hàng phải có từ 1 đến 100 ký tự, chỉ gồm chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy.';
  if (!/^[0-9]{9,15}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại khách hàng phải có từ 9 đến 15 chữ số.';
  if (form.email && !validEmail(form.email.trim())) errors.email = 'Email khách hàng không đúng định dạng. Ví dụ: ten@example.com.';
  const message = passwordError(form.password);
  if (message) errors.password = message;
  if (form.birthday && !validDate(form.birthday)) errors.birthday = 'Ngày sinh không hợp lệ. Vui lòng chọn ngày thực tế.';
  if (form.address.length > 500) errors.address = 'Địa chỉ khách hàng không được vượt quá 500 ký tự.';
  if (!Number.isSafeInteger(form.initialPoints) || form.initialPoints < 0) errors.initialPoints = 'Điểm khởi tạo phải là số nguyên không âm và nằm trong giới hạn số hợp lệ.';
  return errors;
}

export function apiErrorMessage(data: { message?: unknown; errors?: unknown } | null, fallback: string): string {
  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const messages = [...new Set(Object.values(data.errors).filter((value): value is string => typeof value === 'string' && !!value.trim()))];
    if (messages.length) return messages.join('\n');
  }
  return typeof data?.message === 'string' && data.message.trim() ? data.message : fallback;
}
