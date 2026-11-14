interface ShiftAttendance {
  status?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  handoverAt?: string | null;
}

export function getShiftStatusLabel(shift: ShiftAttendance): string {
  if (shift.handoverAt) return 'Đã bàn giao';
  if (shift.status === 'ABSENT') return 'Vắng mặt';
  if (shift.status === 'COMPLETED' || shift.checkOutTime) return 'Chờ bàn giao';
  if (shift.status === 'PRESENT' && shift.checkInTime) return 'Đang làm việc';
  return 'Chưa vào ca';
}
