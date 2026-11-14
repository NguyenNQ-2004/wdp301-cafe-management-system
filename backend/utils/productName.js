const normalizeProductName = value => value.normalize('NFC').trim().replace(/\s+/gu, ' ');
const productNameKey = value => normalizeProductName(value).toLocaleLowerCase('vi');
module.exports = { normalizeProductName, productNameKey };
