import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, clearToken } from './apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('iiml_vms_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email) {
    const { token, user: u } = await api.login(email);
    setToken(token);
    setUser(u);
    return u;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export const ROLE_ROUTES = {
  GUARD: '/guard',
  HOST: '/host',
  ADMIN: '/admin',
  SECURITY_HEAD: '/security',
  LEADERSHIP: '/leadership',
  IT_ADMIN: '/admin',
};

export function getHomeRoute(role) {
  return ROLE_ROUTES[role] || '/login';
}
