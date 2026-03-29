import axios from "axios";

import type {
  ControlDetail,
  ControlListItem,
  ControlRequest,
  DashboardResponse,
  LoginResponse,
  LogsResponse,
  LookupResponse,
  UserProfile,
} from "@/lib/types";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8070/api";
const tokenKey = "logical-control.token";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(tokenKey);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function persistToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(tokenKey, token);
    return;
  }

  window.localStorage.removeItem(tokenKey);
}

export function readPersistedToken() {
  return window.localStorage.getItem(tokenKey);
}

export async function loginRequest(username: string, password: string) {
  const { data } = await api.post<LoginResponse>("/auth/login", { username, password });
  return data;
}

export async function currentUserRequest() {
  const { data } = await api.get<UserProfile>("/auth/me");
  return data;
}

export async function fetchDashboard() {
  const { data } = await api.get<DashboardResponse>("/dashboard/summary");
  return data;
}

export async function fetchControls(params?: { q?: string; status?: string; system?: string }) {
  const { data } = await api.get<ControlListItem[]>("/controls", { params });
  return data;
}

export async function fetchControl(id: string) {
  const { data } = await api.get<ControlDetail>(`/controls/${id}`);
  return data;
}

export async function createControl(payload: ControlRequest) {
  const { data } = await api.post<ControlDetail>("/controls", payload);
  return data;
}

export async function updateControl(id: string, payload: ControlRequest) {
  const { data } = await api.put<ControlDetail>(`/controls/${id}`, payload);
  return data;
}

export async function duplicateControl(id: string) {
  const { data } = await api.post<ControlDetail>(`/controls/${id}/duplicate`);
  return data;
}

export async function fetchLogs(result?: string) {
  const { data } = await api.get<LogsResponse>("/logs", {
    params: result ? { result } : undefined,
  });
  return data;
}

export async function fetchLookups() {
  const { data } = await api.get<LookupResponse>("/lookups/bootstrap");
  return data;
}
