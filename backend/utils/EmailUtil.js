const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emailFilter = email => {
  const normalized = normalizeEmail(email);
  return { $or: [{ emailKey: normalized }, { email: new RegExp(`^\\s*${escapeRegex(normalized)}\\s*$`, 'i') }] };
};
const validLogin = value => typeof value === 'string' && (validEmail(value) || /^\+?\d{9,15}$/.test(value) || /^[a-z0-9][a-z0-9._+-]{0,63}$/i.test(value));
const loginFilter = value => {
  const normalized = normalizeEmail(value);
  if (/^\+?\d{9,15}$/.test(normalized)) return { phone: normalized };
  if (validEmail(normalized)) return emailFilter(normalized);
  return { email: new RegExp(`^\\s*${escapeRegex(normalized)}@`, 'i') };
};
module.exports = { normalizeEmail, validEmail, emailFilter, validLogin, loginFilter };
