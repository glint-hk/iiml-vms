const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('iiml_vms_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (email) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),
  getDemoUsers: () => request('/auth/demo-users'),
  me: () => request('/auth/me'),

  createInvite: (body) => request('/invites', { method: 'POST', body: JSON.stringify(body) }),
  bulkInvite: (body) => request('/invites/bulk', { method: 'POST', body: JSON.stringify(body) }),
  getMyInvites: () => request('/invites/mine'),
  cancelInvite: (id) => request(`/invites/${id}/cancel`, { method: 'POST' }),
  getQr: (id) => request(`/invites/${id}/qr`),

  lookupQr: (token) => request(`/gate/lookup/${token}`),
  checkIn: (token, forceZone) => request('/gate/check-in', { method: 'POST', body: JSON.stringify({ token, forceZone }) }),
  checkOut: (token) => request('/gate/check-out', { method: 'POST', body: JSON.stringify({ token }) }),
  walkIn: (body) => request('/gate/walk-in', { method: 'POST', body: JSON.stringify(body) }),
  override: (body) => request('/gate/override', { method: 'POST', body: JSON.stringify(body) }),
  gateActivity: () => request('/gate/activity'),
  overrideReasons: () => request('/gate/override-reasons'),
  lookupRecurring: (token) => request(`/gate/recurring/${token}`),
  recurringCheckIn: (token) => request('/gate/recurring/check-in', { method: 'POST', body: JSON.stringify({ token }) }),
  recurringCheckOut: (token) => request('/gate/recurring/check-out', { method: 'POST', body: JSON.stringify({ token }) }),

  recurringPasses: () => request('/recurring-passes'),
  createRecurringPass: (body) => request('/recurring-passes', { method: 'POST', body: JSON.stringify(body) }),
  revokeRecurringPass: (id) => request(`/recurring-passes/${id}/revoke`, { method: 'POST' }),

  notifications: () => request('/notifications'),
  notificationUnreadCount: () => request('/notifications/unread-count'),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  dashboard: () => request('/admin/dashboard'),
  occupancy: () => request('/admin/occupancy'),
  visitorLog: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/visitors${q ? `?${q}` : ''}`);
  },
  exportLog: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/export${q ? `?${q}` : ''}`);
  },
  blacklist: () => request('/admin/blacklist'),
  addBlacklist: (body) => request('/admin/blacklist', { method: 'POST', body: JSON.stringify(body) }),
  removeBlacklist: (id) => request(`/admin/blacklist/${id}`, { method: 'DELETE' }),
  incidents: () => request('/admin/incidents'),
  dsr: () => request('/admin/dsr'),
  createDsr: (body) => request('/admin/dsr', { method: 'POST', body: JSON.stringify(body) }),
  completeDsr: (id) => request(`/admin/dsr/${id}/complete`, { method: 'POST' }),
  auditLog: () => request('/admin/audit'),
  users: () => request('/admin/users'),
  updateUserRole: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  gates: () => request('/admin/gates'),
  overstayVisitors: (hours) => request(`/admin/overstay${hours ? `?hours=${hours}` : ''}`),
  resolveIncident: (id) => request(`/admin/incidents/${id}/resolve`, { method: 'PATCH' }),

  flagEmergency: (body) => request('/gate/emergency', { method: 'POST', body: JSON.stringify(body) }),
};

export function setToken(token) {
  localStorage.setItem('iiml_vms_token', token);
}

export function clearToken() {
  localStorage.removeItem('iiml_vms_token');
}
