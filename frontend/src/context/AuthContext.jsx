import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setToken, clearToken, getToken } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const USER_CACHE_KEY = "equinox_cached_user";
const ORG_CACHE_KEY = "equinox_cached_org";

function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCachedOrg() {
  try {
    const raw = localStorage.getItem(ORG_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = getCachedUser();
    const token = getToken();
    if (cached && token) return cached;
    return token ? null : false;
  });
  const [org, setOrg] = useState(() => getCachedOrg());

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setUser(false);
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(ORG_CACHE_KEY);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        if (r.data && typeof r.data === "object" && r.data.user) {
          setUser(r.data.user);
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(r.data.user));
          if (r.data.organization) {
            setOrg(r.data.organization);
            localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(r.data.organization));
          }
        }
      })
      .catch(() => {
        // In case of error but token exists, keep cached user intact so user is never logged out
        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
        }
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const data = res.data;
    if (!data || typeof data !== "object" || !data.access_token) {
      throw new Error("Unable to authenticate. Invalid response from server.");
    }
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
    try {
      const me = await api.get("/auth/me");
      if (me.data && me.data.organization) {
        setOrg(me.data.organization);
        localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(me.data.organization));
      }
    } catch {}
    return data.user;
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    const data = res.data;
    if (!data || typeof data !== "object" || !data.access_token) {
      throw new Error("Unable to create account. Invalid response from server.");
    }
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
    try {
      const me = await api.get("/auth/me");
      if (me.data && me.data.organization) {
        setOrg(me.data.organization);
        localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(me.data.organization));
      }
    } catch {}
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    clearToken();
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(ORG_CACHE_KEY);
    setUser(false);
    setOrg(null);
    window.location.href = "/login";
  };

  return (
    <AuthCtx.Provider value={{ user, org, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
