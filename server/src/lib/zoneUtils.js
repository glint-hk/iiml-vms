import prisma from './prisma.js';

export const DEFAULT_GATE_ZONES = {
  'Main Entrance': ['MAIN_CAMPUS', 'ACADEMIC_BLOCK', 'PLACEMENT_BLOCK', 'AUDITORIUM', 'RECEIVING_AREA'],
  'Hostel Gate': ['HOSTEL', 'MAIN_CAMPUS'],
  'Faculty Gate': ['FACULTY_RESIDENCE', 'MAIN_CAMPUS'],
  'Exec-Ed Gate': ['EXEC_ED_GUEST_HOUSE', 'ACADEMIC_BLOCK', 'MAIN_CAMPUS'],
};

export function parseGateZones(gate) {
  if (!gate?.allowedZones) return ['MAIN_CAMPUS'];
  return gate.allowedZones.split(',').map((z) => z.trim());
}

export async function getGateWithZones(gateId) {
  if (!gateId) return null;
  const gate = await prisma.gate.findUnique({ where: { id: gateId } });
  if (!gate) return null;
  return { ...gate, zones: parseGateZones(gate) };
}

export function isZoneAllowedAtGate(visitorZone, gateZones) {
  if (!visitorZone || !gateZones?.length) return true;
  return gateZones.includes(visitorZone) || visitorZone === 'MAIN_CAMPUS';
}

export function zoneViolationMessage(visitorZone, gateName) {
  return `Zone mismatch: visitor authorized for ${visitorZone.replace(/_/g, ' ')} but gate "${gateName}" does not serve that zone`;
}
