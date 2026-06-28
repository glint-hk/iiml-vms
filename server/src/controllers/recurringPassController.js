import prisma from '../lib/prisma.js';
import { generateQrToken } from '../lib/visitUtils.js';
import { logAudit, createIncident } from '../lib/audit.js';
import { notifySecurityHead } from '../lib/notificationService.js';

export async function listRecurringPasses(_req, res) {
  const passes = await prisma.recurringPass.findMany({
    include: {
      visitor: true,
      createdBy: { select: { name: true } },
      entries: { orderBy: { entryAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(passes);
}

export async function createRecurringPass(req, res) {
  const {
    visitorName, mobile, purpose, zone,
    validFrom, validUntil, shiftStart, shiftEnd, biometricEnrolled,
  } = req.body;

  if (!visitorName || !mobile || !purpose || !validFrom || !validUntil) {
    return res.status(400).json({ error: 'visitorName, mobile, purpose, validFrom, validUntil required' });
  }

  let visitor = await prisma.visitor.findFirst({ where: { mobile } });
  if (!visitor) {
    visitor = await prisma.visitor.create({ data: { name: visitorName, mobile } });
  }

  const pass = await prisma.recurringPass.create({
    data: {
      passToken: generateQrToken(),
      visitorId: visitor.id,
      zone: zone || 'MAIN_CAMPUS',
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      shiftStart,
      shiftEnd,
      purpose,
      biometricEnrolled: !!biometricEnrolled,
      createdById: req.user.id,
    },
    include: { visitor: true, createdBy: { select: { name: true } } },
  });

  await logAudit('CREATE_RECURRING_PASS', 'RecurringPass', pass.id, req.user.id, { mobile });
  res.status(201).json(pass);
}

export async function revokeRecurringPass(req, res) {
  const { id } = req.params;

  const activeEntry = await prisma.recurringPassEntry.findFirst({
    where: { passId: id, exitAt: null },
  });

  const pass = await prisma.recurringPass.update({
    where: { id },
    data: { isActive: false },
    include: { visitor: true },
  });

  await logAudit('REVOKE_RECURRING_PASS', 'RecurringPass', id, req.user.id);

  if (activeEntry) {
    const incident = await createIncident({
      severity: 'P1',
      title: `Revoked pass: ${pass.visitor.name} still on campus`,
      description: 'Recurring pass revoked while holder is checked in. Security verification required.',
      guardId: req.user.id,
    });
    notifySecurityHead({
      title: 'Pass Revoked — Holder On Campus',
      body: `${pass.visitor.name}'s pass was just revoked but they are still on campus. Please verify and escort out.`,
    }).catch(console.error);
    return res.json({ pass, onCampusAlert: true, incident });
  }

  res.json({ pass, onCampusAlert: false });
}

export async function lookupRecurringPass(req, res) {
  const { token } = req.params;

  const pass = await prisma.recurringPass.findUnique({
    where: { passToken: token },
    include: {
      visitor: true,
      entries: { where: { exitAt: null }, orderBy: { entryAt: 'desc' }, take: 1 },
    },
  });

  if (!pass) {
    return res.status(404).json({ error: 'Invalid pass token', code: 'NOT_FOUND' });
  }

  const now = new Date();
  let status = 'VALID';
  if (!pass.isActive) status = 'REVOKED';
  else if (now < pass.validFrom) status = 'NOT_YET_VALID';
  else if (now > pass.validUntil) status = 'EXPIRED';

  if (pass.shiftStart && pass.shiftEnd) {
    const [sh, sm] = pass.shiftStart.split(':').map(Number);
    const [eh, em] = pass.shiftEnd.split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = sh * 60 + (sm || 0);
    const endMins = eh * 60 + (em || 0);
    if (mins < startMins || mins > endMins) status = 'OUTSIDE_SHIFT';
  }

  const onCampus = pass.entries[0] || null;

  res.json({ pass, status, onCampus: !!onCampus, activeEntry: onCampus });
}

export async function checkInRecurringPass(req, res) {
  const { token } = req.body;

  const pass = await prisma.recurringPass.findUnique({
    where: { passToken: token },
    include: { visitor: true, entries: { where: { exitAt: null } } },
  });

  if (!pass) return res.status(404).json({ error: 'Invalid pass' });
  if (!pass.isActive) return res.status(403).json({ error: 'Pass revoked', code: 'REVOKED', pass });
  if (new Date() > pass.validUntil) {
    return res.status(403).json({ error: 'Pass expired — Contact Admin', code: 'EXPIRED', pass });
  }
  if (pass.entries.length > 0) {
    return res.status(400).json({ error: 'Already checked in today', pass });
  }

  const entry = await prisma.recurringPassEntry.create({
    data: { passId: pass.id, gateId: req.user.gateId, guardId: req.user.id },
  });

  await logAudit('RECURRING_CHECK_IN', 'RecurringPass', pass.id, req.user.id);
  res.json({ pass, entry, message: `${pass.visitor.name} cleared via recurring pass` });
}

export async function checkOutRecurringPass(req, res) {
  const { token } = req.body;

  const pass = await prisma.recurringPass.findUnique({
    where: { passToken: token },
    include: { visitor: true, entries: { where: { exitAt: null }, orderBy: { entryAt: 'desc' }, take: 1 } },
  });

  if (!pass) return res.status(404).json({ error: 'Invalid pass' });
  const active = pass.entries[0];
  if (!active) return res.status(400).json({ error: 'Not checked in', pass });

  await prisma.recurringPassEntry.update({
    where: { id: active.id },
    data: { exitAt: new Date() },
  });

  await logAudit('RECURRING_CHECK_OUT', 'RecurringPass', pass.id, req.user.id);
  res.json({ pass, message: `${pass.visitor.name} checked out` });
}
