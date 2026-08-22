import axios from "axios";
import { handleMockRequest } from "./mockApi";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";
const TOKEN_KEY = "equinox_token";

const rawAxios = axios.create({ baseURL: BASE, timeout: 8000 });

rawAxios.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t && t !== "undefined" && t !== "null") cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

async function requestWrapper(method, url, dataOrConfig, maybeConfig) {
  let data = undefined;
  let config = undefined;

  if (method === "get" || method === "delete") {
    config = dataOrConfig;
  } else {
    data = dataOrConfig;
    config = maybeConfig;
  }

  // If external backend is configured, attempt real network call
  if (BACKEND_URL) {
    try {
      const res = await (method === "get"
        ? rawAxios.get(url, config)
        : method === "delete"
        ? rawAxios.delete(url, config)
        : method === "put"
        ? rawAxios.put(url, data, config)
        : rawAxios.post(url, data, config));

      if (typeof res.data === "string" && (res.data.includes("<!DOCTYPE html") || res.data.includes("<!doctype html"))) {
        return await handleMockRequest(method, url, data, config?.params);
      }
      return res;
    } catch (err) {
      if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
        throw err;
      }
      // If server is not reachable, fall back gracefully to client store
      return await handleMockRequest(method, url, data, config?.params);
    }
  }

  // Standalone client mode: use client mock database engine
  return await handleMockRequest(method, url, data, config?.params);
}

export const api = {
  get: (url, cfg) => requestWrapper("get", url, cfg),
  post: (url, data, cfg) => requestWrapper("post", url, data, cfg),
  put: (url, data, cfg) => requestWrapper("put", url, data, cfg),
  delete: (url, cfg) => requestWrapper("delete", url, cfg),
};

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
