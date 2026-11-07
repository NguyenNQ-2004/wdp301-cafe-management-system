const { invalid } = require('./adminValidation');

module.exports = function catalogImage(value) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw invalid('Ảnh không hợp lệ.');
  const image = value.trim();
  if (!image.startsWith('data:')) {
    if (image.length > 2000 || (!/^https?:\/\//i.test(image) && !/^\/(?!\/)/.test(image))) throw invalid('Ảnh phải là URL http/https hoặc tệp ảnh được tải lên.');
    return image;
  }
  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match) throw invalid('Chỉ hỗ trợ ảnh JPG, PNG, WebP và GIF.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 2 * 1024 * 1024) throw invalid('Ảnh không được vượt quá 2 MB.');
  const signatures = {
    png: bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    jpeg: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    gif: ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii')),
    webp: bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  };
  if (!signatures[match[1]]) throw invalid('Nội dung tệp không khớp định dạng ảnh.');
  return image;
};
