import { LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import NotificationBell from './NotificationBell.jsx';

const ROLE_LABELS = {
  GUARD: 'Security Guard',
  HOST: 'Host',
  ADMIN: 'Admin Officer',
  SECURITY_HEAD: 'Security Head',
  LEADERSHIP: 'Leadership',
  IT_ADMIN: 'IT Admin',
};

export default function AppShell({ title, subtitle, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="glass-dark sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-iiml-gold flex items-center justify-center font-black text-iiml-navy text-xs tracking-tight shadow-[0_2px_8px_rgba(201,162,39,0.4)]">
              IIML
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">{title}</h1>
              {subtitle && <p className="text-white/50 text-xs mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-white text-sm leading-tight">{user?.name}</p>
              <p className="text-white/45 text-xs">{ROLE_LABELS[user?.role]}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <LogOut size={16} className="text-white/70" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-7">{children}</main>
    </div>
  );
}

export function StatCard({ label, value, accent, icon: Icon }) {
  return (
    <div className="glass rounded-3xl p-5 shadow-[0_4px_24px_rgba(26,39,68,0.07)]">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">{label}</p>
      <p className={`text-4xl font-black mt-2 tracking-tight ${accent || 'text-iiml-navy'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export function Badge({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-gray-500/10 text-gray-600 border-gray-300/40',
    success: 'bg-emerald-500/12 text-emerald-700 border-emerald-300/40',
    warning: 'bg-amber-500/12 text-amber-700 border-amber-300/40',
    danger: 'bg-red-500/12 text-red-700 border-red-300/40',
    info: 'bg-blue-500/12 text-blue-700 border-blue-300/40',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-iiml-navy text-white shadow-[0_4px_16px_rgba(26,39,68,0.28)] hover:shadow-[0_6px_20px_rgba(26,39,68,0.36)] hover:bg-[#1e2f56]',
    gold: 'bg-iiml-gold text-iiml-navy shadow-[0_4px_16px_rgba(201,162,39,0.30)] hover:shadow-[0_6px_20px_rgba(201,162,39,0.38)] hover:bg-[#d4aa2c]',
    danger: 'bg-iiml-red text-white shadow-[0_4px_16px_rgba(192,57,43,0.28)] hover:shadow-[0_6px_20px_rgba(192,57,43,0.36)]',
    outline: 'border border-iiml-navy/25 text-iiml-navy bg-white/40 hover:bg-white/65',
    ghost: 'text-iiml-navy hover:bg-black/5',
  };
  return (
    <button
      className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          {label}
        </span>
      )}
      <input
        className="glass-input w-full px-4 py-3 rounded-2xl text-sm text-gray-800 placeholder-gray-400"
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          {label}
        </span>
      )}
      <select
        className="glass-input w-full px-4 py-3 rounded-2xl text-sm text-gray-800 cursor-pointer"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Card({ title, children, action }) {
  return (
    <div className="glass rounded-3xl shadow-[0_8px_32px_rgba(26,39,68,0.07)] overflow-hidden">
      {(title || action) && (
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          {title && (
            <h2 className="font-bold text-iiml-navy text-sm tracking-tight">{title}</h2>
          )}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
