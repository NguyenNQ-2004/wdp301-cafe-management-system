const express = require('express');
const { randomInt, randomBytes, createHash } = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Recovery = require('../models/PasswordRecovery');
const mailer = require('../utils/recoveryEmail');
const { normalizeEmail, validEmail, emailFilter } = require('../utils/EmailUtil');
const router = express.Router();
const { atomicRoute } = require('../utils/atomicRoute');
const hash = value => createHash('sha256').update(value).digest('hex');
const generic = 'Nếu email thuộc tài khoản đang hoạt động, mã OTP sẽ được gửi đến hộp thư của bạn.';
const error = (res, status, message) => res.status(status).json({ message });
const validBody = body => body && typeof body === 'object' && !Array.isArray(body);

router.post('/forgot-password', async (req, res) => {
  try {
    if (!validBody(req.body)) return error(res, 400, 'Dữ liệu không hợp lệ.');
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) return error(res, 400, 'Vui lòng nhập email hợp lệ.');
    if (!mailer.configured()) return error(res, 503, 'Chưa cấu hình dịch vụ gửi email. Vui lòng liên hệ quản trị viên.');
    const challenge = randomBytes(32).toString('hex');
    const user = await User.findOne({ ...emailFilter(email), status: 'ACTIVE' }).select('_id');
    if (!user) return res.json({ message: generic, challenge });
    const now = new Date();
    const otp = String(randomInt(0, 1000000)).padStart(6, '0');
    // Unique email and the conditional upsert enforce the cooldown even when
    // two resend requests arrive at the same time.
    let record;
    try {
      record = await Recovery.findOneAndUpdate({ email, $or: [{ sentAt: { $lte: new Date(now.getTime() - 60000) } }, { sentAt: { $exists: false } }] },
        { $set: { user: user._id, challenge, otpHash: hash(`${challenge}:${otp}`), attempts: 0, sentAt: now, expiresAt: new Date(now.getTime() + 600000) }, $unset: { resetTokenHash: 1 } },
        { upsert: true, returnDocument: 'after', runValidators: true });
    } catch (failure) {
      if (failure.code === 11000) return res.json({ message: generic, challenge });
      throw failure;
    }
    try { await mailer.send(email, otp); }
    catch (_) { await Recovery.deleteOne({ _id: record._id, challenge }); return error(res, 503, 'Không gửi được email. Vui lòng thử lại sau.'); }
    return res.json({ message: generic, challenge });
  } catch (_) { return error(res, 500, 'Không thể tạo yêu cầu khôi phục mật khẩu.'); }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { challenge, otp } = validBody(req.body) ? req.body : {};
    if (typeof challenge !== 'string' || !/^[a-f0-9]{64}$/.test(challenge) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return error(res, 400, 'Mã OTP phải gồm 6 chữ số.');
    // Count every attempt atomically. Expiry is checked explicitly because TTL
    // cleanup is asynchronous in MongoDB.
    const attempt = await Recovery.findOneAndUpdate({ challenge, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 }, resetTokenHash: { $exists: false } }, { $inc: { attempts: 1 } }, { returnDocument: 'after' }).select('+otpHash');
    if (!attempt || attempt.otpHash !== hash(`${challenge}:${otp}`)) return error(res, 400, 'Mã OTP sai, hết hạn hoặc đã vượt quá 5 lần thử.');
    const resetToken = randomBytes(32).toString('hex');
    const verified = await Recovery.findOneAndUpdate({ _id: attempt._id, challenge, resetTokenHash: { $exists: false }, expiresAt: { $gt: new Date() } }, { $set: { resetTokenHash: hash(resetToken), expiresAt: new Date(Date.now() + 900000) } });
    if (!verified) return error(res, 400, 'Mã OTP đã được sử dụng.');
    return res.json({ resetToken, message: 'Xác minh thành công. Hãy đặt mật khẩu mới.' });
  } catch (_) { return error(res, 500, 'Không thể xác minh OTP.'); }
});

router.post('/reset-password', atomicRoute(async (req, res) => {
  try {
    const { resetToken, password, confirmPassword } = validBody(req.body) ? req.body : {};
    if (typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken)) return error(res, 400, 'Phiên đổi mật khẩu không hợp lệ.');
    if (typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) return error(res, 400, 'Mật khẩu phải có ít nhất 6 ký tự và tối đa 72 byte.');
    if (password !== confirmPassword) return error(res, 400, 'Mật khẩu xác nhận không khớp.');
    const passwordHash = await bcrypt.hash(password, 10);
    // Consume the reset token once, before changing the password.
    const record = await Recovery.findOneAndDelete({ resetTokenHash: hash(resetToken), expiresAt: { $gt: new Date() } });
    if (!record) return error(res, 400, 'Phiên đổi mật khẩu đã hết hạn hoặc đã được sử dụng.');
    const user = await User.findOneAndUpdate({ _id: record.user, ...emailFilter(record.email), status: 'ACTIVE' }, { $set: { passwordHash, passwordChangedAt: new Date() } });
    if (!user) return error(res, 400, 'Tài khoản không còn khả dụng.');
    return res.json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (_) { return error(res, 500, 'Không thể đặt lại mật khẩu. Vui lòng yêu cầu OTP mới.'); }
}));
module.exports = router;
