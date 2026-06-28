import prisma from '../lib/prisma.js';

export async function getMyNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
}

export async function markNotificationRead(req, res) {
  const { id } = req.params;
  const notification = await prisma.notification.updateMany({
    where: { id, userId: req.user.id },
    data: { read: true },
  });
  res.json({ updated: notification.count });
}

export async function markAllRead(req, res) {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });
  res.json({ updated: result.count });
}

export async function getUnreadCount(req, res) {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, read: false },
  });
  res.json({ count });
}
