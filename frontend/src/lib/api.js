import axios from "axios";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";
const TOKEN_KEY = "equinox_token";

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t && t !== "undefined" && t !== "null") cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => {
    if (typeof r.data === "string" && (r.data.includes("<!DOCTYPE html") || r.data.includes("<!doctype html") || r.data.includes("<html"))) {
      return Promise.reject(new Error("Unable to reach the backend API. Please make sure the backend server is running and REACT_APP_BACKEND_URL is properly configured."));
    }
    return r;
  },
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const setToken = (t) => {
  if (t && t !== "undefined" && t !== "null") {
    localStorage.setItem(TOKEN_KEY, t);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getToken = () => {
  const t = localStorage.getItem(TOKEN_KEY);
  return t && t !== "undefined" && t !== "null" ? t : null;
};

export function apiErr(e) {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  if (d?.msg) return d.msg;
  return String(d);
}

export default api;
