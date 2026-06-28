import prisma from '../lib/prisma.js';
import { generateQrToken, getVisitWindow, isWithinWindow, OVERRIDE_REASONS } from '../lib/visitUtils.js';
import { logAudit, checkBlacklist, createIncident } from '../lib/audit.js';
import { getGateWithZones, isZoneAllowedAtGate, zoneViolationMessage } from '../lib/zoneUtils.js';
import { notifyHostArrival, notifyHostDeparture, notifySecurityHead } from '../lib/notificationService.js';

async function validateZoneAtGate(gateId, visitorZone, guardId, visitId) {
  const gate = await getGateWithZones(gateId);
  if (!gate) return { allowed: true };

  const allowed = isZoneAllowedAtGate(visitorZone, gate.zones);
  if (!allowed) {
    await createIncident({
      severity: 'P2',
      title: 'Zone violation at gate',
      description: zoneViolationMessage(visitorZone, gate.name),
      gateId,
      guardId,
      visitId,
    });
  }
  return { allowed, gate, warning: allowed ? null : zoneViolationMessage(visitorZone, gate.name) };
}

export async function lookupQr(req, res) {
  const { token } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { qrToken: token },
    include: { visitor: true, host: true, gate: true },
  });

  if (!visit) {
    return res.status(404).json({ error: 'Invalid QR token', code: 'NOT_FOUND' });
  }

  const blacklistHit = await checkBlacklist({
    mobile: visit.visitor.mobile,
    name: visit.visitor.name,
    idPartial: visit.visitor.idLastFour,
  });

  if (blacklistHit) {
    await createIncident({
      severity: 'P0',
      title: 'Blacklist hit at gate',
      description: `Blacklisted individual attempted entry: ${visit.visitor.name}`,
      gateId: req.user.gateId,
      guardId: req.user.id,
      visitId: visit.id,
    });
    await notifySecurityHead({
      title: 'P0: Blacklist Hit',
      body: `Blacklisted individual at gate: ${visit.visitor.name}`,
      visitId: visit.id,
    });
    await logAudit('BLACKLIST_HIT', 'Visit', visit.id, req.user.id);
    return res.status(403).json({
      error: 'DO NOT ALLOW ENTRY — Contact Security Head',
      code: 'BLACKLIST',
      visit: { id: visit.id, visitor: { name: visit.visitor.name } },
    });
  }

  if (visit.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Invite cancelled', code: 'CANCELLED', visit });
  }

  if (visit.qrUsed && visit.status !== 'CHECKED_IN') {
    return res.status(400).json({ error: 'Token already used', code: 'USED', visit });
  }

  const now = new Date();
  let windowStatus = 'VALID';
  if (now < visit.windowStart) windowStatus = 'EARLY';
  if (!isWithinWindow(visit, now) && visit.status !== 'CHECKED_IN') windowStatus = 'EXPIRED';

  const zoneCheck = await validateZoneAtGate(req.user.gateId, visit.zone, req.user.id, visit.id);

  res.json({
    visit,
    windowStatus,
    withinWindow: isWithinWindow(visit, now),
    zoneAllowed: zoneCheck.allowed,
    zoneWarning: zoneCheck.warning,
  });
}

export async function checkIn(req, res) {
  const { token, forceZone } = req.body;
  const visit = await prisma.visit.findUnique({
    where: { qrToken: token },
    include: { visitor: true, host: true },
  });

  if (!visit) return res.status(404).json({ error: 'Invalid token' });

  const blacklistHit = await checkBlacklist({
    mobile: visit.visitor.mobile,
    name: visit.visitor.name,
  });
  if (blacklistHit) {
    return res.status(403).json({ error: 'DO NOT ALLOW ENTRY — Contact Security Head', code: 'BLACKLIST' });
  }

  if (visit.qrUsed && visit.status === 'CHECKED_OUT') {
    return res.status(400).json({ error: 'Token already used', code: 'USED' });
  }

  if (visit.status === 'CHECKED_IN') {
    return res.status(400).json({ error: 'Visitor already checked in', visit });
  }

  const now = new Date();
  if (!isWithinWindow(visit, now) && visit.visitType === 'PRE_APPROVED') {
    return res.status(400).json({
      error: now < visit.windowStart ? 'Early arrival — visit opens at scheduled time' : 'QR expired',
      code: now < visit.windowStart ? 'EARLY' : 'EXPIRED',
      visit,
    });
  }

  const zoneCheck = await validateZoneAtGate(req.user.gateId, visit.zone, req.user.id, visit.id);
  if (!zoneCheck.allowed && !forceZone) {
    return res.status(403).json({
      error: zoneCheck.warning,
      code: 'ZONE_MISMATCH',
      visit,
      canOverride: true,
    });
  }

  const gate = await prisma.gate.findUnique({ where: { id: req.user.gateId } });

  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: {
      status: 'CHECKED_IN',
      entryAt: now,
      gateId: req.user.gateId,
      guardId: req.user.id,
      qrUsed: true,
      qrUsedAt: now,
    },
    include: { visitor: true, host: true, gate: true },
  });

  await logAudit('CHECK_IN', 'Visit', visit.id, req.user.id, { gateId: req.user.gateId });
  notifyHostArrival(updated, gate?.name).catch(console.error);

  res.json({
    visit: updated,
    zoneWarning: zoneCheck.warning,
    notification: `Host ${updated.host?.name} notified`,
  });
}

export async function checkOut(req, res) {
  const { token } = req.body;
  const visit = await prisma.visit.findUnique({
    where: { qrToken: token },
    include: { visitor: true, host: true },
  });

  if (!visit) return res.status(404).json({ error: 'Invalid token' });
  if (visit.status !== 'CHECKED_IN') {
    return res.status(400).json({ error: 'Visitor not checked in', visit });
  }

  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: { status: 'CHECKED_OUT', exitAt: new Date(), guardId: req.user.id },
    include: { visitor: true, host: true, gate: true },
  });

  await logAudit('CHECK_OUT', 'Visit', visit.id, req.user.id);
  notifyHostDeparture(updated).catch(console.error);

  res.json({ visit: updated, notification: 'Host notified of departure' });
}

export async function walkInRegister(req, res) {
  const {
    visitorName, mobile, purpose, hostEmail, category, zone,
    idType, idLastFour, language, consentGiven, consentMethod,
  } = req.body;

  if (!visitorName || !mobile || !purpose) {
    return res.status(400).json({ error: 'visitorName, mobile, and purpose are required' });
  }

  if (!consentGiven) {
    return res.status(400).json({ error: 'Biometric consent required for walk-in registration' });
  }

  const blacklistHit = await checkBlacklist({ mobile, name: visitorName, idPartial: idLastFour });
  if (blacklistHit) {
    await createIncident({
      severity: 'P0',
      title: 'Blacklist hit — walk-in',
      gateId: req.user.gateId,
      guardId: req.user.id,
    });
    return res.status(403).json({ error: 'DO NOT ALLOW ENTRY — Contact Security Head', code: 'BLACKLIST' });
  }

  const zoneCheck = await validateZoneAtGate(req.user.gateId, zone || 'MAIN_CAMPUS', req.user.id);

  let host = null;
  if (hostEmail) {
    host = await prisma.user.findUnique({ where: { email: hostEmail } });
  }

  let visitor = await prisma.visitor.findFirst({ where: { mobile } });
  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: { name: visitorName, mobile, idType, idLastFour },
    });
  }

  const now = new Date();
  const { windowStart, windowEnd } = getVisitWindow(now);
  const qrToken = generateQrToken();

  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostId: host?.id,
      purpose,
      category: category || 'OTHER',
      zone: zone || 'MAIN_CAMPUS',
      visitType: 'WALK_IN',
      status: 'CHECKED_IN',
      scheduledAt: now,
      windowStart,
      windowEnd,
      qrToken,
      qrUsed: true,
      qrUsedAt: now,
      entryAt: now,
      gateId: req.user.gateId,
      guardId: req.user.id,
      language: language || 'en',
      consentGiven: true,
      consentMethod: consentMethod || 'thumbprint',
    },
    include: { visitor: true, host: true, gate: true },
  });

  await prisma.consentRecord.create({
    data: {
      visitId: visit.id,
      language: language || 'en',
      method: consentMethod || 'thumbprint',
      guardId: req.user.id,
    },
  });

  await logAudit('WALK_IN', 'Visit', visit.id, req.user.id, { mobile, purpose });
  if (host) notifyHostArrival(visit, visit.gate?.name).catch(console.error);

  res.status(201).json({ visit, zoneWarning: zoneCheck.warning });
}

export async function manualOverride(req, res) {
  const { visitId, reason, notes } = req.body;

  if (!visitId || !reason) {
    return res.status(400).json({ error: 'visitId and reason are required' });
  }

  if (!OVERRIDE_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid override reason', allowed: OVERRIDE_REASONS });
  }

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) return res.status(404).json({ error: 'Visit not found' });

  await prisma.overrideLog.create({
    data: { visitId, guardId: req.user.id, reason, notes },
  });

  const updated = await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: 'CHECKED_IN',
      entryAt: new Date(),
      gateId: req.user.gateId,
      guardId: req.user.id,
    },
    include: { visitor: true, host: true },
  });

  await logAudit('MANUAL_OVERRIDE', 'Visit', visitId, req.user.id, { reason, notes });
  res.json({ visit: updated });
}

export async function getGateActivity(req, res) {
  const where = req.user.gateId ? { gateId: req.user.gateId } : {};
  const visits = await prisma.visit.findMany({
    where: {
      ...where,
      OR: [{ entryAt: { not: null } }, { exitAt: { not: null } }],
    },
    include: { visitor: true, host: true, gate: true },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  });
  res.json(visits);
}

export function getOverrideReasons(_req, res) {
  res.json(OVERRIDE_REASONS);
}

export async function flagEmergency(req, res) {
  const { description, location } = req.body;

  const incident = await createIncident({
    severity: 'P0',
    title: `EMERGENCY — Guard alert at ${location || 'gate'}`,
    description: description || 'Emergency flagged by guard',
    gateId: req.user.gateId,
    guardId: req.user.id,
  });

  await notifySecurityHead({
    title: 'P0 EMERGENCY: Guard Alert',
    body: `Emergency by ${req.user.name}${location ? ` at ${location}` : ''}. ${description || ''}`,
  });

  await logAudit('EMERGENCY_FLAG', 'Incident', incident.id, req.user.id, { description, location });

  res.status(201).json({ incident, message: 'Emergency alert sent to Security Head' });
}
