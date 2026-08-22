import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setToken, clearToken, getToken } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking
  const [org, setOrg] = useState(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setUser(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        if (r.data && typeof r.data === "object" && r.data.user) {
          setUser(r.data.user);
          setOrg(r.data.organization || null);
        } else {
          clearToken();
          setUser(false);
        }
      })
      .catch(() => {
        clearToken();
        setUser(false);
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
    try {
      const me = await api.get("/auth/me");
      if (me.data && me.data.organization) {
        setOrg(me.data.organization);
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
    try {
      const me = await api.get("/auth/me");
      if (me.data && me.data.organization) {
        setOrg(me.data.organization);
      }
    } catch {}
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    clearToken();
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
