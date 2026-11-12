const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emailFilter = email => {
  const normalized = normalizeEmail(email);
  return { $or: [{ emailKey: normalized }, { email: new RegExp(`^\\s*${escapeRegex(normalized)}\\s*$`, 'i') }] };
};
// Email is the only account identifier. Phone remains contact information.
const validLogin = value => validEmail(normalizeEmail(value));
const loginFilter = value => emailFilter(normalizeEmail(value));
module.exports = { normalizeEmail, validEmail, emailFilter, validLogin, loginFilter };
