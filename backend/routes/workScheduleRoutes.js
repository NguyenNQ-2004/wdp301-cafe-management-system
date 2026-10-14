const express = require('express');
const WorkSchedule = require('../models/WorkSchedule');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

// 1. GET ALL SCHEDULES (Admin xem tất cả, Staff xem lịch của mình hoặc theo ngày)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'STAFF') {
      filter.user = req.user._id;
    } else if (req.query.userId) {
      filter.user = req.query.userId;
    }
    if (req.query.workDate) {
      const d = new Date(req.query.workDate);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      filter.workDate = { $gte: d, $lt: nextD };
    }
    if (req.query.shiftName) {
      filter.shiftName = req.query.shiftName;
    }

    const schedules = await WorkSchedule.find(filter)
      .populate('user', 'fullName phone role position')
      .sort({ workDate: -1, shiftName: 1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CHECK-IN / CHECK-OUT / BÀN GIAO TIỀN KÉT (Staff thao tác)
router.put('/:id/shift-action', async (req, res) => {
  try {
    const { action, cash, note } = req.body;
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });

    if (action === 'CHECK_IN') {
      schedule.checkInTime = new Date();
      schedule.status = 'PRESENT';
      if (cash !== undefined) schedule.startingCash = Number(cash);
    } else if (action === 'CHECK_OUT') {
      schedule.checkOutTime = new Date();
      schedule.status = 'COMPLETED';
      if (cash !== undefined) schedule.endingCashActual = Number(cash);
    }
    if (note) schedule.note = note;

    await schedule.save();
    res.json({ message: 'Cập nhật ca làm thành công!', schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ADMIN: TẠO MỚI CA LÀM
router.post('/', adminOnly, async (req, res) => {
  try {
    const schedule = await WorkSchedule.create(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. ADMIN: CẬP NHẬT CA LÀM
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const schedule = await WorkSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. ADMIN: XÓA CA LÀM
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await WorkSchedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa ca làm việc thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
