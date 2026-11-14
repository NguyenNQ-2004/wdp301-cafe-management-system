const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emailFilter = email => {
  const normalized = normalizeEmail(email);
  return { $or: [{ emailKey: normalized }, { email: new RegExp(`^\\s*${escapeRegex(normalized)}\\s*$`, 'i') }] };
};
const normalizePhone = value => typeof value === 'string' ? value.replace(/\s+/g, '') : '';
const validPhone = value => typeof value === 'string' && /^\+?[0-9]{9,15}$/.test(value);
const validLogin = value => validEmail(normalizeEmail(value)) || validPhone(normalizePhone(value));
const loginFilter = value => validEmail(normalizeEmail(value))
  ? emailFilter(normalizeEmail(value))
  : { phone: normalizePhone(value) };
module.exports = { normalizeEmail, validEmail, emailFilter, validLogin, loginFilter };
