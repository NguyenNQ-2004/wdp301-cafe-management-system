const router = require('express').Router();
const Request = require('../models/RestockRequest');
const Ingredient = require('../models/Ingredient');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { invalid, objectBody, objectId, sendError } = require('../utils/adminValidation');
const cashierOnly = (req, res, next) => {
  if (req.user.role !== 'STAFF' || req.user.position !== 'CASHIER') return res.status(403).json({ message: 'Chỉ thu ngân được tạo và gửi đề xuất.' });
  next();
};
router.use(protect, (req, res, next) => {
  if (req.user.role === 'ADMIN' || (req.user.role === 'STAFF' && req.user.position === 'CASHIER')) return next();
  res.status(403).json({ message: 'Bạn không có quyền truy cập đề xuất nhập hàng.' });
});
const note = value => {
  if (value == null) return '';
  if (typeof value !== 'string' || value.trim().length > 500) throw invalid('Ghi chú không được quá 500 ký tự.');
  return value.trim();
};
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'ALL';
    if (!['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) throw invalid('Trạng thái không hợp lệ.');
    const requests = await Request.find({ ...(status === 'ALL' ? {} : { status }), ...(req.user.role === 'ADMIN' ? {} : { requester: req.user._id }) }).populate('requester reviewer history.actor', 'fullName').populate('items.ingredient', 'name unit').sort({ createdAt: -1 });
    res.json(requests);
  } catch (failure) { sendError(res, failure); }
});
async function parseRequest(body) {
  objectBody(body);
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(body.status)) throw invalid('Trạng thái khởi tạo không hợp lệ.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw invalid('Cần từ 1 đến 100 nguyên liệu.');
  const ids = new Set();
  const items = [];
  for (const line of body.items) {
    objectBody(line);
    const ingredient = objectId(line.ingredient);
    if (ids.has(String(ingredient)) || typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 1000000000) throw invalid('Nguyên liệu trùng hoặc số lượng không hợp lệ.');
    if (!await Ingredient.exists({ _id: ingredient, isActive: { $ne: false } })) throw invalid('Nguyên liệu không còn hoạt động.', 409);
    ids.add(String(ingredient)); items.push({ ingredient, quantity: line.quantity, itemNote: note(line.itemNote) });
  }
  return { status: body.status, reason: note(body.reason), note: note(body.note), items };
}
router.post('/', cashierOnly, async (req, res) => {
  try {
    const fields = await parseRequest(req.body);
    res.status(201).json(await Request.create({ ...fields, requester: req.user._id, history: [{ action: 'create', actor: req.user._id, at: new Date() }] }));
  } catch (failure) { sendError(res, failure); }
});
router.put('/:id', cashierOnly, async (req, res) => {
  try {
    const fields = await parseRequest(req.body);
    const updated = await Request.findOneAndUpdate({ _id: objectId(req.params.id), requester: req.user._id, status: { $in: ['DRAFT', 'REJECTED'] }, ...(req.body.expectedUpdatedAt ? { updatedAt: new Date(req.body.expectedUpdatedAt) } : {}) }, {
      $set: fields,
      $push: { history: { action: fields.status === 'DRAFT' ? 'edit' : 'resubmit', actor: req.user._id, at: new Date() } }
    }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw invalid('Đề xuất đã thay đổi hoặc không được phép sửa.', 409);
    res.json(updated);
  } catch (failure) { sendError(res, failure); }
});
router.post('/:id/transition', async (req, res) => {
  try {
    const body = objectBody(req.body);
    const transitions = { submit: [['DRAFT'], 'PENDING_APPROVAL'], approve: [['PENDING_APPROVAL'], 'APPROVED'], reject: [['PENDING_APPROVAL'], 'REJECTED'], cancel: [['DRAFT', 'PENDING_APPROVAL'], 'CANCELLED'] };
    if (!Object.hasOwn(transitions, body.action)) throw invalid('Thao tác không hợp lệ.');
    const [from, status] = transitions[body.action];
    const reviewed = ['approve', 'reject'].includes(body.action);
    if (reviewed && req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ Admin được xét duyệt đề xuất.' });
    if (!reviewed && (req.user.role !== 'STAFF' || req.user.position !== 'CASHIER')) return res.status(403).json({ message: 'Chỉ thu ngân được gửi hoặc hủy đề xuất của mình.' });
    const updated = await Request.findOneAndUpdate({ _id: objectId(req.params.id), status: { $in: from }, ...(!reviewed ? { requester: req.user._id } : {}) }, { $set: { status, ...(reviewed ? { reviewer: req.user._id, reviewedAt: new Date(), reviewNote: note(body.reviewNote) } : {}) }, $push: { history: { action: body.action, actor: req.user._id, at: new Date(), note: reviewed ? note(body.reviewNote) : '' } } }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw invalid('Trạng thái đề xuất đã thay đổi. Vui lòng tải lại.', 409);
    res.json(updated);
  } catch (failure) { sendError(res, failure); }
});
module.exports = router;
