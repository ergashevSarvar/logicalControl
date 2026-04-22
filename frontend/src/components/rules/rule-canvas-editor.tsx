import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  PanOnScrollMode,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  createContext,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ChangeEvent as ReactChangeEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Ban,
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GitBranchPlus,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cancelSqlQueryExecution, fetchSqlQueryExecutionStatus, startSqlQueryExecution } from "@/lib/api";
import { buildClassifierServerOptions, classifierQueryKeys, getClassifierServers, getClassifierTables } from "@/lib/classifiers";
import { cn } from "@/lib/utils";
import type {
  ClassifierServer,
  ClassifierTable,
  ClassifierTableColumn,
  LocaleCode,
  RuleType,
  SqlQueryExecutionStatusResponse,
} from "@/lib/types";

function resolveLocaleCode(language: string): LocaleCode {
  return language === "UZ" || language === "OZ" || language === "RU" || language === "EN" ? language : "OZ";
}

type RuleCanvasEditorProps = {
  canvas: Record<string, unknown>;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  canvasHeightClassName?: string;
  rootLabel?: string;
  preferredSystemType?: string;
};

type BuilderNodeKind = "start" | "condition" | "branch" | "action" | "group";
type BuilderTemplateId = "condition" | "then" | "else" | "approve" | "block" | "notify";
type ActionTone = "success" | "danger" | "info";
type ClauseJoiner = "AND" | "OR";
type ComparisonMode = "VALUE" | "COLUMN";
type ConditionValueType = "text" | "number" | "date" | "datetime" | "boolean";
type ConditionInputMode = "single" | "range" | "list" | "none";

type RuleConditionClause = {
  id: string;
  joiner: ClauseJoiner;
  tableName: string;
  columnName: string;
  operator: string;
  comparisonMode: ComparisonMode;
  value: string;
  secondValue: string;
  compareTableName: string;
  compareColumnName: string;
  sqlEnabled: boolean;
  sqlScript: string;
};

type RuleCanvasNodeData = {
  kind: BuilderNodeKind;
  rawLabel: string;
  ruleType: RuleType;
  isRoot?: boolean;
  isPrimaryCondition?: boolean;
  conditionSequence?: number;
  groupWidth?: number;
  groupHeight?: number;
  conditions?: RuleConditionClause[];
  sqlEnabled?: boolean;
  sqlScript?: string;
  sqlServer?: string;
  actionTone?: ActionTone;
  notifyMessages?: Record<LocaleCode, string>;
  notifyPhone?: string;
};

type RuleCanvasNode = Node<RuleCanvasNodeData, "ruleNode">;

type BuilderTemplate = {
  id: BuilderTemplateId;
  label: string;
  description: string;
  kind: BuilderNodeKind;
  ruleType: RuleType;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
  actionTone?: ActionTone;
  defaults?: Partial<RuleCanvasNodeData>;
};

type OperatorOption = {
  value: string;
  label: string;
  inputMode: ConditionInputMode;
  allowColumnComparison?: boolean;
};

export type BuilderAutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
  searchText?: string;
};

type RuleCanvasActions = {
  updateNode: (nodeId: string, patch: Partial<RuleCanvasNodeData>) => void;
  appendTemplate: (templateId: BuilderTemplateId, sourceNodeId?: string) => void;
  canAppendTemplate: (templateId: BuilderTemplateId, sourceNodeId?: string) => boolean;
  openTemplatePicker: (nodeId: string) => void;
  removeNode: (nodeId: string) => void;
  addCondition: (nodeId: string) => void;
  updateCondition: (nodeId: string, conditionId: string, updater: (current: RuleConditionClause) => RuleConditionClause) => void;
  removeCondition: (nodeId: string, conditionId: string) => void;
  classifierServers: ClassifierServer[];
  classifierTables: ClassifierTable[];
  classifierTablesLoading: boolean;
  preferredSystemType?: string;
};

const logicalOptions: Array<{ value: ClauseJoiner; label: string }> = [
  { value: "AND", label: "VA" },
  { value: "OR", label: "YOKI" },
];

const textOperators: OperatorOption[] = [
  { value: "eq", label: "Teng", inputMode: "single", allowColumnComparison: true },
  { value: "neq", label: "Teng emas", inputMode: "single", allowColumnComparison: true },
  { value: "contains", label: "O'z ichiga oladi", inputMode: "single" },
  { value: "not_contains", label: "O'z ichiga olmaydi", inputMode: "single" },
  { value: "starts_with", label: "Bilan boshlanadi", inputMode: "single" },
  { value: "ends_with", label: "Bilan tugaydi", inputMode: "single" },
  { value: "in_list", label: "Ro'yxatda", inputMode: "list" },
  { value: "is_empty", label: "Bo'sh", inputMode: "none" },
  { value: "is_not_empty", label: "Bo'sh emas", inputMode: "none" },
];

const numberOperators: OperatorOption[] = [
  { value: "eq", label: "Teng", inputMode: "single", allowColumnComparison: true },
  { value: "neq", label: "Teng emas", inputMode: "single", allowColumnComparison: true },
  { value: "gt", label: "Katta", inputMode: "single", allowColumnComparison: true },
  { value: "gte", label: "Katta yoki teng", inputMode: "single", allowColumnComparison: true },
  { value: "lt", label: "Kichik", inputMode: "single", allowColumnComparison: true },
  { value: "lte", label: "Kichik yoki teng", inputMode: "single", allowColumnComparison: true },
  { value: "between", label: "Oraliqda", inputMode: "range" },
  { value: "not_between", label: "Oraliqda emas", inputMode: "range" },
  { value: "in_list", label: "Ro'yxatda", inputMode: "list" },
  { value: "is_empty", label: "Bo'sh", inputMode: "none" },
  { value: "is_not_empty", label: "Bo'sh emas", inputMode: "none" },
];

const dateOperators: OperatorOption[] = [
  { value: "eq", label: "Aynan sana", inputMode: "single", allowColumnComparison: true },
  { value: "before", label: "Oldin", inputMode: "single", allowColumnComparison: true },
  { value: "after", label: "Keyin", inputMode: "single", allowColumnComparison: true },
  { value: "on_or_before", label: "Oldin yoki aynan", inputMode: "single", allowColumnComparison: true },
  { value: "on_or_after", label: "Keyin yoki aynan", inputMode: "single", allowColumnComparison: true },
  { value: "between", label: "Oraliqda", inputMode: "range" },
  { value: "not_between", label: "Oraliqda emas", inputMode: "range" },
  { value: "is_empty", label: "Bo'sh", inputMode: "none" },
  { value: "is_not_empty", label: "Bo'sh emas", inputMode: "none" },
];

const booleanOperators: OperatorOption[] = [
  { value: "is_true", label: "Rost", inputMode: "none" },
  { value: "is_false", label: "Yolg'on", inputMode: "none" },
  { value: "is_empty", label: "Bo'sh", inputMode: "none" },
  { value: "is_not_empty", label: "Bo'sh emas", inputMode: "none" },
];

const builderTemplates: BuilderTemplate[] = [
  {
    id: "condition",
    label: "AGAR",
    description: "Shart bloki",
    kind: "condition",
    ruleType: "CONDITION",
    icon: Workflow,
    accentClassName: "border-sky-400/35 bg-sky-500/18 text-sky-100 hover:bg-sky-500/26",
    defaults: {
      rawLabel: "",
    },
  },
  {
    id: "then",
    label: "UNDA",
    description: "Asosiy yo'nalish",
    kind: "branch",
    ruleType: "GROUP",
    icon: GitBranchPlus,
    accentClassName: "border-cyan-400/35 bg-cyan-500/18 text-cyan-100 hover:bg-cyan-500/26",
    defaults: { rawLabel: "UNDA" },
  },
  {
    id: "else",
    label: "AKS HOLDA AGAR",
    description: "Muqobil shart bloki",
    kind: "condition",
    ruleType: "CONDITION",
    icon: GitBranchPlus,
    accentClassName: "border-indigo-400/35 bg-indigo-500/18 text-indigo-100 hover:bg-indigo-500/26",
    defaults: { rawLabel: "AKS HOLDA AGAR" },
  },
  {
    id: "approve",
    label: "Tasdiqlash",
    description: "Yashil natija",
    kind: "action",
    ruleType: "ACTION",
    icon: ShieldCheck,
    accentClassName: "border-emerald-400/35 bg-emerald-500/18 text-emerald-100 hover:bg-emerald-500/26",
    actionTone: "success",
    defaults: { rawLabel: "Tasdiqlash" },
  },
  {
    id: "block",
    label: "Taqiqlash",
    description: "Qizil natija",
    kind: "action",
    ruleType: "RESULT",
    icon: Ban,
    accentClassName: "border-rose-400/35 bg-rose-500/18 text-rose-100 hover:bg-rose-500/26",
    actionTone: "danger",
    defaults: { rawLabel: "Taqiqlash" },
  },
  {
    id: "notify",
    label: "Ogohlantirish xabari",
    description: "Bildirish bloki",
    kind: "action",
    ruleType: "ACTION",
    icon: BellRing,
    accentClassName: "border-amber-400/35 bg-amber-500/18 text-amber-100 hover:bg-amber-500/26",
    actionTone: "info",
    defaults: {
      rawLabel: "Ogohlantirish xabari",
      notifyMessages: createEmptyNotifyMessages(),
      notifyPhone: "",
    },
  },
];

const notifyLocaleFields: Array<{ key: LocaleCode; label: string }> = [
  { key: "UZ", label: "O'zbekcha (kiril)" },
  { key: "OZ", label: "O'zbekcha (lotin)" },
  { key: "RU", label: "Русский" },
  { key: "EN", label: "English" },
];

const sqlKeywords = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "EXISTS",
  "BETWEEN",
  "LIKE",
  "ILIKE",
  "AS",
  "ON",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "FULL",
  "CROSS",
  "UNION",
  "ALL",
  "WITH",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "GROUP",
  "BY",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "DISTINCT",
  "COUNT",
  "SUM",
  "MIN",
  "MAX",
  "AVG",
  "OVER",
  "PARTITION",
  "ROW_NUMBER",
  "TRUE",
  "FALSE",
  "DESC",
  "ASC",
  "CREATE",
  "ALTER",
  "DROP",
  "TABLE",
  "VIEW",
  "MATERIALIZED",
  "COALESCE",
  "CAST",
  "DATE",
  "INTERVAL",
]);

const sqlTokenRegex =
  /(\{\{\s*param\d+\.[A-Za-z_][\w$]*\s*\}\}|--.*$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:[^"]|"")*"|\b[A-Za-z_][\w$]*\b|\b\d+(?:\.\d+)?\b|[:@][A-Za-z_][\w$]*|[()[\].,.;*+=<>/%-]+|[{}])/gm;

const sqlMultiTokenClauses = new Map<string, string>([
  ["GROUP BY", "GROUP BY"],
  ["ORDER BY", "ORDER BY"],
  ["INSERT INTO", "INSERT INTO"],
  ["DELETE FROM", "DELETE FROM"],
  ["UNION ALL", "UNION ALL"],
  ["LEFT JOIN", "LEFT JOIN"],
  ["RIGHT JOIN", "RIGHT JOIN"],
  ["INNER JOIN", "INNER JOIN"],
  ["OUTER JOIN", "OUTER JOIN"],
  ["FULL JOIN", "FULL JOIN"],
  ["CROSS JOIN", "CROSS JOIN"],
]);

const sqlMajorClauses = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "UNION",
  "UNION ALL",
  "WITH",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "OUTER JOIN",
  "FULL JOIN",
  "CROSS JOIN",
]);

const sqlInlineBreakClauses = new Set(["AND", "OR", "WHEN", "ELSE"]);
const sqlListClauses = new Set(["SELECT", "SET", "VALUES", "WITH"]);

const nodeTypes = {
  ruleNode: RuleNode,
};

const RuleCanvasActionsContext = createContext<RuleCanvasActions | null>(null);
const defaultFitViewOptions = { padding: 0.12, maxZoom: 1.05 } as const;
const viewportTopOffset = 84;
const PRIMARY_CONDITION_NODE_ID = "root-primary-condition";

function createUniqueId(prefix = "id") {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(10);
    cryptoApi.getRandomValues(bytes);
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${prefix}-${token}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function useRuleCanvasActions() {
  const context = useContext(RuleCanvasActionsContext);
  if (!context) {
    throw new Error("RuleCanvas actions context is missing");
  }
  return context;
}

function stopBuilderEventPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function getTemplate(templateId: BuilderTemplateId) {
  return builderTemplates.find((template) => template.id === templateId)!;
}

function isTemplateAllowedForNode(
  sourceNode: RuleCanvasNode | undefined,
  templateId: BuilderTemplateId,
  nodes: RuleCanvasNode[] = [],
  edges: Edge[] = [],
) {
  if (!sourceNode || sourceNode.data.kind === "start") {
    return templateId === "condition" && findRootIfNodeId(nodes, edges) === null;
  }

  if (templateId === "notify") {
    return false;
  }

  if (templateId === "else") {
    const availableNodes = nodes.length > 0 ? nodes : [sourceNode];
    return resolveElseChainSourceId(sourceNode.id, availableNodes, edges) !== null;
  }

  if (sourceNode.data.kind === "condition") {
    return templateId !== "condition";
  }

  return true;
}

function getOperatorOptions(valueType: ConditionValueType) {
  switch (valueType) {
    case "number":
      return numberOperators;
    case "date":
    case "datetime":
      return dateOperators;
    case "boolean":
      return booleanOperators;
    case "text":
    default:
      return textOperators;
  }
}

function getOperatorMeta(valueType: ConditionValueType, operator: string) {
  return getOperatorOptions(valueType).find((item) => item.value === operator) ?? getOperatorOptions(valueType)[0];
}

function getConditionInputType(valueType: ConditionValueType) {
  switch (valueType) {
    case "number":
      return "number" as const;
    case "date":
      return "date" as const;
    case "datetime":
      return "datetime-local" as const;
    case "boolean":
      return "text" as const;
    case "text":
    default:
      return "text" as const;
  }
}

function getConditionValuePlaceholder(valueType: ConditionValueType, inputMode: ConditionInputMode, isSecond = false) {
  if (inputMode === "list") {
    return "Qiymatlarni vergul bilan kiriting";
  }

  switch (valueType) {
    case "number":
      return isSecond ? "Ikkinchi raqamni kiriting" : "Raqamni kiriting";
    case "date":
      return isSecond ? "Ikkinchi sanani kiriting" : "Sanani kiriting";
    case "datetime":
      return isSecond ? "Ikkinchi sana-vaqtni kiriting" : "Sana-vaqtni kiriting";
    case "text":
    default:
      return isSecond ? "Ikkinchi qiymatni kiriting" : "Qiymatni kiriting";
  }
}

function detectColumnValueType(column?: ClassifierTableColumn | null): ConditionValueType {
  const normalized = column?.dataType?.toLowerCase() ?? "";

  if (normalized.includes("bool")) return "boolean";
  if (normalized.includes("timestamp") || normalized.includes("time")) return "datetime";
  if (normalized.includes("date")) return "date";
  if (
    normalized.includes("int") ||
    normalized.includes("decimal") ||
    normalized.includes("numeric") ||
    normalized.includes("number") ||
    normalized.includes("double") ||
    normalized.includes("float") ||
    normalized.includes("real")
  ) {
    return "number";
  }

  return "text";
}

function createBlankCondition(joiner: ClauseJoiner = "AND"): RuleConditionClause {
  return {
    id: createUniqueId("condition"),
    joiner,
    tableName: "",
    columnName: "",
    operator: "eq",
    comparisonMode: "VALUE",
    value: "",
    secondValue: "",
    compareTableName: "",
    compareColumnName: "",
    sqlEnabled: false,
    sqlScript: "",
  };
}

function sortTablesForBuilder(tables: ClassifierTable[], preferredSystemType?: string) {
  const normalizedPreferred = preferredSystemType?.trim().toLowerCase();

  return [...tables].sort((left, right) => {
    const leftPreferred = normalizedPreferred && left.systemType.toLowerCase() === normalizedPreferred ? 0 : 1;
    const rightPreferred = normalizedPreferred && right.systemType.toLowerCase() === normalizedPreferred ? 0 : 1;

    return (
      leftPreferred - rightPreferred ||
      left.systemType.localeCompare(right.systemType, "uz") ||
      left.tableName.localeCompare(right.tableName, "uz")
    );
  });
}

function sortColumns(columns: ClassifierTableColumn[]) {
  return [...columns].sort(
    (left, right) => left.ordinalPosition - right.ordinalPosition || left.name.localeCompare(right.name, "uz"),
  );
}

function findTable(tables: ClassifierTable[], tableName: string) {
  return tables.find((table) => table.tableName === tableName) ?? null;
}

function findColumn(table: ClassifierTable | null, columnName: string) {
  return table?.columns.find((column) => column.name === columnName) ?? null;
}

function getDefaultTable(tables: ClassifierTable[], preferredSystemType?: string) {
  return sortTablesForBuilder(tables, preferredSystemType)[0] ?? null;
}

function getDefaultColumn(table: ClassifierTable | null) {
  return table ? sortColumns(table.columns)[0] ?? null : null;
}

function createConditionFromMetadata(tables: ClassifierTable[], preferredSystemType?: string, joiner: ClauseJoiner = "AND") {
  const defaultTable = getDefaultTable(tables, preferredSystemType);
  const defaultColumn = getDefaultColumn(defaultTable);
  const defaultOperator = getOperatorOptions(detectColumnValueType(defaultColumn))[0]?.value ?? "eq";

  return {
    id: createUniqueId("condition"),
    joiner,
    tableName: defaultTable?.tableName ?? "",
    columnName: defaultColumn?.name ?? "",
    operator: defaultOperator,
    comparisonMode: "VALUE" as ComparisonMode,
    value: "",
    secondValue: "",
    compareTableName: defaultTable?.tableName ?? "",
    compareColumnName: "",
    sqlEnabled: false,
    sqlScript: "",
  };
}

function normalizeConditionWithMetadata(
  condition: RuleConditionClause,
  tables: ClassifierTable[],
  preferredSystemType: string | undefined,
  index: number,
): RuleConditionClause {
  if (tables.length === 0) {
    return {
      ...condition,
      joiner: index === 0 ? "AND" : condition.joiner ?? "AND",
      comparisonMode: condition.comparisonMode ?? "VALUE",
    };
  }

  const fallback = createConditionFromMetadata(tables, preferredSystemType, index === 0 ? "AND" : condition.joiner ?? "AND");
  const selectedTable = findTable(tables, condition.tableName) ?? findTable(tables, fallback.tableName);
  const selectedColumn = findColumn(selectedTable, condition.columnName) ?? getDefaultColumn(selectedTable);
  const operatorMeta = getOperatorMeta(detectColumnValueType(selectedColumn), condition.operator || fallback.operator);
  const comparisonMode =
    operatorMeta.allowColumnComparison && condition.comparisonMode === "COLUMN" ? "COLUMN" : "VALUE";
  const compareTable =
    comparisonMode === "COLUMN"
      ? findTable(tables, condition.compareTableName) ?? selectedTable
      : null;
  const compareColumn =
    comparisonMode === "COLUMN"
      ? findColumn(compareTable, condition.compareColumnName) ?? getDefaultColumn(compareTable)
      : null;

  return {
    id: condition.id || createUniqueId("condition"),
    joiner: index === 0 ? "AND" : condition.joiner ?? "AND",
    tableName: selectedTable?.tableName ?? "",
    columnName: selectedColumn?.name ?? "",
    operator: operatorMeta.value,
    comparisonMode,
    value: operatorMeta.inputMode === "none" ? "" : condition.value ?? "",
    secondValue: operatorMeta.inputMode === "range" ? condition.secondValue ?? "" : "",
    compareTableName: comparisonMode === "COLUMN" ? compareTable?.tableName ?? selectedTable?.tableName ?? "" : "",
    compareColumnName: comparisonMode === "COLUMN" ? compareColumn?.name ?? "" : "",
    sqlEnabled: Boolean(condition.sqlEnabled),
    sqlScript: condition.sqlScript ?? "",
  };
}

function normalizeConditionListWithMetadata(
  conditions: RuleConditionClause[] | undefined,
  tables: ClassifierTable[],
  preferredSystemType?: string,
) {
  const source = conditions && conditions.length > 0 ? conditions : [createBlankCondition()];
  return source.map((condition, index) => normalizeConditionWithMetadata(condition, tables, preferredSystemType, index));
}

function normalizeConditions(source: Record<string, unknown>) {
  const rawConditions = source.conditions;
  if (Array.isArray(rawConditions) && rawConditions.length > 0) {
    return rawConditions.map((item, index) => {
      const raw = item as Record<string, unknown>;
      return {
        id: String(raw.id ?? createUniqueId("condition")),
        joiner: String(raw.joiner ?? (index === 0 ? "AND" : "AND")) === "OR" ? "OR" : "AND",
        tableName: String(raw.tableName ?? ""),
        columnName: String(raw.columnName ?? ""),
        operator: String(raw.operator ?? "eq"),
        comparisonMode: String(raw.comparisonMode ?? "VALUE") === "COLUMN" ? "COLUMN" : "VALUE",
        value: String(raw.value ?? ""),
        secondValue: String(raw.secondValue ?? ""),
        compareTableName: String(raw.compareTableName ?? ""),
        compareColumnName: String(raw.compareColumnName ?? ""),
        sqlEnabled: Boolean(raw.sqlEnabled ?? false),
        sqlScript: String(raw.sqlScript ?? ""),
      } satisfies RuleConditionClause;
    });
  }

  const legacyConditions: RuleConditionClause[] = [];
  const firstField = String(source.field ?? "");
  const firstValue = String(source.value ?? "");
  if (firstField || firstValue || source.operator) {
    legacyConditions.push({
      ...createBlankCondition("AND"),
      columnName: firstField,
      operator: String(source.operator ?? "eq"),
      value: firstValue,
    });
  }

  const secondField = String(source.secondField ?? "");
  const secondValue = String(source.secondValue ?? "");
  if (secondField || secondValue) {
    legacyConditions.push({
      ...createBlankCondition(String(source.combinator ?? "AND") === "OR" ? "OR" : "AND"),
      columnName: secondField,
      operator: "eq",
      value: secondValue,
    });
  }

  return legacyConditions.length > 0 ? legacyConditions : [createBlankCondition()];
}

function createEmptyNotifyMessages(): Record<LocaleCode, string> {
  return {
    UZ: "",
    OZ: "",
    RU: "",
    EN: "",
  };
}

function normalizeNotifyMessages(source: unknown) {
  const raw = typeof source === "object" && source !== null ? (source as Record<string, unknown>) : {};

  return {
    UZ: String(raw.UZ ?? raw.uzCyrl ?? ""),
    OZ: String(raw.OZ ?? raw.uzLatn ?? ""),
    RU: String(raw.RU ?? raw.ru ?? ""),
    EN: String(raw.EN ?? raw.en ?? ""),
  } satisfies Record<LocaleCode, string>;
}

function createConditionNotifyState(source?: { notifyMessages?: unknown; notifyPhone?: unknown } | null) {
  return {
    notifyMessages: normalizeNotifyMessages(source?.notifyMessages),
    notifyPhone: String(source?.notifyPhone ?? ""),
  };
}

function createConditionSqlState(
  source?: { sqlEnabled?: unknown; sqlScript?: unknown; sqlServer?: unknown; conditions?: unknown } | null,
) {
  const rawConditions = Array.isArray(source?.conditions) ? (source.conditions as Array<Record<string, unknown>>) : [];
  const legacySqlCondition =
    rawConditions.find((condition) => Boolean(condition.sqlEnabled) || String(condition.sqlScript ?? "").trim().length > 0) ??
    null;
  const resolvedScript = String(source?.sqlScript ?? legacySqlCondition?.sqlScript ?? "");
  const hasExplicitEnabled = Boolean(source && typeof source === "object" && "sqlEnabled" in source);

  return {
    sqlEnabled: hasExplicitEnabled ? Boolean(source?.sqlEnabled) : resolvedScript.trim().length > 0 || Boolean(legacySqlCondition?.sqlEnabled),
    sqlScript: resolvedScript,
    sqlServer: String(source?.sqlServer ?? ""),
  };
}

function inferNodeKind(source: Record<string, unknown>, id: string): BuilderNodeKind {
  if (source.kind === "start" || id === "root-node") return "start";
  if (source.kind === "condition" || source.type === "CONDITION") return "condition";
  if (source.kind === "branch" || source.type === "GROUP") return "branch";
  return "action";
}

function inferActionTone(label: string, tone: unknown): ActionTone {
  if (tone === "success" || tone === "danger" || tone === "info") return tone;
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes("taqiq")) return "danger";
  if (normalizedLabel.includes("xabar") || normalizedLabel.includes("notify")) return "info";
  return "success";
}

function isNotifyActionNode(data: RuleCanvasNodeData | undefined) {
  return data?.kind === "action" && (data.actionTone ?? "success") === "info";
}

function isElseIfConditionNode(data: RuleCanvasNodeData | undefined) {
  return data?.kind === "condition" && data.rawLabel === "AKS HOLDA AGAR";
}

function isPrimaryConditionNodeId(nodeId: string, nodes: RuleCanvasNode[], edges: Edge[]) {
  return findRootIfNodeId(nodes, edges) === nodeId;
}

function withNodePorts(node: RuleCanvasNode): RuleCanvasNode {
  return {
    ...node,
    sourcePosition: node.sourcePosition ?? Position.Bottom,
    targetPosition: node.targetPosition ?? Position.Top,
    deletable:
      node.id !== "root-node" &&
      node.data.kind !== "group" &&
      !node.data.isPrimaryCondition,
  };
}

function createRootNode(label: string): RuleCanvasNode {
  return withNodePorts({
    id: "root-node",
    type: "ruleNode",
    position: { x: 420, y: 92 },
    data: {
      kind: "start",
      rawLabel: label,
      ruleType: "RESULT",
      isRoot: true,
    },
  });
}

function createPrimaryConditionNode(
  nodes: RuleCanvasNode[],
  edges: Edge[],
  classifierTables: ClassifierTable[] = [],
  preferredSystemType?: string,
): RuleCanvasNode {
  return withNodePorts({
    id: PRIMARY_CONDITION_NODE_ID,
    type: "ruleNode",
    position: getNextChildPosition("root-node", "condition", nodes, edges),
    data: {
      kind: "condition",
      rawLabel: "",
      ruleType: "CONDITION",
      isPrimaryCondition: true,
      conditions: [createConditionFromMetadata(classifierTables, preferredSystemType)],
      ...createConditionSqlState(),
      ...createConditionNotifyState(),
    },
  });
}

function applyCanvasNodePolicies(nodes: RuleCanvasNode[], edges: Edge[]) {
  const primaryConditionId = findRootIfNodeId(nodes, edges);

  return nodes.map((node) =>
    withNodePorts({
      ...node,
      data: {
        ...node.data,
        isPrimaryCondition: node.id === primaryConditionId,
      },
    }),
  );
}

function embedLegacyNotifyNodesInConditions(nodes: RuleCanvasNode[], edges: Edge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const notifyNodeIdsToRemove = new Set<string>();

  const nextNodes = nodes.map((node) => {
    if (node.data.kind !== "condition") {
      return node;
    }

    const legacyNotifyNode = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => nodeMap.get(edge.target))
      .find((targetNode): targetNode is RuleCanvasNode => Boolean(targetNode && isNotifyActionNode(targetNode.data)));

    if (legacyNotifyNode) {
      notifyNodeIdsToRemove.add(legacyNotifyNode.id);
    }

    return withNodePorts({
      ...node,
      data: {
        ...node.data,
        ...createConditionNotifyState(legacyNotifyNode?.data ?? node.data),
      },
    });
  });

  if (notifyNodeIdsToRemove.size === 0) {
    return { nodes: nextNodes, edges };
  }

  return {
    nodes: nextNodes.filter((node) => !notifyNodeIdsToRemove.has(node.id)),
    edges: edges.filter((edge) => !notifyNodeIdsToRemove.has(edge.source) && !notifyNodeIdsToRemove.has(edge.target)),
  };
}

function getConditionSequenceMap(nodes: RuleCanvasNode[], edges: Edge[]) {
  const sequenceMap = new Map<string, number>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const visited = new Set<string>();
  let sequence = 1;
  let currentId = findRootIfNodeId(nodes, edges) ?? null;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    sequenceMap.set(currentId, sequence);
    sequence += 1;

    currentId =
      edges
        .filter((edge) => edge.source === currentId)
        .map((edge) => edge.target)
        .filter((targetId) => isElseIfConditionNode(nodeMap.get(targetId)?.data))
        .sort((leftId, rightId) => (nodeOrder.get(leftId) ?? -1) - (nodeOrder.get(rightId) ?? -1))
        .at(-1) ?? null;
  }

  nodes
    .filter((node) => node.data.kind === "condition" && !sequenceMap.has(node.id))
    .sort((leftNode, rightNode) => (leftNode.position.y - rightNode.position.y) || (leftNode.position.x - rightNode.position.x))
    .forEach((node) => {
      sequenceMap.set(node.id, sequence);
      sequence += 1;
    });

  return sequenceMap;
}

function estimateConditionNodeSize(node: RuleCanvasNode) {
  const clauseCount = Math.max(node.data.conditions?.length ?? 1, 1);
  return {
    width: 1160,
    height: node.data.sqlEnabled ? 824 : Math.max(586, 178 + clauseCount * 186),
  };
}

const conditionGroupPadding = {
  x: 40,
  top: 72,
  bottom: 40,
} as const;

function buildConditionGroupNodes(nodes: RuleCanvasNode[], edges: Edge[]) {
  const sequenceMap = getConditionSequenceMap(nodes, edges);

  return nodes
    .filter((node) => node.data.kind === "condition")
    .map((conditionNode) => {
      const conditionSize = estimateConditionNodeSize(conditionNode);
      const minX = conditionNode.position.x - conditionGroupPadding.x;
      const minY = conditionNode.position.y - conditionGroupPadding.top;
      const maxX = conditionNode.position.x + conditionSize.width + conditionGroupPadding.x;
      const maxY = conditionNode.position.y + conditionSize.height + conditionGroupPadding.bottom;
      const sequence = sequenceMap.get(conditionNode.id) ?? 1;

      return withNodePorts({
        id: `group-${conditionNode.id}`,
        type: "ruleNode",
        position: { x: minX, y: minY },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        data: {
          kind: "group",
          rawLabel: `SHART-${sequence}`,
          ruleType: "GROUP",
          groupWidth: maxX - minX,
          groupHeight: maxY - minY,
        },
      });
    });
}

function ensurePrimaryConditionCanvas(
  nodes: RuleCanvasNode[],
  edges: Edge[],
  classifierTables: ClassifierTable[] = [],
  preferredSystemType?: string,
) {
  const nextNodes = [...nodes];
  const nextEdges = [...edges];
  let primaryConditionId = findRootIfNodeId(nextNodes, nextEdges);

  if (!primaryConditionId) {
    const primaryConditionNode = createPrimaryConditionNode(nextNodes, nextEdges, classifierTables, preferredSystemType);
    nextNodes.push(primaryConditionNode);
    nextEdges.push(createBuilderEdge("root-node", primaryConditionNode.id));
    primaryConditionId = primaryConditionNode.id;
  }
  const embeddedNotifyCanvas = embedLegacyNotifyNodesInConditions(nextNodes, nextEdges);

  return {
    nodes: applyCanvasNodePolicies(embeddedNotifyCanvas.nodes, embeddedNotifyCanvas.edges),
    edges: embeddedNotifyCanvas.edges,
  };
}

function normalizeNodes(
  nodes: unknown,
  rootLabel: string,
  classifierTables: ClassifierTable[] = [],
  preferredSystemType?: string,
): RuleCanvasNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [createRootNode(rootLabel)];

  const normalized = nodes.map((sourceNode, index) => {
    const source = sourceNode as Record<string, unknown>;
    const id = String(source.id ?? `node-${index}`);
    const kind = inferNodeKind(source, id);
    const normalizedConditions =
      kind === "condition"
        ? normalizeConditionListWithMetadata(normalizeConditions(source), classifierTables, preferredSystemType)
        : undefined;
    const conditionSqlState = kind === "condition" ? createConditionSqlState(source) : undefined;
    const label = String(
      source.label ??
        source.rawLabel ??
        (id === "root-node" ? rootLabel : kind === "condition" ? "" : "Node"),
    );

    return withNodePorts({
      id,
      type: "ruleNode",
      position:
        typeof source.position === "object" && source.position !== null
          ? (source.position as { x: number; y: number })
          : { x: 220 + index * 140, y: 160 + index * 80 },
      data: {
        kind,
        rawLabel: id === "root-node" ? rootLabel : label,
        ruleType:
          (source.type as RuleType | undefined) ??
          (kind === "branch" ? "GROUP" : kind === "action" ? "ACTION" : "CONDITION"),
        isRoot: id === "root-node",
        conditions: normalizedConditions,
        sqlEnabled: conditionSqlState?.sqlEnabled,
        sqlScript: conditionSqlState?.sqlScript,
        sqlServer: conditionSqlState?.sqlServer,
        actionTone: inferActionTone(label, source.actionTone),
        notifyMessages:
          kind === "condition" || (kind === "action" && inferActionTone(label, source.actionTone) === "info")
            ? normalizeNotifyMessages(source.notifyMessages)
            : undefined,
        notifyPhone:
          kind === "condition" || (kind === "action" && inferActionTone(label, source.actionTone) === "info")
            ? String(source.notifyPhone ?? "")
            : undefined,
      },
    });
  });

  if (!normalized.some((node) => node.id === "root-node")) {
    return [createRootNode(rootLabel), ...normalized];
  }

  return normalized.map((node) =>
    node.id === "root-node"
      ? {
          ...node,
          data: {
            ...node.data,
            kind: "start",
            rawLabel: rootLabel,
            isRoot: true,
            ruleType: "RESULT",
          },
        }
      : node,
  );
}

function normalizeEdges(edges: unknown): Edge[] {
  if (!Array.isArray(edges)) return [];

  return edges.map((sourceEdge, index) => {
    const source = sourceEdge as Record<string, unknown>;

    return {
      id: String(source.id ?? `edge-${index}`),
      source: String(source.source ?? "root-node"),
      target: String(source.target ?? ""),
      sourceHandle: source.sourceHandle ? String(source.sourceHandle) : undefined,
      targetHandle: source.targetHandle ? String(source.targetHandle) : undefined,
      label: source.label ? String(source.label) : undefined,
      animated: true,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
      style: { strokeWidth: 2, stroke: "var(--primary)" },
    };
  });
}

function serializeCanvas(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((node) => {
      const data = (node.data ?? {}) as RuleCanvasNodeData;
      const firstCondition = data.conditions?.[0];
      const secondCondition = data.conditions?.[1];
      return {
        id: node.id,
        type: inferRuleTypeFromNode(node),
        kind: data.kind,
        label: data.rawLabel,
        conditions: data.conditions ?? [],
        field: firstCondition?.columnName,
        operator: firstCondition?.operator,
        value: firstCondition?.value,
        combinator: secondCondition?.joiner,
        secondField: secondCondition?.columnName,
        secondValue: secondCondition?.value,
        sqlEnabled: data.sqlEnabled,
        sqlScript: data.sqlScript,
        sqlServer: data.sqlServer,
        actionTone: data.actionTone,
        notifyMessages: data.notifyMessages,
        notifyPhone: data.notifyPhone,
        position: node.position,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label ?? "",
    })),
  };
}

function inferRuleTypeFromNode(node: Node): RuleType {
  const source = (node.data as Record<string, unknown> | undefined)?.ruleType;
  return (source as RuleType | undefined) ?? "CONDITION";
}

function getOffsetByIndex(index: number, step: number) {
  if (index === 0) return 0;
  const direction = index % 2 === 1 ? 1 : -1;
  const multiplier = Math.ceil(index / 2);
  return direction * multiplier * step;
}

function getNextChildPosition(sourceNodeId: string, templateId: BuilderTemplateId, nodes: RuleCanvasNode[], edges: Edge[]) {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId);
  const template = getTemplate(templateId);

  if (!sourceNode) {
    return { x: 420, y: 240 };
  }

  if (templateId === "else" && sourceNode.data.kind === "condition") {
    const conditionSize = estimateConditionNodeSize(sourceNode);

    return {
      x: sourceNode.position.x + conditionSize.width + 120,
      y: sourceNode.position.y,
    };
  }

  const siblingCount = edges.filter((edge) => edge.source === sourceNodeId).length;
  const horizontalStep = template.kind === "branch" ? 220 : sourceNode.data.kind === "branch" ? 0 : 290;
  const verticalStep = template.kind === "branch" ? 124 : sourceNode.data.kind === "branch" ? 156 : 188;

  return {
    x: sourceNode.position.x + getOffsetByIndex(siblingCount, horizontalStep),
    y: sourceNode.position.y + verticalStep,
  };
}

function frameClassesForActionTone(tone: ActionTone) {
  switch (tone) {
    case "danger":
      return "border-rose-300/70 shadow-[0_24px_40px_-28px_rgba(244,63,94,0.34)]";
    case "info":
      return "border-amber-300/70 shadow-[0_24px_40px_-28px_rgba(245,158,11,0.34)]";
    case "success":
    default:
      return "border-emerald-300/70 shadow-[0_24px_40px_-28px_rgba(16,185,129,0.32)]";
  }
}

function headerClassesForActionTone(tone: ActionTone) {
  switch (tone) {
    case "danger":
      return "bg-[linear-gradient(135deg,#ef4444,#dc2626)]";
    case "info":
      return "bg-[linear-gradient(135deg,#f59e0b,#f97316)]";
    case "success":
    default:
      return "bg-[linear-gradient(135deg,#16a34a,#059669)]";
  }
}

function actionTitleForTone(tone: ActionTone) {
  switch (tone) {
    case "danger":
      return "Taqiqlash";
    case "info":
      return "Ogohlantirish xabari";
    case "success":
    default:
      return "Tasdiqlash";
  }
}

function getNodeDisplayLabel(data: RuleCanvasNodeData | undefined, rootLabel: string) {
  if (!data) return rootLabel;

  switch (data.kind) {
    case "group":
      return data.rawLabel || "Shart guruhi";
    case "condition":
      return data.rawLabel || "AGAR";
    case "branch":
      return data.rawLabel || "UNDA";
    case "action":
      return data.rawLabel || actionTitleForTone(data.actionTone ?? "success");
    case "start":
    default:
      return data.rawLabel || rootLabel;
  }
}

function getSelectedNodeDisplayLabel(data: RuleCanvasNodeData | undefined, rootLabel: string) {
  if (data?.kind === "condition" && data.conditionSequence) {
    return `Shart-${data.conditionSequence}`;
  }

  return getNodeDisplayLabel(data, rootLabel);
}

function createBuilderEdge(
  sourceId: string,
  targetId: string,
  handles?: {
    sourceHandle?: string;
    targetHandle?: string;
  },
): Edge {
  return {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle: handles?.sourceHandle,
    targetHandle: handles?.targetHandle,
    animated: true,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
    style: { strokeWidth: 2, stroke: "var(--primary)" },
  };
}

function collectDescendantNodeIds(sourceIds: string[], edges: Edge[]) {
  const visited = new Set<string>();
  const queue = [...sourceIds];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);

    edges.forEach((edge) => {
      if (edge.source === currentId && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }

  return visited;
}

function findOwningIfNodeId(sourceNodeId: string | undefined, nodes: RuleCanvasNode[], edges: Edge[]) {
  if (!sourceNodeId) return null;

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const queue = [sourceNodeId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);

    const currentNode = nodeMap.get(currentId);
    if (currentNode?.data.kind === "condition" && !isElseIfConditionNode(currentNode.data)) {
      return currentId;
    }

    edges.forEach((edge) => {
      if (edge.target === currentId && !visited.has(edge.source)) {
        queue.push(edge.source);
      }
    });
  }

  return null;
}

function resolveElseChainSourceId(sourceNodeId: string | undefined, nodes: RuleCanvasNode[], edges: Edge[]) {
  const anchorId = findOwningIfNodeId(sourceNodeId, nodes, edges);
  if (!anchorId) return null;

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const visited = new Set<string>();
  let currentId = anchorId;
  let lastElseIfId: string | null = null;

  while (true) {
    const nextElseIfId = edges
      .filter((edge) => edge.source === currentId)
      .map((edge) => edge.target)
      .filter((targetId) => isElseIfConditionNode(nodeMap.get(targetId)?.data))
      .sort((leftId, rightId) => (nodeOrder.get(leftId) ?? -1) - (nodeOrder.get(rightId) ?? -1))
      .at(-1);

    if (!nextElseIfId || visited.has(nextElseIfId)) {
      break;
    }

    visited.add(nextElseIfId);
    lastElseIfId = nextElseIfId;
    currentId = nextElseIfId;
  }

  return lastElseIfId ?? anchorId;
}

function findRootIfNodeId(nodes: RuleCanvasNode[], edges: Edge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));

  return edges
    .filter((edge) => edge.source === "root-node")
    .map((edge) => edge.target)
    .filter((targetId) => {
      const targetNode = nodeMap.get(targetId);
      return targetNode?.data.kind === "condition" && !isElseIfConditionNode(targetNode.data);
    })
    .sort((leftId, rightId) => (nodeOrder.get(leftId) ?? -1) - (nodeOrder.get(rightId) ?? -1))
    .at(0);
}

function NodeActionButton({
  title,
  onClick,
  variant = "light",
  disabled = false,
  children,
}: {
  title: string;
  onClick?: () => void;
  variant?: "light" | "danger";
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        variant === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
          : "border-white/20 bg-white/12 text-white hover:bg-white/20",
        !disabled && "cursor-pointer",
      )}
    >
      {children}
    </button>
  );
}

function BuilderSelect({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "nodrag h-10 w-full min-w-0 rounded-[12px] border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function BuilderAutocompleteSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
  hasError = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: BuilderAutocompleteOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const stopNodeInteraction = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent | MouseEvent | TouchEvent) {
      if (!containerRef.current || !(event.target instanceof globalThis.Node)) {
        return;
      }

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (open) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const estimatedDropdownHeight = 340;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
      }

      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    setQuery("");
    setOpenUpward(false);
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""} ${option.searchText ?? ""} ${option.value}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  const triggerLabel = selectedOption?.label || value || placeholder;

  return (
    <div
      ref={containerRef}
      className={cn("nodrag nowheel nopan relative min-w-0", className)}
      onPointerDown={stopNodeInteraction}
      onMouseDown={stopNodeInteraction}
      onClick={stopNodeInteraction}
      onDoubleClick={stopNodeInteraction}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "nodrag nowheel nopan flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[12px] border border-input bg-background px-3 text-left text-sm outline-none transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          hasError && "border-destructive hover:border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground hover:border-input",
        )}
      >
        <span
          title={triggerLabel}
          className={cn("min-w-0 truncate", selectedOption || value ? "text-foreground" : "text-muted-foreground")}
        >
          {triggerLabel}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "nowheel nopan absolute left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
        >
          <div className="border-b border-border/70 p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="nodrag nowheel nopan h-10 rounded-[12px]"
              autoComplete="off"
              onClick={stopNodeInteraction}
              onPointerDown={stopNodeInteraction}
            />
          </div>

          <div className="nowheel nopan max-h-[18rem] overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="nodrag nowheel nopan flex w-full items-start justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="min-w-0">
                    <p className="truncate leading-6 text-foreground">{option.label}</p>
                    {option.hint ? <p className="truncate text-xs text-muted-foreground">{option.hint}</p> : null}
                  </div>
                  {value === option.value ? <Check className="mt-1 size-4 shrink-0 text-primary" /> : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BuilderSourceHandle({ nodeId, hidden = false }: { nodeId: string; hidden?: boolean }) {
  const { openTemplatePicker } = useRuleCanvasActions();

  return (
    <Handle
      type="source"
      position={Position.Bottom}
      title={hidden ? undefined : "Keyingi amal qo'shish"}
      role={hidden ? undefined : "button"}
      aria-label={hidden ? undefined : "Keyingi amal qo'shish"}
      tabIndex={hidden ? -1 : 0}
      onClick={
        hidden
          ? undefined
          : (event) => {
              event.preventDefault();
              event.stopPropagation();
              openTemplatePicker(nodeId);
            }
      }
      onKeyDown={
        hidden
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                openTemplatePicker(nodeId);
              }
            }
      }
      className={cn(
        "!h-4 !w-4 transition-transform",
        hidden
          ? "!border-0 !bg-transparent opacity-0 pointer-events-none"
          : "!border-2 !border-background !bg-primary hover:!scale-110 focus-visible:!ring-4 focus-visible:!ring-primary/25",
      )}
    />
  );
}

function BuilderTemplatePickerModal({
  sourceLabel,
  sourceNode,
  nodes,
  edges,
  onClose,
  onSelect,
}: {
  sourceLabel: string;
  sourceNode: RuleCanvasNode;
  nodes: RuleCanvasNode[];
  edges: Edge[];
  onClose: () => void;
  onSelect: (templateId: BuilderTemplateId) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/32 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Builder amal tanlash oynasi"
        className="w-full max-w-3xl rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.94))] p-6 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.42)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Keyingi amalni qo'shish</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">{sourceLabel}</span> tugunidan keyin qaysi amal qo'shilishini tanlang.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:border-primary/25 hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {builderTemplates.filter((template) => template.id !== "notify").map((template) => {
            const Icon = template.icon;
            const isDisabled = !isTemplateAllowedForNode(sourceNode, template.id, nodes, edges);
            const hasRootCondition = sourceNode.data.kind === "start" && findRootIfNodeId(nodes, edges) !== null;
            const disabledReason =
              sourceNode.data.kind === "start"
                ? hasRootCondition
                  ? "Boshlanish nuqtasida faqat bitta AGAR bo'lishi mumkin"
                  : "Boshlanish nuqtasidan faqat AGAR qo'shiladi"
                : template.id === "else"
                  ? "Avval AGAR yaratilishi kerak"
                  : "Bu tugundan AGAR qo'shib bo'lmaydi";

            return (
              <button
                key={template.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    onSelect(template.id);
                  }
                }}
                className={cn(
                  "flex items-start gap-4 rounded-[22px] border border-border/70 bg-background/90 px-4 py-4 text-left transition",
                  isDisabled
                    ? "cursor-not-allowed opacity-45"
                    : "hover:border-primary/30 hover:bg-primary/4",
                )}
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[16px]", template.accentClassName)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{template.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{template.description}</span>
                  {isDisabled ? <span className="mt-1 block text-xs text-muted-foreground">{disabledReason}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function renderSqlHighlightedTokens(value: string): ReactNode[] {
  const content = value.length > 0 ? value : " ";
  const fragments: ReactNode[] = [];
  let lastIndex = 0;

  sqlTokenRegex.lastIndex = 0;

  for (const match of content.matchAll(sqlTokenRegex)) {
    const token = match[0];
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      fragments.push(content.slice(lastIndex, startIndex));
    }

    const upperToken = token.toUpperCase();
    let className = "text-foreground";

    if (token.startsWith("{{")) {
      className = "sql-reference-token text-sky-700";
    } else if (token.startsWith("--") || token.startsWith("/*")) {
      className = "text-emerald-700 italic";
    } else if (token.startsWith("'") || token.startsWith('"')) {
      className = "text-amber-700";
    } else if (token.startsWith(":") || token.startsWith("@")) {
      className = "font-medium text-cyan-700";
    } else if (/^\d/.test(token)) {
      className = "text-fuchsia-700";
    } else if (sqlKeywords.has(upperToken)) {
      className = "font-semibold text-primary";
    } else if (/^[()[\],.;*+=<>/%-]+$/.test(token)) {
      className = "text-muted-foreground";
    }

    fragments.push(
      <span key={`${token}-${startIndex}`} className={className}>
        {token}
      </span>,
    );

    lastIndex = startIndex + token.length;
  }

  if (lastIndex < content.length) {
    fragments.push(content.slice(lastIndex));
  }

  return fragments;
}

function matchSqlClause(tokens: string[], index: number) {
  const currentToken = tokens[index];

  if (!currentToken || !/^[A-Za-z_][\w$]*$/.test(currentToken)) {
    return null;
  }

  const currentUpper = currentToken.toUpperCase();
  const nextUpper = tokens[index + 1]?.toUpperCase();

  if (nextUpper) {
    const composite = `${currentUpper} ${nextUpper}`;
    if (sqlMultiTokenClauses.has(composite)) {
      return {
        text: sqlMultiTokenClauses.get(composite)!,
        length: 2,
      };
    }
  }

  return sqlKeywords.has(currentUpper)
    ? {
        text: currentUpper,
        length: 1,
      }
    : null;
}

export function formatSqlScript(source: string) {
  const tokens = Array.from(source.matchAll(sqlTokenRegex), (match) => match[0]).filter((token) => token.trim().length > 0);

  if (tokens.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let currentLine = "";
  let currentClause = "";

  const flushCurrentLine = () => {
    const trimmedLine = currentLine.trimEnd();
    if (trimmedLine.trim().length > 0) {
      lines.push(trimmedLine);
    }
    currentLine = "";
  };

  const appendToken = (token: string, options?: { noSpaceBefore?: boolean }) => {
    if (currentLine.length === 0) {
      currentLine = token;
      return;
    }

    const noSpaceBefore = options?.noSpaceBefore ?? false;
    const lastCharacter = currentLine.slice(-1);
    const separator = noSpaceBefore || lastCharacter === "(" || lastCharacter === "." ? "" : " ";
    currentLine += `${separator}${token}`;
  };

  const ensureIndentedContinuation = () => {
    if (currentLine.length === 0) {
      currentLine = currentClause ? "  " : "";
    }
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.startsWith("--") || token.startsWith("/*")) {
      flushCurrentLine();
      lines.push(token.trim());
      currentClause = "";
      continue;
    }

    const matchedClause = matchSqlClause(tokens, index);
    if (matchedClause) {
      const clauseText = matchedClause.text;

      if (sqlMajorClauses.has(clauseText)) {
        flushCurrentLine();
        currentClause = clauseText;

        if (sqlListClauses.has(clauseText)) {
          lines.push(clauseText);
          currentLine = "  ";
        } else {
          currentLine = clauseText;
        }

        index += matchedClause.length - 1;
        continue;
      }

      if (sqlInlineBreakClauses.has(clauseText)) {
        flushCurrentLine();
        currentLine = `  ${clauseText}`;
        currentClause = clauseText;
        index += matchedClause.length - 1;
        continue;
      }

      if (clauseText === "THEN") {
        appendToken(clauseText);
        flushCurrentLine();
        currentLine = "  ";
        currentClause = clauseText;
        index += matchedClause.length - 1;
        continue;
      }

      if (clauseText === "END") {
        flushCurrentLine();
        currentLine = "END";
        currentClause = clauseText;
        index += matchedClause.length - 1;
        continue;
      }

      appendToken(clauseText);
      currentClause = clauseText;
      index += matchedClause.length - 1;
      continue;
    }

    if (token === ",") {
      appendToken(token, { noSpaceBefore: true });
      flushCurrentLine();
      if (currentClause) {
        currentLine = "  ";
      }
      continue;
    }

    if (token === ";") {
      appendToken(token, { noSpaceBefore: true });
      flushCurrentLine();
      currentClause = "";
      continue;
    }

    if (token === ")" || token === ".") {
      appendToken(token, { noSpaceBefore: true });
      continue;
    }

    if (token === "(") {
      appendToken(token, { noSpaceBefore: true });
      continue;
    }

    ensureIndentedContinuation();
    appendToken(token);
  }

  flushCurrentLine();

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().toLowerCase();
}

export type SqlProjectionColumn = {
  displayName: string;
  sourceText: string;
};

const SQL_EDITOR_DRAG_INSERT_MIME = "application/x-logical-control-sql-insert";
const SQL_EDITOR_ALLOWED_CHARACTER_REGEX = /^[\x09\x0A\x0D\x20-\x7E]$/;
const SQL_EDITOR_DISALLOWED_CHARACTERS_REGEX = /[^\x09\x0A\x0D\x20-\x7E]/g;

type SqlEditorDragInsertPayload = {
  text: string;
  sourceEditorId?: string | null;
};

function serializeSqlEditorDragInsertPayload(payload: SqlEditorDragInsertPayload) {
  return JSON.stringify(payload);
}

function parseSqlEditorDragInsertPayload(rawValue: string) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SqlEditorDragInsertPayload>;
    if (typeof parsed.text !== "string" || parsed.text.length === 0) {
      return null;
    }

    return {
      text: parsed.text,
      sourceEditorId: typeof parsed.sourceEditorId === "string" ? parsed.sourceEditorId : null,
    } satisfies SqlEditorDragInsertPayload;
  } catch {
    return {
      text: rawValue,
      sourceEditorId: null,
    } satisfies SqlEditorDragInsertPayload;
  }
}

function sanitizeSqlEditorValue(value: string) {
  return value.replace(SQL_EDITOR_DISALLOWED_CHARACTERS_REGEX, "");
}

function isBlockedSelectedColumnSelfDrop(
  payload: SqlEditorDragInsertPayload | null,
  selectedColumnDragContextId?: string,
  disallowSelectedColumnSelfDrop?: boolean,
) {
  if (!payload || !disallowSelectedColumnSelfDrop || !selectedColumnDragContextId) {
    return false;
  }

  return payload.sourceEditorId === selectedColumnDragContextId;
}

function joinSqlTokens(tokens: string[]) {
  let result = "";

  tokens.forEach((token, index) => {
    const previousToken = tokens[index - 1];
    const noSpaceBefore = token === ")" || token === "." || token === "," || token === ";" || token === "]";
    const noSpaceAfterPrevious = previousToken === "(" || previousToken === "." || previousToken === "[" || previousToken === ",";

    if (result.length > 0 && !noSpaceBefore && !noSpaceAfterPrevious) {
      result += " ";
    }

    result += token;
  });

  return result.replace(/\s+/g, " ").trim();
}

function expandSqlStructuralTokens(tokens: string[]) {
  return tokens.flatMap((token) => {
    if (/^[()[\],.;*+=<>/%-]+$/.test(token)) {
      return token.split("");
    }

    return [token];
  });
}

function isSqlIdentifierToken(token: string) {
  return (
    /^[A-Za-z_][\w$]*$/.test(token) ||
    /^"(?:[^"]|"")+"$/.test(token) ||
    /^\[(?:[^\]]|\]\])+\]$/.test(token) ||
    /^`[^`]+`$/.test(token)
  );
}

function normalizeSqlIdentifier(token: string) {
  if (/^"(?:[^"]|"")+"$/.test(token)) {
    return token.slice(1, -1).replace(/""/g, "\"");
  }

  if (/^\[(?:[^\]]|\]\])+\]$/.test(token)) {
    return token.slice(1, -1).replace(/\]\]/g, "]");
  }

  if (/^`[^`]+`$/.test(token)) {
    return token.slice(1, -1);
  }

  return token;
}

function findTopLevelAsIndex(tokens: string[]) {
  let depth = 0;
  let lastAsIndex = -1;

  tokens.forEach((token, index) => {
    if (token === "(") {
      depth += 1;
      return;
    }

    if (token === ")") {
      depth = Math.max(depth - 1, 0);
      return;
    }

    if (depth === 0 && token.toUpperCase() === "AS") {
      lastAsIndex = index;
    }
  });

  return lastAsIndex;
}

function isSimpleSqlProjection(tokens: string[]) {
  if (tokens.length === 1) {
    return tokens[0] === "*" || isSqlIdentifierToken(tokens[0]);
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isEven = index % 2 === 0;

    if (isEven) {
      const isLast = index === tokens.length - 1;
      if (!(isSqlIdentifierToken(token) || (isLast && token === "*"))) {
        return false;
      }
      continue;
    }

    if (token !== ".") {
      return false;
    }
  }

  return true;
}

function getSimpleSqlProjectionDisplayName(tokens: string[]) {
  const normalizedTokens = tokens.filter((token) => token !== ".");

  if (normalizedTokens.length === 0) {
    return "";
  }

  const lastToken = normalizedTokens[normalizedTokens.length - 1];

  if (lastToken === "*") {
    return normalizedTokens.length > 1 ? `${normalizeSqlIdentifier(normalizedTokens[normalizedTokens.length - 2])}.*` : "*";
  }

  return normalizeSqlIdentifier(lastToken);
}

function normalizeSqlProjectionColumn(tokens: string[], position: number) {
  const trimmedTokens = tokens.filter((token) => token.trim().length > 0);

  if (trimmedTokens.length === 0) {
    return null;
  }

  const asIndex = findTopLevelAsIndex(trimmedTokens);
  let expressionTokens = trimmedTokens;
  let aliasTokens: string[] = [];

  if (asIndex >= 0) {
    expressionTokens = trimmedTokens.slice(0, asIndex);
    aliasTokens = trimmedTokens.slice(asIndex + 1);
  } else if (
    trimmedTokens.length >= 2 &&
    isSqlIdentifierToken(trimmedTokens[trimmedTokens.length - 1]) &&
    trimmedTokens[trimmedTokens.length - 2] !== "."
  ) {
    expressionTokens = trimmedTokens.slice(0, -1);
    aliasTokens = trimmedTokens.slice(-1);
  }

  const sourceText = joinSqlTokens(expressionTokens.length > 0 ? expressionTokens : trimmedTokens);
  const aliasText = aliasTokens.length > 0 ? normalizeSqlIdentifier(joinSqlTokens(aliasTokens)) : "";
  const normalizedExpressionTokens = expressionTokens.length > 0 ? expressionTokens : trimmedTokens;
  let displayName = "";

  if (isSimpleSqlProjection(normalizedExpressionTokens)) {
    displayName = aliasText || getSimpleSqlProjectionDisplayName(normalizedExpressionTokens);
  } else {
    displayName = `column${position}`;
  }

  if (!displayName) {
    return null;
  }

  return {
    displayName,
    sourceText,
  } satisfies SqlProjectionColumn;
}

function trimSelectProjectionPrefix(tokens: string[]) {
  let startIndex = 0;

  while (startIndex < tokens.length) {
    const upperToken = tokens[startIndex]?.toUpperCase();

    if (upperToken === "DISTINCT" || upperToken === "ALL") {
      startIndex += 1;
      continue;
    }

    if (upperToken === "TOP") {
      startIndex += 1;

      while (startIndex < tokens.length) {
        const token = tokens[startIndex];
        const upper = token?.toUpperCase();
        startIndex += 1;

        if (upper === "PERCENT" || upper === "WITH" || upper === "TIES") {
          continue;
        }

        if (token === "(") {
          let depth = 1;
          while (startIndex < tokens.length && depth > 0) {
            if (tokens[startIndex] === "(") depth += 1;
            if (tokens[startIndex] === ")") depth -= 1;
            startIndex += 1;
          }
        }

        break;
      }

      continue;
    }

    break;
  }

  return tokens.slice(startIndex);
}

export function extractSelectProjectionColumns(source: string) {
  const tokens = expandSqlStructuralTokens(
    Array.from(source.matchAll(sqlTokenRegex), (match) => match[0]).filter((token) => token.trim().length > 0),
  );

  if (tokens.length === 0) {
    return {
      isSelectQuery: false,
      columns: [] as SqlProjectionColumn[],
    };
  }

  let depth = 0;
  let selectIndex = -1;
  let fromIndex = -1;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "(") {
      depth += 1;
      continue;
    }

    if (token === ")") {
      depth = Math.max(depth - 1, 0);
      continue;
    }

    if (depth !== 0 || !/^[A-Za-z_][\w$]*$/.test(token)) {
      continue;
    }

    const upperToken = token.toUpperCase();

    if (selectIndex === -1 && upperToken === "SELECT") {
      selectIndex = index;
      continue;
    }

    if (selectIndex !== -1 && upperToken === "FROM") {
      fromIndex = index;
      break;
    }
  }

  if (selectIndex === -1) {
    return {
      isSelectQuery: false,
      columns: [] as SqlProjectionColumn[],
    };
  }

  const projectionTokens = trimSelectProjectionPrefix(tokens.slice(selectIndex + 1, fromIndex === -1 ? tokens.length : fromIndex));

  if (projectionTokens.length === 0) {
    return {
      isSelectQuery: true,
      columns: [] as SqlProjectionColumn[],
    };
  }

  const columnGroups: string[][] = [];
  let currentGroup: string[] = [];
  depth = 0;

  projectionTokens.forEach((token) => {
    if (token === "(") {
      depth += 1;
      currentGroup.push(token);
      return;
    }

    if (token === ")") {
      depth = Math.max(depth - 1, 0);
      currentGroup.push(token);
      return;
    }

    if (token === "," && depth === 0) {
      if (currentGroup.length > 0) {
        columnGroups.push(currentGroup);
      }
      currentGroup = [];
      return;
    }

    currentGroup.push(token);
  });

  if (currentGroup.length > 0) {
    columnGroups.push(currentGroup);
  }

  return {
    isSelectQuery: true,
    columns: columnGroups
      .map((group, index) => normalizeSqlProjectionColumn(group, index + 1))
      .filter((column): column is SqlProjectionColumn => Boolean(column)),
  };
}

type SqlAutocompleteSuggestion = {
  id: string;
  kind: "table" | "column" | "schema" | "message";
  label: string;
  hint?: string;
  insertText: string;
  disabled?: boolean;
};

type SqlAutocompleteSession = {
  suggestions: SqlAutocompleteSuggestion[];
  replaceStart: number;
  replaceEnd: number;
};

type SqlAutocompleteMenuState = SqlAutocompleteSession & {
  position: SqlAutocompleteMenuPosition;
  activeIndex: number;
};

type SqlAutocompleteMenuPosition = {
  top: number;
  left: number;
  maxWidth: number;
  maxHeight: number;
};

type SqlAutocompleteTableReference = {
  tableName: string;
  alias: string;
};

type SqlAutocompleteResolvedTableReference = {
  table: ClassifierTable;
  reference: SqlAutocompleteTableReference;
};

const sqlAutocompleteTableKeywords = new Set(["FROM", "JOIN", "UPDATE", "INTO", "TABLE"]);
const sqlAutocompleteMenuWidth = 320;
const sqlAutocompleteMenuHeight = 240;

function tokenizeSqlForAutocomplete(source: string) {
  return expandSqlStructuralTokens(
    Array.from(source.matchAll(sqlTokenRegex), (match) => match[0]).filter((token) => token.trim().length > 0),
  );
}

function getSqlAutocompleteTokenRange(source: string, cursorIndex: number) {
  let start = cursorIndex;
  let end = cursorIndex;

  while (start > 0 && /[\w$.]/.test(source[start - 1] ?? "")) {
    start -= 1;
  }

  while (end < source.length && /[\w$.]/.test(source[end] ?? "")) {
    end += 1;
  }

  return {
    start,
    end,
    text: source.slice(start, end),
  };
}

function findSqlAutocompletePreviousKeyword(source: string, cursorIndex: number) {
  const tokens = tokenizeSqlForAutocomplete(source.slice(0, cursorIndex));

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];

    if (!isSqlIdentifierToken(token)) {
      continue;
    }

    const upperToken = normalizeSqlIdentifier(token).toUpperCase();
    if (sqlKeywords.has(upperToken)) {
      return upperToken;
    }
  }

  return null;
}

function extractSqlAutocompleteTableReferences(source: string) {
  const tokens = tokenizeSqlForAutocomplete(source);
  const references: SqlAutocompleteTableReference[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const upperToken = isSqlIdentifierToken(token) ? normalizeSqlIdentifier(token).toUpperCase() : "";

    if (!sqlAutocompleteTableKeywords.has(upperToken)) {
      continue;
    }

    let cursor = index + 1;
    const firstNameToken = tokens[cursor];
    if (!isSqlIdentifierToken(firstNameToken ?? "")) {
      continue;
    }

    const nameTokens: string[] = [firstNameToken!];
    cursor += 1;

    while (tokens[cursor] === "." && isSqlIdentifierToken(tokens[cursor + 1] ?? "")) {
      nameTokens.push(tokens[cursor]!, tokens[cursor + 1]!);
      cursor += 2;
    }

    if (nameTokens.length === 0) {
      continue;
    }

    const normalizedNameTokens = nameTokens.filter((item) => item !== ".").map(normalizeSqlIdentifier);
    const tableName = normalizedNameTokens[normalizedNameTokens.length - 1] ?? "";

    if (!tableName) {
      continue;
    }

    let alias = tableName;

    if ((tokens[cursor] ?? "").toUpperCase() === "AS" && isSqlIdentifierToken(tokens[cursor + 1] ?? "")) {
      alias = normalizeSqlIdentifier(tokens[cursor + 1]!);
    } else if (isSqlIdentifierToken(tokens[cursor] ?? "")) {
      const candidateAlias = normalizeSqlIdentifier(tokens[cursor]!);
      if (!sqlKeywords.has(candidateAlias.toUpperCase())) {
        alias = candidateAlias;
      }
    }

    references.push({
      tableName,
      alias,
    });
  }

  return references;
}

function buildSqlAutocompleteMessage(message: string, replaceStart: number, replaceEnd: number): SqlAutocompleteSession {
  return {
    replaceStart,
    replaceEnd,
    suggestions: [
      {
        id: `message-${message}`,
        kind: "message",
        label: message,
        insertText: "",
        disabled: true,
      },
    ],
  };
}

function formatSqlAutocompleteColumnType(dataType: string | null | undefined) {
  const normalizedType = dataType?.trim();
  return normalizedType ? `[${normalizedType.toUpperCase()}]` : undefined;
}

function buildSqlAutocompleteSuggestions({
  source,
  cursorIndex,
  classifierTables,
  serverName,
  supportedServerName,
  schemaName,
}: {
  source: string;
  cursorIndex: number;
  classifierTables: ClassifierTable[];
  serverName: string;
  supportedServerName: string;
  schemaName: string;
}): SqlAutocompleteSession | null {
  const tokenRange = getSqlAutocompleteTokenRange(source, cursorIndex);
  const trimmedServerName = serverName.trim();
  const normalizedSupportedServer = supportedServerName.trim().toLocaleLowerCase();
  const normalizedSchemaName = schemaName.trim() || "etranzit";

  if (!trimmedServerName) {
    return buildSqlAutocompleteMessage("Avval serverni tanlang", tokenRange.start, tokenRange.end);
  }

  if (trimmedServerName.toLocaleLowerCase() !== normalizedSupportedServer) {
    return buildSqlAutocompleteMessage(
      `Hozircha hint faqat ${supportedServerName} serveri uchun mavjud`,
      tokenRange.start,
      tokenRange.end,
    );
  }

  if (classifierTables.length === 0) {
    return buildSqlAutocompleteMessage("Jadval tasniflagichi hali yuklanmagan", tokenRange.start, tokenRange.end);
  }

  const normalizedTableMap = new Map(
    classifierTables.map((table) => [table.tableName.trim().toLocaleLowerCase(), table] as const),
  );
  const previousKeyword = findSqlAutocompletePreviousKeyword(source, tokenRange.start);
  const rawToken = tokenRange.text.trim();
  const normalizedToken = rawToken.toLocaleLowerCase();
  const tableReferences = extractSqlAutocompleteTableReferences(source);

  const pushUniqueSuggestion = (items: SqlAutocompleteSuggestion[], nextItem: SqlAutocompleteSuggestion) => {
    if (items.some((item) => item.id === nextItem.id)) {
      return;
    }

    items.push(nextItem);
  };

  const buildTableSuggestions = (filterValue: string, replaceStart = tokenRange.start, replaceEnd = tokenRange.end) => {
    const nextSuggestions: SqlAutocompleteSuggestion[] = [];
    const normalizedFilter = filterValue.trim().replace(new RegExp(`^${normalizedSchemaName}\\.`, "i"), "").toLocaleLowerCase();

    [...classifierTables]
      .filter((table) => {
        if (!normalizedFilter) {
          return true;
        }

        return table.tableName.trim().toLocaleLowerCase().includes(normalizedFilter);
      })
      .sort((left, right) => {
        const leftName = left.tableName.trim().toLocaleLowerCase();
        const rightName = right.tableName.trim().toLocaleLowerCase();
        const leftIndex = normalizedFilter ? leftName.indexOf(normalizedFilter) : 0;
        const rightIndex = normalizedFilter ? rightName.indexOf(normalizedFilter) : 0;

        return (
          leftIndex - rightIndex ||
          leftName.length - rightName.length ||
          leftName.localeCompare(rightName, "uz")
        );
      })
      .slice(0, 14)
      .forEach((table) => {
        pushUniqueSuggestion(nextSuggestions, {
          id: `table-${table.tableName}`,
          kind: "table",
          label: table.tableName,
          insertText: `${normalizedSchemaName}.${table.tableName}`,
        });
      });

    if (nextSuggestions.length === 0) {
      return buildSqlAutocompleteMessage("Mos jadval topilmadi", replaceStart, replaceEnd);
    }

    return {
      replaceStart,
      replaceEnd,
      suggestions: nextSuggestions,
    } satisfies SqlAutocompleteSession;
  };

  const buildReferencedColumnSuggestions = (
    filterValue: string,
    replaceStart = tokenRange.start,
    replaceEnd = tokenRange.end,
  ) => {
    const normalizedFilter = filterValue.trim().toLocaleLowerCase();
    if (!normalizedFilter) {
      return null;
    }

    const resolvedReferences: SqlAutocompleteResolvedTableReference[] = tableReferences.flatMap((reference) => {
      const table = normalizedTableMap.get(reference.tableName.trim().toLocaleLowerCase());
      return table ? [{ table, reference }] : [];
    });

    if (resolvedReferences.length === 0) {
      return null;
    }

    const matchingCandidates = resolvedReferences.flatMap(({ table, reference }) =>
      [...table.columns]
        .sort((left, right) => left.ordinalPosition - right.ordinalPosition)
        .filter((column) => column.name.toLocaleLowerCase().includes(normalizedFilter))
        .map((column) => ({ table, reference, column })),
    );

    if (matchingCandidates.length === 0) {
      return null;
    }

    const columnSuggestions = matchingCandidates
      .sort((left, right) => {
        const leftName = left.column.name.toLocaleLowerCase();
        const rightName = right.column.name.toLocaleLowerCase();
        const leftMatchIndex = leftName.indexOf(normalizedFilter);
        const rightMatchIndex = rightName.indexOf(normalizedFilter);

        return (
          leftMatchIndex - rightMatchIndex ||
          leftName.length - rightName.length ||
          left.column.ordinalPosition - right.column.ordinalPosition ||
          left.table.tableName.localeCompare(right.table.tableName, "uz")
        );
      })
      .slice(0, 24)
      .map(({ table, reference, column }) => {
        const normalizedAlias = reference.alias.trim();
        const normalizedTableName = table.tableName.trim();
        const hasCustomAlias = normalizedAlias.length > 0 && normalizedAlias.toLocaleLowerCase() !== normalizedTableName.toLocaleLowerCase();
        const insertPrefix = hasCustomAlias
          ? `${normalizedAlias}.`
          : resolvedReferences.length > 1
            ? `${normalizedTableName}.`
            : "";

        return {
          id: `column-search-${normalizedTableName}-${normalizedAlias || normalizedTableName}-${column.name}`,
          kind: "column",
          label: column.name,
          hint: formatSqlAutocompleteColumnType(column.dataType),
          insertText: `${insertPrefix}${column.name}`,
        } satisfies SqlAutocompleteSuggestion;
      });

    return {
      replaceStart,
      replaceEnd,
      suggestions: columnSuggestions,
    } satisfies SqlAutocompleteSession;
  };

  if (rawToken.includes(".")) {
    const dotIndex = rawToken.lastIndexOf(".");
    const qualifier = rawToken.slice(0, dotIndex).trim();
    const memberFilter = rawToken.slice(dotIndex + 1).trim();
    const normalizedQualifier = qualifier.toLocaleLowerCase();

    if (normalizedQualifier === normalizedSchemaName.toLocaleLowerCase()) {
      return buildTableSuggestions(memberFilter, tokenRange.start, tokenRange.end);
    }

    const matchedReference = tableReferences.find((reference) => {
      const normalizedAlias = reference.alias.trim().toLocaleLowerCase();
      const normalizedTableName = reference.tableName.trim().toLocaleLowerCase();
      return normalizedAlias === normalizedQualifier || normalizedTableName === normalizedQualifier;
    });
    const matchedTable = normalizedTableMap.get(
      matchedReference?.tableName.trim().toLocaleLowerCase() ?? normalizedQualifier,
    );

    if (matchedTable) {
      const normalizedMemberFilter = memberFilter.toLocaleLowerCase();
      const columnSuggestions = [...matchedTable.columns]
        .sort((left, right) => left.ordinalPosition - right.ordinalPosition)
        .filter((column) => {
          if (!normalizedMemberFilter) {
            return true;
          }

          return column.name.toLocaleLowerCase().includes(normalizedMemberFilter);
        })
        .slice(0, 24)
        .map((column) => ({
          id: `column-${matchedTable.tableName}-${column.name}`,
          kind: "column",
          label: column.name,
          hint: formatSqlAutocompleteColumnType(column.dataType),
          insertText: `${qualifier}.${column.name}`,
        } satisfies SqlAutocompleteSuggestion));

      if (columnSuggestions.length === 0) {
        return buildSqlAutocompleteMessage("Mos ustun topilmadi", tokenRange.start, tokenRange.end);
      }

      return {
        replaceStart: tokenRange.start,
        replaceEnd: tokenRange.end,
        suggestions: columnSuggestions,
      };
    }
  }

  if (previousKeyword && sqlAutocompleteTableKeywords.has(previousKeyword)) {
    return buildTableSuggestions(normalizedToken, tokenRange.start, tokenRange.end);
  }

  if (normalizedToken.length > 0) {
    const columnSuggestions = buildReferencedColumnSuggestions(normalizedToken, tokenRange.start, tokenRange.end);
    if (columnSuggestions) {
      return columnSuggestions;
    }

    return buildTableSuggestions(normalizedToken, tokenRange.start, tokenRange.end);
  }

  return buildTableSuggestions("", tokenRange.start, tokenRange.end);
}

function measureTextareaCaretPosition(textarea: HTMLTextAreaElement, cursorIndex: number) {
  const mirror = document.createElement("div");
  const computedStyle = window.getComputedStyle(textarea);
  const stylesToCopy = [
    "box-sizing",
    "width",
    "height",
    "overflow-x",
    "overflow-y",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "font-style",
    "font-variant",
    "font-weight",
    "font-stretch",
    "font-size",
    "font-family",
    "line-height",
    "letter-spacing",
    "text-transform",
    "text-align",
    "text-indent",
    "text-decoration",
    "tab-size",
    "white-space",
    "word-break",
    "word-spacing",
  ];

  stylesToCopy.forEach((property) => {
    mirror.style.setProperty(property, computedStyle.getPropertyValue(property));
  });

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.overflow = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.width = `${textarea.clientWidth}px`;

  const beforeCursorText = textarea.value.slice(0, cursorIndex);
  mirror.textContent = beforeCursorText || " ";

  if (beforeCursorText.endsWith("\n")) {
    mirror.textContent += " ";
  }

  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(cursorIndex) || " ";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || Number.parseFloat(computedStyle.fontSize) * 1.5 || 24;

  document.body.removeChild(mirror);

  return {
    top,
    left,
    lineHeight,
  };
}

function getSqlAutocompleteMenuPosition(
  textarea: HTMLTextAreaElement,
  container: HTMLElement,
  cursorIndex: number,
): SqlAutocompleteMenuPosition {
  const caret = measureTextareaCaretPosition(textarea, cursorIndex);
  const textareaRect = textarea.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const maxWidth = Math.max(320, Math.min(sqlAutocompleteMenuWidth, containerRect.width - 24));
  const maxHeight = Math.max(220, Math.min(sqlAutocompleteMenuHeight, containerRect.height - 24));
  const baseTop = textareaRect.top - containerRect.top + caret.top + caret.lineHeight + 8;
  const fallbackTop = textareaRect.top - containerRect.top + caret.top - maxHeight - 8;

  return {
    top: Math.max(12, baseTop + maxHeight <= containerRect.height - 12 ? baseTop : fallbackTop),
    left: Math.min(
      Math.max(12, textareaRect.left - containerRect.left + caret.left),
      Math.max(12, containerRect.width - maxWidth - 12),
    ),
    maxWidth,
    maxHeight,
  };
}

function SqlProjectionColumnsPanel({
  columns,
  getDragInsertText,
  dragSourceEditorId,
}: {
  columns: SqlProjectionColumn[];
  getDragInsertText?: (column: SqlProjectionColumn) => string;
  dragSourceEditorId?: string;
}) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-border/70 bg-background/55 lg:border-t-0">
      <div className="editor-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-2.5">
          {columns.map((column, index) => (
            <div
              key={`${column.displayName}-${index}`}
              draggable
              onDragStart={(event) => {
                const dragInsertText = getDragInsertText?.(column) ?? column.displayName;
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData(
                  SQL_EDITOR_DRAG_INSERT_MIME,
                  serializeSqlEditorDragInsertPayload({
                    text: dragInsertText,
                    sourceEditorId: dragSourceEditorId ?? null,
                  }),
                );
                event.dataTransfer.setData("text/plain", dragInsertText);
              }}
              className="flex min-w-0 cursor-grab items-start gap-2 rounded-[14px] border border-border/70 bg-background px-3 py-2.5 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.24)] transition hover:border-primary/30 hover:bg-primary/5 active:cursor-grabbing"
              title="Ustunni query ichiga sudrab olib boring"
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {index + 1}
              </span>
              <p className="min-w-0 truncate whitespace-nowrap text-sm font-medium text-foreground">{column.displayName}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function SqlExecutionServerAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  compact = false,
  hasError = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownFrame, setDropdownFrame] = useState<{
    top: number | null;
    bottom: number | null;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent | MouseEvent | TouchEvent) {
      if (!(event.target instanceof globalThis.Node)) {
        return;
      }

      if (containerRef.current?.contains(event.target) || dropdownRef.current?.contains(event.target)) {
        return;
      }

      if (open) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (open) {
      const updateDropdownFrame = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }

        const gap = 6;
        const viewportPadding = 8;
        const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
        const spaceAbove = rect.top - gap - viewportPadding;
        const shouldOpenUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
        const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
        const width = Math.max(220, rect.width);
        const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
        const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);
        const listMaxHeight = Math.max(88, availableSpace - 52);

        setDropdownFrame({
          top: shouldOpenUpward ? null : rect.bottom + gap,
          bottom: shouldOpenUpward ? Math.max(viewportPadding, window.innerHeight - rect.top + gap) : null,
          left,
          width,
          maxHeight: Math.min(320, listMaxHeight),
        });
      };

      updateDropdownFrame();
      window.addEventListener("resize", updateDropdownFrame);
      window.addEventListener("scroll", updateDropdownFrame, true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => {
        window.removeEventListener("resize", updateDropdownFrame);
        window.removeEventListener("scroll", updateDropdownFrame, true);
      };
    }

    setQuery("");
    setDropdownFrame(null);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.toLocaleLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const triggerLabel = value || placeholder;
  const triggerClassName = compact
    ? "h-8 rounded-[10px] px-2.5 text-xs"
    : "h-10 rounded-[12px] px-3 text-sm";
  const dropdownSearchClassName = compact ? "h-8 rounded-[10px] px-2.5 text-xs" : "h-9 rounded-[10px] px-3 text-sm";
  const optionClassName = compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm";

  return (
    <div ref={containerRef} className="nodrag nopan nowheel relative min-w-[220px]">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex w-full items-center gap-2 border border-border bg-background text-left transition hover:bg-muted/55",
          triggerClassName,
          hasError && "border-destructive hover:border-destructive focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20",
          disabled && "cursor-not-allowed text-muted-foreground opacity-70",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate font-medium", compact ? "text-xs" : "text-sm", value ? "text-foreground" : "text-muted-foreground")}>
          {triggerLabel}
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && dropdownFrame && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[120] overflow-hidden rounded-[14px] border border-border/75 bg-popover shadow-[0_24px_42px_-28px_rgba(15,23,42,0.34)]"
              style={{
                top: dropdownFrame.top ?? undefined,
                bottom: dropdownFrame.bottom ?? undefined,
                left: dropdownFrame.left,
                width: dropdownFrame.width,
              }}
            >
              <div className="border-b border-border/70 p-2">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Serverni qidiring..."
                  className={dropdownSearchClassName}
                />
              </div>

              <div className="overflow-y-auto p-1.5" style={{ maxHeight: dropdownFrame.maxHeight }}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onChange?.(option);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-[10px] text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                        optionClassName,
                      )}
                    >
                      <span className="min-w-0 truncate font-medium">{option}</span>
                      {value === option ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                    </button>
                  ))
                ) : (
                  <div className="px-2.5 py-5 text-center text-xs text-muted-foreground">Mos server topilmadi</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function estimateSelectedColumnsPanelWidth(columns: SqlProjectionColumn[]) {
  const longestColumnNameLength = columns.reduce((longest, column) => Math.max(longest, column.displayName.length), 0);

  return Math.max(220, Math.min(560, Math.ceil(116 + longestColumnNameLength * 8.4)));
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: Array<number | "ellipsis"> = [];
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

const SQL_RESULT_COLUMN_MIN_WIDTH = 148;
const SQL_RESULT_COLUMN_MAX_WIDTH = 640;
const SQL_RESULT_ROW_NUMBER_WIDTH = 64;
const SQL_RESULT_PAGE_SIZE_OPTIONS = [10, 50, 100, 500, 1000] as const;

function estimateSqlResultColumnWidth(columnName: string, rows: Array<Array<unknown>>, columnIndex: number) {
  const headerLength = columnName.trim().length;
  const sampleLength = rows.slice(0, 24).reduce((longest, row) => {
    const valueLength = String(row[columnIndex] ?? "NULL").length;
    return Math.max(longest, valueLength);
  }, headerLength);

  return Math.max(
    SQL_RESULT_COLUMN_MIN_WIDTH,
    Math.min(SQL_RESULT_COLUMN_MAX_WIDTH, Math.ceil(sampleLength * 8.2 + 52)),
  );
}

function resolveExecutionErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = error as {
      response?: {
        data?: {
          detail?: unknown;
          title?: unknown;
        };
      };
      message?: unknown;
    };
    const detail = maybeResponse.response?.data?.detail;
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }

    if (typeof maybeResponse.message === "string" && maybeResponse.message.trim().length > 0) {
      return maybeResponse.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "SQL query bajarilmadi";
}

type SqlQueryExecutionContext = {
  serverName?: string | null;
  supportedServerName?: string;
  serverOptions?: string[];
  onServerNameChange?: (serverName: string) => void;
  serverPlaceholder?: string;
  classifierTables?: ClassifierTable[];
  autocompleteSchemaName?: string;
  runExecution?: (payload: { sql: string; serverName: string }) => Promise<SqlQueryExecutionStatusResponse>;
  cancelExecution?: (execution: SqlQueryExecutionStatusResponse) => Promise<SqlQueryExecutionStatusResponse | null | void>;
};

export type SqlCodeEditorInsertionRequest = {
  id: string;
  text: string;
};

type SqlResultSortDirection = "asc" | "desc";

function SqlExecutionResultsPanel({
  execution,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
}: {
  execution: SqlQueryExecutionStatusResponse | null;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveLocaleCode(i18n.language);
  const result = execution?.result;
  const rows = result?.rows ?? [];
  const [resultSearchQuery, setResultSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ columnIndex: number; direction: SqlResultSortDirection } | null>(null);
  const normalizedSearchQuery = resultSearchQuery.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!result || normalizedSearchQuery.length === 0) {
      return rows;
    }

    return rows.filter((row) =>
      row.some((cell, index) => {
        const normalizedCell = String(cell ?? "null").toLowerCase();
        const normalizedColumn = result.columns[index]?.toLowerCase() ?? "";
        return normalizedCell.includes(normalizedSearchQuery) || normalizedColumn.includes(normalizedSearchQuery);
      }),
    );
  }, [normalizedSearchQuery, result, rows]);
  const sortedRows = useMemo(() => {
    if (!sortConfig) {
      return filteredRows;
    }

    const { columnIndex, direction } = sortConfig;
    const numericValuePattern = /^-?\d+(?:\.\d+)?$/;
    const directionFactor = direction === "asc" ? 1 : -1;

    return filteredRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const leftRaw = left.row[columnIndex];
        const rightRaw = right.row[columnIndex];

        if (leftRaw === rightRaw) {
          return left.index - right.index;
        }

        if (leftRaw === null) {
          return 1;
        }

        if (rightRaw === null) {
          return -1;
        }

        const leftValue = leftRaw.trim();
        const rightValue = rightRaw.trim();
        const leftNumber = numericValuePattern.test(leftValue) ? Number(leftValue) : null;
        const rightNumber = numericValuePattern.test(rightValue) ? Number(rightValue) : null;

        if (leftNumber !== null && rightNumber !== null) {
          if (leftNumber === rightNumber) {
            return left.index - right.index;
          }

          return (leftNumber - rightNumber) * directionFactor;
        }

        const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
        if (comparison === 0) {
          return left.index - right.index;
        }

        return comparison * directionFactor;
      })
      .map((item) => item.row);
  }, [filteredRows, sortConfig]);
  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalRows, 1) / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalRows);
  const paginatedRows = sortedRows.slice(pageStartIndex, pageEndIndex);
  const paginationItems = buildPaginationItems(safeCurrentPage, totalPages);

  const isRunning = execution?.status === "QUEUED" || execution?.status === "RUNNING";
  const isFailed = execution?.status === "FAILED";
  const isCancelled = execution?.status === "CANCELLED";
  const hasResult = Boolean(result);
  const loadedRowsCount = rows.length;
  const resultPanelText = {
    title: {
      OZ: "Query natijasi",
      UZ: "Query натижаси",
      RU: "Результат запроса",
      EN: "Query result",
    },
    foundRows: {
      OZ: "ta qator topildi",
      UZ: "та қатор топилди",
      RU: "строк найдено",
      EN: "rows found",
    },
    running: {
      OZ: "Query bajarilmoqda...",
      UZ: "Query бажарилмоқда...",
      RU: "Запрос выполняется...",
      EN: "Query is running...",
    },
    failed: {
      OZ: "Bajarilish vaqtida xatolik yuz berdi",
      UZ: "Бажарилиш вақтида хатолик юз берди",
      RU: "Во время выполнения произошла ошибка",
      EN: "An error occurred during execution",
    },
    cancelled: {
      OZ: "Query foydalanuvchi tomonidan to'xtatildi",
      UZ: "Query фойдаланувчи томонидан тўхтатилди",
      RU: "Запрос остановлен пользователем",
      EN: "Query was stopped by the user",
    },
    ready: {
      OZ: "Natija ko'rishga tayyor",
      UZ: "Натижа кўришга тайёр",
      RU: "Результат готов к просмотру",
      EN: "Result is ready to view",
    },
    pending: {
      OZ: "Natija shu yerda ko'rsatiladi",
      UZ: "Натижа шу ерда кўрсатилади",
      RU: "Результат появится здесь",
      EN: "Result will appear here",
    },
    search: {
      OZ: "Natijadan qidiring...",
      UZ: "Натижадан қидиринг...",
      RU: "Поиск по результату...",
      EN: "Search in result...",
    },
    clearSearch: {
      OZ: "Qidiruvni tozalash",
      UZ: "Қидирувни тозалаш",
      RU: "Очистить поиск",
      EN: "Clear search",
    },
    expand: {
      OZ: "Natijani ochish",
      UZ: "Натижани очиш",
      RU: "Развернуть результат",
      EN: "Expand result",
    },
    collapse: {
      OZ: "Natijani yig'ish",
      UZ: "Натижани йиғиш",
      RU: "Свернуть результат",
      EN: "Collapse result",
    },
    sqlLog: {
      OZ: "SQL log",
      UZ: "SQL log",
      RU: "SQL лог",
      EN: "SQL log",
    },
    queryFailed: {
      OZ: "SQL query bajarilmadi",
      UZ: "SQL query бажарилмади",
      RU: "SQL-запрос не выполнен",
      EN: "SQL query failed",
    },
    queryStopped: {
      OZ: "Query to'xtatildi",
      UZ: "Query тўхтатилди",
      RU: "Запрос остановлен",
      EN: "Query stopped",
    },
    searchNoResults: {
      OZ: "Qidiruv bo'yicha natija topilmadi",
      UZ: "Қидирув бўйича натижа топилмади",
      RU: "По вашему запросу ничего не найдено",
      EN: "No results found for the search",
    },
    noResults: {
      OZ: "Natija topilmadi",
      UZ: "Натижа топилмади",
      RU: "Нет результатов",
      EN: "No results found",
    },
    showing: {
      OZ: "ko'rsatilmoqda",
      UZ: "кўрсатилмоқда",
      RU: "показано",
      EN: "shown",
    },
    rows: {
      OZ: "Qatorlar",
      UZ: "Қаторлар",
      RU: "Строки",
      EN: "Rows",
    },
    previous: {
      OZ: "Oldingi",
      UZ: "Олдинги",
      RU: "Назад",
      EN: "Previous",
    },
    next: {
      OZ: "Keyingi",
      UZ: "Кейинги",
      RU: "Далее",
      EN: "Next",
    },
    emptyState: {
      OZ: "RUN bosilgandan keyin natija yoki xatolik logi shu yerda chiqadi",
      UZ: "RUN босилгандан кейин натижа ёки хатолик логи шу ерда чиқади",
      RU: "После нажатия RUN здесь появится результат или журнал ошибки",
      EN: "After pressing RUN, the result or error log will appear here",
    },
  } as const;
  const resultSummaryText = hasResult
    ? normalizedSearchQuery.length > 0
      ? `${filteredRows.length} / ${loadedRowsCount} ${resultPanelText.foundRows[currentLocale]}`
      : `${loadedRowsCount} ${resultPanelText.foundRows[currentLocale]}`
    : null;
  const executionDurationMs = useMemo(() => {
    if (!execution?.finishedAt) {
      return null;
    }

    const startedAtSource = execution.startedAt ?? execution.createdAt;
    const startedAt = Date.parse(startedAtSource);
    const finishedAt = Date.parse(execution.finishedAt);
    if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) {
      return null;
    }

    return Math.max(1, finishedAt - startedAt);
  }, [execution?.createdAt, execution?.finishedAt, execution?.startedAt]);
  const statusText = isRunning
    ? resultPanelText.running[currentLocale]
    : isFailed
      ? resultPanelText.failed[currentLocale]
      : isCancelled
        ? resultPanelText.cancelled[currentLocale]
        : !hasResult
          ? resultPanelText.pending[currentLocale]
          : null;
  const initialColumnWidths = useMemo(
    () =>
      result?.columns.map((column, index) => estimateSqlResultColumnWidth(column, rows, index)) ?? [],
    [result?.columns, rows],
  );
  const [columnWidths, setColumnWidths] = useState<number[]>(initialColumnWidths);
  const resizeStateRef = useRef<{ columnIndex: number; startX: number; startWidth: number } | null>(null);
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);

  useEffect(() => {
    setColumnWidths(initialColumnWidths);
  }, [initialColumnWidths]);

  useEffect(() => {
    setResultSearchQuery("");
    setSortConfig(null);
  }, [execution?.executionId]);

  useEffect(() => {
    if (currentPage !== 1) {
      onPageChange(1);
    }
  }, [normalizedSearchQuery, onPageChange]);

  const effectiveColumnWidths =
    result && columnWidths.length === result.columns.length ? columnWidths : initialColumnWidths;
  const totalTableWidth =
    SQL_RESULT_ROW_NUMBER_WIDTH + effectiveColumnWidths.reduce((sum, width) => sum + width, 0);

  const handleColumnResizeEnd = useCallback(() => {
    resizeStateRef.current = null;
    setResizingColumnIndex(null);
  }, []);

  useEffect(() => {
    if (resizingColumnIndex === null) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const nextWidth = Math.max(
        SQL_RESULT_COLUMN_MIN_WIDTH,
        Math.min(SQL_RESULT_COLUMN_MAX_WIDTH, resizeState.startWidth + event.clientX - resizeState.startX),
      );

      setColumnWidths((current) => {
        const base =
          current.length === initialColumnWidths.length ? [...current] : [...initialColumnWidths];
        base[resizeState.columnIndex] = nextWidth;
        return base;
      });
    };

    const stopResizing = () => {
      handleColumnResizeEnd();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [handleColumnResizeEnd, initialColumnWidths, resizingColumnIndex]);

  const handleColumnResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, columnIndex: number) => {
      event.preventDefault();
      event.stopPropagation();
      resizeStateRef.current = {
        columnIndex,
        startX: event.clientX,
        startWidth: effectiveColumnWidths[columnIndex] ?? SQL_RESULT_COLUMN_MIN_WIDTH,
      };
      setResizingColumnIndex(columnIndex);
    },
    [effectiveColumnWidths],
  );

  const handleSortToggle = useCallback(
    (columnIndex: number) => {
      setSortConfig((current) => {
        if (!current || current.columnIndex !== columnIndex) {
          return { columnIndex, direction: "asc" };
        }

        if (current.direction === "asc") {
          return { columnIndex, direction: "desc" };
        }

        return null;
      });

      if (currentPage !== 1) {
        onPageChange(1);
      }
    },
    [currentPage, onPageChange],
  );

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.9))]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            <Terminal className="size-4 text-primary" />
            <span>{resultPanelText.title[currentLocale]}</span>
            {resultSummaryText ? (
              <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {resultSummaryText}
              </span>
            ) : null}
            {executionDurationMs !== null ? (
              <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {executionDurationMs} ms
              </span>
            ) : null}
          </div>
          {statusText ? <p className="text-xs text-muted-foreground">{statusText}</p> : null}
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {hasResult && !collapsed ? (
            <div className="relative w-full sm:w-[290px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={resultSearchQuery}
                onChange={(event) => setResultSearchQuery(event.target.value)}
                placeholder={resultPanelText.search[currentLocale]}
                className="h-9 rounded-[12px] border-border/70 bg-background pl-9 pr-10 text-sm"
              />
              {resultSearchQuery.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setResultSearchQuery("")}
                  aria-label={resultPanelText.clearSearch[currentLocale]}
                  className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {collapsible ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? resultPanelText.expand[currentLocale] : resultPanelText.collapse[currentLocale]}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-border/70 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          ) : null}
        </div>
      </div>

      {!collapsed && isFailed ? (
        <div className="px-5 py-4">
          <div className="rounded-[16px] border border-rose-200 bg-rose-50/80 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
              <AlertTriangle className="size-4" />
              {resultPanelText.sqlLog[currentLocale]}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-rose-800">
              {execution?.errorMessage ?? resultPanelText.queryFailed[currentLocale]}
            </p>
          </div>
        </div>
      ) : !collapsed && isCancelled ? (
        <div className="px-5 py-4">
          <div className="rounded-[16px] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
            {execution?.logMessage ?? resultPanelText.queryStopped[currentLocale]}
          </div>
        </div>
      ) : !collapsed && isRunning ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6">
          <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            <span>{execution?.logMessage ?? resultPanelText.running[currentLocale]}</span>
          </div>
        </div>
      ) : !collapsed && hasResult ? (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="min-h-0 h-full overflow-auto border-y border-border/70">
              <table
                className="w-max min-w-full table-fixed border-separate border-spacing-0 caption-bottom text-sm"
                style={totalTableWidth > 0 ? { width: totalTableWidth } : undefined}
              >
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-transparent">
                    <th
                      style={{
                        width: SQL_RESULT_ROW_NUMBER_WIDTH,
                        minWidth: SQL_RESULT_ROW_NUMBER_WIDTH,
                        maxWidth: SQL_RESULT_ROW_NUMBER_WIDTH,
                      }}
                      className="sticky top-0 z-10 h-11 whitespace-nowrap border-b border-r border-border bg-[rgba(248,250,252,0.98)] px-4 text-center align-middle text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-[0_1px_0_0_var(--border)] backdrop-blur first:border-l"
                    >
                      №
                    </th>
                    {result!.columns.map((column, index) => (
                      <th
                        key={`${column}-${index}`}
                        style={{
                          width: effectiveColumnWidths[index],
                          minWidth: effectiveColumnWidths[index],
                          maxWidth: effectiveColumnWidths[index],
                        }}
                        className="sticky top-0 z-10 h-11 whitespace-nowrap border-b border-r border-border bg-[rgba(248,250,252,0.98)] px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-[0_1px_0_0_var(--border)] backdrop-blur first:border-l"
                      >
                        <div className="group relative flex h-full items-center gap-2 pr-3">
                          <button
                            type="button"
                            onClick={() => handleSortToggle(index)}
                            className="inline-flex min-w-0 flex-1 items-center gap-1 text-left text-inherit transition hover:text-foreground"
                            title={
                              sortConfig?.columnIndex === index
                                ? sortConfig.direction === "asc"
                                  ? `${column} bo'yicha kamayish tartibida saralash`
                                  : `${column} bo'yicha saralashni bekor qilish`
                                : `${column} bo'yicha o'sish tartibida saralash`
                            }
                          >
                            <span className="block min-w-0 truncate">{column}</span>
                            {sortConfig?.columnIndex === index ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="size-3.5 shrink-0 text-primary" />
                              ) : (
                                <ArrowDown className="size-3.5 shrink-0 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground/70" />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label={`${column} ustuni eni`}
                            onPointerDown={(event) => handleColumnResizeStart(event, index)}
                            className={cn(
                              "absolute -right-4 top-1/2 z-20 h-8 w-4 -translate-y-1/2 cursor-col-resize touch-none rounded-full border border-transparent transition",
                              resizingColumnIndex === index
                                ? "bg-primary/12 text-primary"
                                : "bg-transparent text-muted-foreground/70 hover:border-border hover:bg-background/92",
                            )}
                          >
                            <span className="absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 bg-current" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {paginatedRows.length === 0 ? (
                    <tr className="border-b transition-colors hover:bg-transparent">
                      <td
                        colSpan={Math.max(result!.columns.length + 1, 1)}
                        className="p-4 py-8 text-center align-middle text-sm text-muted-foreground"
                      >
                        {normalizedSearchQuery.length > 0 ? resultPanelText.searchNoResults[currentLocale] : resultPanelText.noResults[currentLocale]}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, rowIndex) => (
                      <tr
                        key={`sql-row-${pageStartIndex + rowIndex}`}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td
                          style={{
                            width: SQL_RESULT_ROW_NUMBER_WIDTH,
                            minWidth: SQL_RESULT_ROW_NUMBER_WIDTH,
                            maxWidth: SQL_RESULT_ROW_NUMBER_WIDTH,
                          }}
                          className="whitespace-nowrap border-r border-border px-4 py-2.5 text-center align-top text-sm font-medium text-muted-foreground select-none first:border-l"
                        >
                          {pageStartIndex + rowIndex + 1}
                        </td>
                        {result!.columns.map((column, columnIndex) => (
                          <td
                            key={`${column}-${pageStartIndex + rowIndex}-${columnIndex}`}
                            style={{
                              width: effectiveColumnWidths[columnIndex],
                              minWidth: effectiveColumnWidths[columnIndex],
                              maxWidth: effectiveColumnWidths[columnIndex],
                            }}
                            className="whitespace-nowrap border-r border-border px-4 py-2.5 align-top text-sm first:border-l"
                            title={row[columnIndex] ?? ""}
                          >
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                              {row[columnIndex] ?? "NULL"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {totalRows === 0
                  ? `0 / 0 ${resultPanelText.showing[currentLocale]}`
                  : `${pageStartIndex + 1}-${pageEndIndex} / ${totalRows} ${resultPanelText.showing[currentLocale]}`}
              </p>
              <label className="flex h-8 items-center gap-2 rounded-[10px] border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground">
                <span>{resultPanelText.rows[currentLocale]}</span>
                <select
                  value={pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value))}
                  className="h-full bg-transparent text-xs font-semibold text-foreground outline-none"
                >
                  {SQL_RESULT_PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="size-3.5" />
                {resultPanelText.previous[currentLocale]}
              </button>
              <div className="flex flex-wrap items-center gap-1">
                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`sql-ellipsis-${index}`}
                      className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-xs text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPageChange(item)}
                      className={cn(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] border px-3 text-xs font-medium transition",
                        item === safeCurrentPage
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resultPanelText.next[currentLocale]}
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6">
          <div className="rounded-[18px] border border-dashed border-border/80 bg-background/70 px-5 py-4 text-center text-sm text-muted-foreground">
            {resultPanelText.emptyState[currentLocale]}
          </div>
        </div>
      )}
    </section>
  );
}

type SqlEditorFrame = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function getSqlEditorExpandedFrame(): SqlEditorFrame {
  if (typeof window === "undefined") {
    return {
      top: 24,
      left: 24,
      width: 1540,
      height: 900,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.max(1080, Math.min(viewportWidth - 28, 1660));
  const height = Math.max(520, Math.min(viewportHeight - 32, 920));

  return {
    top: Math.max((viewportHeight - height) / 2, 24),
    left: Math.max((viewportWidth - width) / 2, 24),
    width,
    height,
  };
}

function measureSqlEditorFrame(element: HTMLElement | null): SqlEditorFrame | null {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function SqlCodeEditorSurface({
  value,
  onChange,
  placeholder,
  className,
  headerLabel = "SQL Script",
  headerContent,
  headerDragHandleProps,
  minHeightClassName = "min-h-[560px]",
  selectedColumnsPanel,
  selectedColumnsPanelWidth,
  onSelectedColumnsPanelWidthChange,
  textareaRef,
  toolbarLeadingActions,
  toolbarActions,
  hideHeader = false,
  autoFocus = false,
  onRunShortcut,
  autocompleteClassifierTables = [],
  autocompleteServerName = "",
  autocompleteSupportedServerName = "etran.db.gtk",
  autocompleteSchemaName = "etranzit",
  selectedColumnDragContextId,
  disallowSelectedColumnSelfDrop = false,
  onEditorFocusChange,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  headerLabel?: string | null;
  headerContent?: ReactNode;
  headerDragHandleProps?: {
    onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    title?: string;
    className?: string;
  };
  minHeightClassName?: string;
  selectedColumnsPanel?: ReactNode;
  selectedColumnsPanelWidth?: number;
  onSelectedColumnsPanelWidthChange?: (width: number) => void;
  textareaRef?: MutableRefObject<HTMLTextAreaElement | null>;
  toolbarLeadingActions?: ReactNode;
  toolbarActions?: ReactNode;
  hideHeader?: boolean;
  autoFocus?: boolean;
  onRunShortcut?: (() => void) | null;
  autocompleteClassifierTables?: ClassifierTable[];
  autocompleteServerName?: string;
  autocompleteSupportedServerName?: string;
  autocompleteSchemaName?: string;
  selectedColumnDragContextId?: string;
  disallowSelectedColumnSelfDrop?: boolean;
  onEditorFocusChange?: (focused: boolean) => void;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveLocaleCode(i18n.language);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const overlayScrollRef = useRef<HTMLDivElement | null>(null);
  const gutterScrollRef = useRef<HTMLDivElement | null>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightedTokens = useMemo(() => renderSqlHighlightedTokens(value), [value]);
  const lineCount = useMemo(() => Math.max(value.split("\n").length, 1), [value]);
  const [isResizingColumnsPanel, setIsResizingColumnsPanel] = useState(false);
  const [autocompleteState, setAutocompleteState] = useState<SqlAutocompleteMenuState | null>(null);
  const surfaceText = {
    format: {
      OZ: "Format",
      UZ: "Формат",
      RU: "Формат",
      EN: "Format",
    },
    formatTitle: {
      OZ: "Format qilish (Ctrl+Shift+F)",
      UZ: "Формат қилиш (Ctrl+Shift+F)",
      RU: "Форматировать (Ctrl+Shift+F)",
      EN: "Format (Ctrl+Shift+F)",
    },
    columnPanelWidth: {
      OZ: "Ustunlar paneli eni",
      UZ: "Устунлар панели эни",
      RU: "Ширина панели колонок",
      EN: "Column panel width",
    },
  } as const;

  const clampColumnsPanelWidth = useCallback((nextWidth: number) => {
    const containerWidth = bodyRef.current?.clientWidth ?? 0;
    const maxWidth = containerWidth > 0 ? Math.max(220, Math.min(560, containerWidth - 240)) : 420;

    return Math.min(Math.max(nextWidth, 220), maxWidth);
  }, []);

  const setTextareaElement = useCallback(
    (node: HTMLTextAreaElement | null) => {
      localTextareaRef.current = node;
      if (textareaRef) {
        textareaRef.current = node;
      }
    },
    [textareaRef],
  );

  const syncScrollPositions = useCallback((element: HTMLTextAreaElement) => {
    if (overlayScrollRef.current) {
      overlayScrollRef.current.scrollTop = element.scrollTop;
      overlayScrollRef.current.scrollLeft = element.scrollLeft;
    }

    if (gutterScrollRef.current) {
      gutterScrollRef.current.scrollTop = element.scrollTop;
    }

    setAutocompleteState((current) => {
      if (!current || !editorPaneRef.current) {
        return current;
      }

      return {
        ...current,
        position: getSqlAutocompleteMenuPosition(
          element,
          editorPaneRef.current,
          element.selectionStart ?? element.value.length,
        ),
      };
    });
  }, []);

  const closeAutocomplete = useCallback(() => {
    setAutocompleteState(null);
  }, []);

  const buildAutocompleteState = useCallback(
    (textarea: HTMLTextAreaElement, source: string, activeSuggestionId?: string | null) => {
      const container = editorPaneRef.current;
      if (!container) {
        return null;
      }

      const cursorIndex = textarea.selectionStart ?? source.length;
      const session = buildSqlAutocompleteSuggestions({
        source,
        cursorIndex,
        classifierTables: autocompleteClassifierTables,
        serverName: autocompleteServerName,
        supportedServerName: autocompleteSupportedServerName,
        schemaName: autocompleteSchemaName,
      });

      if (!session) {
        return null;
      }

      const firstEnabledIndex = Math.max(
        0,
        session.suggestions.findIndex((suggestion) => !suggestion.disabled),
      );
      const activeIndex = activeSuggestionId
        ? Math.max(
            0,
            session.suggestions.findIndex((suggestion) => suggestion.id === activeSuggestionId),
          )
        : firstEnabledIndex;

      return {
        ...session,
        activeIndex,
        position: getSqlAutocompleteMenuPosition(textarea, container, cursorIndex),
      } satisfies SqlAutocompleteMenuState;
    },
    [
      autocompleteClassifierTables,
      autocompleteSchemaName,
      autocompleteServerName,
      autocompleteSupportedServerName,
    ],
  );

  const openAutocomplete = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const activeSuggestionId = autocompleteState?.suggestions[autocompleteState.activeIndex]?.id ?? null;
      setAutocompleteState(buildAutocompleteState(textarea, textarea.value, activeSuggestionId));
    },
    [autocompleteState, buildAutocompleteState],
  );

  const applyAutocompleteSuggestion = useCallback(
    (suggestion: SqlAutocompleteSuggestion, textarea?: HTMLTextAreaElement | null) => {
      if (suggestion.disabled || !autocompleteState) {
        return;
      }

      const activeTextarea = textarea ?? localTextareaRef.current;
      if (!activeTextarea) {
        return;
      }

      const rawNextValue = `${value.slice(0, autocompleteState.replaceStart)}${suggestion.insertText}${value.slice(autocompleteState.replaceEnd)}`;
      const nextValue = sanitizeSqlEditorValue(rawNextValue);
      const nextCaretPosition = sanitizeSqlEditorValue(
        rawNextValue.slice(0, autocompleteState.replaceStart + suggestion.insertText.length),
      ).length;

      onChange(nextValue);
      setAutocompleteState(null);

      requestAnimationFrame(() => {
        const nextTextarea = localTextareaRef.current ?? activeTextarea;
        if (!nextTextarea) {
          return;
        }

        nextTextarea.focus();
        nextTextarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
        syncScrollPositions(nextTextarea);
      });
    },
    [autocompleteState, onChange, syncScrollPositions, value],
  );

  const moveAutocompleteSelection = useCallback((direction: 1 | -1) => {
    setAutocompleteState((current) => {
      if (!current || current.suggestions.length === 0) {
        return current;
      }

      let nextIndex = current.activeIndex;
      for (let attempt = 0; attempt < current.suggestions.length; attempt += 1) {
        nextIndex = (nextIndex + direction + current.suggestions.length) % current.suggestions.length;
        if (!current.suggestions[nextIndex]?.disabled) {
          return {
            ...current,
            activeIndex: nextIndex,
          };
        }
      }

      return current;
    });
  }, []);

  const handleTextareaChange = useCallback(
    (event: ReactChangeEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      const nextValue = sanitizeSqlEditorValue(target.value);
      const nextSelectionStart = sanitizeSqlEditorValue(target.value.slice(0, target.selectionStart ?? 0)).length;
      const nextSelectionEnd = sanitizeSqlEditorValue(target.value.slice(0, target.selectionEnd ?? 0)).length;
      onChange(nextValue);

      if (nextValue !== target.value) {
        requestAnimationFrame(() => {
          const textarea = localTextareaRef.current;
          if (!textarea) {
            return;
          }

          textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
          syncScrollPositions(textarea);
        });
      }

      if (!autocompleteState) {
        return;
      }

      requestAnimationFrame(() => {
        openAutocomplete(target);
      });
    },
    [autocompleteState, onChange, openAutocomplete],
  );

  const handleFormatClick = useCallback(() => {
    const formattedValue = sanitizeSqlEditorValue(formatSqlScript(value));
    onChange(formattedValue);
    closeAutocomplete();

    requestAnimationFrame(() => {
      const textarea = localTextareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      syncScrollPositions(textarea);
    });
  }, [closeAutocomplete, onChange, syncScrollPositions, value]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.length === 1 &&
        !SQL_EDITOR_ALLOWED_CHARACTER_REGEX.test(event.key)
      ) {
        event.preventDefault();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        handleFormatClick();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onRunShortcut) {
        event.preventDefault();
        onRunShortcut();
        return;
      }

      if (event.ctrlKey && (event.code === "Space" || event.key === " ")) {
        event.preventDefault();
        openAutocomplete(event.currentTarget);
        return;
      }

      if (autocompleteState) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveAutocompleteSelection(1);
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveAutocompleteSelection(-1);
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeAutocomplete();
          return;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          const activeSuggestion = autocompleteState.suggestions[autocompleteState.activeIndex];
          if (activeSuggestion && !activeSuggestion.disabled) {
            event.preventDefault();
            applyAutocompleteSuggestion(activeSuggestion, event.currentTarget);
            return;
          }
        }
      }

      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      const target = event.currentTarget;
      const rawNextValue = `${value.slice(0, target.selectionStart)}  ${value.slice(target.selectionEnd)}`;
      const nextValue = sanitizeSqlEditorValue(rawNextValue);
      const nextCaretPosition = sanitizeSqlEditorValue(rawNextValue.slice(0, target.selectionStart + 2)).length;
      onChange(nextValue);

      requestAnimationFrame(() => {
        const textarea = localTextareaRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
        syncScrollPositions(textarea);
      });
    },
    [
      autocompleteState,
      applyAutocompleteSuggestion,
      closeAutocomplete,
      handleFormatClick,
      moveAutocompleteSelection,
      onChange,
      onRunShortcut,
      openAutocomplete,
      syncScrollPositions,
      value,
    ],
  );

  const handleInsertDraggedText = useCallback(
    (text: string, textarea: HTMLTextAreaElement, mode: "cursor" | "append-end" = "cursor") => {
      const insertionStart = mode === "append-end" ? value.length : (textarea.selectionStart ?? value.length);
      const insertionEnd = mode === "append-end" ? value.length : (textarea.selectionEnd ?? insertionStart);
      const separator = mode === "append-end" && value.length > 0 && !/\s$/.test(value) ? " " : "";
      const rawNextValue = `${value.slice(0, insertionStart)}${separator}${text}${value.slice(insertionEnd)}`;
      const nextValue = sanitizeSqlEditorValue(rawNextValue);
      const nextCaretPosition = sanitizeSqlEditorValue(
        rawNextValue.slice(0, insertionStart + separator.length + text.length),
      ).length;

      onChange(nextValue);

      requestAnimationFrame(() => {
        const nextTextarea = localTextareaRef.current ?? textarea;
        if (!nextTextarea) {
          return;
        }

        nextTextarea.focus();
        nextTextarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
        syncScrollPositions(nextTextarea);
      });
    },
    [onChange, syncScrollPositions, value],
  );

  const handleTextDragOver = useCallback((event: ReactDragEvent<HTMLTextAreaElement>) => {
    const transferTypes = Array.from(event.dataTransfer.types);
    if (!transferTypes.includes(SQL_EDITOR_DRAG_INSERT_MIME) && !transferTypes.includes("text/plain")) {
      return;
    }

    const customDragPayload = transferTypes.includes(SQL_EDITOR_DRAG_INSERT_MIME)
      ? parseSqlEditorDragInsertPayload(event.dataTransfer.getData(SQL_EDITOR_DRAG_INSERT_MIME))
      : null;

    if (isBlockedSelectedColumnSelfDrop(customDragPayload, selectedColumnDragContextId, disallowSelectedColumnSelfDrop)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [disallowSelectedColumnSelfDrop, selectedColumnDragContextId]);

  const handleTextDrop = useCallback(
    (event: ReactDragEvent<HTMLTextAreaElement>) => {
      const customDragPayload = parseSqlEditorDragInsertPayload(event.dataTransfer.getData(SQL_EDITOR_DRAG_INSERT_MIME));
      const dragText = customDragPayload?.text || event.dataTransfer.getData("text/plain");
      if (!dragText) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeAutocomplete();

      if (isBlockedSelectedColumnSelfDrop(customDragPayload, selectedColumnDragContextId, disallowSelectedColumnSelfDrop)) {
        return;
      }

      handleInsertDraggedText(dragText, event.currentTarget, customDragPayload ? "append-end" : "cursor");
    },
    [closeAutocomplete, disallowSelectedColumnSelfDrop, handleInsertDraggedText, selectedColumnDragContextId],
  );

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const textarea = localTextareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      syncScrollPositions(textarea);
    });

    return () => cancelAnimationFrame(frameId);
  }, [autoFocus, syncScrollPositions]);

  useEffect(() => {
    if (!autocompleteState) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && surfaceRef.current?.contains(target)) {
        return;
      }

      setAutocompleteState(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [autocompleteState]);

  const handleColumnsResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedColumnsPanel || !onSelectedColumnsPanelWidthChange) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      setIsResizingColumnsPanel(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const rect = bodyRef.current?.getBoundingClientRect();

        if (!rect) {
          return;
        }

        const nextWidth = rect.right - moveEvent.clientX;
        onSelectedColumnsPanelWidthChange(clampColumnsPanelWidth(nextWidth));
      };

      const cleanup = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        setIsResizingColumnsPanel(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", cleanup);
      window.addEventListener("pointercancel", cleanup);
    },
    [clampColumnsPanelWidth, onSelectedColumnsPanelWidthChange, selectedColumnsPanel],
  );

  const resolvedColumnsPanelWidth = clampColumnsPanelWidth(selectedColumnsPanelWidth ?? 220);

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "nodrag nopan nowheel flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-border bg-background shadow-sm",
        className,
      )}
    >
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/35 px-4 py-2.5">
          {headerContent ? (
            <div
              onPointerDown={headerDragHandleProps?.onPointerDown}
              title={headerDragHandleProps?.title}
              className={cn(
                "min-w-0 flex items-center",
                headerDragHandleProps?.onPointerDown &&
                  "flex-1 self-stretch rounded-[10px] px-1 cursor-grab active:cursor-grabbing select-none touch-none transition-colors hover:bg-muted/45",
                headerDragHandleProps?.className,
              )}
            >
              {headerContent}
            </div>
          ) : headerLabel ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{headerLabel}</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {toolbarLeadingActions}
            <button
              type="button"
              onClick={handleFormatClick}
              title={surfaceText.formatTitle[currentLocale]}
              className="nodrag nopan nowheel inline-flex h-8 items-center justify-center rounded-[10px] border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              {surfaceText.format[currentLocale]}
            </button>
            {toolbarActions}
          </div>
        </div>
      ) : null}

      <div ref={bodyRef} className={cn("flex min-h-0 flex-col flex-1 lg:flex-row", minHeightClassName)}>
        <div ref={editorPaneRef} className="relative min-h-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex overflow-hidden">
            <div
              ref={gutterScrollRef}
              className="w-14 shrink-0 overflow-hidden border-r border-border bg-muted/30 px-3 py-4 text-right font-mono text-xs leading-6 text-muted-foreground"
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>

            <div ref={overlayScrollRef} className="min-w-0 flex-1 overflow-hidden">
              <pre className="sql-editor-code m-0 min-h-full whitespace-pre-wrap break-words px-4 py-4 font-mono text-sm leading-6">
                <code>
                  {value.trim().length > 0 ? highlightedTokens : <span className="text-muted-foreground">{placeholder}</span>}
                </code>
              </pre>
            </div>
          </div>

          <div className="absolute inset-0 flex">
            <div className="w-14 shrink-0 border-r border-transparent" aria-hidden="true" />
            <textarea
              ref={setTextareaElement}
              value={value}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              onFocus={() => onEditorFocusChange?.(true)}
              onBlur={() => onEditorFocusChange?.(false)}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onDragOver={handleTextDragOver}
              onDrop={handleTextDrop}
              onScroll={(event) => syncScrollPositions(event.currentTarget)}
              className="sql-editor-code editor-scroll nodrag nopan nowheel h-full w-full resize-none overflow-y-scroll bg-transparent px-4 py-4 font-mono text-sm leading-6 text-transparent caret-foreground outline-none placeholder:text-transparent"
              placeholder={placeholder}
            />
          </div>

          <AnimatePresence>
            {autocompleteState ? (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute z-20"
                style={{
                  top: autocompleteState.position.top,
                  left: autocompleteState.position.left,
                  width: autocompleteState.position.maxWidth,
                }}
              >
                <div className="overflow-hidden rounded-[14px] border border-border/80 bg-background/98 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
                  <div
                    className="editor-scroll overflow-y-auto p-1.5"
                    style={{ maxHeight: autocompleteState.position.maxHeight }}
                  >
                    <div className="space-y-1">
                      {autocompleteState.suggestions.map((suggestion, index) => {
                        const isActive = index === autocompleteState.activeIndex;
                        return suggestion.disabled ? (
                          <div
                            key={suggestion.id}
                            className="rounded-[10px] border border-dashed border-border/70 bg-muted/25 px-3 py-2 text-xs text-muted-foreground"
                          >
                            {suggestion.label}
                          </div>
                        ) : (
                          <button
                            key={suggestion.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyAutocompleteSuggestion(suggestion)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-[10px] border px-3 py-2 text-left transition",
                              isActive
                                ? "border-primary/35 bg-primary/8"
                                : "border-border/70 bg-background hover:border-primary/20 hover:bg-primary/5",
                            )}
                          >
                            <span className="block min-w-0 truncate text-sm font-medium text-foreground">{suggestion.label}</span>
                            {suggestion.hint ? (
                              <span className="shrink-0 text-xs font-medium text-muted-foreground">{suggestion.hint}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {selectedColumnsPanel ? (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={surfaceText.columnPanelWidth[currentLocale]}
              onPointerDown={handleColumnsResizeStart}
              className={cn(
                "relative hidden w-4 shrink-0 cursor-col-resize touch-none items-stretch justify-center bg-background/55 transition lg:flex",
                isResizingColumnsPanel && "bg-primary/8",
              )}
            >
              <div className={cn("absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border", isResizingColumnsPanel && "bg-primary")} />
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 h-14 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background shadow-sm",
                  isResizingColumnsPanel && "border-primary/40 bg-primary/10",
                )}
              />
            </div>
            <div
              className="min-h-0 w-full lg:w-[var(--sql-panel-width)] lg:shrink-0"
              style={{ ["--sql-panel-width" as string]: `${resolvedColumnsPanelWidth}px` }}
            >
              {selectedColumnsPanel}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export type SqlCodeEditorHandle = {
  expand: () => void;
  collapse: () => void;
};

type SqlCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  headerLabel?: string | null;
  headerContent?: ReactNode;
  headerDragHandleProps?: {
    onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    title?: string;
    className?: string;
  };
  minHeightClassName?: string;
  toolbarLeadingActions?: ReactNode;
  showSelectedColumnsPanel?: boolean;
  selectedColumnsPanelWidth?: number;
  onSelectedColumnsPanelWidthChange?: (width: number) => void;
  queryExecutionContext?: SqlQueryExecutionContext;
  pendingInsertion?: SqlCodeEditorInsertionRequest | null;
  onInsertionHandled?: (requestId: string) => void;
  getSelectedColumnDragText?: (column: SqlProjectionColumn) => string;
  selectedColumnDragContextId?: string;
  disallowSelectedColumnSelfDrop?: boolean;
  onEditorFocusChange?: (focused: boolean) => void;
  hideInlineHeader?: boolean;
};

export const SqlCodeEditor = forwardRef<SqlCodeEditorHandle, SqlCodeEditorProps>(function SqlCodeEditor({
  value,
  onChange,
  placeholder,
  className,
  headerLabel,
  headerContent,
  headerDragHandleProps,
  minHeightClassName = "min-h-[560px]",
  toolbarLeadingActions,
  showSelectedColumnsPanel = false,
  selectedColumnsPanelWidth = 220,
  onSelectedColumnsPanelWidthChange,
  queryExecutionContext,
  pendingInsertion,
  onInsertionHandled,
  getSelectedColumnDragText,
  selectedColumnDragContextId,
  disallowSelectedColumnSelfDrop = false,
  onEditorFocusChange,
  hideInlineHeader = false,
}: SqlCodeEditorProps, ref) {
  const { i18n } = useTranslation();
  const currentLocale = resolveLocaleCode(i18n.language);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inlineTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const lastExecutedKeyRef = useRef<string | null>(null);
  const handledInsertionIdRef = useRef<string | null>(null);
  const wasExpandedRef = useRef(false);
  const scrollPositionRef = useRef({ top: 0, left: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [originFrame, setOriginFrame] = useState<SqlEditorFrame | null>(null);
  const [expandedFrame, setExpandedFrame] = useState<SqlEditorFrame>(() => getSqlEditorExpandedFrame());
  const [internalSelectedColumnsPanelWidth, setInternalSelectedColumnsPanelWidth] = useState(selectedColumnsPanelWidth);
  const [execution, setExecution] = useState<SqlQueryExecutionStatusResponse | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isExecutionPanelCollapsed, setIsExecutionPanelCollapsed] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const [resultPageSize, setResultPageSize] = useState<number>(10);
  const selectProjection = useMemo(() => extractSelectProjectionColumns(value), [value]);
  const autoSelectedColumnsPanelWidth = useMemo(
    () => estimateSelectedColumnsPanelWidth(selectProjection.columns),
    [selectProjection.columns],
  );
  const selectedColumnsPanel =
    showSelectedColumnsPanel && selectProjection.isSelectQuery && selectProjection.columns.length > 0 ? (
      <SqlProjectionColumnsPanel
        columns={selectProjection.columns}
        getDragInsertText={getSelectedColumnDragText}
        dragSourceEditorId={selectedColumnDragContextId}
      />
    ) : null;
  const resolvedSelectedColumnsPanelWidth = onSelectedColumnsPanelWidthChange ? selectedColumnsPanelWidth : internalSelectedColumnsPanelWidth;
  const effectiveSelectedColumnsPanelWidth = Math.max(resolvedSelectedColumnsPanelWidth, autoSelectedColumnsPanelWidth);
  const normalizedExecutionServerName = queryExecutionContext?.serverName?.trim() ?? "";
  const supportedExecutionServerName = queryExecutionContext?.supportedServerName?.trim() || "etran.db.gtk";
  const executionServerOptions = queryExecutionContext?.serverOptions ?? [];
  const autocompleteClassifierTables = queryExecutionContext?.classifierTables ?? [];
  const autocompleteSchemaName = queryExecutionContext?.autocompleteSchemaName?.trim() || "etranzit";
  const executionRequestKey = `${normalizedExecutionServerName}::${value}`;
  const isExecutionRunning = execution?.status === "QUEUED" || execution?.status === "RUNNING";
  const editorText = {
    sqlScript: {
      OZ: "SQL Script",
      UZ: "SQL Script",
      RU: "SQL Script",
      EN: "SQL Script",
    },
    noSql: {
      OZ: "SQL query kiritilmagan",
      UZ: "SQL query киритилмаган",
      RU: "SQL-запрос не указан",
      EN: "SQL query is empty",
    },
    noServer: {
      OZ: "Server tanlanmagan",
      UZ: "Сервер танланмаган",
      RU: "Сервер не выбран",
      EN: "Server is not selected",
    },
    onlyServer: {
      OZ: "Hozircha faqat {{server}} serveri bilan ishlaydi",
      UZ: "Ҳозирча фақат {{server}} сервери билан ишлайди",
      RU: "Пока работает только с сервером {{server}}",
      EN: "Currently works only with {{server}} server",
    },
    expand: {
      OZ: "Kattalashtirish",
      UZ: "Катталаштириш",
      RU: "Развернуть",
      EN: "Expand",
    },
    collapse: {
      OZ: "Kichraytirish",
      UZ: "Кичрайтириш",
      RU: "Свернуть",
      EN: "Collapse",
    },
    serverPlaceholder: {
      OZ: "Serverni tanlang",
      UZ: "Серверни танланг",
      RU: "Выберите сервер",
      EN: "Select server",
    },
    runningTitle: {
      OZ: "Query bajarilmoqda • Ctrl+Enter",
      UZ: "Query бажарилмоқда • Ctrl+Enter",
      RU: "Запрос выполняется • Ctrl+Enter",
      EN: "Query is running • Ctrl+Enter",
    },
    runTitle: {
      OZ: "Queryni ishga tushirish (Ctrl+Enter)",
      UZ: "Queryни ишга тушириш (Ctrl+Enter)",
      RU: "Запустить запрос (Ctrl+Enter)",
      EN: "Run query (Ctrl+Enter)",
    },
    running: {
      OZ: "Query bajarilmoqda",
      UZ: "Query бажарилмоқда",
      RU: "Запрос выполняется",
      EN: "Query is running",
    },
    failed: {
      OZ: "SQL query bajarilmadi",
      UZ: "SQL query бажарилмади",
      RU: "SQL-запрос не выполнен",
      EN: "SQL query failed",
    },
    closeEditor: {
      OZ: "SQL editorni yopish",
      UZ: "SQL editorни ёпиш",
      RU: "Закрыть SQL-редактор",
      EN: "Close SQL editor",
    },
    editorDialog: {
      OZ: "SQL query editor",
      UZ: "SQL query editor",
      RU: "SQL-редактор запроса",
      EN: "SQL query editor",
    },
  } as const;
  const canStopExecution =
    isExecutionRunning && (Boolean(queryExecutionContext?.cancelExecution) || Boolean(execution?.stopAvailable));
  const resolvedHeaderLabel = headerLabel ?? editorText.sqlScript[currentLocale];
  const runDisabledReason = !queryExecutionContext
    ? null
    : value.trim().length === 0
      ? editorText.noSql[currentLocale]
      : normalizedExecutionServerName.length === 0
        ? editorText.noServer[currentLocale]
        : normalizedExecutionServerName.toLowerCase() !== supportedExecutionServerName.toLowerCase()
          ? editorText.onlyServer[currentLocale].replace("{{server}}", supportedExecutionServerName)
          : null;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (onSelectedColumnsPanelWidthChange) {
      return;
    }

    setInternalSelectedColumnsPanelWidth(selectedColumnsPanelWidth);
  }, [onSelectedColumnsPanelWidthChange, selectedColumnsPanelWidth]);

  useEffect(() => {
    return () => clearPollTimer();
  }, [clearPollTimer]);

  useEffect(() => {
    if (!pendingInsertion || handledInsertionIdRef.current === pendingInsertion.id) {
      return;
    }

    const activeTextarea =
      (isExpanded ? expandedTextareaRef.current : inlineTextareaRef.current) ??
      expandedTextareaRef.current ??
      inlineTextareaRef.current;
    const selectionStart = activeTextarea?.selectionStart ?? value.length;
    const selectionEnd = activeTextarea?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, selectionStart)}${pendingInsertion.text}${value.slice(selectionEnd)}`;
    const nextCaretPosition = selectionStart + pendingInsertion.text.length;

    handledInsertionIdRef.current = pendingInsertion.id;
    onChange(nextValue);
    onInsertionHandled?.(pendingInsertion.id);

    requestAnimationFrame(() => {
      const textarea =
        (isExpanded ? expandedTextareaRef.current : inlineTextareaRef.current) ??
        expandedTextareaRef.current ??
        inlineTextareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
      textarea.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
  }, [isExpanded, onChange, onInsertionHandled, pendingInsertion, value]);

  useEffect(() => {
    clearPollTimer();
    if (!execution?.executionId || !execution.stopAvailable) {
      return;
    }

    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const nextExecution = await fetchSqlQueryExecutionStatus(execution.executionId);
        setExecution(nextExecution);
        setExecutionError(null);
      } catch (error) {
        const message = resolveExecutionErrorMessage(error);
        setExecutionError(message);
        setExecution((current) =>
          current
            ? {
                ...current,
                status: "FAILED",
                logMessage: editorText.failed[currentLocale],
                errorMessage: message,
                stopAvailable: false,
                finishedAt: new Date().toISOString(),
              }
            : null,
        );
      }
    }, 900);

    return clearPollTimer;
  }, [clearPollTimer, execution?.executionId, execution?.stopAvailable]);

  const handleRun = useCallback(async () => {
    if (!queryExecutionContext) {
      return;
    }

    if (runDisabledReason) {
      clearPollTimer();
      setExecution(null);
      setExecutionError(runDisabledReason);
      setResultPage(1);
      return;
    }

    clearPollTimer();
    setExecutionError(null);
    setIsExecutionPanelCollapsed(false);
    setResultPage(1);

    try {
      if (queryExecutionContext.runExecution) {
        const placeholderExecutionId = `custom-${Date.now()}`;
        setExecution({
          executionId: placeholderExecutionId,
          status: "RUNNING",
          serverName: normalizedExecutionServerName,
          logMessage: editorText.running[currentLocale],
          errorMessage: null,
          stopAvailable: false,
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          finishedAt: null,
          result: null,
        });

        const completedExecution = await queryExecutionContext.runExecution({
          sql: value,
          serverName: normalizedExecutionServerName,
        });

        lastExecutedKeyRef.current = executionRequestKey;
        setExecution(completedExecution);
        return;
      }

      const startResponse = await startSqlQueryExecution({
        sql: value,
        serverName: normalizedExecutionServerName,
      });

      lastExecutedKeyRef.current = executionRequestKey;
      setExecution({
        executionId: startResponse.executionId,
        status: startResponse.status,
        serverName: normalizedExecutionServerName,
        logMessage: startResponse.logMessage,
        errorMessage: null,
        stopAvailable: startResponse.stopAvailable,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
        result: null,
      });
    } catch (error) {
      setExecution(null);
      setExecutionError(resolveExecutionErrorMessage(error));
      lastExecutedKeyRef.current = null;
    }
  }, [clearPollTimer, executionRequestKey, normalizedExecutionServerName, queryExecutionContext, runDisabledReason, value]);

  const handleStop = useCallback(async () => {
    if (!execution || !isExecutionRunning) {
      return;
    }

    clearPollTimer();
    try {
      if (queryExecutionContext?.cancelExecution) {
        const nextExecution = await queryExecutionContext.cancelExecution(execution);
        if (nextExecution) {
          setExecution(nextExecution);
        }
      } else if (execution.executionId) {
        const nextExecution = await cancelSqlQueryExecution(execution.executionId);
        setExecution(nextExecution);
      }
      setExecutionError(null);
    } catch (error) {
      setExecutionError(resolveExecutionErrorMessage(error));
    }
  }, [clearPollTimer, execution, isExecutionRunning, queryExecutionContext]);

  const handleExpand = useCallback(() => {
    if (inlineTextareaRef.current) {
      scrollPositionRef.current = {
        top: inlineTextareaRef.current.scrollTop,
        left: inlineTextareaRef.current.scrollLeft,
      };
    }
    setOriginFrame(measureSqlEditorFrame(rootRef.current));
    setExpandedFrame(getSqlEditorExpandedFrame());
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    if (expandedTextareaRef.current) {
      scrollPositionRef.current = {
        top: expandedTextareaRef.current.scrollTop,
        left: expandedTextareaRef.current.scrollLeft,
      };
    }
    setOriginFrame(measureSqlEditorFrame(rootRef.current));
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCollapse();
      }
    };

    const handleResize = () => {
      setExpandedFrame(getSqlEditorExpandedFrame());
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleCollapse, isExpanded]);

  useEffect(() => {
    if (isExpanded === wasExpandedRef.current) {
      return;
    }

    if (isExpanded) {
      const frameId = requestAnimationFrame(() => {
        const textarea = expandedTextareaRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        textarea.scrollTop = scrollPositionRef.current.top;
        textarea.scrollLeft = scrollPositionRef.current.left;
        textarea.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

      wasExpandedRef.current = isExpanded;
      return () => cancelAnimationFrame(frameId);
    }

    const frameId = requestAnimationFrame(() => {
      const textarea = inlineTextareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.scrollTop = scrollPositionRef.current.top;
      textarea.scrollLeft = scrollPositionRef.current.left;
      textarea.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    wasExpandedRef.current = isExpanded;
    return () => cancelAnimationFrame(frameId);
  }, [isExpanded]);

  useImperativeHandle(
    ref,
    () => ({
      expand: handleExpand,
      collapse: handleCollapse,
    }),
    [handleCollapse, handleExpand],
  );

  const inlineToolbarButton = (
    <button
      type="button"
      onClick={handleExpand}
      className="nodrag nopan nowheel inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
    >
      <Maximize2 className="size-3.5" />
      {editorText.expand[currentLocale]}
    </button>
  );

  const expandedServerSelect = queryExecutionContext ? (
    <SqlExecutionServerAutocomplete
      value={normalizedExecutionServerName}
      onChange={queryExecutionContext.onServerNameChange}
      options={executionServerOptions}
      placeholder={queryExecutionContext.serverPlaceholder ?? editorText.serverPlaceholder[currentLocale]}
      disabled={!queryExecutionContext.onServerNameChange || executionServerOptions.length === 0 || isExecutionRunning}
      compact
    />
  ) : null;

  const expandedExecutionActions = queryExecutionContext ? (
    <>
      <button
        type="button"
        onClick={() => {
          void handleRun();
        }}
        disabled={Boolean(runDisabledReason) || isExecutionRunning}
        title={
          isExecutionRunning
            ? editorText.runningTitle[currentLocale]
            : runDisabledReason
              ? `${runDisabledReason} • Ctrl+Enter`
              : editorText.runTitle[currentLocale]
        }
        className="nodrag nopan nowheel inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50/90 px-3 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isExecutionRunning ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        RUN
      </button>
      <button
        type="button"
        onClick={() => {
          void handleStop();
        }}
        disabled={!canStopExecution}
        className="nodrag nopan nowheel inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-rose-200 bg-rose-50/90 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <Square className="size-3.5" />
        STOP
      </button>
    </>
  ) : null;

  const expandedToolbarButton = (
    <button
      type="button"
      onClick={handleCollapse}
      className="nodrag nopan nowheel inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
    >
      <Minimize2 className="size-3.5" />
      {editorText.collapse[currentLocale]}
    </button>
  );

  const displayExecution: SqlQueryExecutionStatusResponse | null = execution ?? (executionError
    ? {
        executionId: "sql-runner-error",
        status: "FAILED",
        serverName: normalizedExecutionServerName,
        logMessage: editorText.failed[currentLocale],
        errorMessage: executionError,
        stopAvailable: false,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: new Date().toISOString(),
        result: null,
      }
    : null);
  const shouldShowExecutionPanel = isExpanded && Boolean(queryExecutionContext) && Boolean(displayExecution);
  const fallbackOriginFrame = originFrame ?? measureSqlEditorFrame(rootRef.current) ?? getSqlEditorExpandedFrame();

  useEffect(() => {
    if (!shouldShowExecutionPanel) {
      setIsExecutionPanelCollapsed(false);
    }
  }, [shouldShowExecutionPanel]);

  return (
    <>
      <div ref={rootRef} className="relative">
        <SqlCodeEditorSurface
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(className, isExpanded && "invisible pointer-events-none")}
          headerLabel={resolvedHeaderLabel}
          headerContent={headerContent}
          headerDragHandleProps={headerDragHandleProps}
          minHeightClassName={minHeightClassName}
          selectedColumnsPanel={selectedColumnsPanel}
          selectedColumnsPanelWidth={effectiveSelectedColumnsPanelWidth}
          onSelectedColumnsPanelWidthChange={onSelectedColumnsPanelWidthChange ?? setInternalSelectedColumnsPanelWidth}
          textareaRef={inlineTextareaRef}
          toolbarLeadingActions={hideInlineHeader ? null : toolbarLeadingActions}
          toolbarActions={hideInlineHeader ? null : inlineToolbarButton}
          hideHeader={hideInlineHeader}
          autocompleteClassifierTables={autocompleteClassifierTables}
          autocompleteServerName={normalizedExecutionServerName}
          autocompleteSupportedServerName={supportedExecutionServerName}
          autocompleteSchemaName={autocompleteSchemaName}
          selectedColumnDragContextId={selectedColumnDragContextId}
          disallowSelectedColumnSelfDrop={disallowSelectedColumnSelfDrop}
          onEditorFocusChange={onEditorFocusChange}
        />
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isExpanded ? (
                <motion.div
                  className="fixed inset-0 z-[90]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    aria-label={editorText.closeEditor[currentLocale]}
                    className="absolute inset-0 bg-slate-950/32 backdrop-blur-sm"
                    onClick={handleCollapse}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={editorText.editorDialog[currentLocale]}
                    className="fixed overflow-hidden rounded-[24px] shadow-[0_34px_90px_-30px_rgba(15,23,42,0.42)]"
                    initial={fallbackOriginFrame}
                    animate={expandedFrame}
                    exit={fallbackOriginFrame}
                    transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.92 }}
                  >
                    <div className="flex h-full flex-col bg-background">
                      <SqlCodeEditorSurface
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={cn(
                          "min-h-0 border-0 rounded-none shadow-none",
                          shouldShowExecutionPanel
                            ? isExecutionPanelCollapsed
                              ? "flex-1"
                              : "h-[52%]"
                            : "h-full",
                        )}
                        headerLabel={resolvedHeaderLabel}
                        headerContent={headerContent}
                        headerDragHandleProps={headerDragHandleProps}
                        minHeightClassName="min-h-0"
                        selectedColumnsPanel={selectedColumnsPanel}
                        selectedColumnsPanelWidth={effectiveSelectedColumnsPanelWidth}
                        onSelectedColumnsPanelWidthChange={onSelectedColumnsPanelWidthChange ?? setInternalSelectedColumnsPanelWidth}
                        textareaRef={expandedTextareaRef}
                        toolbarLeadingActions={
                          expandedServerSelect || expandedExecutionActions || toolbarLeadingActions ? (
                            <>
                              {expandedServerSelect}
                              {expandedExecutionActions}
                              {toolbarLeadingActions}
                            </>
                          ) : null
                        }
                        toolbarActions={expandedToolbarButton}
                        autoFocus
                        onRunShortcut={
                          queryExecutionContext
                            ? () => {
                                void handleRun();
                              }
                            : null
                        }
                        autocompleteClassifierTables={autocompleteClassifierTables}
                        autocompleteServerName={normalizedExecutionServerName}
                        autocompleteSupportedServerName={supportedExecutionServerName}
                        autocompleteSchemaName={autocompleteSchemaName}
                        selectedColumnDragContextId={selectedColumnDragContextId}
                        disallowSelectedColumnSelfDrop={disallowSelectedColumnSelfDrop}
                        onEditorFocusChange={onEditorFocusChange}
                      />
                      {shouldShowExecutionPanel ? (
                        <div className={cn("min-h-0 shrink-0", isExecutionPanelCollapsed ? "h-[78px]" : "h-[46%]")}>
                          <SqlExecutionResultsPanel
                            execution={displayExecution}
                            pageSize={resultPageSize}
                            currentPage={resultPage}
                            onPageChange={setResultPage}
                            onPageSizeChange={(nextPageSize) => {
                              setResultPageSize(nextPageSize);
                              setResultPage(1);
                            }}
                            collapsible
                            collapsed={isExecutionPanelCollapsed}
                            onToggleCollapsed={() => setIsExecutionPanelCollapsed((current) => !current)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
});

function NotifyEditorSection({
  notifyMessages,
  notifyPhone,
  onNotifyMessagesChange,
  onNotifyPhoneChange,
  className,
}: {
  notifyMessages: Record<LocaleCode, string>;
  notifyPhone: string;
  onNotifyMessagesChange: (messages: Record<LocaleCode, string>) => void;
  onNotifyPhoneChange: (phone: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-[18px] border border-amber-200/75 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,247,214,0.88))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 rounded-[14px] border border-amber-200/70 bg-white/82 px-3 py-2 text-amber-700 shadow-sm">
        <BellRing className="size-4 shrink-0" />
        <span className="text-sm font-semibold">Ogohlantirish xabari</span>
      </div>

      {notifyLocaleFields.map((field) => (
        <div key={field.key}>
          <Textarea
            value={notifyMessages[field.key]}
            onChange={(event) =>
              onNotifyMessagesChange({
                ...notifyMessages,
                [field.key]: event.target.value,
              })
            }
            className="nodrag nopan nowheel min-h-[78px] rounded-[12px] bg-white"
            placeholder={`${field.label} uchun xabar`}
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">IP telefon raqamlari</p>
        <Input
          value={notifyPhone}
          onChange={(event) => onNotifyPhoneChange(event.target.value)}
          className="nodrag nopan nowheel h-10 rounded-[12px] bg-white"
          placeholder="7716,7717...."
        />
      </div>
    </div>
  );
}

function RuleNode({ id, data, selected }: NodeProps<RuleCanvasNode>) {
  const source = data as RuleCanvasNodeData;
  const {
    appendTemplate,
    canAppendTemplate,
    removeNode,
    updateNode,
    addCondition,
    updateCondition,
    removeCondition,
    classifierServers,
    classifierTables,
    classifierTablesLoading,
    preferredSystemType,
  } = useRuleCanvasActions();

  if (source.kind === "group") {
    return (
      <div
        className="pointer-events-none relative rounded-[36px] border border-sky-300/90 bg-[linear-gradient(180deg,rgba(245,250,255,0.98),rgba(233,242,255,0.94))] shadow-[0_28px_56px_-40px_rgba(59,130,246,0.34)]"
        style={{
          width: source.groupWidth ?? 720,
          height: source.groupHeight ?? 520,
        }}
      >
        <div className="absolute inset-[12px] rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(240,247,255,0.62))]" />
        <div className="absolute inset-x-[18px] top-[18px] h-11 rounded-[18px] border border-sky-200/80 bg-white/88 shadow-sm" />
        <div className="absolute left-7 top-[23px] rounded-full border border-sky-200 bg-sky-50/96 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm">
          {source.rawLabel}
        </div>
      </div>
    );
  }

  const canAddRootCondition = canAppendTemplate("condition", id);

  if (source.kind === "start") {
    return (
      <div
        className={cn(
          "relative min-w-[258px] rounded-[22px] border border-primary/15 px-5 py-4 text-primary-foreground shadow-[0_28px_50px_-30px_rgba(15,23,42,0.4)]",
          selected && "ring-4 ring-primary/20",
        )}
        style={{ background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.98), rgba(var(--primary-rgb), 0.78))" }}
      >
        <BuilderSourceHandle nodeId={id} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">Boshlanish</p>
            <p className="mt-2 text-base font-semibold leading-7">{source.rawLabel || "Mantiqiy nazorat"}</p>
          </div>
          <NodeActionButton
            title={canAddRootCondition ? "Shart qo'shish" : "Boshlanish nuqtasida faqat bitta AGAR bo'lishi mumkin"}
            onClick={() => appendTemplate("condition", id)}
            disabled={!canAddRootCondition}
          >
            <Plus className="size-4" />
          </NodeActionButton>
        </div>
      </div>
    );
  }

  if (source.kind === "branch") {
    return (
      <div
        className={cn(
          "relative min-w-[152px] rounded-[18px] border border-primary/20 px-4 py-3 text-primary-foreground shadow-[0_20px_36px_-24px_rgba(15,23,42,0.28)]",
          selected && "ring-4 ring-primary/16",
        )}
        style={{ background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.92), rgba(var(--primary-rgb), 0.72))" }}
      >
        <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] leading-6">{source.rawLabel || "UNDA"}</span>
          <div className="flex items-center gap-1">
            <NodeActionButton title="Shart qo'shish" onClick={() => appendTemplate("condition", id)}>
              <Plus className="size-4" />
            </NodeActionButton>
            <NodeActionButton title="Tugunni o'chirish" onClick={() => removeNode(id)} variant="danger">
              <Trash2 className="size-4" />
            </NodeActionButton>
          </div>
        </div>
        <BuilderSourceHandle nodeId={id} />
      </div>
    );
  }

  if (source.kind === "action") {
    const tone = source.actionTone ?? "success";
    const isNotifyNode = isNotifyActionNode(source);
    const notifyMessages = source.notifyMessages ?? createEmptyNotifyMessages();

    return (
      <div
        className={cn(
          "relative rounded-[20px] border bg-white shadow-[0_24px_44px_-28px_rgba(15,23,42,0.24)]",
          isNotifyNode ? "min-w-[420px] max-w-[520px]" : "min-w-[286px] max-w-[360px]",
          frameClassesForActionTone(tone),
          selected && "ring-4 ring-primary/14",
        )}
      >
        <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
        <div className={cn("flex items-start justify-between gap-3 rounded-t-[20px] px-4 py-3 text-white", headerClassesForActionTone(tone))}>
          <div>
            {!isNotifyNode ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">Action</p> : null}
            <p className={cn("text-base font-semibold leading-7", !isNotifyNode && "mt-1")}>{actionTitleForTone(tone)}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isNotifyNode ? (
              <NodeActionButton title="Keyingi shartni qo'shish" onClick={() => appendTemplate("condition", id)}>
                <Plus className="size-4" />
              </NodeActionButton>
            ) : null}
            <NodeActionButton title="Tugunni o'chirish" onClick={() => removeNode(id)} variant="danger">
              <Trash2 className="size-4" />
            </NodeActionButton>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          {!isNotifyNode ? (
            <Input
              value={source.rawLabel}
              onChange={(event) => updateNode(id, { rawLabel: event.target.value })}
              className="nodrag nopan nowheel h-10 rounded-[12px] bg-white"
              placeholder="Natija nomi"
            />
          ) : null}

          {isNotifyNode ? (
            <NotifyEditorSection
              notifyMessages={notifyMessages}
              notifyPhone={source.notifyPhone ?? ""}
              onNotifyMessagesChange={(nextMessages) => updateNode(id, { notifyMessages: nextMessages })}
              onNotifyPhoneChange={(nextPhone) => updateNode(id, { notifyPhone: nextPhone })}
            />
          ) : null}
        </div>
        {!isNotifyNode ? <BuilderSourceHandle nodeId={id} /> : null}
      </div>
    );
  }

  const conditions = source.conditions ?? [createBlankCondition()];
  const notifyMessages = source.notifyMessages ?? createEmptyNotifyMessages();
  const conditionSequence = source.conditionSequence;
  const sqlEnabled = Boolean(source.sqlEnabled);
  const sqlScript = source.sqlScript ?? "";
  const sqlServer = source.sqlServer ?? "";
  const tableOptions = sortTablesForBuilder(classifierTables, preferredSystemType).map((table) => ({
    value: table.tableName,
    label: table.tableName,
    hint: table.systemType,
    searchText: `${table.systemType} ${table.description ?? ""}`,
  }));
  const sqlServerOptions = buildClassifierServerOptions(classifierServers, sqlServer).map((server) => ({
    value: server,
    label: server,
  }));

  return (
    <div
      className={cn(
        "relative min-w-[980px] max-w-[1160px] rounded-[22px] border border-primary/18 bg-white shadow-[0_28px_50px_-30px_rgba(15,23,42,0.24)]",
        selected && "ring-4 ring-primary/16",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
        <div
          className="flex items-start justify-between gap-3 rounded-t-[22px] px-4 py-3 text-primary-foreground"
          style={{ background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.98), rgba(var(--primary-rgb), 0.76))" }}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] leading-6 text-primary-foreground/70">{source.rawLabel || "AGAR"}</p>
              {conditionSequence ? (
                <span className="rounded-full border border-white/24 bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                  SHART-{conditionSequence}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label
              className="nodrag nopan nowheel flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary-foreground"
              onPointerDownCapture={stopBuilderEventPropagation}
              onMouseDownCapture={stopBuilderEventPropagation}
              onClickCapture={stopBuilderEventPropagation}
              onDoubleClickCapture={stopBuilderEventPropagation}
            >
              <span>SQL</span>
              <Switch
                size="sm"
                checked={sqlEnabled}
                onCheckedChange={(checked) => updateNode(id, { sqlEnabled: checked })}
                onPointerDownCapture={stopBuilderEventPropagation}
                onMouseDownCapture={stopBuilderEventPropagation}
                onClickCapture={stopBuilderEventPropagation}
                onDoubleClickCapture={stopBuilderEventPropagation}
                className="nodrag nopan nowheel"
              />
            </label>
            <NodeActionButton
              title={sqlEnabled ? "SQL rejimida ichki shart qo'shib bo'lmaydi" : "Ichki shart qo'shish"}
              onClick={() => addCondition(id)}
              disabled={sqlEnabled}
            >
              <Plus className="size-4" />
            </NodeActionButton>
            {!source.isPrimaryCondition ? (
              <NodeActionButton title="Tugunni o'chirish" onClick={() => removeNode(id)} variant="danger">
                <Trash2 className="size-4" />
              </NodeActionButton>
            ) : null}
          </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {classifierTablesLoading && !sqlEnabled ? (
          <div className="rounded-[16px] border border-dashed border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            Jadval va ustun ma'lumotlari yuklanmoqda...
          </div>
        ) : null}

        <div className={cn("flex gap-4", sqlEnabled ? "items-stretch" : "items-start")}>
          <div className={cn("min-w-0 flex-1", sqlEnabled ? "flex self-stretch flex-col gap-3" : "space-y-3")}>
            {sqlEnabled ? (
              <>
                <BuilderAutocompleteSelect
                  value={sqlServer}
                  onChange={(nextValue) => updateNode(id, { sqlServer: nextValue })}
                  options={sqlServerOptions}
                  placeholder="Serverni tanlang"
                  searchPlaceholder="Serverni qidiring..."
                  emptyLabel="Mos server topilmadi"
                />
                <SqlCodeEditor
                  className="flex-1"
                  value={sqlScript}
                  onChange={(nextValue) => updateNode(id, { sqlScript: nextValue })}
                  placeholder="AGAR box uchun to'liq SQL scriptni kiriting"
                  queryExecutionContext={{
                    serverName: sqlServer,
                    serverOptions: sqlServerOptions.map((option) => option.value),
                    onServerNameChange: (nextServerName) => updateNode(id, { sqlServer: nextServerName }),
                    classifierTables,
                  }}
                />

                <button
                  type="button"
                  onClick={() => appendTemplate("else", id)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-primary/25 bg-primary/6 text-sm font-medium text-primary transition hover:bg-primary/10"
                >
                  <Plus className="size-4" />
                  AKS HOLDA AGAR qo'shish
                </button>
              </>
            ) : (
              <>
                {conditions.map((condition, index) => {
                  const selectedTable = findTable(classifierTables, condition.tableName);
                  const tableColumns = sortColumns(selectedTable?.columns ?? []);
                  const selectedColumn = findColumn(selectedTable, condition.columnName);
                  const valueType = detectColumnValueType(selectedColumn);
                  const operatorMeta = getOperatorMeta(valueType, condition.operator);
                  const conditionInputType = getConditionInputType(valueType);
                  const typeLabel =
                    valueType === "number"
                      ? "Son"
                      : valueType === "date"
                        ? "Sana"
                        : valueType === "datetime"
                          ? "Sana-vaqt"
                          : valueType === "boolean"
                            ? "Mantiqiy"
                            : "Matn";

                  return (
                    <div key={condition.id} className="space-y-3 rounded-[18px] border border-border/80 bg-background/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {index === 0 ? (
                            <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                              1-shart
                            </span>
                          ) : (
                            <BuilderSelect
                              value={condition.joiner}
                              onChange={(nextValue) =>
                                updateCondition(id, condition.id, (current) => ({
                                  ...current,
                                  joiner: nextValue === "OR" ? "OR" : "AND",
                                }))
                              }
                              className="!w-auto h-8 min-w-[86px] rounded-full bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
                            >
                              {logicalOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </BuilderSelect>
                          )}
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                            {typeLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCondition(id, condition.id)}
                          className="flex h-8 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                        >
                          O'chirish
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <BuilderAutocompleteSelect
                          value={condition.tableName}
                          onChange={(nextValue) =>
                            updateCondition(id, condition.id, (current) => ({
                              ...current,
                              tableName: nextValue,
                              columnName: "",
                              compareTableName: nextValue,
                              compareColumnName: "",
                            }))
                          }
                          options={tableOptions}
                          placeholder="Jadvalni tanlang"
                          searchPlaceholder="Jadvalni qidiring..."
                          emptyLabel="Mos jadval topilmadi"
                          disabled={classifierTablesLoading || tableOptions.length === 0}
                          className="min-w-[15rem] flex-[2.2_1_18rem]"
                        />

                        <BuilderAutocompleteSelect
                          value={condition.columnName}
                          onChange={(nextValue) =>
                            updateCondition(id, condition.id, (current) => ({
                              ...current,
                              columnName: nextValue,
                              operator: getOperatorOptions(
                                detectColumnValueType(findColumn(findTable(classifierTables, current.tableName), nextValue)),
                              )[0]?.value ?? "",
                              compareColumnName: "",
                              value: "",
                              secondValue: "",
                            }))
                          }
                          options={tableColumns.map((column) => ({
                            value: column.name,
                            label: column.name,
                            hint: column.dataType,
                            searchText: `${column.description ?? ""} ${column.dataType}`,
                          }))}
                          placeholder={tableColumns.length === 0 ? "Ustun topilmadi" : "Ustunni tanlang"}
                          searchPlaceholder="Ustunni qidiring..."
                          emptyLabel="Mos ustun topilmadi"
                          disabled={tableColumns.length === 0}
                          className="min-w-[13rem] flex-[1.6_1_15rem]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="min-w-[11rem] flex-[0.9_1_12rem]">
                          <BuilderSelect
                            value={condition.operator}
                            onChange={(nextValue) =>
                              updateCondition(id, condition.id, (current) => ({
                                ...current,
                                operator: nextValue,
                                value: "",
                                secondValue: "",
                              }))
                            }
                          >
                            {getOperatorOptions(valueType).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </BuilderSelect>
                        </div>

                        {operatorMeta.inputMode === "single" ? (
                          <Input
                            type={conditionInputType}
                            value={condition.value}
                            onChange={(event) =>
                              updateCondition(id, condition.id, (current) => ({
                                ...current,
                                value: event.target.value,
                              }))
                            }
                            className="nodrag nopan nowheel h-10 min-w-[16rem] flex-[1.6_1_18rem] rounded-[12px] bg-white"
                            placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode)}
                          />
                        ) : null}

                        {operatorMeta.inputMode === "range" ? (
                          <>
                            <Input
                              type={conditionInputType}
                              value={condition.value}
                              onChange={(event) =>
                                updateCondition(id, condition.id, (current) => ({
                                  ...current,
                                  value: event.target.value,
                                }))
                              }
                              className="nodrag nopan nowheel h-10 min-w-[14rem] flex-[1_1_16rem] rounded-[12px] bg-white"
                              placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode)}
                            />
                            <Input
                              type={conditionInputType}
                              value={condition.secondValue}
                              onChange={(event) =>
                                updateCondition(id, condition.id, (current) => ({
                                  ...current,
                                  secondValue: event.target.value,
                                }))
                              }
                              className="nodrag nopan nowheel h-10 min-w-[14rem] flex-[1_1_16rem] rounded-[12px] bg-white"
                              placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode, true)}
                            />
                          </>
                        ) : null}

                        {operatorMeta.inputMode === "list" ? (
                          <Input
                            type="text"
                            value={condition.value}
                            onChange={(event) =>
                              updateCondition(id, condition.id, (current) => ({
                                ...current,
                                value: event.target.value,
                              }))
                            }
                            className="nodrag nopan nowheel h-10 min-w-[16rem] flex-[1.8_1_22rem] rounded-[12px] bg-white"
                            placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode)}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => appendTemplate("else", id)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-primary/25 bg-primary/6 text-sm font-medium text-primary transition hover:bg-primary/10"
                >
                  <Plus className="size-4" />
                  AKS HOLDA AGAR qo'shish
                </button>
              </>
            )}
          </div>

          <NotifyEditorSection
            className="w-[360px] shrink-0"
            notifyMessages={notifyMessages}
            notifyPhone={source.notifyPhone ?? ""}
            onNotifyMessagesChange={(nextMessages) => updateNode(id, { notifyMessages: nextMessages })}
            onNotifyPhoneChange={(nextPhone) => updateNode(id, { notifyPhone: nextPhone })}
          />
        </div>
      </div>

      <BuilderSourceHandle nodeId={id} hidden />
    </div>
  );
}

export function RuleCanvasEditor({
  canvas,
  onCanvasChange,
  canvasHeightClassName,
  rootLabel,
  preferredSystemType,
}: RuleCanvasEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState("root-node");
  const [templatePickerSourceId, setTemplatePickerSourceId] = useState<string | null>(null);
  const normalizedRootLabel = rootLabel?.trim() || "Mantiqiy nazorat";
  const tablesQuery = useQuery({
    queryKey: classifierQueryKeys.tables,
    queryFn: getClassifierTables,
  });
  const serversQuery = useQuery({
    queryKey: classifierQueryKeys.servers,
    queryFn: getClassifierServers,
  });

  const classifierTables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  const classifierServers = useMemo(() => serversQuery.data ?? [], [serversQuery.data]);
  const normalizedIncomingCanvas = useMemo(() => {
    const baseNodes = normalizeNodes(canvas.nodes, normalizedRootLabel, classifierTables, preferredSystemType);
    const baseEdges = normalizeEdges(canvas.edges);
    return ensurePrimaryConditionCanvas(baseNodes, baseEdges, classifierTables, preferredSystemType);
  }, [canvas.edges, canvas.nodes, classifierTables, normalizedRootLabel, preferredSystemType]);
  const normalizedIncomingNodes = normalizedIncomingCanvas.nodes;
  const normalizedIncomingEdges = normalizedIncomingCanvas.edges;
  const incomingCanvas = useMemo(() => serializeCanvas(normalizedIncomingNodes, normalizedIncomingEdges), [normalizedIncomingEdges, normalizedIncomingNodes]);
  const incomingSignature = useMemo(() => JSON.stringify(incomingCanvas), [incomingCanvas]);

  const [nodes, setNodes, onNodesChange] = useNodesState(normalizedIncomingNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(normalizedIncomingEdges);
  const renderedNodes = useMemo(() => {
    const policyNodes = applyCanvasNodePolicies(nodes, edges);
    const sequenceMap = getConditionSequenceMap(policyNodes, edges);
    const nodesWithSequence = policyNodes.map((node) =>
      node.data.kind === "condition"
        ? {
            ...node,
            data: {
              ...node.data,
              conditionSequence: sequenceMap.get(node.id),
            },
          }
        : node,
    );

    return [...buildConditionGroupNodes(nodesWithSequence, edges), ...nodesWithSequence];
  }, [edges, nodes]);

  const appliedIncomingSignatureRef = useRef(incomingSignature);
  const emittedSignatureRef = useRef(incomingSignature);
  const reactFlowRef = useRef<ReactFlowInstance<RuleCanvasNode, Edge> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const canvasRef = useRef(canvas);
  const incomingSignatureRef = useRef(incomingSignature);
  const onCanvasChangeRef = useRef(onCanvasChange);
  const isNodeDragActiveRef = useRef(false);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [edges, nodes]);

  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  useEffect(() => {
    incomingSignatureRef.current = incomingSignature;
  }, [incomingSignature]);

  useEffect(() => {
    onCanvasChangeRef.current = onCanvasChange;
  }, [onCanvasChange]);

  const alignViewportToTop = useCallback((instance: ReactFlowInstance<RuleCanvasNode, Edge>) => {
    void instance.fitView(defaultFitViewOptions).then(() => {
      requestAnimationFrame(() => {
        const viewport = instance.getViewport();
        void instance.setViewport(
          {
            ...viewport,
            y: viewport.y - viewportTopOffset,
          },
          { duration: 0 },
        );
      });
    });
  }, []);

  const commitCanvasChange = useCallback(() => {
    const nextCanvas = serializeCanvas(nodesRef.current, edgesRef.current);
    const nextSignature = JSON.stringify(nextCanvas);
    if (nextSignature === emittedSignatureRef.current) return;

    emittedSignatureRef.current = nextSignature;

    if (nextSignature !== incomingSignatureRef.current) {
      onCanvasChangeRef.current({
        ...(canvasRef.current ?? {}),
        ...nextCanvas,
      });
    }
  }, []);

  useEffect(() => {
    if (incomingSignature === appliedIncomingSignatureRef.current) return;

    const currentSignature = JSON.stringify(serializeCanvas(nodesRef.current, edgesRef.current));
    appliedIncomingSignatureRef.current = incomingSignature;
    emittedSignatureRef.current = incomingSignature;

    if (isNodeDragActiveRef.current) {
      return;
    }

    if (incomingSignature !== currentSignature) {
      setNodes(normalizedIncomingNodes);
      setEdges(normalizedIncomingEdges);

      const instance = reactFlowRef.current;
      if (instance) {
        const frameId = requestAnimationFrame(() => alignViewportToTop(instance));
        return () => cancelAnimationFrame(frameId);
      }
    }
  }, [alignViewportToTop, incomingSignature, normalizedIncomingEdges, normalizedIncomingNodes, setEdges, setNodes]);

  useEffect(() => {
    if (isNodeDragActiveRef.current) {
      return;
    }

    commitCanvasChange();
  }, [commitCanvasChange, edges, nodes]);

  useEffect(() => {
    if (!nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId("root-node");
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (templatePickerSourceId && !nodes.some((node) => node.id === templatePickerSourceId)) {
      setTemplatePickerSourceId(null);
    }
  }, [nodes, templatePickerSourceId]);

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<RuleCanvasNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const updateCondition = useCallback(
    (nodeId: string, conditionId: string, updater: (current: RuleConditionClause) => RuleConditionClause) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || node.data.kind !== "condition") {
            return node;
          }

          const sourceConditions = node.data.conditions ?? [createBlankCondition()];
          const updatedConditions = sourceConditions.map((condition) =>
            condition.id === conditionId ? updater(condition) : condition,
          );

          return {
            ...node,
            data: {
              ...node.data,
              conditions: normalizeConditionListWithMetadata(updatedConditions, classifierTables, preferredSystemType),
            },
          };
        }),
      );
    },
    [classifierTables, preferredSystemType, setNodes],
  );

  const addCondition = useCallback(
    (nodeId: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || node.data.kind !== "condition") {
            return node;
          }

          const sourceConditions =
            node.data.conditions && node.data.conditions.length > 0
              ? node.data.conditions
              : [createConditionFromMetadata(classifierTables, preferredSystemType, "AND")];
          const nextCondition = createConditionFromMetadata(classifierTables, preferredSystemType, "AND");
          return {
            ...node,
            data: {
              ...node.data,
              conditions: normalizeConditionListWithMetadata(
                [...sourceConditions, nextCondition],
                classifierTables,
                preferredSystemType,
              ),
            },
          };
        }),
      );
    },
    [classifierTables, preferredSystemType, setNodes],
  );

  const removeCondition = useCallback(
    (nodeId: string, conditionId: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || node.data.kind !== "condition") {
            return node;
          }

          const remaining = (node.data.conditions ?? []).filter((condition) => condition.id !== conditionId);
          const safeConditions =
            remaining.length > 0
              ? remaining
              : [createConditionFromMetadata(classifierTables, preferredSystemType, "AND")];

          return {
            ...node,
            data: {
              ...node.data,
              conditions: normalizeConditionListWithMetadata(safeConditions, classifierTables, preferredSystemType),
            },
          };
        }),
      );
    },
    [classifierTables, preferredSystemType, setNodes],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      if (nodeId === "root-node" || isPrimaryConditionNodeId(nodeId, nodesRef.current, edgesRef.current)) return;

      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const nodeMap = new Map(currentNodes.map((node) => [node.id, node]));
      const directNotifyIds = currentEdges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target)
        .filter((targetId) => isNotifyActionNode(nodeMap.get(targetId)?.data));
      const idsToRemove = new Set([nodeId, ...collectDescendantNodeIds(directNotifyIds, currentEdges)]);
      const nextNodes = currentNodes.filter((node) => !idsToRemove.has(node.id));
      const nextEdges = currentEdges.filter((edge) => !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target));

      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId("root-node");
      setTemplatePickerSourceId((currentId) => (currentId && idsToRemove.has(currentId) ? null : currentId));
    },
    [setEdges, setNodes],
  );

  const canAppendTemplate = useCallback(
    (templateId: BuilderTemplateId, sourceNodeId?: string) => {
      const currentNodes = nodes;
      const currentEdges = edges;
      const requestedSourceId = sourceNodeId ?? selectedNodeId ?? "root-node";
      const sourceId =
        templateId === "else"
          ? resolveElseChainSourceId(requestedSourceId, currentNodes, currentEdges)
          : requestedSourceId;

      if (!sourceId) {
        return false;
      }

      const sourceNode = currentNodes.find((node) => node.id === sourceId) as RuleCanvasNode | undefined;
      return isTemplateAllowedForNode(sourceNode, templateId, currentNodes, currentEdges);
    },
    [edges, nodes, selectedNodeId],
  );

  const appendTemplate = useCallback(
    (templateId: BuilderTemplateId, sourceNodeId?: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const requestedSourceId = sourceNodeId ?? selectedNodeId ?? "root-node";
      const sourceId =
        templateId === "else"
          ? resolveElseChainSourceId(requestedSourceId, currentNodes, currentEdges)
          : requestedSourceId;

      if (!sourceId) {
        return;
      }

      const sourceNode = currentNodes.find((node) => node.id === sourceId) as RuleCanvasNode | undefined;

      if (!isTemplateAllowedForNode(sourceNode, templateId, currentNodes, currentEdges)) {
        return;
      }

      const template = getTemplate(templateId);
      const nextNode = withNodePorts({
        id: createUniqueId(template.kind),
        type: "ruleNode",
        position: getNextChildPosition(sourceId, templateId, currentNodes as RuleCanvasNode[], currentEdges),
        data: {
          kind: template.kind,
          rawLabel: template.defaults?.rawLabel ?? template.label,
          ruleType: template.ruleType,
          conditions:
            template.kind === "condition"
              ? [createConditionFromMetadata(classifierTables, preferredSystemType)]
              : undefined,
          sqlEnabled: template.kind === "condition" ? createConditionSqlState(template.defaults).sqlEnabled : template.defaults?.sqlEnabled,
          sqlScript: template.kind === "condition" ? createConditionSqlState(template.defaults).sqlScript : template.defaults?.sqlScript,
          sqlServer: template.kind === "condition" ? createConditionSqlState(template.defaults).sqlServer : template.defaults?.sqlServer,
          actionTone: template.actionTone ?? "success",
          notifyMessages:
            template.kind === "condition"
              ? createConditionNotifyState(template.defaults).notifyMessages
              : template.defaults?.notifyMessages,
          notifyPhone:
            template.kind === "condition"
              ? createConditionNotifyState(template.defaults).notifyPhone
              : template.defaults?.notifyPhone,
        },
      });

      const nextNodes = [...currentNodes, nextNode];
      const nextEdges = [...currentEdges, createBuilderEdge(sourceId, nextNode.id)];

      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextNode.id);
    },
    [classifierTables, preferredSystemType, selectedNodeId, setEdges, setNodes],
  );

  const openTemplatePicker = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setTemplatePickerSourceId(nodeId);
  }, []);

  const selectedNode = renderedNodes.find((node) => node.id === selectedNodeId) ?? renderedNodes.find((node) => node.id === "root-node");
  const templatePickerSourceNode = templatePickerSourceId
    ? (renderedNodes.find((node) => node.id === templatePickerSourceId) as RuleCanvasNode | undefined)
    : undefined;

  const actions = useMemo<RuleCanvasActions>(
    () => ({
      updateNode,
      appendTemplate,
      canAppendTemplate,
      openTemplatePicker,
      removeNode,
      addCondition,
      updateCondition,
      removeCondition,
      classifierServers,
      classifierTables,
      classifierTablesLoading: tablesQuery.isLoading,
      preferredSystemType,
    }),
    [
      addCondition,
      appendTemplate,
      canAppendTemplate,
      classifierServers,
      classifierTables,
      openTemplatePicker,
      preferredSystemType,
      removeCondition,
      removeNode,
      tablesQuery.isLoading,
      updateCondition,
      updateNode,
    ],
  );

  function handleConnect(connection: Connection) {
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          animated: true,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
          style: { strokeWidth: 2, stroke: "var(--primary)" },
        },
        currentEdges,
      ),
    );
  }

  return (
    <ReactFlowProvider>
      <RuleCanvasActionsContext.Provider value={actions}>
        <Card className="overflow-hidden border-border/70 bg-[linear-gradient(180deg,#eef3fa,#e6edf7)] shadow-[0_22px_48px_-28px_rgba(15,23,42,0.24)]">
          <CardContent
            className={cn(
              "relative h-[72vh] min-h-[640px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(238,243,250,0.86)_38%,rgba(230,237,247,0.96))] p-0",
              canvasHeightClassName,
            )}
          >
          <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-end gap-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-[18px] border border-border/70 bg-card/92 px-4 py-2.5 text-right shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tanlangan tugun</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {getSelectedNodeDisplayLabel(selectedNode?.data as RuleCanvasNodeData | undefined, normalizedRootLabel)}
                </p>
              </div>
            </div>
          </div>

          <ReactFlow<RuleCanvasNode, Edge>
            nodes={renderedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowRef.current = instance;
              alignViewportToTop(instance);
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeDragStart={() => {
              isNodeDragActiveRef.current = true;
            }}
            onNodeDragStop={() => {
              isNodeDragActiveRef.current = false;
              requestAnimationFrame(() => commitCanvasChange());
            }}
            onNodeClick={(_, node) => {
              if ((node.data as RuleCanvasNodeData | undefined)?.kind === "group") {
                return;
              }
              setSelectedNodeId(node.id);
            }}
            onPaneClick={() => setSelectedNodeId("root-node")}
            fitView
            fitViewOptions={defaultFitViewOptions}
            defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
            minZoom={0.2}
            maxZoom={1.4}
            zoomOnScroll={false}
            panOnScroll
            panOnScrollMode={PanOnScrollMode.Free}
            panOnScrollSpeed={0.85}
            snapToGrid
            snapGrid={[20, 20]}
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
              style: { strokeWidth: 2, stroke: "var(--primary)" },
            }}
            connectionLineStyle={{ stroke: "var(--primary)", strokeWidth: 2 }}
            style={{ backgroundColor: "#eef3fa" }}
          >
            <Controls className="rounded-2xl border border-border/70 bg-card" showInteractive={false} />
            <Background
              id="rule-canvas-dots"
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="rgba(100,116,139,0.22)"
              bgColor="#eef3fa"
            />
          </ReactFlow>

          {templatePickerSourceNode ? (
            <BuilderTemplatePickerModal
              sourceLabel={getNodeDisplayLabel(templatePickerSourceNode.data, normalizedRootLabel)}
              sourceNode={templatePickerSourceNode}
              nodes={nodes}
              edges={edges}
              onClose={() => setTemplatePickerSourceId(null)}
              onSelect={(templateId) => {
                appendTemplate(templateId, templatePickerSourceNode.id);
                setTemplatePickerSourceId(null);
              }}
            />
          ) : null}

          </CardContent>
        </Card>
      </RuleCanvasActionsContext.Provider>
    </ReactFlowProvider>
  );
}


