import { PrismaClient } from '@prisma/client';
import { DEFAULT_GATE_ZONES } from '../src/lib/zoneUtils.js';

const prisma = new PrismaClient();

async function main() {
  const gates = [
    { name: 'Main Entrance', location: 'North Gate — Academic Block' },
    { name: 'Hostel Gate', location: 'East Gate — Student Hostels' },
    { name: 'Faculty Gate', location: 'West Gate — Faculty Residences' },
    { name: 'Exec-Ed Gate', location: 'South Gate — Executive Education' },
  ];

  for (const gate of gates) {
    const zones = (DEFAULT_GATE_ZONES[gate.name] || ['MAIN_CAMPUS']).join(',');
    const existing = await prisma.gate.findFirst({ where: { name: gate.name } });
    if (existing) {
      await prisma.gate.update({ where: { id: existing.id }, data: { allowedZones: zones } });
    } else {
      await prisma.gate.create({ data: { ...gate, allowedZones: zones } });
    }
  }

  const mainGate = await prisma.gate.findFirst({ where: { name: 'Main Entrance' } });

  const users = [
    { email: 'guard@iiml.ac.in', name: 'Suresh Kumar', role: 'GUARD', gateId: mainGate?.id },
    { email: 'host@iiml.ac.in', name: 'Priya Sharma', role: 'HOST' },
    { email: 'admin@iiml.ac.in', name: 'Ms. Sharma', role: 'ADMIN' },
    { email: 'security@iiml.ac.in', name: 'Dr. Kapoor', role: 'SECURITY_HEAD' },
    { email: 'leadership@iiml.ac.in', name: 'Director Office', role: 'LEADERSHIP' },
    { email: 'it@iiml.ac.in', name: 'IT Admin', role: 'IT_ADMIN' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, gateId: user.gateId ?? null },
      create: user,
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin@iiml.ac.in' } });
  const host = await prisma.user.findUnique({ where: { email: 'host@iiml.ac.in' } });

  if (admin) {
    const bl = await prisma.blacklist.findFirst({ where: { mobile: '9999900000' } });
    if (!bl) {
      await prisma.blacklist.create({
        data: {
          name: 'Blocked Individual',
          mobile: '9999900000',
          reason: 'Previous security incident — unauthorized access attempt',
          createdById: admin.id,
        },
      });
    }

    let worker = await prisma.visitor.findFirst({ where: { mobile: '9123456780' } });
    if (!worker) {
      worker = await prisma.visitor.create({
        data: { name: 'Meena Devi', mobile: '9123456780' },
      });
    }

    const passExists = await prisma.recurringPass.findFirst({ where: { visitorId: worker.id } });
    if (!passExists) {
      const validFrom = new Date();
      validFrom.setMonth(validFrom.getMonth() - 1);
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 6);

      await prisma.recurringPass.create({
        data: {
          passToken: 'demo-recurring-pass-meena',
          visitorId: worker.id,
          zone: 'MAIN_CAMPUS',
          validFrom,
          validUntil,
          shiftStart: '06:00',
          shiftEnd: '18:00',
          purpose: 'Daily sanitation — contracted agency',
          biometricEnrolled: true,
          createdById: admin.id,
        },
      });
    }
  }

  if (host) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    let visitor = await prisma.visitor.findFirst({ where: { mobile: '9876543210' } });
    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: { name: 'Ravi Mehta', mobile: '9876543210' },
      });
    }

    const existing = await prisma.visit.findFirst({
      where: { visitorId: visitor.id, hostId: host.id, status: 'APPROVED' },
    });

    if (!existing) {
      const windowStart = new Date(tomorrow);
      windowStart.setMinutes(windowStart.getMinutes() - 30);
      const windowEnd = new Date(tomorrow);
      windowEnd.setMinutes(windowEnd.getMinutes() + 30);

      await prisma.visit.create({
        data: {
          visitorId: visitor.id,
          hostId: host.id,
          purpose: 'Placement interview — HR round',
          category: 'RECRUITER',
          zone: 'PLACEMENT_BLOCK',
          visitType: 'PRE_APPROVED',
          status: 'APPROVED',
          scheduledAt: tomorrow,
          windowStart,
          windowEnd,
          qrToken: 'demo-qr-token-recruiter-' + Date.now(),
        },
      });
    }
  }

  console.log('Seed complete: gates, zones, users, recurring pass, sample invite, blacklist');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
