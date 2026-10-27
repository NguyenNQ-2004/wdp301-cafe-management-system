export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function loginCredentials(identifier: string, password: string) {
  const email = normalizeEmail(identifier);
  if (!validEmail(email)) throw new Error('Vui lòng nhập địa chỉ Gmail/email hợp lệ. Số điện thoại chỉ dùng để liên hệ.');
  if (!password) throw new Error('Vui lòng nhập mật khẩu.');
  return { email, password };
}

export function registrationPayload(input: { fullName: string; email: string; phone: string; password: string }) {
  const { email, password } = loginCredentials(input.email, input.password);
  const fullName = input.fullName.trim();
  const phone = input.phone.replace(/\s+/g, '');
  if (!fullName || fullName.length > 100) throw new Error('Họ tên phải có từ 1 đến 100 ký tự.');
  if (!/^\+?[0-9]{9,15}$/.test(phone)) throw new Error('Số điện thoại liên hệ phải có từ 9 đến 15 chữ số.');
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) throw new Error('Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte.');
  return { fullName, email, phone, password };
}
