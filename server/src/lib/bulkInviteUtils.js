import { generateQrToken, getVisitWindow } from './visitUtils.js';

export function parseBulkCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['Empty CSV'] };

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('name') && header.includes('mobile');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = [];
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 3) {
      errors.push(`Row ${i + 1}: need at least name, mobile, purpose`);
      continue;
    }

    const [visitorName, mobile, purpose, scheduledAt, category, zone] = parts;
    if (!visitorName || !mobile || !purpose) {
      errors.push(`Row ${i + 1}: missing required fields`);
      continue;
    }

    rows.push({
      visitorName,
      mobile,
      purpose,
      scheduledAt: scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      category: category?.toUpperCase() || 'OTHER',
      zone: zone?.toUpperCase() || 'MAIN_CAMPUS',
    });
  }

  if (rows.length > 500) {
    errors.push('Maximum 500 rows per batch');
    return { rows: [], errors };
  }

  return { rows, errors };
}

export function buildVisitData(row, hostId) {
  const scheduled = new Date(row.scheduledAt);
  const { windowStart, windowEnd } = getVisitWindow(scheduled);
  return {
    purpose: row.purpose,
    category: row.category,
    zone: row.zone,
    visitType: 'PRE_APPROVED',
    status: 'APPROVED',
    scheduledAt: scheduled,
    windowStart,
    windowEnd,
    qrToken: generateQrToken(),
    hostId,
  };
}
