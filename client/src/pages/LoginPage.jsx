import { useEffect, useState } from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { api } from '../lib/apiClient.js';
import { useAuth, getHomeRoute } from '../lib/auth.jsx';

const ROLE_COLORS = {
  GUARD: 'from-slate-600 to-slate-800',
  HOST: 'from-indigo-500 to-indigo-700',
  ADMIN: 'from-iiml-navy to-[#0f1a30]',
  SECURITY_HEAD: 'from-red-600 to-red-800',
  LEADERSHIP: 'from-iiml-gold to-amber-600',
  IT_ADMIN: 'from-teal-500 to-teal-700',
};

const ROLE_ICONS = {
  GUARD: '🛡',
  HOST: '🏠',
  ADMIN: '⚙️',
  SECURITY_HEAD: '🔐',
  LEADERSHIP: '🎓',
  IT_ADMIN: '💻',
};

export default function LoginPage() {
  const { login } = useAuth();
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDemoUsers().then(setDemoUsers).catch(() => {});
  }, []);

  async function handleLogin(email) {
    setLoading(true);
    setLoadingEmail(email);
    setError('');
    try {
      const user = await login(email);
      window.location.href = getHomeRoute(user.role);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setLoadingEmail('');
    }
  }

  const roleGroups = {
    'Gate Operations': demoUsers.filter((u) => u.role === 'GUARD'),
    'Hosts & Invites': demoUsers.filter((u) => u.role === 'HOST'),
    Administration: demoUsers.filter((u) => ['ADMIN', 'SECURITY_HEAD', 'LEADERSHIP', 'IT_ADMIN'].includes(u.role)),
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0d1a35 0%, #1a2744 45%, #0f1d3d 75%, #1a2744 100%)',
      }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.35) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(100,140,255,0.30) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <div
          className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(30,122,76,0.40) 0%, transparent 70%)', filter: 'blur(30px)' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-[0_8px_32px_rgba(201,162,39,0.45)]"
            style={{ background: 'linear-gradient(135deg, #c9a227, #e8be40)' }}
          >
            <Shield className="text-iiml-navy" size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">IIML-VMS</h1>
          <p className="text-white/50 mt-2 text-sm font-medium">IIM Lucknow · Visitor Management System</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-iiml-gold/15 border border-iiml-gold/25">
            <div className="w-1.5 h-1.5 rounded-full bg-iiml-gold animate-pulse" />
            <span className="text-iiml-gold text-xs font-semibold">Enterprise MVP · Phase 1 &amp; 2</span>
          </div>
        </div>

        {/* Glass card */}
        <div
          className="rounded-3xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <p className="text-white/60 text-sm mb-6 font-medium">
            Select a demo role to explore. Production uses IIML Google Workspace SSO.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-400/25 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {Object.entries(roleGroups).map(([group, users]) =>
              users.length === 0 ? null : (
                <div key={group}>
                  <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-2.5 px-1">
                    {group}
                  </p>
                  <div className="space-y-2">
                    {users.map((u) => (
                      <button
                        key={u.email}
                        onClick={() => handleLogin(u.email)}
                        disabled={loading}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 disabled:opacity-50 group"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.20)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.10)';
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-md"
                          style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))` }}
                        >
                          {ROLE_ICONS[u.role] || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm leading-tight">{u.name}</p>
                          <p className="text-white/40 text-xs mt-0.5 truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(201,162,39,0.18)', color: '#e8c840', border: '1px solid rgba(201,162,39,0.25)' }}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                          {loadingEmail === u.email ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <ChevronRight size={16} className="text-white/25 group-hover:text-white/60 transition-colors" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-6 font-medium tracking-wide">
          DPDP Act 2023 Compliant · Data Minimization · 5-Year Audit Retention
        </p>
      </div>
    </div>
  );
}
