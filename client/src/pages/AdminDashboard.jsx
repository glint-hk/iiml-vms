import { useState, useEffect } from 'react';
import { Download, Plus, Trash2, ShieldAlert, Upload, Repeat, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import AppShell, { Card, Button, Input, Select, StatCard, Badge } from '../components/AppShell.jsx';
import { api } from '../lib/apiClient.js';
import { useAuth } from '../lib/auth.jsx';

function dsrDaysLeft(dueDate) {
  return Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
}

function DsrCountdown({ dueDate }) {
  const days = dsrDaysLeft(dueDate);
  if (days < 0) {
    return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{Math.abs(days)}d OVERDUE</span>;
  }
  if (days === 0) {
    return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">DUE TODAY</span>;
  }
  if (days <= 7) {
    return <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{days}d left</span>;
  }
  return <span className="text-xs text-gray-500">{days}d left</span>;
}

function passExpiryDays(validUntil) {
  return Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24));
}

const ROLES = ['GUARD', 'HOST', 'ADMIN', 'SECURITY_HEAD', 'LEADERSHIP', 'IT_ADMIN'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [dsr, setDsr] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [passes, setPasses] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [users, setUsers] = useState([]);
  const [blForm, setBlForm] = useState({ name: '', mobile: '', reason: '' });
  const [dsrForm, setDsrForm] = useState({ mobile: '', requestType: 'DELETION' });
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [passForm, setPassForm] = useState({
    visitorName: '', mobile: '', purpose: '', zone: 'MAIN_CAMPUS',
    validFrom: '', validUntil: '', shiftStart: '06:00', shiftEnd: '18:00',
  });

  async function loadAll() {
    const [s, v, b, d, i, p] = await Promise.all([
      api.dashboard(), api.visitorLog({}), api.blacklist(), api.dsr(), api.incidents(), api.recurringPasses(),
    ]);
    setStats(s);
    setVisitors(v);
    setBlacklist(b);
    setDsr(d);
    setIncidents(i);
    setPasses(p);
  }

  async function loadAudit() {
    const data = await api.auditLog();
    setAuditLog(data);
  }

  async function loadUsers() {
    const data = await api.users();
    setUsers(data);
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (tab === 'audit') loadAudit();
    if (tab === 'users') loadUsers();
  }, [tab]);

  async function handleExport() {
    const data = await api.exportLog({});
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iiml-vms-export-${Date.now()}.json`;
    a.click();
  }

  async function addBlacklist(e) {
    e.preventDefault();
    await api.addBlacklist(blForm);
    setBlForm({ name: '', mobile: '', reason: '' });
    loadAll();
  }

  async function removeBlacklist(id) {
    if (!confirm('Remove from blacklist?')) return;
    await api.removeBlacklist(id);
    loadAll();
  }

  async function createDsr(e) {
    e.preventDefault();
    await api.createDsr(dsrForm);
    setDsrForm({ mobile: '', requestType: 'DELETION' });
    loadAll();
  }

  async function completeDsr(id) {
    await api.completeDsr(id);
    loadAll();
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    const result = await api.bulkInvite({ csv: bulkCsv });
    setBulkResult(result);
    setBulkCsv('');
    loadAll();
  }

  async function createPass(e) {
    e.preventDefault();
    await api.createRecurringPass({ ...passForm, biometricEnrolled: true });
    setPassForm({ visitorName: '', mobile: '', purpose: '', zone: 'MAIN_CAMPUS', validFrom: '', validUntil: '', shiftStart: '06:00', shiftEnd: '18:00' });
    loadAll();
  }

  async function revokePass(id) {
    if (!confirm('Revoke this recurring pass?')) return;
    await api.revokeRecurringPass(id);
    loadAll();
  }

  async function updateRole(id, role) {
    await api.updateUserRole(id, { role });
    loadUsers();
  }

  async function resolveIncident(id) {
    await api.resolveIncident(id);
    setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, resolved: true } : i));
  }

  const tabs = [
    ['overview', 'Overview'],
    ['log', 'Visitor Log'],
    ['bulk', 'Bulk Invites'],
    ['recurring', 'Recurring Passes'],
    ['blacklist', 'Blacklist'],
    ['dsr', 'Data Requests'],
    ['incidents', 'Incidents'],
    ['audit', 'Audit Log'],
    ['users', 'Users'],
  ];

  const activePasses = passes.filter((p) => p.isActive);
  const expiringPasses = activePasses.filter((p) => passExpiryDays(p.validUntil) <= 7);

  return (
    <AppShell title="Admin Dashboard" subtitle="Visitor logs, compliance, blacklist management">
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-iiml-navy text-white shadow-[0_4px_14px_rgba(26,39,68,0.28)]' : 'glass text-iiml-navy border-0 hover:bg-white/80'}`}
          >
            {label}
            {t === 'dsr' && dsr.filter((r) => r.status === 'OPEN' && dsrDaysLeft(r.dueDate) <= 7).length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-red-500 text-white rounded-full">
                {dsr.filter((r) => r.status === 'OPEN' && dsrDaysLeft(r.dueDate) <= 7).length}
              </span>
            )}
            {t === 'recurring' && expiringPasses.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-amber-500 text-white rounded-full">
                {expiringPasses.length}
              </span>
            )}
          </button>
        ))}
        <Button variant="outline" onClick={handleExport} className="ml-auto flex items-center gap-2">
          <Download size={16} /> Export Log
        </Button>
      </div>

      {tab === 'overview' && stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Today's Entries" value={stats.todayVisits} />
            <StatCard label="On Campus Now" value={stats.onCampus} accent="text-iiml-green" />
            <StatCard label="Pending Invites" value={stats.pendingInvites} />
            <StatCard label="Open Incidents" value={stats.openIncidents} accent="text-iiml-red" />
          </div>
          <Card title="Live Occupancy by Category">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(stats.occupancy.byCategory).map(([cat, count]) => (
                <div key={cat} className="p-3 bg-black/[0.03] rounded-2xl">
                  <p className="text-xs text-gray-500">{cat.replace('_', ' ')}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              ))}
              {Object.keys(stats.occupancy.byCategory).length === 0 && (
                <p className="text-gray-500 col-span-full text-center py-4">No visitors currently on campus</p>
              )}
            </div>
          </Card>
        </>
      )}

      {tab === 'log' && (
        <Card title="Digital Visitor Log">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Visitor</th>
                  <th className="pb-2">Host</th>
                  <th className="pb-2">Purpose</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Entry</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{v.visitor.name}</td>
                    <td className="py-2">{v.host?.name || '—'}</td>
                    <td className="py-2">{v.purpose}</td>
                    <td className="py-2"><Badge>{v.visitType}</Badge></td>
                    <td className="py-2"><Badge variant={v.status === 'CHECKED_IN' ? 'success' : 'default'}>{v.status}</Badge></td>
                    <td className="py-2 text-xs">{v.entryAt ? new Date(v.entryAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'bulk' && (
        <Card title="Bulk Event Invite (CSV)">
          <p className="text-sm text-gray-500 mb-4">Upload up to 500 visitors for convocation, placement season, etc. Format: name,mobile,purpose,scheduledAt,category,zone</p>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">CSV Data</span>
              <textarea
                className="w-full h-40 px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm"
                placeholder={'name,mobile,purpose,2026-07-01T10:00:00,RECRUITER,PLACEMENT_BLOCK\nJane Doe,9876543210,Placement interview,...'}
                value={bulkCsv}
                onChange={(e) => setBulkCsv(e.target.value)}
              />
            </label>
            <Button type="submit" className="flex items-center gap-2"><Upload size={16} /> Process Bulk Invites</Button>
          </form>
          {bulkResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl text-sm">
              <p className="font-medium text-green-800">Created {bulkResult.created} invites</p>
              {bulkResult.failed > 0 && <p className="text-red-600 mt-1">{bulkResult.failed} failures</p>}
            </div>
          )}
        </Card>
      )}

      {tab === 'recurring' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Create Recurring Pass">
            <form onSubmit={createPass} className="space-y-3">
              <Input label="Worker Name" required value={passForm.visitorName} onChange={(e) => setPassForm({ ...passForm, visitorName: e.target.value })} />
              <Input label="Mobile" required value={passForm.mobile} onChange={(e) => setPassForm({ ...passForm, mobile: e.target.value })} />
              <Input label="Purpose" required value={passForm.purpose} onChange={(e) => setPassForm({ ...passForm, purpose: e.target.value })} />
              <Input label="Valid From" required type="date" value={passForm.validFrom} onChange={(e) => setPassForm({ ...passForm, validFrom: e.target.value })} />
              <Input label="Valid Until" required type="date" value={passForm.validUntil} onChange={(e) => setPassForm({ ...passForm, validUntil: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Shift Start" value={passForm.shiftStart} onChange={(e) => setPassForm({ ...passForm, shiftStart: e.target.value })} />
                <Input label="Shift End" value={passForm.shiftEnd} onChange={(e) => setPassForm({ ...passForm, shiftEnd: e.target.value })} />
              </div>
              <Button type="submit" className="flex items-center gap-2"><Repeat size={16} /> Create Pass</Button>
            </form>
          </Card>
          <Card title="Active Recurring Passes">
            {expiringPasses.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                <AlertCircle size={16} className="shrink-0" />
                <span>{expiringPasses.length} pass{expiringPasses.length > 1 ? 'es' : ''} expiring within 7 days — renew soon.</span>
              </div>
            )}
            {activePasses.map((p) => {
              const days = passExpiryDays(p.validUntil);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 border-b border-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.visitor.name}</p>
                      {days <= 7 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {days <= 0 ? 'EXPIRED' : `${days}d left`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{p.purpose} · until {new Date(p.validUntil).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">{p.passToken.slice(0, 20)}…</p>
                  </div>
                  <button onClick={() => revokePass(p.id)} className="text-red-500"><Trash2 size={18} /></button>
                </div>
              );
            })}
            {activePasses.length === 0 && (
              <p className="text-gray-500 text-center py-6">No active passes</p>
            )}
          </Card>
        </div>
      )}

      {tab === 'blacklist' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Add to Blacklist">
            <form onSubmit={addBlacklist} className="space-y-3">
              <Input label="Name" required value={blForm.name} onChange={(e) => setBlForm({ ...blForm, name: e.target.value })} />
              <Input label="Mobile" value={blForm.mobile} onChange={(e) => setBlForm({ ...blForm, mobile: e.target.value })} />
              <Input label="Reason" required value={blForm.reason} onChange={(e) => setBlForm({ ...blForm, reason: e.target.value })} />
              <Button type="submit" className="flex items-center gap-2"><Plus size={16} /> Add</Button>
            </form>
          </Card>
          <Card title="Active Blacklist">
            {blacklist.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 border-b border-gray-50">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.reason}</p>
                </div>
                <button onClick={() => removeBlacklist(b.id)} className="text-red-500"><Trash2 size={18} /></button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'dsr' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="New Data Subject Request">
            <form onSubmit={createDsr} className="space-y-3">
              <Input label="Mobile" required value={dsrForm.mobile} onChange={(e) => setDsrForm({ ...dsrForm, mobile: e.target.value })} />
              <Select label="Request Type" value={dsrForm.requestType} onChange={(e) => setDsrForm({ ...dsrForm, requestType: e.target.value })}>
                <option value="DELETION">Deletion (Right to be Forgotten)</option>
                <option value="ACCESS">Access (Data Portability)</option>
                <option value="CORRECTION">Correction</option>
              </Select>
              <Button type="submit">Create Request</Button>
            </form>
          </Card>
          <Card title="Open Requests (30-day SLA)">
            {dsr.length === 0 && <p className="text-gray-500 text-center py-6">No requests</p>}
            {dsr.map((r) => (
              <div key={r.id} className="flex items-start justify-between p-3 border-b border-gray-50 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{r.referenceId}</p>
                    {r.status === 'OPEN' && <DsrCountdown dueDate={r.dueDate} />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.mobile} · {r.requestType} · Due {new Date(r.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0">
                  {r.status === 'OPEN' ? (
                    <Button variant="outline" onClick={() => completeDsr(r.id)}>Complete</Button>
                  ) : (
                    <Badge variant="success">Done</Badge>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'incidents' && (
        <Card title="Incident Log">
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No incidents recorded</p>
          ) : (
            incidents.map((i) => (
              <div key={i.id} className="flex items-start gap-3 p-3 border-b border-gray-50">
                <ShieldAlert className={i.severity === 'P0' ? 'text-red-600' : 'text-amber-500'} size={20} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${i.resolved ? 'line-through text-gray-400' : ''}`}>{i.title}</p>
                  <p className="text-xs text-gray-500">{i.severity} · {new Date(i.createdAt).toLocaleString()}</p>
                  {i.description && !i.resolved && <p className="text-xs text-gray-400 mt-0.5">{i.description}</p>}
                </div>
                <div className="shrink-0">
                  {i.resolved ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <button
                      onClick={() => resolveIncident(i.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {tab === 'audit' && (
        <Card title="Audit Log (last 100 actions)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Timestamp</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Entity</th>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{entry.action}</code>
                    </td>
                    <td className="py-2 pr-4 text-xs">{entry.entity}</td>
                    <td className="py-2 pr-4 text-xs">
                      {entry.user ? (
                        <span>{entry.user.name} <span className="text-gray-400">({entry.user.role})</span></span>
                      ) : '—'}
                    </td>
                    <td className="py-2 text-xs text-gray-400 max-w-xs truncate">
                      {entry.details || '—'}
                    </td>
                  </tr>
                ))}
                {auditLog.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">No audit entries</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'users' && (
        <Card title="User Management">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Gate</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{u.name}</td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{u.email}</td>
                    <td className="py-2 pr-4">
                      {user?.role === 'IT_ADMIN' ? (
                        <select
                          value={u.role}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <Badge>{u.role}</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs">{u.gate?.name || '—'}</td>
                    <td className="py-2">
                      <Badge variant={u.isActive ? 'success' : 'default'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {user?.role !== 'IT_ADMIN' && (
            <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
              <Clock size={12} /> Role edits require IT Admin access.
            </p>
          )}
        </Card>
      )}
    </AppShell>
  );
}
