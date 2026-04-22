export type LocaleCode = "UZ" | "OZ" | "RU" | "EN";
export type ThemeMode = "light" | "dark" | "system";
export type PaletteName = "ocean" | "copper" | "emerald" | "graphite";

export type ControlSystem = string;
export type ControlType = "WARNING" | "ALLOW" | "BLOCK";
export type ControlStatus = "ACTIVE" | "CANCELLED" | "SUSPENDED";
export type DeploymentScope = "INTERNAL" | "EXTERNAL" | "HYBRID";
export type ControlDirection = "ENTRY" | "EXIT";
export type ConfidentialityLevel = "CONFIDENTIAL" | "NON_CONFIDENTIAL";
export type RuleType = "CONDITION" | "GROUP" | "ACTION" | "RESULT";
export type LogResult = "POSITIVE" | "NEGATIVE";

export const CONFIDENTIALITY_LEVEL_CONFIDENTIAL: ConfidentialityLevel = "CONFIDENTIAL";
export const CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL: ConfidentialityLevel = "NON_CONFIDENTIAL";

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  locale: LocaleCode;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: UserProfile;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  hint: string;
}

export interface DashboardTrendPoint {
  label: string;
  daily: number;
  monthly: number;
  yearly: number;
}

export interface DashboardRecentActivity {
  controlId: string;
  controlCode: string;
  controlName: string;
  result: LogResult;
  whenLabel: string;
}

export interface DashboardResponse {
  metrics: DashboardMetric[];
  trend: DashboardTrendPoint[];
  recentActivities: DashboardRecentActivity[];
}

export interface DictionaryEntry {
  code: string;
  labels: Record<LocaleCode, string>;
}

export interface LookupResponse {
  dictionaries: Record<string, DictionaryEntry[]>;
  roles: Array<{ code: string; name: string }>;
}

export interface ClassifierDepartment {
  id: string;
  name: string;
  departmentType: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierDepartmentRequest {
  name: string;
  departmentType: string;
  active: boolean;
}

export interface ClassifierProcessStage {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierProcessStageRequest {
  name: string;
  description: string;
  active: boolean;
  sortOrder?: number;
}

export interface ClassifierSystemType {
  id: string;
  systemName: string;
  scopeType: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierSystemTypeRequest {
  systemName: string;
  scopeType: string;
  active: boolean;
}

export interface ClassifierServer {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierServerRequest {
  name: string;
  description: string;
  active: boolean;
}

export interface ClassifierRole {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierRoleRequest {
  name: string;
  active: boolean;
}

export interface ClassifierState {
  id: string;
  code: string;
  name: string;
  lang: LocaleCode;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifierStateRequest {
  code: string;
  name: string;
  lang: LocaleCode;
  active: boolean;
}

export interface ClassifierTableColumn {
  id: string | null;
  name: string;
  dataType: string;
  description: string | null;
  nullable: boolean | null;
  ordinalPosition: number;
}

export interface ClassifierTableColumnRequest {
  id: string;
  name: string;
  dataType: string;
  description: string;
  nullable: boolean | null;
  ordinalPosition: number;
}

export interface ClassifierTable {
  id: string | null;
  tableName: string;
  description: string;
  systemType: string;
  columns: ClassifierTableColumn[];
}

export interface ClassifierTableRequest {
  tableName: string;
  description: string;
  systemType: string;
  columns: ClassifierTableColumnRequest[];
}

export interface ControlRule {
  id?: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
  ruleType: RuleType;
  definition: Record<string, unknown>;
  visual: Record<string, unknown>;
}

export interface ControlListItem {
  id: string;
  code: string;
  uniqueNumber: string;
  name: string;
  currentStateCode: string | null;
  currentStateName: string | null;
  systemName: ControlSystem;
  deploymentScope: DeploymentScope;
  directionType: ControlDirection | null;
  controlType: ControlType;
  status: ControlStatus;
  processStage: string;
  confidentialityLevel: ConfidentialityLevel;
  priorityOrder: number | null;
  versionNumber: number;
  startDate: string | null;
  finishDate: string | null;
  ruleCount: number;
  logCount: number;
  updatedAt: string;
}

export interface ControlLogItem {
  id: string;
  instime: string;
  result: LogResult;
  declarationId: string | null;
  declarationUncodId: string | null;
  durationMs: number | null;
  matchedRuleName: string | null;
  details: Record<string, unknown>;
}

export interface ChangeLogItem {
  id: string;
  actor: string;
  action: string;
  changedAt: string;
  details: Record<string, unknown>;
}

export interface FieldChangeItem {
  id: string;
  actor: string;
  changedAt: string;
  fieldPath: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface ControlRequest {
  code: string;
  name: string;
  objective: string;
  basis: string;
  tableName: string;
  basisFileName: string;
  basisFileContentType: string;
  basisFileSize: number | null;
  basisFileBase64: string | null;
  basisFileRemoved: boolean;
  systemName: string;
  approvers: string[];
  approverDepartmentIds: string[];
  startDate: string | null;
  finishDate: string | null;
  uniqueNumber: string;
  controlType: ControlType;
  processStage: string;
  authorName: string;
  responsibleDepartment: string;
  status: ControlStatus;
  suspendedUntil: string | null;
  messages: Record<LocaleCode, string>;
  phoneExtension: string;
  priorityOrder: number;
  confidentialityLevel: ConfidentialityLevel;
  smsNotificationEnabled: boolean;
  smsPhones: string[];
  deploymentScope: DeploymentScope;
  directionType: ControlDirection | null;
  versionNumber: number;
  timeoutMs: number;
  lastExecutionDurationMs: number;
  territories: string[];
  posts: string[];
  autoCancelAfterDays: number;
  conflictMonitoringEnabled: boolean;
  copiedFromControlId: string | null;
  ruleBuilderCanvas: Record<string, unknown>;
  rules: ControlRule[];
}

export interface ControlOverviewRequest {
  name: string;
  objective: string;
  basis: string;
  tableName: string;
  basisFileName: string;
  basisFileContentType: string;
  basisFileSize: number | null;
  basisFileBase64: string | null;
  basisFileRemoved: boolean;
  systemName: string;
  approverDepartmentIds: string[];
  startDate: string | null;
  finishDate: string | null;
  controlType: ControlType;
  processStage: string;
  smsNotificationEnabled: boolean;
  smsPhones: string[];
  deploymentScope: DeploymentScope;
  directionType: ControlDirection | null;
  confidentialityLevel: ConfidentialityLevel;
}

export interface ControlUniqueNumberResponse {
  uniqueNumber: string;
}

export type SqlQueryExecutionStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface SqlQueryExecutionRequest {
  sql: string;
  serverName: string;
}

export interface SqlQueryExecutionResult {
  columns: string[];
  rows: Array<Array<string | null>>;
  totalRows: number;
  truncated: boolean;
}

export interface SqlQueryExecutionStartResponse {
  executionId: string;
  status: SqlQueryExecutionStatus;
  logMessage: string;
  stopAvailable: boolean;
}

export interface SqlQueryExecutionStatusResponse {
  executionId: string;
  status: SqlQueryExecutionStatus;
  serverName: string;
  logMessage: string;
  errorMessage: string | null;
  stopAvailable: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: SqlQueryExecutionResult | null;
}

export interface ControlDetail extends ControlRequest {
  id: string;
  hasBasisFile: boolean;
  currentStateCode: string | null;
  currentStateName: string | null;
  recentLogs: ControlLogItem[];
  changeLogs: ChangeLogItem[];
  fieldChangeLogs: FieldChangeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LogsResponse {
  total: number;
  positive: number;
  negative: number;
  items: Array<{
    id: string;
    controlId: string;
    controlCode: string;
    controlName: string;
    instime: string;
    result: LogResult;
    declarationId: string | null;
    declarationUncodId: string | null;
    durationMs: number | null;
    matchedRuleName: string | null;
    details: Record<string, unknown>;
  }>;
}

export const localeLabels: Record<LocaleCode, string> = {
  UZ: "Ўзбек",
  OZ: "O'zbek",
  RU: "Русский",
  EN: "English",
};

export const paletteOptions: Array<{ value: PaletteName; label: string; hint: string }> = [
  { value: "ocean", label: "Ocean", hint: "Tiniq va ishonchli" },
  { value: "copper", label: "Copper", hint: "Issiq va premium" },
  { value: "emerald", label: "Emerald", hint: "Sokin va toza" },
  { value: "graphite", label: "Graphite", hint: "Texnik va jiddiy" },
];

export function createDefaultRule(order = 0): ControlRule {
  return {
    name: order === 0 ? "Start condition" : `Rule ${order + 1}`,
    description: "",
    sortOrder: order,
    active: true,
    ruleType: order === 0 ? "CONDITION" : "RESULT",
    definition: order === 0 ? { field: "permit.expireDate", operator: ">=", value: "today" } : { action: "ALLOW" },
    visual: {},
  };
}

export function normalizeConfidentialityLevelKey(value: string | null | undefined): ConfidentialityLevel {
  const normalized = value?.trim();
  if (!normalized) {
    return CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL;
  }

  const normalizedKey = normalized.toUpperCase().replace(/[\s-]+/g, "_");
  return normalizedKey === "MAXFIY" || normalizedKey === CONFIDENTIALITY_LEVEL_CONFIDENTIAL
    ? CONFIDENTIALITY_LEVEL_CONFIDENTIAL
    : CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL;
}

export function normalizeLocaleCode(value: string | null | undefined): LocaleCode {
  const normalized = value?.trim();
  if (!normalized) {
    return "OZ";
  }

  switch (normalized.toLowerCase()) {
    case "uz":
    case "uzcyrl":
    case "uz-cyrl":
      return "UZ";
    case "oz":
    case "uzlatn":
    case "uz-latn":
      return "OZ";
    case "ru":
      return "RU";
    case "en":
      return "EN";
    default:
      return normalized === "UZ" || normalized === "OZ" || normalized === "RU" || normalized === "EN"
        ? normalized
        : "OZ";
  }
}

export function createDefaultControlRequest(): ControlRequest {
  return {
    code: "",
    name: "",
    objective: "",
    basis: "",
    tableName: "",
    basisFileName: "",
    basisFileContentType: "",
    basisFileSize: null,
    basisFileBase64: null,
    basisFileRemoved: false,
    systemName: "Yukli avtotransport (AT)",
    approvers: [],
    approverDepartmentIds: [],
    startDate: null,
    finishDate: null,
    uniqueNumber: "",
    controlType: "BLOCK",
    processStage: "Verifikatsiyadan o'tkazish",
    authorName: "",
    responsibleDepartment: "Bojxona nazorati va rasmiylashtiruvini tashkil etish boshqarmasi",
    status: "ACTIVE",
    suspendedUntil: null,
    messages: {
      UZ: "",
      OZ: "",
      RU: "",
      EN: "",
    },
    phoneExtension: "",
    priorityOrder: 1,
    confidentialityLevel: CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL,
    smsNotificationEnabled: false,
    smsPhones: [],
    deploymentScope: "INTERNAL",
    directionType: "ENTRY",
    versionNumber: 1,
    timeoutMs: 3000,
    lastExecutionDurationMs: 0,
    territories: [],
    posts: [],
    autoCancelAfterDays: 90,
    conflictMonitoringEnabled: true,
    copiedFromControlId: null,
    ruleBuilderCanvas: {
      conditionViewMode: "complex",
      title: "New rule canvas",
      nodes: [],
      edges: [],
    },
    rules: [createDefaultRule(0), createDefaultRule(1)],
  };
}

export function controlDetailToRequest(detail: ControlDetail): ControlRequest {
  return {
    code: detail.code,
    name: detail.name,
    objective: detail.objective,
    basis: detail.basis ?? "",
    tableName: detail.tableName ?? "",
    basisFileName: detail.basisFileName,
    basisFileContentType: detail.basisFileContentType,
    basisFileSize: detail.basisFileSize,
    basisFileBase64: null,
    basisFileRemoved: false,
    systemName: detail.systemName,
    approvers: Array.isArray(detail.approvers) ? detail.approvers : [],
    approverDepartmentIds: Array.isArray(detail.approverDepartmentIds) ? detail.approverDepartmentIds : [],
    startDate: detail.startDate,
    finishDate: detail.finishDate,
    uniqueNumber: detail.uniqueNumber,
    controlType: detail.controlType,
    processStage: detail.processStage,
    authorName: detail.authorName,
    responsibleDepartment: detail.responsibleDepartment,
    status: detail.status,
    suspendedUntil: detail.suspendedUntil,
    messages: detail.messages,
    phoneExtension: detail.phoneExtension ?? "",
    priorityOrder: detail.priorityOrder ?? 1,
    confidentialityLevel: normalizeConfidentialityLevelKey(detail.confidentialityLevel),
    smsNotificationEnabled: detail.smsNotificationEnabled,
    smsPhones: detail.smsPhones,
    deploymentScope: detail.deploymentScope,
    directionType: detail.directionType,
    versionNumber: detail.versionNumber,
    timeoutMs: detail.timeoutMs ?? 3000,
    lastExecutionDurationMs: detail.lastExecutionDurationMs ?? 0,
    territories: detail.territories,
    posts: detail.posts,
    autoCancelAfterDays: detail.autoCancelAfterDays ?? 90,
    conflictMonitoringEnabled: detail.conflictMonitoringEnabled,
    copiedFromControlId: detail.copiedFromControlId,
    ruleBuilderCanvas: detail.ruleBuilderCanvas,
    rules: detail.rules,
  };
}

