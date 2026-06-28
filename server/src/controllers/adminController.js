import prisma from '../lib/prisma.js';
import { logAudit, getOccupancyStats } from '../lib/audit.js';

export async function getVisitorLog(req, res) {
  const { from, to, status, category } = req.query;
  const where = {};

  if (from || to) {
    where.scheduledAt = {};
    if (from) where.scheduledAt.gte = new Date(from);
    if (to) where.scheduledAt.lte = new Date(to);
  }
  if (status) where.status = status;
  if (category) where.category = category;

  const visits = await prisma.visit.findMany({
    where,
    include: { visitor: true, host: true, gate: true, guard: true },
    orderBy: { scheduledAt: 'desc' },
    take: 200,
  });

  res.json(visits);
}

export async function getOccupancy(req, res) {
  const stats = await getOccupancyStats();
  res.json(stats);
}

export async function getBlacklist(req, res) {
  const entries = await prisma.blacklist.findMany({
    where: { isActive: true },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(entries);
}

export async function addBlacklist(req, res) {
  const { name, mobile, idPartial, reason, endDate } = req.body;

  if (!name || !reason) {
    return res.status(400).json({ error: 'name and reason are required' });
  }

  const entry = await prisma.blacklist.create({
    data: {
      name,
      mobile,
      idPartial,
      reason,
      endDate: endDate ? new Date(endDate) : null,
      createdById: req.user.id,
    },
    include: { createdBy: { select: { name: true } } },
  });

  await logAudit('BLACKLIST_ADD', 'Blacklist', entry.id, req.user.id, { name, reason });
  res.status(201).json(entry);
}

export async function removeBlacklist(req, res) {
  const { id } = req.params;
  const entry = await prisma.blacklist.update({
    where: { id },
    data: { isActive: false },
  });
  await logAudit('BLACKLIST_REMOVE', 'Blacklist', id, req.user.id);
  res.json(entry);
}

export async function getIncidents(req, res) {
  const incidents = await prisma.incident.findMany({
    include: { guard: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(incidents);
}

export async function getDataSubjectRequests(req, res) {
  const requests = await prisma.dataSubjectRequest.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}

export async function createDataSubjectRequest(req, res) {
  const { mobile, requestType } = req.body;
  if (!mobile) return res.status(400).json({ error: 'mobile required' });

  const referenceId = `DSR-${Date.now().toString(36).toUpperCase()}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const request = await prisma.dataSubjectRequest.create({
    data: { mobile, requestType: requestType || 'DELETION', referenceId, dueDate },
  });

  await logAudit('DSR_CREATED', 'DataSubjectRequest', request.id, req.user.id, { mobile });
  res.status(201).json(request);
}

export async function completeDataSubjectRequest(req, res) {
  const { id } = req.params;
  const request = await prisma.dataSubjectRequest.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  await logAudit('DSR_COMPLETED', 'DataSubjectRequest', id, req.user.id);
  res.json(request);
}

export async function exportVisitorLog(req, res) {
  const { from, to } = req.query;
  const where = {};
  if (from || to) {
    where.scheduledAt = {};
    if (from) where.scheduledAt.gte = new Date(from);
    if (to) where.scheduledAt.lte = new Date(to);
  }

  const visits = await prisma.visit.findMany({
    where,
    include: { visitor: true, host: true, gate: true },
    orderBy: { scheduledAt: 'asc' },
  });

  const rows = visits.map((v) => ({
    date: v.scheduledAt.toISOString().split('T')[0],
    visitor: v.visitor.name,
    mobile: v.visitor.mobile.replace(/(\d{6})(\d{4})/, '******$2'),
    host: v.host?.name || '—',
    purpose: v.purpose,
    category: v.category,
    zone: v.zone,
    type: v.visitType,
    status: v.status,
    entry: v.entryAt?.toISOString() || '—',
    exit: v.exitAt?.toISOString() || '—',
    gate: v.gate?.name || '—',
  }));

  res.json({
    generatedAt: new Date().toISOString(),
    count: rows.length,
    records: rows,
  });
}

export async function getDashboardStats(req, res) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayVisits, onCampus, pendingInvites, openIncidents, openDsr] = await Promise.all([
    prisma.visit.count({ where: { entryAt: { gte: today, lt: tomorrow } } }),
    prisma.visit.count({ where: { status: 'CHECKED_IN' } }),
    prisma.visit.count({ where: { status: 'APPROVED', scheduledAt: { gte: today } } }),
    prisma.incident.count({ where: { resolved: false, severity: { in: ['P0', 'P1'] } } }),
    prisma.dataSubjectRequest.count({ where: { status: 'OPEN' } }),
  ]);

  const occupancy = await getOccupancyStats();

  res.json({
    todayVisits,
    onCampus,
    pendingInvites,
    openIncidents,
    openDsr,
    occupancy,
  });
}

export async function getAuditLog(req, res) {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, role: true } } },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });
  res.json(logs);
}

export async function getUsers(req, res) {
  const users = await prisma.user.findMany({
    include: { gate: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role, isActive } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(typeof isActive === 'boolean' && { isActive }),
    },
  });

  await logAudit('USER_UPDATE', 'User', id, req.user.id, { role, isActive });
  res.json(user);
}

export async function getGates(_req, res) {
  const gates = await prisma.gate.findMany({ where: { isActive: true } });
  res.json(gates);
}

export async function getOverstayVisitors(req, res) {
  const thresholdHours = parseInt(req.query.hours) || 8;
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  const visits = await prisma.visit.findMany({
    where: { status: 'CHECKED_IN', entryAt: { lte: cutoff } },
    include: { visitor: true, host: true, gate: true },
    orderBy: { entryAt: 'asc' },
  });

  res.json(
    visits.map((v) => ({
      ...v,
      hoursOnCampus: ((Date.now() - new Date(v.entryAt)) / 3_600_000).toFixed(1),
    }))
  );
}

export async function resolveIncident(req, res) {
  const { id } = req.params;
  const incident = await prisma.incident.update({
    where: { id },
    data: { resolved: true },
  });
  await logAudit('INCIDENT_RESOLVED', 'Incident', id, req.user.id);
  res.json(incident);
}
