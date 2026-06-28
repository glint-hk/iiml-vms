import { useState, useEffect } from 'react';
import { QrCode, Plus, X, Eye } from 'lucide-react';
import AppShell, { Card, Button, Input, Select, Badge } from '../components/AppShell.jsx';
import { api } from '../lib/apiClient.js';

const CATEGORIES = [
  ['PARENT', 'Parent / Family'],
  ['ALUMNI', 'Alumni'],
  ['RECRUITER', 'Recruiter'],
  ['GUEST_SPEAKER', 'Guest Speaker'],
  ['VENDOR', 'Vendor'],
  ['DELIVERY', 'Delivery'],
  ['INTERVIEW_CANDIDATE', 'Interview Candidate'],
  ['EXEC_ED', 'Exec-Ed Participant'],
  ['OTHER', 'Other'],
];

const ZONES = [
  ['MAIN_CAMPUS', 'Main Campus'],
  ['ACADEMIC_BLOCK', 'Academic Block'],
  ['PLACEMENT_BLOCK', 'Placement Block'],
  ['HOSTEL', 'Hostel'],
  ['AUDITORIUM', 'Auditorium'],
];

function statusBadge(status) {
  const map = {
    APPROVED: ['info', 'Approved'],
    CHECKED_IN: ['success', 'On Campus'],
    CHECKED_OUT: ['default', 'Departed'],
    CANCELLED: ['danger', 'Cancelled'],
    EXPIRED: ['warning', 'Expired'],
  };
  const [v, l] = map[status] || ['default', status];
  return <Badge variant={v}>{l}</Badge>;
}

export default function HostDashboard() {
  const [invites, setInvites] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [form, setForm] = useState({
    visitorName: '',
    mobile: '',
    purpose: '',
    scheduledAt: '',
    category: 'PARENT',
    zone: 'MAIN_CAMPUS',
    isMultiDay: false,
    multiDayDays: 3,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadInvites() {
    const data = await api.getMyInvites();
    setInvites(data);
  }

  useEffect(() => { loadInvites(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await api.createInvite(form);
      setQrModal(result);
      setShowForm(false);
      setForm({ visitorName: '', mobile: '', purpose: '', scheduledAt: '', category: 'PARENT', zone: 'MAIN_CAMPUS', isMultiDay: false, multiDayDays: 3 });
      loadInvites();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this invite?')) return;
    await api.cancelInvite(id);
    loadInvites();
  }

  async function showQr(id) {
    const data = await api.getQr(id);
    setQrModal(data);
  }

  return (
    <AppShell title="Host Portal" subtitle="Invite visitors in under 60 seconds">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Create pre-approved invites with QR passes sent via SMS/WhatsApp.</p>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus size={18} /> Invite Visitor
        </Button>
      </div>

      {showForm && (
        <Card title="New Visitor Invite" action={<button onClick={() => setShowForm(false)}><X size={20} /></button>}>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Visitor Name" required value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} />
            <Input label="Mobile Number" required type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <Input label="Purpose of Visit" required className="sm:col-span-2" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            <Input label="Expected Arrival" required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            <Select label="Visitor Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select label="Authorized Zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              {ZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <div className="sm:col-span-2 p-4 bg-blue-500/8 rounded-2xl border border-blue-300/20">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isMultiDay} onChange={(e) => setForm({ ...form, isMultiDay: e.target.checked })} />
                <span className="text-sm"><strong>Multi-day pass</strong> — for exec-ed participants (valid for consecutive days)</span>
              </label>
              {form.isMultiDay && (
                <Input label="Duration (days)" type="number" min={2} max={14} className="mt-3" value={form.multiDayDays} onChange={(e) => setForm({ ...form, multiDayDays: Number(e.target.value) })} />
              )}
            </div>
            {error && <p className="sm:col-span-2 text-red-600 text-sm">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Invite & Send QR'}</Button>
            </div>
          </form>
        </Card>
      )}

      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <QrCode className="mx-auto text-iiml-navy mb-3" size={32} />
            <h3 className="font-semibold text-lg">QR Pass Generated</h3>
            <p className="text-sm text-gray-500 mt-1">{qrModal.visit?.visitor?.name || qrModal.deliveryNote}</p>
            {qrModal.qrDataUrl && <img src={qrModal.qrDataUrl} alt="QR Pass" className="mx-auto mt-4 rounded-lg" />}
            <p className="text-xs text-gray-400 mt-3">Single-use · Valid ±30 min of scheduled time</p>
            <Button className="mt-4 w-full" onClick={() => setQrModal(null)}>Done</Button>
          </div>
        </div>
      )}

      <Card title="My Invites">
        {invites.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invites yet. Create your first visitor invite above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Visitor</th>
                  <th className="pb-3 font-medium">Purpose</th>
                  <th className="pb-3 font-medium">Scheduled</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <p className="font-medium">{inv.visitor.name}</p>
                      <p className="text-gray-400 text-xs">{inv.visitor.mobile}</p>
                    </td>
                    <td className="py-3">{inv.purpose}</td>
                    <td className="py-3">{new Date(inv.scheduledAt).toLocaleString()}</td>
                    <td className="py-3">{statusBadge(inv.status)}</td>
                    <td className="py-3 flex gap-2">
                      {inv.status === 'APPROVED' && (
                        <>
                          <button onClick={() => showQr(inv.id)} className="text-iiml-navy hover:text-iiml-gold"><Eye size={18} /></button>
                          <button onClick={() => handleCancel(inv.id)} className="text-red-500 hover:text-red-700"><X size={18} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
