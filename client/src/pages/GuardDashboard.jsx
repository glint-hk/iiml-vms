import { useState, useEffect } from 'react';
import { ScanLine, LogIn, LogOut, UserPlus, AlertTriangle, Repeat, ShieldAlert, WifiOff, Camera } from 'lucide-react';
import AppShell, { Card, Button, Input, Select, Badge } from '../components/AppShell.jsx';
import { lazy, Suspense } from 'react';
const QrCameraScanner = lazy(() => import('../components/QrCameraScanner.jsx'));
import { api } from '../lib/apiClient.js';

const LABELS = {
  en: {
    title: 'Walk-In Registration',
    language: 'Language / भाषा',
    consentHeading: 'Biometric Consent',
    consentText: 'Visitor consents to face photo capture for visit duration only. Data purged within 24h per DPDP Act 2023.',
    visitorName: 'Visitor Name',
    mobile: 'Mobile (OTP verified)',
    purpose: 'Purpose of Visit',
    hostEmail: 'Host Email (optional)',
    idType: 'ID Type',
    idLastFour: 'ID Last 4 Digits Only',
    submit: 'Register & Check In',
    consentRequired: 'Biometric consent must be confirmed before registration',
    category: 'Visitor Category',
    zone: 'Zone',
  },
  hi: {
    title: 'वॉक-इन पंजीकरण',
    language: 'भाषा / Language',
    consentHeading: 'बायोमेट्रिक सहमति',
    consentText: 'आगंतुक केवल यात्रा अवधि के लिए फोटो कैप्चर हेतु सहमत हैं। DPDP अधिनियम 2023 के अनुसार 24 घंटे में डेटा हटाया जाएगा।',
    visitorName: 'आगंतुक का नाम',
    mobile: 'मोबाइल नंबर (OTP सत्यापित)',
    purpose: 'यात्रा का उद्देश्य',
    hostEmail: 'होस्ट ईमेल (वैकल्पिक)',
    idType: 'पहचान पत्र का प्रकार',
    idLastFour: 'पहचान पत्र के अंतिम 4 अंक',
    submit: 'पंजीकरण करें और चेक इन करें',
    consentRequired: 'पंजीकरण से पहले बायोमेट्रिक सहमति अनिवार्य है',
    category: 'आगंतुक वर्ग',
    zone: 'क्षेत्र',
  },
};

export default function GuardDashboard() {
  const [mode, setMode] = useState('scan');
  const [token, setToken] = useState('');
  const [lookup, setLookup] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recurringLookup, setRecurringLookup] = useState(null);
  const [walkIn, setWalkIn] = useState({
    visitorName: '', mobile: '', purpose: '', hostEmail: '',
    category: 'OTHER', zone: 'MAIN_CAMPUS', idType: 'Aadhaar', idLastFour: '',
    language: 'en', consentGiven: false,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ description: '', location: '' });
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadActivity() {
    const data = await api.gateActivity();
    setActivity(data);
  }

  useEffect(() => { loadActivity(); }, []);

  async function handleLookup(e) {
    e.preventDefault();
    setError('');
    setLookup(null);
    try {
      const data = await api.lookupQr(token.trim());
      setLookup(data);
    } catch (err) {
      setError(err.data?.error || err.message);
      if (err.data?.code === 'BLACKLIST') {
        setLookup({ blacklist: true, visit: err.data.visit });
      }
    }
  }

  async function handleCameraScan(decoded) {
    setCameraOpen(false);
    setToken(decoded);
    setError('');
    setLookup(null);
    try {
      const data = await api.lookupQr(decoded.trim());
      setLookup(data);
    } catch (err) {
      setError(err.data?.error || err.message);
      if (err.data?.code === 'BLACKLIST') {
        setLookup({ blacklist: true, visit: err.data.visit });
      }
    }
  }

  async function handleCheckIn(forceZone = false) {
    setError('');
    try {
      const result = await api.checkIn(token.trim(), forceZone);
      setSuccess(`${result.visit.visitor.name} checked in. ${result.notification || ''}`);
      setLookup(null);
      setToken('');
      loadActivity();
    } catch (err) {
      if (err.data?.code === 'ZONE_MISMATCH') {
        setLookup({ ...lookup, zoneMismatch: true, zoneError: err.data.error, visit: err.data.visit });
      } else {
        setError(err.data?.error || err.message);
      }
    }
  }

  async function handleCheckOut() {
    setError('');
    try {
      const result = await api.checkOut(token.trim());
      setSuccess(`${result.visit.visitor.name} checked out.`);
      setLookup(null);
      setToken('');
      loadActivity();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  const L = LABELS[walkIn.language] || LABELS.en;

  async function handleWalkIn(e) {
    e.preventDefault();
    if (!walkIn.consentGiven) {
      setError(L.consentRequired);
      return;
    }
    setError('');
    try {
      const result = await api.walkIn({ ...walkIn, consentMethod: 'thumbprint' });
      setSuccess(`Walk-in registered: ${result.visit.visitor.name}`);
      setWalkIn({ visitorName: '', mobile: '', purpose: '', hostEmail: '', category: 'OTHER', zone: 'MAIN_CAMPUS', idType: 'Aadhaar', idLastFour: '', language: 'en', consentGiven: false });
      loadActivity();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function handleRecurringLookup(e) {
    e.preventDefault();
    setError('');
    setRecurringLookup(null);
    try {
      const data = await api.lookupRecurring(token.trim());
      setRecurringLookup(data);
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function handleRecurringCheckIn() {
    setError('');
    try {
      const result = await api.recurringCheckIn(token.trim());
      setSuccess(result.message);
      setRecurringLookup(null);
      setToken('');
      loadActivity();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function handleRecurringCheckOut() {
    setError('');
    try {
      const result = await api.recurringCheckOut(token.trim());
      setSuccess(result.message);
      setRecurringLookup(null);
      setToken('');
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function handleEmergency(e) {
    e.preventDefault();
    setEmergencySubmitting(true);
    try {
      await api.flagEmergency(emergencyForm);
      setEmergencyOpen(false);
      setEmergencyForm({ description: '', location: '' });
      setSuccess('EMERGENCY ALERT sent to Security Head');
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setEmergencySubmitting(false);
    }
  }

  return (
    <AppShell title="Guard Tablet" subtitle="Gate operations — scan, verify, clear">
      {!isOnline && (
        <div className="mb-4 p-3 bg-gray-800 text-white rounded-xl flex items-center gap-3">
          <WifiOff size={20} className="text-amber-400 shrink-0" />
          <span className="font-medium">OFFLINE — Gate clearance may use cached data. Reconnect ASAP.</span>
        </div>
      )}

      {emergencyOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="text-red-600" size={22} />
              </div>
              <div>
                <h3 className="font-bold text-red-700 text-lg">Emergency Alert</h3>
                <p className="text-xs text-gray-500">Notifies Security Head immediately (P0)</p>
              </div>
            </div>
            <form onSubmit={handleEmergency} className="space-y-3">
              <Input
                label="Location / Description"
                placeholder="e.g. Main gate — suspicious individual"
                value={emergencyForm.description}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, description: e.target.value })}
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emergencySubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-bold text-sm disabled:opacity-50"
                >
                  {emergencySubmitting ? 'Sending…' : 'SEND ALERT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {[
          ['scan', 'Scan QR', ScanLine],
          ['recurring', 'Recurring Pass', Repeat],
          ['walkin', 'Walk-In', UserPlus],
          ['activity', 'Activity', LogIn],
        ].map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${mode === m ? 'bg-iiml-navy text-white shadow-[0_4px_14px_rgba(26,39,68,0.28)]' : 'glass text-iiml-navy hover:bg-white/80'}`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
        <button
          onClick={() => { setEmergencyOpen(true); setError(''); setSuccess(''); }}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors animate-pulse"
        >
          <ShieldAlert size={18} /> SOS / Emergency
        </button>
      </div>

      {success && <div className="mb-4 p-4 rounded-xl bg-green-50 text-green-800 font-medium">{success}</div>}
      {error && <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-800 font-medium">{error}</div>}

      {cameraOpen && (
        <Suspense fallback={null}>
          <QrCameraScanner
            onScan={handleCameraScan}
            onClose={() => setCameraOpen(false)}
          />
        </Suspense>
      )}

      {mode === 'scan' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Scan QR Token">
            {/* Camera scan button — primary action */}
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="w-full mb-4 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-iiml-gold/40 bg-iiml-gold/5 hover:bg-iiml-gold/10 hover:border-iiml-gold/60 transition-all duration-200 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-iiml-gold/15 group-hover:bg-iiml-gold/25 flex items-center justify-center transition-colors">
                <Camera size={28} className="text-iiml-gold" />
              </div>
              <div className="text-center">
                <p className="font-bold text-iiml-navy text-sm">Open Camera</p>
                <p className="text-gray-400 text-xs mt-0.5">Tap to scan visitor's QR pass</p>
              </div>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-black/8" />
              <span className="text-xs text-gray-400 font-medium">or enter manually</span>
              <div className="flex-1 h-px bg-black/8" />
            </div>

            <form onSubmit={handleLookup} className="space-y-3">
              <Input
                label="QR Token"
                placeholder="Paste token here"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">Look Up Visitor</Button>
            </form>
          </Card>

          {lookup && (
            <Card title={lookup.blacklist ? '⛔ BLACKLIST ALERT' : 'Visitor Context'}>
              {lookup.blacklist ? (
                <div className="text-center py-6">
                  <AlertTriangle className="mx-auto text-red-600 mb-3" size={48} />
                  <p className="text-xl font-bold text-red-700">DO NOT ALLOW ENTRY</p>
                  <p className="text-gray-600 mt-2">Contact Security Head immediately</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Name</span><p className="font-semibold">{lookup.visit.visitor.name}</p></div>
                    <div><span className="text-gray-500">Mobile</span><p className="font-semibold">{lookup.visit.visitor.mobile}</p></div>
                    <div><span className="text-gray-500">Host</span><p className="font-semibold">{lookup.visit.host?.name || '—'}</p></div>
                    <div><span className="text-gray-500">Purpose</span><p className="font-semibold">{lookup.visit.purpose}</p></div>
                    <div><span className="text-gray-500">Zone</span><p className="font-semibold">{lookup.visit.zone}</p></div>
                    <div><span className="text-gray-500">Window</span><p className="font-semibold">{lookup.windowStatus}</p></div>
                  </div>
                  {lookup.zoneWarning && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      ⚠ {lookup.zoneWarning}
                    </div>
                  )}
                  {lookup.zoneMismatch && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                      <p className="text-red-800 font-medium">{lookup.zoneError}</p>
                      <Button variant="danger" className="mt-2 w-full" onClick={() => handleCheckIn(true)}>
                        Override & Allow Entry
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-3 pt-3">
                    {lookup.visit.status !== 'CHECKED_IN' && !lookup.zoneMismatch ? (
                      <Button onClick={handleCheckIn} className="flex-1 flex items-center justify-center gap-2">
                        <LogIn size={18} /> Check In
                      </Button>
                    ) : (
                      <Button onClick={handleCheckOut} variant="gold" className="flex-1 flex items-center justify-center gap-2">
                        <LogOut size={18} /> Check Out
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {mode === 'recurring' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Recurring Pass Lookup">
            <p className="text-sm text-gray-500 mb-4">For daily workers (sanitation, maintenance). Demo token: <code className="bg-gray-100 px-1 rounded">demo-recurring-pass-meena</code></p>
            <form onSubmit={handleRecurringLookup} className="space-y-4">
              <Input label="Pass Token" value={token} onChange={(e) => setToken(e.target.value)} required />
              <Button type="submit" className="w-full">Look Up Pass</Button>
            </form>
          </Card>
          {recurringLookup && (
            <Card title="Recurring Worker">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Name</span><p className="font-semibold">{recurringLookup.pass.visitor.name}</p></div>
                  <div><span className="text-gray-500">Status</span><p className="font-semibold">{recurringLookup.status}</p></div>
                  <div><span className="text-gray-500">Purpose</span><p className="font-semibold">{recurringLookup.pass.purpose}</p></div>
                  <div><span className="text-gray-500">Zone</span><p className="font-semibold">{recurringLookup.pass.zone}</p></div>
                  <div><span className="text-gray-500">Shift</span><p className="font-semibold">{recurringLookup.pass.shiftStart}–{recurringLookup.pass.shiftEnd}</p></div>
                  <div><span className="text-gray-500">Biometric</span><p className="font-semibold">{recurringLookup.pass.biometricEnrolled ? 'Enrolled' : 'Pending'}</p></div>
                </div>
                {recurringLookup.status === 'VALID' && !recurringLookup.onCampus && (
                  <Button onClick={handleRecurringCheckIn} className="w-full flex items-center justify-center gap-2">
                    <LogIn size={18} /> Check In (Biometric Simulated)
                  </Button>
                )}
                {recurringLookup.onCampus && (
                  <Button onClick={handleRecurringCheckOut} variant="gold" className="w-full flex items-center justify-center gap-2">
                    <LogOut size={18} /> Check Out
                  </Button>
                )}
                {recurringLookup.status === 'EXPIRED' && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-lg font-medium">Pass Expired — Contact Admin</div>
                )}
                {recurringLookup.status === 'REVOKED' && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-lg font-medium">Pass Revoked — Do Not Allow Entry</div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {mode === 'walkin' && (
        <Card title={L.title}>
          <form onSubmit={handleWalkIn} className="grid gap-4 sm:grid-cols-2">
            <Select
              label={L.language}
              value={walkIn.language}
              onChange={(e) => setWalkIn({ ...walkIn, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </Select>
            <div className="sm:col-span-2 p-4 bg-amber-400/10 rounded-2xl border border-amber-300/30">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walkIn.consentGiven}
                  onChange={(e) => setWalkIn({ ...walkIn, consentGiven: e.target.checked })}
                  className="mt-1 w-5 h-5 accent-amber-600"
                />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">
                    🔏 {L.consentHeading}
                  </p>
                  <p className="text-sm text-amber-800">{L.consentText}</p>
                </div>
              </label>
            </div>
            <Input label={L.visitorName} required value={walkIn.visitorName} onChange={(e) => setWalkIn({ ...walkIn, visitorName: e.target.value })} />
            <Input label={L.mobile} required type="tel" value={walkIn.mobile} onChange={(e) => setWalkIn({ ...walkIn, mobile: e.target.value })} />
            <Input label={L.purpose} required className="sm:col-span-2" value={walkIn.purpose} onChange={(e) => setWalkIn({ ...walkIn, purpose: e.target.value })} />
            <Input label={L.hostEmail} type="email" value={walkIn.hostEmail} onChange={(e) => setWalkIn({ ...walkIn, hostEmail: e.target.value })} />
            <Input label={L.idType} value={walkIn.idType} onChange={(e) => setWalkIn({ ...walkIn, idType: e.target.value })} />
            <Input label={L.idLastFour} maxLength={4} value={walkIn.idLastFour} onChange={(e) => setWalkIn({ ...walkIn, idLastFour: e.target.value })} />
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full">{L.submit}</Button>
            </div>
          </form>
        </Card>
      )}

      {mode === 'activity' && (
        <Card title="Recent Gate Activity">
          <div className="space-y-3">
            {activity.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] hover:bg-black/[0.05] transition-colors">
                <div>
                  <p className="font-medium">{v.visitor.name}</p>
                  <p className="text-xs text-gray-500">{v.purpose} · {v.visitType}</p>
                </div>
                <Badge variant={v.status === 'CHECKED_IN' ? 'success' : 'default'}>{v.status.replace('_', ' ')}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
