import prisma from '../lib/prisma.js';

export async function logAudit(action, entity, entityId, userId, details) {
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      userId,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

export async function checkBlacklist({ mobile, name, idPartial }) {
  const now = new Date();
  const entries = await prisma.blacklist.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  return entries.find((entry) => {
    if (mobile && entry.mobile && entry.mobile === mobile) return true;
    if (name && entry.name.toLowerCase() === name.toLowerCase()) return true;
    if (idPartial && entry.idPartial && entry.idPartial === idPartial) return true;
    return false;
  });
}

export async function createIncident({ severity, title, description, gateId, guardId, visitId }) {
  return prisma.incident.create({
    data: { severity, title, description, gateId, guardId, visitId },
  });
}

export async function getOccupancyStats() {
  const onCampus = await prisma.visit.findMany({
    where: { status: 'CHECKED_IN' },
    include: { visitor: true, host: true },
  });

  const byCategory = {};
  for (const visit of onCampus) {
    byCategory[visit.category] = (byCategory[visit.category] || 0) + 1;
  }

  return {
    total: onCampus.length,
    byCategory,
    visitors: onCampus.map((v) => ({
      id: v.id,
      name: v.visitor.name,
      category: v.category,
      zone: v.zone,
      entryAt: v.entryAt,
      host: v.host?.name,
    })),
    updatedAt: new Date().toISOString(),
  };
}
