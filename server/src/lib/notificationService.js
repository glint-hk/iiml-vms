import prisma from './prisma.js';

const CHANNELS = ['PUSH', 'SMS'];

export async function notifyUser({ userId, event, title, body, visitId }) {
  if (!userId) return;

  const notifications = CHANNELS.map((channel) =>
    prisma.notification.create({
      data: { userId, channel, event, title, body, visitId },
    })
  );

  await Promise.all(notifications);
}

export async function notifyHostArrival(visit, gateName) {
  if (!visit.hostId) return;
  await notifyUser({
    userId: visit.hostId,
    event: 'VISITOR_ARRIVAL',
    title: 'Guest Arrived',
    body: `${visit.visitor?.name || 'Your guest'} has arrived at ${gateName || 'campus gate'}`,
    visitId: visit.id,
  });
}

export async function notifyHostDeparture(visit) {
  if (!visit.hostId) return;
  await notifyUser({
    userId: visit.hostId,
    event: 'VISITOR_DEPARTURE',
    title: 'Guest Departed',
    body: `${visit.visitor?.name || 'Your guest'} has left campus`,
    visitId: visit.id,
  });
}

export async function notifySecurityHead({ title, body, visitId }) {
  const secHeads = await prisma.user.findMany({
    where: { role: 'SECURITY_HEAD', isActive: true },
  });
  await Promise.all(
    secHeads.map((u) =>
      notifyUser({ userId: u.id, event: 'P0_ALERT', title, body, visitId })
    )
  );
}

export async function notifyAdmins({ title, body, visitId }) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SECURITY_HEAD'] }, isActive: true },
  });
  await Promise.all(
    admins.map((u) =>
      notifyUser({ userId: u.id, event: 'ADMIN_ALERT', title, body, visitId })
    )
  );
}

export async function deliverQrToVisitor(_mobile, _qrToken, visitorName) {
  // Simulated async SMS/WhatsApp delivery — never blocks gate clearance
  console.log(`[NOTIFY] QR sent to ${_mobile} for ${visitorName} (simulated)`);
  return { delivered: true, channel: 'WHATSAPP', simulated: true };
}
