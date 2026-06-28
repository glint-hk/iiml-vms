import { useState, useEffect } from 'react';
import { TrendingUp, Users, Shield } from 'lucide-react';
import AppShell, { Card, StatCard } from '../components/AppShell.jsx';
import { api } from '../lib/apiClient.js';

export default function LeadershipDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.dashboard().then(setStats);
  }, []);

  return (
    <AppShell title="Leadership Dashboard" subtitle="Read-only campus visibility — glanceable metrics">
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Visitors On Campus" value={stats.onCampus} accent="text-iiml-green" />
            <StatCard label="Today's Total Entries" value={stats.todayVisits} />
            <StatCard label="Pre-Approved Pending" value={stats.pendingInvites} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Campus Occupancy Overview">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-iiml-green/10 flex items-center justify-center">
                  <Users className="text-iiml-green" size={32} />
                </div>
                <div>
                  <p className="text-4xl font-black text-iiml-navy tracking-tight">{stats.onCampus}</p>
                  <p className="text-gray-500 text-sm mt-0.5">Active visitors on campus</p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(stats.occupancy.byCategory).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between items-center py-2.5 border-b border-black/5 last:border-0">
                    <span className="text-sm text-gray-600">{cat.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-iiml-navy">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Operational Health">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-emerald-500/8 rounded-2xl border border-emerald-300/20">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">North Star Metric</p>
                    <p className="text-xs text-emerald-600 mt-0.5">P95 clearance ≤ 30 sec (pre-approved)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-iiml-navy/[0.05] rounded-2xl border border-iiml-navy/10">
                  <div className="w-9 h-9 rounded-xl bg-iiml-navy/10 flex items-center justify-center shrink-0">
                    <Shield className="text-iiml-navy" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-iiml-navy">Open Incidents</p>
                    <p className="text-3xl font-black text-iiml-navy tracking-tight mt-0.5">{stats.openIncidents}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-amber-400/8 rounded-2xl border border-amber-300/20">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
                    <span className="text-base">📋</span>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">DPDP Data Requests</p>
                    <p className="text-xs text-amber-600 mt-0.5">{stats.openDsr} open · 30-day SLA</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
