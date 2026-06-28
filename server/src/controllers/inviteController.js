import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';
import { generateQrToken, getVisitWindow, getMultiDayWindow } from '../lib/visitUtils.js';
import { logAudit } from '../lib/audit.js';
import { deliverQrToVisitor } from '../lib/notificationService.js';
import { parseBulkCsv, buildVisitData } from '../lib/bulkInviteUtils.js';

async function upsertVisitor(name, mobile) {
  let visitor = await prisma.visitor.findFirst({ where: { mobile } });
  if (!visitor) {
    visitor = await prisma.visitor.create({ data: { name, mobile } });
  } else if (visitor.name !== name) {
    visitor = await prisma.visitor.update({ where: { id: visitor.id }, data: { name } });
  }
  return visitor;
}

export async function createInvite(req, res) {
  const { visitorName, mobile, purpose, scheduledAt, category, zone, isMultiDay, multiDayDays } = req.body;

  if (!visitorName || !mobile || !purpose || !scheduledAt) {
    return res.status(400).json({ error: 'visitorName, mobile, purpose, and scheduledAt are required' });
  }

  const scheduled = new Date(scheduledAt);
  const qrToken = generateQrToken();
  let windowStart, windowEnd, validUntil = null;

  if (isMultiDay) {
    const md = getMultiDayWindow(scheduled, multiDayDays || 3);
    windowStart = md.windowStart;
    windowEnd = md.windowEnd;
    validUntil = md.validUntil;
  } else {
    const w = getVisitWindow(scheduled);
    windowStart = w.windowStart;
    windowEnd = w.windowEnd;
  }

  const visitor = await upsertVisitor(visitorName, mobile);

  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostId: req.user.id,
      purpose,
      category: category || 'OTHER',
      zone: zone || 'MAIN_CAMPUS',
      visitType: 'PRE_APPROVED',
      status: 'APPROVED',
      scheduledAt: scheduled,
      windowStart,
      windowEnd,
      qrToken,
      isMultiDay: !!isMultiDay,
      validUntil,
    },
    include: { visitor: true, host: true },
  });

  const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 280, margin: 2 });
  const delivery = await deliverQrToVisitor(mobile, qrToken, visitorName);

  await logAudit('CREATE_INVITE', 'Visit', visit.id, req.user.id, { mobile, purpose, isMultiDay });

  res.status(201).json({
    visit,
    qrToken,
    qrDataUrl,
    delivery,
    deliveryNote: `QR sent to ${mobile} via ${delivery.channel} (simulated)`,
  });
}

export async function bulkInvite(req, res) {
  const { csv, rows: jsonRows } = req.body;

  let rows = jsonRows;
  let parseErrors = [];

  if (csv) {
    const parsed = parseBulkCsv(csv);
    rows = parsed.rows;
    parseErrors = parsed.errors;
  }

  if (!rows?.length) {
    return res.status(400).json({ error: 'No valid rows', parseErrors });
  }

  const created = [];
  const failed = [...parseErrors];

  for (const row of rows) {
    try {
      const visitor = await upsertVisitor(row.visitorName, row.mobile);
      const visitData = buildVisitData(row, req.user.id);
      const visit = await prisma.visit.create({
        data: { ...visitData, visitorId: visitor.id },
        include: { visitor: true },
      });
      await deliverQrToVisitor(row.mobile, visit.qrToken, row.visitorName);
      created.push(visit);
    } catch (err) {
      failed.push(`${row.visitorName}: ${err.message}`);
    }
  }

  await logAudit('BULK_INVITE', 'Visit', null, req.user.id, { count: created.length });

  res.status(201).json({
    created: created.length,
    failed: failed.length,
    failures: failed,
    visits: created,
  });
}

export async function getMyInvites(req, res) {
  const visits = await prisma.visit.findMany({
    where: { hostId: req.user.id },
    include: { visitor: true, gate: true },
    orderBy: { scheduledAt: 'desc' },
    take: 50,
  });
  res.json(visits);
}

export async function cancelInvite(req, res) {
  const { id } = req.params;
  const visit = await prisma.visit.findFirst({
    where: { id, hostId: req.user.id },
  });

  if (!visit) return res.status(404).json({ error: 'Invite not found' });
  if (visit.status === 'CHECKED_IN') {
    return res.status(400).json({ error: 'Cannot cancel — visitor already on campus' });
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: { visitor: true },
  });

  await logAudit('CANCEL_INVITE', 'Visit', id, req.user.id);
  res.json(updated);
}

export async function getQrForVisit(req, res) {
  const { id } = req.params;
  const visit = await prisma.visit.findFirst({
    where: { id, hostId: req.user.id },
    include: { visitor: true },
  });

  if (!visit) return res.status(404).json({ error: 'Visit not found' });
  const qrDataUrl = await QRCode.toDataURL(visit.qrToken, { width: 280, margin: 2 });
  res.json({ qrToken: visit.qrToken, qrDataUrl, visit });
}
