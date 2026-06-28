import { randomBytes } from 'crypto';

export function generateQrToken() {
  return randomBytes(32).toString('hex');
}

export function getVisitWindow(scheduledAt) {
  const start = new Date(scheduledAt);
  start.setMinutes(start.getMinutes() - 30);
  const end = new Date(scheduledAt);
  end.setMinutes(end.getMinutes() + 30);
  return { windowStart: start, windowEnd: end };
}

export function isWithinWindow(visit, now = new Date()) {
  if (visit.isMultiDay && visit.validUntil) {
    return now >= visit.windowStart && now <= new Date(visit.validUntil);
  }
  return now >= visit.windowStart && now <= visit.windowEnd;
}

export function getMultiDayWindow(scheduledAt, days = 3) {
  const start = new Date(scheduledAt);
  start.setHours(0, 0, 0, 0);
  const windowStart = new Date(start);
  windowStart.setMinutes(windowStart.getMinutes() - 30);
  const validUntil = new Date(start);
  validUntil.setDate(validUntil.getDate() + days);
  validUntil.setHours(23, 59, 59, 999);
  const windowEnd = new Date(validUntil);
  return { windowStart, windowEnd, validUntil };
}

export const OVERRIDE_REASONS = [
  'Biometric failure — host confirmed',
  'Hardware failure — manual clearance',
  'Early arrival — host approved',
  'Late arrival — host extended window',
  'Visitor without smartphone',
];

export const VISITOR_CATEGORIES = [
  'PARENT', 'ALUMNI', 'RECRUITER', 'GUEST_SPEAKER', 'VENDOR',
  'DELIVERY', 'MAINTENANCE', 'INTERVIEW_CANDIDATE', 'EXEC_ED',
  'PROSPECTIVE_STUDENT', 'GOVERNMENT', 'OTHER',
];

export const ZONES = [
  'MAIN_CAMPUS', 'ACADEMIC_BLOCK', 'PLACEMENT_BLOCK', 'HOSTEL',
  'FACULTY_RESIDENCE', 'EXEC_ED_GUEST_HOUSE', 'RECEIVING_AREA', 'AUDITORIUM',
];
