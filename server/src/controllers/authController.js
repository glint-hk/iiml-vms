import prisma from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { logAudit } from '../lib/audit.js';

const DEMO_USERS = [
  { email: 'guard@iiml.ac.in', name: 'Suresh Kumar', role: 'GUARD', gateName: 'Main Entrance' },
  { email: 'host@iiml.ac.in', name: 'Priya Sharma', role: 'HOST' },
  { email: 'admin@iiml.ac.in', name: 'Ms. Sharma', role: 'ADMIN' },
  { email: 'security@iiml.ac.in', name: 'Dr. Kapoor', role: 'SECURITY_HEAD' },
  { email: 'leadership@iiml.ac.in', name: 'Director Office', role: 'LEADERSHIP' },
  { email: 'it@iiml.ac.in', name: 'IT Admin', role: 'IT_ADMIN' },
];

export async function login(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const demo = DEMO_USERS.find((u) => u.email === email);
    if (!demo) {
      return res.status(401).json({ error: 'Unknown user. Use a demo account.' });
    }

    let gateId = null;
    if (demo.gateName) {
      const gate = await prisma.gate.findFirst({ where: { name: demo.gateName } });
      gateId = gate?.id ?? null;
    }

    user = await prisma.user.create({
      data: { email: demo.email, name: demo.name, role: demo.role, gateId },
    });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'Account deactivated' });
  }

  const token = signToken(user);
  await logAudit('LOGIN', 'User', user.id, user.id, { email: user.email });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, gateId: user.gateId },
  });
}

export async function getDemoUsers(_req, res) {
  res.json(DEMO_USERS.map(({ email, name, role }) => ({ email, name, role })));
}

export async function me(req, res) {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    gateId: req.user.gateId,
  });
}
