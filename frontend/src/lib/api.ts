import axios from "axios";

import type {
  ClassifierDepartment,
  ClassifierDepartmentRequest,
  ClassifierProcessStage,
  ClassifierProcessStageRequest,
  ClassifierServer,
  ClassifierServerRequest,
  ClassifierSystemType,
  ClassifierSystemTypeRequest,
  ClassifierTable,
  ClassifierTableRequest,
  ControlDetail,
  ControlListItem,
  ControlOverviewRequest,
  ControlRequest,
  ControlUniqueNumberResponse,
  DashboardResponse,
  LoginResponse,
  LogsResponse,
  LookupResponse,
  SqlQueryExecutionRequest,
  SqlQueryExecutionStartResponse,
  SqlQueryExecutionStatusResponse,
  UserProfile,
} from "@/lib/types";

const baseURL = import.meta.env.VITE_API_URL?.trim() || "/api";
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

export async function fetchControls(params?: {
  q?: string;
  deploymentScope?: string;
  directionType?: string;
  systemName?: string;
  controlType?: string;
  processStage?: string;
}) {
  const { data } = await api.get<ControlListItem[]>("/controls", { params });
  return data;
}

export async function fetchControl(id: string) {
  const { data } = await api.get<ControlDetail>(`/controls/${id}`);
  return data;
}

export async function fetchNextControlUniqueNumber() {
  const { data } = await api.get<ControlUniqueNumberResponse>("/controls/next-unique-number");
  return data;
}

export async function createControlOverview(payload: ControlOverviewRequest) {
  const { data } = await api.post<ControlDetail>("/controls/overview", payload);
  return data;
}

export async function updateControlOverview(id: string, payload: ControlOverviewRequest) {
  const { data } = await api.put<ControlDetail>(`/controls/${id}/overview`, payload);
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

export async function downloadControlBasisFile(id: string) {
  const response = await api.get<Blob>(`/controls/${id}/basis-file`, {
    responseType: "blob",
  });
  return response.data;
}

export async function duplicateControl(id: string) {
  const { data } = await api.post<ControlDetail>(`/controls/${id}/duplicate`);
  return data;
}

export async function startSqlQueryExecution(payload: SqlQueryExecutionRequest) {
  const { data } = await api.post<SqlQueryExecutionStartResponse>("/sql-runner/executions", payload);
  return data;
}

export async function fetchSqlQueryExecutionStatus(executionId: string) {
  const { data } = await api.get<SqlQueryExecutionStatusResponse>(`/sql-runner/executions/${executionId}`);
  return data;
}

export async function cancelSqlQueryExecution(executionId: string) {
  const { data } = await api.post<SqlQueryExecutionStatusResponse>(`/sql-runner/executions/${executionId}/cancel`);
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

export async function fetchClassifierDepartments() {
  const { data } = await api.get<ClassifierDepartment[]>("/classifiers/departments");
  return data;
}

export async function createClassifierDepartment(payload: ClassifierDepartmentRequest) {
  const { data } = await api.post<ClassifierDepartment>("/classifiers/departments", payload);
  return data;
}

export async function updateClassifierDepartment(id: string, payload: ClassifierDepartmentRequest) {
  const { data } = await api.put<ClassifierDepartment>(`/classifiers/departments/${id}`, payload);
  return data;
}

export async function deleteClassifierDepartment(id: string) {
  await api.delete(`/classifiers/departments/${id}`);
}

export async function fetchClassifierProcessStages() {
  const { data } = await api.get<ClassifierProcessStage[]>("/classifiers/process-stages");
  return data;
}

export async function createClassifierProcessStage(payload: ClassifierProcessStageRequest) {
  const { data } = await api.post<ClassifierProcessStage>("/classifiers/process-stages", payload);
  return data;
}

export async function updateClassifierProcessStage(id: string, payload: ClassifierProcessStageRequest) {
  const { data } = await api.put<ClassifierProcessStage>(`/classifiers/process-stages/${id}`, payload);
  return data;
}

export async function deleteClassifierProcessStage(id: string) {
  await api.delete(`/classifiers/process-stages/${id}`);
}

export async function fetchClassifierSystemTypes() {
  const { data } = await api.get<ClassifierSystemType[]>("/classifiers/system-types");
  return data;
}

export async function fetchClassifierServers() {
  const { data } = await api.get<ClassifierServer[]>("/classifiers/servers");
  return data;
}

export async function fetchClassifierTables() {
  const { data } = await api.get<ClassifierTable[]>("/classifiers/tables");
  return data;
}

export async function updateClassifierTable(id: string, payload: ClassifierTableRequest) {
  const { data } = await api.put<ClassifierTable>(`/classifiers/tables/${id}`, payload);
  return data;
}

export async function deleteClassifierTable(id: string) {
  await api.delete(`/classifiers/tables/${id}`);
}

export async function createClassifierSystemType(payload: ClassifierSystemTypeRequest) {
  const { data } = await api.post<ClassifierSystemType>("/classifiers/system-types", payload);
  return data;
}

export async function updateClassifierSystemType(id: string, payload: ClassifierSystemTypeRequest) {
  const { data } = await api.put<ClassifierSystemType>(`/classifiers/system-types/${id}`, payload);
  return data;
}

export async function deleteClassifierSystemType(id: string) {
  await api.delete(`/classifiers/system-types/${id}`);
}

export async function createClassifierServer(payload: ClassifierServerRequest) {
  const { data } = await api.post<ClassifierServer>("/classifiers/servers", payload);
  return data;
}

export async function updateClassifierServer(id: string, payload: ClassifierServerRequest) {
  const { data } = await api.put<ClassifierServer>(`/classifiers/servers/${id}`, payload);
  return data;
}

export async function deleteClassifierServer(id: string) {
  await api.delete(`/classifiers/servers/${id}`);
}
