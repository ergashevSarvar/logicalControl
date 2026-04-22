import {
  fetchClassifierDepartments,
  fetchClassifierProcessStages,
  fetchClassifierRoles,
  fetchClassifierServers,
  fetchClassifierStates,
  fetchClassifierSystemTypes,
  fetchClassifierTables,
} from "@/lib/api";
import type {
  ClassifierDepartment,
  ClassifierProcessStage,
  ClassifierRole,
  ClassifierServer,
  ClassifierState,
  ClassifierSystemType,
  ClassifierTable,
  DeploymentScope,
} from "@/lib/types";

export const deprecatedDepartmentNames = ["Risk boshqarmasi"] as const;

export const legacyProcessStageMap: Record<string, string> = {
  VERIFICATION: "Verifikatsiyadan o'tkazish",
  ACCEPTANCE: "Qabul qilish",
  CLEARANCE: "Ma'lumot kiritish",
  DISPATCH: "Jo'natish",
  "Dastlabki tekshiruvda qabul qilish": "Qabul qilish",
  Rasmiylashtirish: "Ma'lumot kiritish",
  "Транспорт назорати": "Transport nazorati",
  "ИКМ назорати": "IKM nazorati",
  "Божхона кўздан кечируви": "Bojxona ko'zdan kechiruvi",
  "Кинолог текшируви": "Kinolog tekshiruvi",
  "Ветеринария назорати": "Veterinariya nazorati",
  "Фитосанитария назорати": "Fitosanitariya nazorati",
};

export const classifierQueryKeys = {
  departments: ["classifiers", "departments"] as const,
  processStages: ["classifiers", "processStages"] as const,
  systemTypes: ["classifiers", "systemTypes"] as const,
  roles: ["classifiers", "roles"] as const,
  statesBase: ["classifiers", "states"] as const,
  states: (lang?: string) => ["classifiers", "states", lang ?? "all"] as const,
  tables: ["classifiers", "tables"] as const,
  servers: ["classifiers", "servers"] as const,
};

export function sortClassifierDepartments(rows: ClassifierDepartment[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name, "uz"));
}

export function sortClassifierProcessStages(rows: ClassifierProcessStage[]) {
  return [...rows].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "uz"),
  );
}

export function sortClassifierSystemTypes(rows: ClassifierSystemType[]) {
  return [...rows].sort((left, right) => left.systemName.localeCompare(right.systemName, "uz"));
}

export function sortClassifierServers(rows: ClassifierServer[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name, "uz"));
}

export function sortClassifierRoles(rows: ClassifierRole[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name, "uz"));
}

export function sortClassifierStates(rows: ClassifierState[]) {
  const stateOrder: Record<string, number> = {
    NEW: 1,
    SAVED: 2,
    APPROVED_BY_DEPARTMENT: 3,
    APPROVED: 4,
  };

  return [...rows].sort(
    (left, right) =>
      (stateOrder[left.code.toUpperCase()] ?? Number.MAX_SAFE_INTEGER) -
        (stateOrder[right.code.toUpperCase()] ?? Number.MAX_SAFE_INTEGER) ||
      left.code.localeCompare(right.code, "uz") ||
      left.lang.localeCompare(right.lang, "uz") ||
      left.name.localeCompare(right.name, "uz"),
  );
}

export function sortClassifierTables(rows: ClassifierTable[]) {
  return [...rows].sort(
    (left, right) =>
      left.systemType.localeCompare(right.systemType, "uz") || left.tableName.localeCompare(right.tableName, "uz"),
  );
}

export async function getClassifierDepartments() {
  return sortClassifierDepartments(await fetchClassifierDepartments());
}

export async function getClassifierProcessStages() {
  return sortClassifierProcessStages(await fetchClassifierProcessStages());
}

export async function getClassifierSystemTypes() {
  return sortClassifierSystemTypes(await fetchClassifierSystemTypes());
}

export async function getClassifierServers() {
  return sortClassifierServers(await fetchClassifierServers());
}

export async function getClassifierRoles() {
  return sortClassifierRoles(await fetchClassifierRoles());
}

export async function getClassifierStates(lang?: string) {
  return sortClassifierStates(await fetchClassifierStates(lang));
}

export async function getClassifierTables() {
  return sortClassifierTables(await fetchClassifierTables());
}

export function getDefaultDepartmentName(rows: ClassifierDepartment[]) {
  return rows.find(
    (row) => row.active && !deprecatedDepartmentNames.includes(row.name as (typeof deprecatedDepartmentNames)[number]),
  )?.name;
}

export function getDefaultProcessStageName(rows: ClassifierProcessStage[]) {
  return rows.find((row) => row.active)?.name;
}

export function resolveProcessStageValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return legacyProcessStageMap[value] ?? value;
}

export function buildDepartmentOptions(rows: ClassifierDepartment[], currentValue?: string) {
  const activeOptions = rows
    .filter(
      (row) => row.active && !deprecatedDepartmentNames.includes(row.name as (typeof deprecatedDepartmentNames)[number]),
    )
    .map((row) => row.name);

  if (currentValue && !deprecatedDepartmentNames.includes(currentValue as (typeof deprecatedDepartmentNames)[number]) && !activeOptions.includes(currentValue)) {
    return [currentValue, ...activeOptions];
  }

  return activeOptions;
}

export function buildProcessStageOptions(rows: ClassifierProcessStage[], currentValue?: string) {
  const activeOptions = rows.filter((row) => row.active).map((row) => row.name);

  if (currentValue && !activeOptions.includes(currentValue)) {
    return [currentValue, ...activeOptions];
  }

  return activeOptions;
}

export function buildClassifierServerOptions(rows: ClassifierServer[], currentValue?: string) {
  const activeOptions = rows.filter((row) => row.active).map((row) => row.name);

  if (currentValue && !activeOptions.includes(currentValue)) {
    return [currentValue, ...activeOptions];
  }

  return activeOptions;
}

export function buildClassifierTableOptions(rows: ClassifierTable[], systemName: string, currentValue?: string) {
  const normalizedSystemName = systemName.trim().toLocaleLowerCase();
  if (!normalizedSystemName) {
    return currentValue ? [currentValue] : [];
  }

  const activeOptions = [...new Set(
    rows
      .filter((row) => row.systemType.trim().toLocaleLowerCase() === normalizedSystemName)
      .map((row) => row.tableName),
  )].sort((left, right) => left.localeCompare(right, "uz"));

  if (currentValue && !activeOptions.includes(currentValue)) {
    return [currentValue, ...activeOptions];
  }

  return activeOptions;
}

export function buildSystemNameOptions(
  rows: ClassifierSystemType[],
  deploymentScope: DeploymentScope,
  currentValue?: string,
) {
  const scopeLabel = deploymentScope === "EXTERNAL" ? "Tashqi" : "Ichki";
  const activeOptions = [...new Set(
    rows
      .filter((row) => row.active && row.scopeType === scopeLabel)
      .map((row) => row.systemName),
  )];

  if (currentValue && !activeOptions.includes(currentValue)) {
    return [currentValue, ...activeOptions];
  }

  return activeOptions;
}

export function getDefaultSystemName(rows: ClassifierSystemType[], deploymentScope: DeploymentScope) {
  return buildSystemNameOptions(rows, deploymentScope)[0] ?? "";
}
