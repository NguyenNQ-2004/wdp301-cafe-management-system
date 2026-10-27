const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const emailFilter = email => {
  const normalized = normalizeEmail(email);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Also match legacy records that were saved before email normalization.
  return { $or: [{ emailKey: normalized }, { email: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }] };
};
module.exports = { normalizeEmail, validEmail, emailFilter };
