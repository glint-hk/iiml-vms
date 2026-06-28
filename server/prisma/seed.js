import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const DEFAULT_GATE_ZONES = {
  'Main Entrance': ['MAIN_CAMPUS', 'ACADEMIC_BLOCK', 'PLACEMENT_BLOCK', 'AUDITORIUM', 'RECEIVING_AREA'],
  'Hostel Gate': ['HOSTEL', 'MAIN_CAMPUS'],
  'Faculty Gate': ['FACULTY_RESIDENCE', 'MAIN_CAMPUS'],
  'Exec-Ed Gate': ['EXEC_ED_GUEST_HOUSE', 'ACADEMIC_BLOCK', 'MAIN_CAMPUS'],
};

const prisma = new PrismaClient();

function uid() {
  return 'vms-' + crypto.randomBytes(10).toString('hex');
}

function ago(days, hour = 10, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d;
}

function fromNow(days, hour = 14, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d;
}

function window30(scheduled) {
  const s = new Date(scheduled); s.setMinutes(s.getMinutes() - 30);
  const e = new Date(scheduled); e.setMinutes(e.getMinutes() + 30);
  return { windowStart: s, windowEnd: e };
}

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('  ✓ Database already seeded — skipping.');
    return;
  }

  // ── 1. GATES ──────────────────────────────────────────────────────────────
  const gateRows = [
    { name: 'Main Entrance', location: 'North Gate — Academic Block' },
    { name: 'Hostel Gate',   location: 'East Gate — Student Hostels' },
    { name: 'Faculty Gate',  location: 'West Gate — Faculty Residences' },
    { name: 'Exec-Ed Gate',  location: 'South Gate — Executive Education' },
  ];
  for (const g of gateRows) {
    const zones = (DEFAULT_GATE_ZONES[g.name] || ['MAIN_CAMPUS']).join(',');
    const ex = await prisma.gate.findFirst({ where: { name: g.name } });
    if (ex) await prisma.gate.update({ where: { id: ex.id }, data: { allowedZones: zones } });
    else     await prisma.gate.create({ data: { ...g, allowedZones: zones } });
  }

  const mainGate = await prisma.gate.findFirst({ where: { name: 'Main Entrance' } });

  // ── 2. USERS ──────────────────────────────────────────────────────────────
  const userRows = [
    { email: 'guard@iiml.ac.in',       name: 'Suresh Kumar',    role: 'GUARD',        gateId: mainGate?.id },
    { email: 'host@iiml.ac.in',        name: 'Priya Sharma',    role: 'HOST' },
    { email: 'admin@iiml.ac.in',       name: 'Ms. Sharma',      role: 'ADMIN' },
    { email: 'security@iiml.ac.in',    name: 'Dr. Kapoor',      role: 'SECURITY_HEAD' },
    { email: 'leadership@iiml.ac.in',  name: 'Director Office', role: 'LEADERSHIP' },
    { email: 'it@iiml.ac.in',          name: 'IT Admin',        role: 'IT_ADMIN' },
    { email: 'prof.mehta@iiml.ac.in',  name: 'Prof. R. Mehta',  role: 'HOST' },
    { email: 'prof.iyer@iiml.ac.in',   name: 'Prof. S. Iyer',   role: 'HOST' },
  ];
  for (const u of userRows) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, gateId: u.gateId ?? null },
      create: u,
    });
  }

  const admin   = await prisma.user.findUnique({ where: { email: 'admin@iiml.ac.in' } });
  const guard   = await prisma.user.findUnique({ where: { email: 'guard@iiml.ac.in' } });
  const host    = await prisma.user.findUnique({ where: { email: 'host@iiml.ac.in' } });
  const secHead = await prisma.user.findUnique({ where: { email: 'security@iiml.ac.in' } });
  const prof1   = await prisma.user.findUnique({ where: { email: 'prof.mehta@iiml.ac.in' } });
  const prof2   = await prisma.user.findUnique({ where: { email: 'prof.iyer@iiml.ac.in' } });

  // ── 3. BLACKLIST ──────────────────────────────────────────────────────────
  const blacklistEntries = [
    { name: 'Blocked Individual', mobile: '9999900000', reason: 'Unauthorized access attempt — security incident Jan 2026' },
    { name: 'Ranjit Sinha',       mobile: '9988776655', reason: 'Trespassing — caught in restricted zone, Dec 2025' },
    { name: 'Unknown Male',       mobile: null,         idPartial: '7741', reason: 'Attempted theft at Hostel Gate, Nov 2025' },
  ];
  for (const bl of blacklistEntries) {
    const ex = await prisma.blacklist.findFirst({ where: { name: bl.name } });
    if (!ex) await prisma.blacklist.create({ data: { ...bl, createdById: admin.id } });
  }

  // ── 4. VISITORS ───────────────────────────────────────────────────────────
  async function upsertVisitor(mobile, name, idType, idLastFour) {
    let v = await prisma.visitor.findFirst({ where: { mobile } });
    if (!v) v = await prisma.visitor.create({ data: { name, mobile, idType, idLastFour } });
    return v;
  }

  const V = {
    meena:   await upsertVisitor('9123456780', 'Meena Devi',         'Aadhaar', '4421'),
    ravi:    await upsertVisitor('9876543210', 'Ravi Mehta',         'Aadhaar', '9032'),
    priya:   await upsertVisitor('9810001001', 'Priya Patel',        'Aadhaar', '5510'),
    amit:    await upsertVisitor('9811001002', 'Amit Sharma',        'PAN',     '2837'),
    sunita:  await upsertVisitor('9812001003', 'Dr. Sunita Rao',     'Aadhaar', '3394'),
    rajesh:  await upsertVisitor('9813001004', 'Rajesh Kumar',       'Aadhaar', '8821'),
    deepak:  await upsertVisitor('9814001005', 'Deepak Verma',       'Aadhaar', '6612'),
    kavya:   await upsertVisitor('9815001006', 'Kavya Menon',        'Passport','7743'),
    farouk:  await upsertVisitor('9816001007', 'Mohammed Farouk',    'Aadhaar', '1193'),
    ananya:  await upsertVisitor('9817001008', 'Ananya Singh',       'Aadhaar', '5572'),
    vikram:  await upsertVisitor('9818001009', 'Vikram Bose',        'DL',      '4401'),
    shweta:  await upsertVisitor('9819001010', 'Shweta Gupta',       'Aadhaar', '2298'),
    arjun:   await upsertVisitor('9820001011', 'Arjun Nair',         'Passport','8834'),
    neha:    await upsertVisitor('9821001012', 'Neha Tiwari',        'Aadhaar', '6651'),
    suresh:  await upsertVisitor('9823001014', 'Suresh Yadav',       'Aadhaar', '3312'),
    pooja:   await upsertVisitor('9824001015', 'Pooja Mishra',       'Aadhaar', '7784'),
    karim:   await upsertVisitor('9825001016', 'Karim Sheikh',       'Aadhaar', '9923'),
    lakshmi: await upsertVisitor('9826001017', 'Lakshmi Iyer',       'PAN',     '4456'),
    harsh:   await upsertVisitor('9827001018', 'Harsh Malhotra',     'Passport','2201'),
    neeraj:  await upsertVisitor('9828001019', 'Neeraj Gupta',       'Aadhaar', '8890'),
    ritika:  await upsertVisitor('9829001020', 'Ritika Bansal',      'Aadhaar', '3347'),
    vinod:   await upsertVisitor('9830001021', 'Vinod Chandra',      'Aadhaar', '5563'),
  };

  // ── 5. RECURRING PASSES ───────────────────────────────────────────────────
  const passDefs = [
    { token: 'demo-recurring-pass-meena',   visitorId: V.meena.id,  zone: 'MAIN_CAMPUS',    validFrom: ago(30), validUntil: fromNow(180), shiftStart: '06:00', shiftEnd: '18:00', purpose: 'Daily sanitation — contracted agency',    biometricEnrolled: true },
    { token: 'demo-recurring-pass-rajesh',  visitorId: V.rajesh.id, zone: 'RECEIVING_AREA', validFrom: ago(60), validUntil: fromNow(120), shiftStart: '08:00', shiftEnd: '20:00', purpose: 'Campus grocery store — daily resupply',    biometricEnrolled: true },
    { token: 'demo-recurring-pass-karim',   visitorId: V.karim.id,  zone: 'MAIN_CAMPUS',    validFrom: ago(14), validUntil: fromNow(7),   shiftStart: '09:00', shiftEnd: '17:00', purpose: 'Plumbing maintenance — AMC contract',     biometricEnrolled: false },
    { token: 'demo-recurring-pass-shweta',  visitorId: V.shweta.id, zone: 'HOSTEL',         validFrom: ago(90), validUntil: fromNow(3),   shiftStart: '07:00', shiftEnd: '15:00', purpose: 'Hostel housekeeping — contracted staff',  biometricEnrolled: true },
    { token: 'demo-recurring-pass-suresh',  visitorId: V.suresh.id, zone: 'MAIN_CAMPUS',    validFrom: ago(45), validUntil: fromNow(90),  shiftStart: '12:00', shiftEnd: '22:00', purpose: 'Catering contractor — evening mess',       biometricEnrolled: true },
  ];
  for (const p of passDefs) {
    const ex = await prisma.recurringPass.findUnique({ where: { passToken: p.token } });
    if (!ex) {
      await prisma.recurringPass.create({
        data: { passToken: p.token, visitorId: p.visitorId, zone: p.zone, validFrom: p.validFrom, validUntil: p.validUntil, shiftStart: p.shiftStart, shiftEnd: p.shiftEnd, purpose: p.purpose, biometricEnrolled: p.biometricEnrolled, createdById: admin.id },
      });
    }
  }

  // ── 6. VISITS ─────────────────────────────────────────────────────────────
  async function createVisit(data) {
    const ex = await prisma.visit.findFirst({ where: { qrToken: data.qrToken } });
    if (ex) return ex;
    return prisma.visit.create({ data });
  }

  const baseVisit = (v, sched, extra = {}) => ({
    visitorId:    v.id,
    guardId:      guard?.id ?? null,
    gateId:       mainGate?.id ?? null,
    scheduledAt:  sched,
    ...window30(sched),
    qrToken:      uid(),
    language:     'en',
    ...extra,
  });

  // — Today: on campus ——
  await createVisit({ ...baseVisit(V.kavya,  ago(0, 9,  0), { hostId: host?.id,  purpose: 'Placement drive — Google campus recruitment',    category: 'RECRUITER',           zone: 'PLACEMENT_BLOCK',    visitType: 'PRE_APPROVED', status: 'CHECKED_IN', qrUsed: true, qrUsedAt: ago(0, 9, 15), entryAt: ago(0, 9, 15) }) });
  await createVisit({ ...baseVisit(V.sunita, ago(0,10,  0), { hostId: prof1?.id, purpose: 'Guest lecture — Behavioural Economics',            category: 'GUEST_SPEAKER',       zone: 'ACADEMIC_BLOCK',     visitType: 'PRE_APPROVED', status: 'CHECKED_IN', qrUsed: true, qrUsedAt: ago(0,10,  5), entryAt: ago(0,10,  5) }) });
  await createVisit({ ...baseVisit(V.ananya, ago(0, 8,  0), { hostId: prof2?.id, purpose: 'Exec-Ed Programme — Week 2 Day 3',                 category: 'EXEC_ED',             zone: 'EXEC_ED_GUEST_HOUSE',visitType: 'PRE_APPROVED', status: 'CHECKED_IN', qrUsed: true, qrUsedAt: ago(0, 8, 12), entryAt: ago(0, 8, 12) }) });
  await createVisit({ ...baseVisit(V.farouk, ago(0,11,  0), { hostId: host?.id,  purpose: 'Parent visit — son Rahul Farouk (MBA 2025)',       category: 'PARENT',              zone: 'HOSTEL',             visitType: 'WALK_IN',      status: 'CHECKED_IN', qrUsed: true, qrUsedAt: ago(0,11, 20), entryAt: ago(0,11, 20), consentGiven: true, consentMethod: 'thumbprint' }) });
  await createVisit({ ...baseVisit(V.vikram, ago(0,13,  0), { hostId: null,       purpose: 'Amazon delivery — Lab equipment',                  category: 'DELIVERY',            zone: 'RECEIVING_AREA',     visitType: 'WALK_IN',      status: 'CHECKED_IN', qrUsed: true, qrUsedAt: ago(0,13,  5), entryAt: ago(0,13,  5), consentGiven: true, consentMethod: 'thumbprint' }) });

  // — Today: departed ——
  await createVisit({ ...baseVisit(V.deepak, ago(0, 8, 30), { hostId: prof1?.id, purpose: 'Interview — Operations Management faculty position',category: 'INTERVIEW_CANDIDATE',zone: 'ACADEMIC_BLOCK',     visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(0, 8, 45), entryAt: ago(0, 8, 45), exitAt: ago(0,12, 0) }) });
  await createVisit({ ...baseVisit(V.harsh,  ago(0, 9,  0), { hostId: host?.id,  purpose: 'Placement discussion — Deloitte PPO offers',        category: 'RECRUITER',           zone: 'PLACEMENT_BLOCK',    visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(0, 9, 10), entryAt: ago(0, 9, 10), exitAt: ago(0,11,30) }) });
  await createVisit({ ...baseVisit(V.neeraj, ago(0, 7,  0), { hostId: null,       purpose: 'Alumni mentoring — Finance Club',                   category: 'ALUMNI',              zone: 'ACADEMIC_BLOCK',     visitType: 'WALK_IN',      status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(0, 7,  5), entryAt: ago(0, 7,  5), exitAt: ago(0, 9, 0), consentGiven: true, consentMethod: 'thumbprint' }) });

  // — Yesterday ——
  await createVisit({ ...baseVisit(V.priya,  ago(1,14,0), { hostId: host?.id,  purpose: 'Parent-student meeting — academic counselling',  category: 'PARENT',              zone: 'ACADEMIC_BLOCK',     visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(1,14,10), entryAt: ago(1,14,10), exitAt: ago(1,17, 0) }) });
  await createVisit({ ...baseVisit(V.amit,   ago(1,11,0), { hostId: prof1?.id, purpose: 'Alumni talk — Startup Ecosystem in India',       category: 'ALUMNI',              zone: 'AUDITORIUM',         visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(1,11, 5), entryAt: ago(1,11, 5), exitAt: ago(1,13, 0) }) });
  await createVisit({ ...baseVisit(V.arjun,  ago(1,10,0), { hostId: admin?.id, purpose: 'NAAC accreditation committee visit',            category: 'GOVERNMENT',          zone: 'MAIN_CAMPUS',        visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(1,10, 3), entryAt: ago(1,10, 3), exitAt: ago(1,16, 0) }) });
  await createVisit({ ...baseVisit(V.pooja,  ago(1, 9,30), { hostId: prof2?.id, purpose: 'PhD interview — Marketing department',         category: 'INTERVIEW_CANDIDATE', zone: 'ACADEMIC_BLOCK',     visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(1, 9,40), entryAt: ago(1, 9,40), exitAt: ago(1,12,30) }) });
  await createVisit({ ...baseVisit(V.ravi,   ago(1,14,0), { hostId: host?.id,  purpose: 'Placement interview — HR round (Deloitte)',     category: 'RECRUITER',           zone: 'PLACEMENT_BLOCK',    visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(1,14,15), entryAt: ago(1,14,15), exitAt: ago(1,16,30) }) });
  await createVisit({ ...baseVisit(V.lakshmi,ago(1, 8, 0), { hostId: prof1?.id, purpose: 'Exec-Ed Programme — Week 2 Day 2',            category: 'EXEC_ED',             zone: 'EXEC_ED_GUEST_HOUSE', visitType: 'PRE_APPROVED', status: 'CHECKED_OUT', qrUsed: true, qrUsedAt: ago(1, 8,10), entryAt: ago(1, 8,10), exitAt: ago(1,18, 0) }) });

  // — Past week ——
  const pw = [
    { v: V.neha,    h: host?.id,  pur: 'Alumni networking — Finance Club annual meet', cat: 'ALUMNI',               zone: 'AUDITORIUM',          d: 2, eh: 17, xh: 20 },
    { v: V.ritika,  h: prof2?.id, pur: 'Interview — Consulting firm associate role',   cat: 'INTERVIEW_CANDIDATE',  zone: 'PLACEMENT_BLOCK',     d: 2, eh: 10, xh: 13 },
    { v: V.vinod,   h: null,      pur: 'Generator maintenance — AMC visit',            cat: 'MAINTENANCE',          zone: 'MAIN_CAMPUS',         d: 3, eh:  9, xh: 15, wi: true },
    { v: V.kavya,   h: host?.id,  pur: 'Pre-placement talk — Google APAC',             cat: 'RECRUITER',            zone: 'AUDITORIUM',          d: 3, eh: 14, xh: 17 },
    { v: V.sunita,  h: prof1?.id, pur: 'Research collaboration meeting',               cat: 'GUEST_SPEAKER',        zone: 'ACADEMIC_BLOCK',      d: 4, eh: 11, xh: 14 },
    { v: V.priya,   h: host?.id,  pur: 'Parent visit — hostel room inspection',        cat: 'PARENT',               zone: 'HOSTEL',              d: 4, eh: 15, xh: 17 },
    { v: V.farouk,  h: host?.id,  pur: 'Parent visit — fee payment discussion',        cat: 'PARENT',               zone: 'MAIN_CAMPUS',         d: 5, eh: 13, xh: 15 },
    { v: V.harsh,   h: host?.id,  pur: 'Placement pre-talk — Deloitte final year',     cat: 'RECRUITER',            zone: 'PLACEMENT_BLOCK',     d: 5, eh: 10, xh: 12 },
    { v: V.arjun,   h: admin?.id, pur: 'UGC inspection committee',                     cat: 'GOVERNMENT',           zone: 'MAIN_CAMPUS',         d: 6, eh:  9, xh: 18 },
    { v: V.deepak,  h: prof2?.id, pur: 'Interview — Finance faculty candidate',        cat: 'INTERVIEW_CANDIDATE',  zone: 'ACADEMIC_BLOCK',      d: 6, eh: 10, xh: 13 },
    { v: V.neeraj,  h: prof1?.id, pur: 'Alumni guest session — Investment banking',    cat: 'ALUMNI',               zone: 'ACADEMIC_BLOCK',      d: 7, eh: 15, xh: 17 },
    { v: V.ritika,  h: host?.id,  pur: 'McKinsey campus recruitment — Day 1',         cat: 'RECRUITER',            zone: 'PLACEMENT_BLOCK',     d: 7, eh:  9, xh: 19 },
  ];
  for (const r of pw) {
    const sched = ago(r.d, r.eh - 1);
    await createVisit({ ...baseVisit(r.v, sched, {
      hostId: r.h, purpose: r.pur, category: r.cat, zone: r.zone,
      visitType: r.wi ? 'WALK_IN' : 'PRE_APPROVED', status: 'CHECKED_OUT',
      qrUsed: true, qrUsedAt: ago(r.d, r.eh, 8), entryAt: ago(r.d, r.eh, 8), exitAt: ago(r.d, r.xh, 0),
      consentGiven: !!r.wi, consentMethod: r.wi ? 'thumbprint' : null,
    }) });
  }

  // — Upcoming (APPROVED) ——
  const up = [
    { v: V.ravi,    h: host?.id,  pur: 'Final round interview — Bain & Company',         cat: 'RECRUITER',           zone: 'PLACEMENT_BLOCK',     fn: 1, hr: 14 },
    { v: V.ananya,  h: prof2?.id, pur: 'Exec-Ed Programme — Week 3 Day 1',               cat: 'EXEC_ED',             zone: 'EXEC_ED_GUEST_HOUSE', fn: 1, hr:  8 },
    { v: V.lakshmi, h: prof2?.id, pur: 'Exec-Ed Programme — Week 3 Day 2',               cat: 'EXEC_ED',             zone: 'EXEC_ED_GUEST_HOUSE', fn: 2, hr:  8 },
    { v: V.amit,    h: prof1?.id, pur: 'Alumni lecture — Venture Capital 101',            cat: 'ALUMNI',              zone: 'AUDITORIUM',          fn: 2, hr: 16 },
    { v: V.harsh,   h: host?.id,  pur: 'Deloitte final placement drive',                  cat: 'RECRUITER',           zone: 'PLACEMENT_BLOCK',     fn: 3, hr: 10 },
    { v: V.pooja,   h: prof1?.id, pur: 'PhD research interview — Strategy',               cat: 'INTERVIEW_CANDIDATE', zone: 'ACADEMIC_BLOCK',      fn: 3, hr: 11 },
    { v: V.priya,   h: host?.id,  pur: 'Semester-end parent visit',                       cat: 'PARENT',              zone: 'HOSTEL',              fn: 5, hr: 12 },
    { v: V.neeraj,  h: prof1?.id, pur: 'Guest lecture — Emerging markets',                cat: 'GUEST_SPEAKER',       zone: 'AUDITORIUM',          fn: 7, hr: 14 },
  ];
  for (const r of up) {
    const sched = fromNow(r.fn, r.hr);
    await createVisit({ ...baseVisit(r.v, sched, {
      hostId: r.h, purpose: r.pur, category: r.cat, zone: r.zone,
      visitType: 'PRE_APPROVED', status: 'APPROVED',
      guardId: null, gateId: null,
    }) });
  }

  // — Cancelled / Expired ——
  await createVisit({ ...baseVisit(V.vinod,  ago(3,14), { hostId: host?.id,  purpose: 'Vendor demo — ERP software',              category: 'VENDOR',              zone: 'ACADEMIC_BLOCK',  visitType: 'PRE_APPROVED', status: 'CANCELLED', guardId: null, gateId: null }) });
  await createVisit({ ...baseVisit(V.ritika, ago(5,10), { hostId: prof2?.id, purpose: 'Faculty interview — candidate no-show',   category: 'INTERVIEW_CANDIDATE', zone: 'ACADEMIC_BLOCK',  visitType: 'PRE_APPROVED', status: 'EXPIRED',   guardId: null, gateId: null }) });

  // ── 7. INCIDENTS ──────────────────────────────────────────────────────────
  const incidentDefs = [
    { severity: 'P0', resolved: false, title: 'Blacklist hit at Main Entrance',           description: 'Ranjit Sinha (9988776655) attempted entry. Escorted out. Security Head notified.',          createdAt: ago(1, 8, 45) },
    { severity: 'P0', resolved: false, title: 'EMERGENCY — Guard alert at gate',           description: 'Suspicious unidentified individual near Main Gate. Flagged by guard Suresh Kumar.',         createdAt: ago(0, 7, 30) },
    { severity: 'P1', resolved: false, title: 'Pass revoked — Karim Sheikh still on campus',description: 'Recurring pass revoked by admin while holder was checked in. Security verification required.',createdAt: ago(2, 14, 0) },
    { severity: 'P1', resolved: true,  title: 'Tailgating detected at Hostel Gate',         description: 'Two individuals entered on single QR scan. Second identified as student. Resolved.',       createdAt: ago(4, 18, 20) },
    { severity: 'P2', resolved: true,  title: 'Zone mismatch — HOSTEL visitor at Main Entrance', description: 'Priya Patel authorized for HOSTEL tried Main Entrance (ACADEMIC zone). Override by Security Head.', createdAt: ago(4, 15, 10) },
    { severity: 'P2', resolved: false, title: 'Zone violation — AUDITORIUM visitor at Hostel Gate', description: 'Neha Tiwari (ALUMNI) tried Hostel Gate after auditorium event. Denied and redirected.',  createdAt: ago(2, 20, 5) },
    { severity: 'P3', resolved: true,  title: 'QR token presented twice — screenshot suspected', description: 'Ravi Mehta QR scanned second time after check-in. Second attempt blocked automatically.', createdAt: ago(6, 9, 15) },
    { severity: 'P3', resolved: true,  title: 'Early arrival — 90 min before window',      description: 'Ananya Singh arrived 90 min early for exec-ed session. Guard briefed. Visitor waited in reception.', createdAt: ago(3, 6, 30) },
  ];
  for (const inc of incidentDefs) {
    const ex = await prisma.incident.findFirst({ where: { title: inc.title } });
    if (!ex) {
      await prisma.incident.create({
        data: { severity: inc.severity, title: inc.title, description: inc.description, resolved: inc.resolved, guardId: guard?.id, gateId: mainGate?.id, createdAt: inc.createdAt },
      });
    }
  }

  // ── 8. DATA SUBJECT REQUESTS ──────────────────────────────────────────────
  const dsrDefs = [
    { mobile: '9816001007', requestType: 'DELETION',    referenceId: 'DSR-XKMP001', status: 'OPEN',      dueDate: fromNow(2),  createdAt: ago(28) },
    { mobile: '9820001011', requestType: 'ACCESS',      referenceId: 'DSR-XKMP002', status: 'OPEN',      dueDate: fromNow(8),  createdAt: ago(22) },
    { mobile: '9815001006', requestType: 'CORRECTION',  referenceId: 'DSR-XKMP003', status: 'OPEN',      dueDate: fromNow(15), createdAt: ago(15) },
    { mobile: '9811001002', requestType: 'DELETION',    referenceId: 'DSR-XKMP004', status: 'COMPLETED', dueDate: ago(5),      completedAt: ago(6),  createdAt: ago(35) },
    { mobile: '9810001001', requestType: 'ACCESS',      referenceId: 'DSR-XKMP005', status: 'COMPLETED', dueDate: ago(2),      completedAt: ago(3),  createdAt: ago(32) },
  ];
  for (const d of dsrDefs) {
    const ex = await prisma.dataSubjectRequest.findUnique({ where: { referenceId: d.referenceId } });
    if (!ex) {
      await prisma.dataSubjectRequest.create({
        data: { mobile: d.mobile, requestType: d.requestType, referenceId: d.referenceId, status: d.status, dueDate: d.dueDate, completedAt: d.completedAt ?? null, createdAt: d.createdAt },
      });
    }
  }

  // ── 9. NOTIFICATIONS ──────────────────────────────────────────────────────
  const notifDefs = [
    { userId: host?.id,    channel: 'PUSH', event: 'VISITOR_ARRIVAL',   title: 'Guest Arrived',            body: 'Kavya Menon (Google) has arrived at Main Entrance',                              read: false, createdAt: ago(0, 9, 16) },
    { userId: host?.id,    channel: 'PUSH', event: 'VISITOR_ARRIVAL',   title: 'Guest Arrived',            body: 'Mohammed Farouk has arrived at Main Entrance',                                   read: false, createdAt: ago(0,11, 21) },
    { userId: prof1?.id,   channel: 'PUSH', event: 'VISITOR_ARRIVAL',   title: 'Guest Arrived',            body: 'Dr. Sunita Rao has arrived at Main Entrance',                                    read: false, createdAt: ago(0,10,  6) },
    { userId: host?.id,    channel: 'PUSH', event: 'VISITOR_DEPARTURE', title: 'Guest Departed',           body: 'Deepak Verma has left campus',                                                   read: true,  createdAt: ago(0,12,  1) },
    { userId: host?.id,    channel: 'PUSH', event: 'VISITOR_DEPARTURE', title: 'Guest Departed',           body: 'Harsh Malhotra has left campus',                                                 read: true,  createdAt: ago(0,11, 31) },
    { userId: secHead?.id, channel: 'PUSH', event: 'P0_ALERT',          title: 'P0 EMERGENCY: Guard Alert',body: 'Emergency by Suresh Kumar at Main Gate. Suspicious individual.',                 read: false, createdAt: ago(0, 7, 31) },
    { userId: secHead?.id, channel: 'PUSH', event: 'P0_ALERT',          title: 'P0: Blacklist Hit',        body: 'Blacklisted individual Ranjit Sinha at Main Entrance.',                          read: false, createdAt: ago(1, 8, 46) },
    { userId: secHead?.id, channel: 'PUSH', event: 'ADMIN_ALERT',       title: 'Pass Revoked — On Campus', body: "Karim Sheikh's pass revoked but still on campus. Please verify and escort out.", read: true,  createdAt: ago(2,14,  1) },
    { userId: host?.id,    channel: 'PUSH', event: 'VISITOR_ARRIVAL',   title: 'Guest Arrived',            body: 'Ravi Mehta has arrived at Main Entrance',                                        read: true,  createdAt: ago(1,14, 16) },
    { userId: prof1?.id,   channel: 'PUSH', event: 'VISITOR_ARRIVAL',   title: 'Guest Arrived',            body: 'Amit Sharma (Alumni) has arrived at Main Entrance',                              read: true,  createdAt: ago(1,11,  6) },
    { userId: prof2?.id,   channel: 'PUSH', event: 'VISITOR_ARRIVAL',   title: 'Guest Arrived',            body: 'Pooja Mishra has arrived at Main Entrance',                                      read: true,  createdAt: ago(1, 9, 41) },
  ];
  for (const n of notifDefs) {
    if (!n.userId) continue;
    await prisma.notification.create({
      data: { userId: n.userId, channel: n.channel, event: n.event, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt },
    });
  }

  // ── 10. AUDIT LOG ─────────────────────────────────────────────────────────
  const auditDefs = [
    { action: 'CHECK_IN',              entity: 'Visit',              userId: guard?.id,   details: JSON.stringify({ gate: 'Main Entrance' }),                                                timestamp: ago(0, 9, 15)  },
    { action: 'CHECK_IN',              entity: 'Visit',              userId: guard?.id,   details: JSON.stringify({ gate: 'Main Entrance' }),                                                timestamp: ago(0,10,  5)  },
    { action: 'CHECK_IN',              entity: 'Visit',              userId: guard?.id,   details: null,                                                                                      timestamp: ago(0,11, 20)  },
    { action: 'CHECK_OUT',             entity: 'Visit',              userId: guard?.id,   details: null,                                                                                      timestamp: ago(0,12,  0)  },
    { action: 'WALK_IN',               entity: 'Visit',              userId: guard?.id,   details: JSON.stringify({ mobile: '9813001004', purpose: 'Amazon delivery' }),                     timestamp: ago(0,13,  5)  },
    { action: 'EMERGENCY_FLAG',        entity: 'Incident',           userId: guard?.id,   details: JSON.stringify({ description: 'Suspicious individual', location: 'Main Gate' }),         timestamp: ago(0, 7, 30)  },
    { action: 'BLACKLIST_HIT',         entity: 'Visit',              userId: guard?.id,   details: JSON.stringify({ name: 'Ranjit Sinha', mobile: '9988776655' }),                          timestamp: ago(1, 8, 45)  },
    { action: 'BLACKLIST_ADD',         entity: 'Blacklist',          userId: admin?.id,   details: JSON.stringify({ name: 'Ranjit Sinha', reason: 'Trespassing' }),                         timestamp: ago(30,10,  0)  },
    { action: 'REVOKE_RECURRING_PASS', entity: 'RecurringPass',      userId: admin?.id,   details: JSON.stringify({ visitor: 'Karim Sheikh' }),                                             timestamp: ago(2, 14,  0)  },
    { action: 'DSR_CREATED',           entity: 'DataSubjectRequest', userId: admin?.id,   details: JSON.stringify({ mobile: '9816001007', type: 'DELETION' }),                              timestamp: ago(28, 9,  0)  },
    { action: 'DSR_CREATED',           entity: 'DataSubjectRequest', userId: admin?.id,   details: JSON.stringify({ mobile: '9820001011', type: 'ACCESS' }),                                timestamp: ago(22,11,  0)  },
    { action: 'DSR_COMPLETED',         entity: 'DataSubjectRequest', userId: admin?.id,   details: JSON.stringify({ referenceId: 'DSR-XKMP004' }),                                         timestamp: ago(6, 14,  0)  },
    { action: 'CREATE_RECURRING_PASS', entity: 'RecurringPass',      userId: admin?.id,   details: JSON.stringify({ mobile: '9825001016', zone: 'MAIN_CAMPUS' }),                           timestamp: ago(14,10,  0)  },
    { action: 'INCIDENT_RESOLVED',     entity: 'Incident',           userId: secHead?.id, details: JSON.stringify({ title: 'Tailgating detected at Hostel Gate' }),                         timestamp: ago(4, 19,  0)  },
    { action: 'MANUAL_OVERRIDE',       entity: 'Visit',              userId: guard?.id,   details: JSON.stringify({ reason: 'HOST_CONFIRMATION' }),                                         timestamp: ago(4, 15, 12)  },
    { action: 'CHECK_IN',              entity: 'Visit',              userId: guard?.id,   details: JSON.stringify({ gate: 'Main Entrance' }),                                                timestamp: ago(1, 14, 15)  },
    { action: 'CHECK_OUT',             entity: 'Visit',              userId: guard?.id,   details: null,                                                                                      timestamp: ago(1, 16, 30)  },
    { action: 'RECURRING_CHECK_IN',    entity: 'RecurringPass',      userId: guard?.id,   details: JSON.stringify({ visitor: 'Meena Devi', pass: 'demo-recurring-pass-meena' }),            timestamp: ago(0, 6, 15)  },
    { action: 'USER_UPDATE',           entity: 'User',               userId: admin?.id,   details: JSON.stringify({ role: 'HOST', email: 'prof.mehta@iiml.ac.in' }),                        timestamp: ago(10,11,  0)  },
    { action: 'BLACKLIST_ADD',         entity: 'Blacklist',          userId: admin?.id,   details: JSON.stringify({ name: 'Unknown Male', idPartial: '7741' }),                             timestamp: ago(60,14,  0)  },
  ];
  for (const a of auditDefs) {
    await prisma.auditLog.create({
      data: { action: a.action, entity: a.entity, userId: a.userId ?? null, details: a.details, timestamp: a.timestamp },
    });
  }

  console.log([
    '',
    '  ✓ Gates:             4',
    '  ✓ Users:             8  (6 demo + 2 faculty hosts)',
    '  ✓ Blacklist:         3  entries',
    '  ✓ Visitors:          22',
    '  ✓ Recurring passes:  5  (2 expiring within 7 days)',
    '  ✓ Visits:            ~38 (5 on-campus, 3 out today, 6 yesterday, 12 past week, 8 upcoming, 2 cancelled/expired)',
    '  ✓ Incidents:         8  (P0×2, P1×2, P2×2, P3×2)',
    '  ✓ DSR requests:      5  (3 open — 1 nearly overdue, 2 completed)',
    '  ✓ Notifications:     11',
    '  ✓ Audit log:         20 entries',
    '',
  ].join('\n'));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
