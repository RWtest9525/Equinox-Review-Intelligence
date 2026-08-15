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
        setUser(r.data.user);
        setOrg(r.data.organization);
      })
      .catch(() => {
        clearToken();
        setUser(false);
      });
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.access_token);
    setUser(data.user);
    const me = await api.get("/auth/me");
    setOrg(me.data.organization);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setToken(data.access_token);
    setUser(data.user);
    const me = await api.get("/auth/me");
    setOrg(me.data.organization);
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
