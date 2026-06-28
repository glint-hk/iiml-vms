import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient.js';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const [{ count: c }, list] = await Promise.all([
        api.notificationUnreadCount(),
        api.notifications(),
      ]);
      setCount(c);
      setItems(list.slice(0, 10));
    } catch {
      /* not logged in or no access */
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  async function markAll() {
    await api.markAllNotificationsRead();
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-iiml-red text-white text-xs rounded-full flex items-center justify-center font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center bg-iiml-cream">
              <span className="font-semibold text-sm text-iiml-navy">Notifications</span>
              {count > 0 && (
                <button onClick={markAll} className="text-xs text-iiml-navy hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
              ) : (
                items.map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                    <p className="font-medium text-sm text-iiml-navy">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
