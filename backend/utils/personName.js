// Keep accented and decomposed Unicode letters, spaces, apostrophes and hyphens.
const validFullName = value => typeof value === 'string'
  && value.trim().length <= 100
  && /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]+\p{L}[\p{L}\p{M}]*)*$/u.test(value.trim());

module.exports = { validFullName };
