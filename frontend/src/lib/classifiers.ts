import {
  fetchClassifierDepartments,
  fetchClassifierProcessStages,
  fetchClassifierSystemTypes,
  fetchClassifierTables,
} from "@/lib/api";
import type {
  ClassifierDepartment,
  ClassifierProcessStage,
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
  tables: ["classifiers", "tables"] as const,
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
