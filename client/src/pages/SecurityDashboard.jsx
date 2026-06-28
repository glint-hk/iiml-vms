import { useState, useEffect } from 'react';
import { AlertTriangle, Users, Activity, Clock, CheckCircle } from 'lucide-react';
import AppShell, { Card, StatCard, Badge } from '../components/AppShell.jsx';
import { api } from '../lib/apiClient.js';

export default function SecurityDashboard() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [overstay, setOverstay] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);

  async function loadAll() {
    const [s, i, v, o] = await Promise.all([
      api.dashboard(),
      api.incidents(),
      api.visitorLog({ status: 'CHECKED_IN' }),
      api.overstayVisitors(8),
    ]);
    setStats(s);
    setIncidents(i);
    setVisitors(v);
    setOverstay(o);
  }

  useEffect(() => { loadAll(); }, []);

  const p0Incidents = incidents.filter((i) => i.severity === 'P0' && !i.resolved);

  async function handleResolve(id) {
    setResolvingId(id);
    try {
      await api.resolveIncident(id);
      setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, resolved: true } : i));
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <AppShell title="Security Operations" subtitle="Real-time campus situational awareness">
      {p0Incidents.length > 0 && (
        <div className="mb-6 p-4 bg-red-600 text-white rounded-xl flex items-center gap-3 animate-pulse">
          <AlertTriangle size={24} />
          <div>
            <p className="font-bold">{p0Incidents.length} P0 Alert{p0Incidents.length > 1 ? 's' : ''} Active</p>
            <p className="text-sm text-white/80">Immediate action required — scroll to Incidents</p>
          </div>
        </div>
      )}

      {overstay.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-amber-900">{overstay.length} Overstay Alert{overstay.length > 1 ? 's' : ''} — 8h+ on campus</p>
            <div className="mt-2 space-y-1">
              {overstay.map((v) => (
                <p key={v.id} className="text-sm text-amber-800">
                  <span className="font-medium">{v.visitor.name}</span>
                  {' — '}{v.hoursOnCampus}h · {v.zone} · Host: {v.host?.name || '—'}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="On Campus" value={stats.onCampus} accent="text-iiml-green" />
          <StatCard label="Today's Entries" value={stats.todayVisits} />
          <StatCard label="Open P0/P1" value={incidents.filter((i) => !i.resolved && ['P0', 'P1'].includes(i.severity)).length} accent="text-iiml-red" />
          <StatCard label="Overstay (8h+)" value={overstay.length} accent={overstay.length > 0 ? 'text-amber-600' : undefined} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Live Campus Occupancy">
          <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm">
            <Activity size={16} />
            Updated {stats?.occupancy?.updatedAt ? new Date(stats.occupancy.updatedAt).toLocaleTimeString() : '—'}
          </div>
          {visitors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Campus clear — no active visitors</p>
          ) : (
            <div className="space-y-2">
              {visitors.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-black/[0.03] rounded-2xl hover:bg-black/[0.05] transition-colors">
                  <div>
                    <p className="font-medium">{v.visitor.name}</p>
                    <p className="text-xs text-gray-500">{v.category} · {v.zone} · Host: {v.host?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overstay.some((o) => o.id === v.id) && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Overstay</span>
                    )}
                    <Badge variant="success">On Campus</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Incidents">
          {incidents.length === 0 && <p className="text-gray-500 text-center py-6">No incidents</p>}
          {incidents.slice(0, 15).map((i) => (
            <div key={i.id} className="flex items-start gap-3 p-3 border-b border-gray-50">
              <Badge variant={i.severity === 'P0' ? 'danger' : i.severity === 'P1' ? 'warning' : 'default'}>
                {i.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${i.resolved ? 'line-through text-gray-400' : ''}`}>{i.title}</p>
                <p className="text-xs text-gray-500">{new Date(i.createdAt).toLocaleString()}</p>
                {i.description && !i.resolved && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{i.description}</p>
                )}
              </div>
              <div className="shrink-0">
                {i.resolved ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <button
                    onClick={() => handleResolve(i.id)}
                    disabled={resolvingId === i.id}
                    className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {resolvingId === i.id ? '…' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {stats?.occupancy?.byCategory && Object.keys(stats.occupancy.byCategory).length > 0 && (
        <Card title="Occupancy by Visitor Category">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats.occupancy.byCategory).map(([cat, count]) => (
              <div key={cat} className="text-center p-4 bg-iiml-navy/[0.05] rounded-2xl">
                <Users className="mx-auto text-iiml-navy mb-2" size={24} />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{cat.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
