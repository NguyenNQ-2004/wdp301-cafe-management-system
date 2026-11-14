const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

// Keep the policy useful for Vietnamese and other Unicode passwords while
// rejecting short, numeric-only, or whitespace-padded passwords.
function passwordError(password) {
  if (typeof password !== 'string' || !password) return 'Vui lòng nhập mật khẩu.';
  if (password.length < MIN_PASSWORD_LENGTH) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) return 'Mật khẩu vượt quá giới hạn 72 byte.';
  if (/\s/u.test(password)) return 'Mật khẩu không được chứa khoảng trắng.';
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) return 'Mật khẩu phải gồm ít nhất một chữ cái và một chữ số.';
  return null;
}

module.exports = { MIN_PASSWORD_LENGTH, MAX_PASSWORD_BYTES, passwordError };
