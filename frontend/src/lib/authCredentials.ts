export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validFullName = (value: string) => value.trim().length <= 100 && /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]+\p{L}[\p{L}\p{M}]*)*$/u.test(value.trim());
export const passwordError = (value: string) => {
  if (!value) return 'Vui lòng nhập mật khẩu.';
  if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (new TextEncoder().encode(value).length > 72) return 'Mật khẩu vượt quá giới hạn 72 byte.';
  if (/\s/u.test(value)) return 'Mật khẩu không được chứa khoảng trắng.';
  if (!/\p{L}/u.test(value) || !/\p{N}/u.test(value)) return 'Mật khẩu phải gồm ít nhất một chữ cái và một chữ số.';
  return undefined;
};

export function loginCredentials(identifier: string, password: string) {
  if (!password) throw new Error('Vui lòng nhập mật khẩu.');
  const email = normalizeEmail(identifier);
  if (validEmail(email)) return { email, password };
  const phone = identifier.replace(/\s+/g, '');
  if (/^\+?[0-9]{9,15}$/.test(phone)) return { identifier: phone, password };
  throw new Error('Nhập email hoặc số điện thoại hợp lệ để đăng nhập.');
}

export type RegistrationInput = { fullName: string; email: string; phone: string; password: string; confirmPassword?: string; termsAccepted?: boolean };
export type RegistrationErrors = Partial<Record<'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'termsAccepted', string>>;

export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = input.phone.replace(/\s+/g, '');
  if (!fullName) errors.fullName = 'Vui lòng nhập họ và tên.';
  else if (fullName.length > 100) errors.fullName = 'Họ tên tối đa 100 ký tự.';
  else if (!validFullName(fullName)) errors.fullName = 'Họ tên không hợp lệ. Chỉ dùng chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy.';
  if (!email) errors.email = 'Vui lòng nhập email.';
  else if (!validEmail(email)) errors.email = 'Địa chỉ email không hợp lệ.';
  if (!phone) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (!/^\+?[0-9]+$/.test(phone)) errors.phone = 'Số điện thoại chỉ được chứa chữ số và dấu + ở đầu nếu có mã quốc gia.';
  else {
    const digits = phone.replace(/^\+/, '').length;
    if (digits < 9) errors.phone = `Số điện thoại quá ngắn: đã nhập ${digits} chữ số, cần ít nhất 9 chữ số.`;
    if (digits > 15) errors.phone = `Số điện thoại quá dài: đã nhập ${digits} chữ số, tối đa 15 chữ số.`;
  }
  const passwordMessage = passwordError(input.password);
  if (passwordMessage) errors.password = passwordMessage;
  if (input.confirmPassword !== undefined) {
    if (!input.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    else if (input.confirmPassword !== input.password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }
  if (input.termsAccepted === false) errors.termsAccepted = 'Bạn cần đồng ý với quy chế bảo mật và điều khoản để đăng ký.';
  return errors;
}

export function registrationPayload(input: RegistrationInput) {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const fullName = input.fullName.trim();
  const phone = input.phone.replace(/\s+/g, '');
  const errors = validateRegistration(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join('\n'));
  return { fullName, email, phone, password };
}
