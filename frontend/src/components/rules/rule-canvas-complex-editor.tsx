import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Reorder, motion, useDragControls } from "motion/react";
import { AlertTriangle, BellRing, Braces, CheckCircle2, ChevronDown, Database, Eye, GitBranch, History, Maximize2, Plus, Server, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  BuilderAutocompleteSelect,
  SqlCodeEditor,
  SqlExecutionServerAutocomplete,
  extractSelectProjectionColumns,
  formatSqlScript,
  type SqlProjectionColumn,
  type SqlCodeEditorInsertionRequest,
  type BuilderAutocompleteOption,
  type SqlCodeEditorHandle,
} from "@/components/rules/rule-canvas-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cancelSqlQueryExecution, fetchSqlQueryExecutionStatus, startSqlQueryExecution } from "@/lib/api";
import { buildClassifierServerOptions, classifierQueryKeys, getClassifierServers, getClassifierTables } from "@/lib/classifiers";
import type {
  ClassifierServer,
  ClassifierTable,
  ClassifierTableColumn,
  LocaleCode,
  SqlQueryExecutionResult,
  SqlQueryExecutionStatusResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type RuleCanvasComplexConditionValidationErrors = {
  serverName?: boolean;
  sqlQuery?: boolean;
};

export type RuleCanvasComplexVerificationRuleValidationErrors = {
  tableName?: boolean;
  fieldRef?: boolean;
  comparisonValue?: boolean;
  secondaryComparisonValue?: boolean;
};

export type RuleCanvasComplexValidationErrors = {
  hasConditionsError?: boolean;
  hasVerificationError?: boolean;
  hasWarningMessagesError?: boolean;
  phoneExtension?: boolean;
  conditionErrorsById?: Record<string, RuleCanvasComplexConditionValidationErrors>;
  verificationRuleErrorsById?: Record<string, RuleCanvasComplexVerificationRuleValidationErrors>;
  warningMessageErrorsByLocale?: Partial<Record<LocaleCode, boolean>>;
};

type RuleCanvasComplexEditorProps = {
  canvas: Record<string, unknown>;
  simpleView?: boolean;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  messages: Partial<Record<LocaleCode, string>>;
  phoneExtension: string;
  onMessageChange: (locale: LocaleCode, value: string) => void;
  onPhoneExtensionChange: (value: string) => void;
  onAllSectionsCollapsedChange?: (collapsed: boolean) => void;
  selectedTableName?: string;
  preferredSystemType?: string;
  validationErrors?: RuleCanvasComplexValidationErrors | null;
  className?: string;
};

export type RuleCanvasComplexEditorHandle = {
  addCondition: () => void;
  toggleAllSectionsCollapsed: () => void;
};

type ComplexCondition = {
  id: string;
  parameterName: string;
  serverName: string;
  orderNumber: number;
  sqlQuery: string;
};

type VerificationRuleJoiner = "AND" | "OR";
type VerificationRuleOperator =
  | "EQ"
  | "NOT_EQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "BETWEEN"
  | "CONTAINS"
  | "STARTS_WITH"
  | "ENDS_WITH"
  | "IS_NULL"
  | "IS_NOT_NULL";
type VerificationTriggerMode = "TRUE" | "FALSE";
type VerificationFieldSource = "PARAMS" | "TABLE";
type VerificationInputMode = "single" | "range" | "none";

type VerificationRule = {
  id: string;
  joiner: VerificationRuleJoiner;
  fieldSource: VerificationFieldSource;
  tableName: string;
  fieldRef: string;
  operator: VerificationRuleOperator;
  comparisonValue: string;
  secondaryComparisonValue: string;
};

type SqlHeaderDragHandleProps = {
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  title?: string;
  className?: string;
};

type ComplexOutputToken = {
  id: string;
  paramName: string;
  columnName: string;
  label: string;
  tokenText: string;
};

type ComplexTraceResultPreview = {
  columns: string[];
  rows: Array<Array<string | null>>;
  totalRows: number;
  truncated: boolean;
};

type ComplexTraceTokenBinding = {
  tokenText: string;
  paramName: string;
  columnName: string;
  value: string | null;
  valueLiteral: string;
};

type ComplexTraceResolvedQuery = {
  sql: string;
  bindings: ComplexTraceTokenBinding[];
  result: ComplexTraceResultPreview | null;
  status: SqlQueryExecutionStatusResponse["status"];
  logMessage: string;
  errorMessage: string | null;
  serverName: string;
};

type ComplexTraceStep = {
  conditionId: string;
  parameterName: string;
  orderNumber: number;
  conditionTitle: string;
  serverName: string;
  originalSql: string;
  resolvedQueries: ComplexTraceResolvedQuery[];
  mergedResult: ComplexTraceResultPreview | null;
  status: SqlQueryExecutionStatusResponse["status"];
  logMessage: string;
  errorMessage: string | null;
};

type ComplexExecutionTrace = {
  targetConditionId: string;
  targetParameterName: string;
  targetOrderNumber: number;
  status: SqlQueryExecutionStatusResponse["status"];
  logMessage: string;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string;
  steps: ComplexTraceStep[];
};

type ComplexConditionCardContentProps = {
  condition: ComplexCondition;
  conditionTitle: string;
  isFirstCondition: boolean;
  collapsed: boolean;
  validationError?: RuleCanvasComplexConditionValidationErrors | null;
  serverOptions: string[];
  serversLoading: boolean;
  classifierTables: ClassifierTable[];
  availableTokens: ComplexOutputToken[];
  pendingInsertion: SqlCodeEditorInsertionRequest | null;
  onUpdateCondition: (conditionId: string, updater: (condition: ComplexCondition) => ComplexCondition) => void;
  onChangeServerName: (conditionId: string, serverName: string) => void;
  onRequestTokenInsert: (conditionId: string, text: string) => void;
  onInsertionHandled: (conditionId: string, requestId: string) => void;
  onRunCondition: (conditionId: string, serverName: string, sqlQuery?: string) => Promise<SqlQueryExecutionStatusResponse>;
  onCancelConditionRun: (
    conditionId: string,
    execution: SqlQueryExecutionStatusResponse,
  ) => Promise<SqlQueryExecutionStatusResponse | null | void>;
  onRemoveCondition: (conditionId: string) => void;
  onEditorFocusChange: (conditionId: string, focused: boolean) => void;
  executionTrace: ComplexExecutionTrace | null;
  onOpenExecutionHistory: (conditionId: string) => void;
  onToggleCollapsed: (conditionId: string) => void;
  headerDragHandleProps?: SqlHeaderDragHandleProps;
};

type SortableComplexConditionCardProps = ComplexConditionCardContentProps & {
  isDragging: boolean;
  onDragStateChange: (conditionId: string | null) => void;
  motionDisabled: boolean;
};

type WarningMessageFieldKey = LocaleCode | "phoneExtension";

const VERIFICATION_OPERATOR_OPTIONS: Array<{
  value: VerificationRuleOperator;
  inputMode: VerificationInputMode;
}> = [
  { value: "EQ", inputMode: "single" },
  { value: "NOT_EQ", inputMode: "single" },
  { value: "GT", inputMode: "single" },
  { value: "GTE", inputMode: "single" },
  { value: "LT", inputMode: "single" },
  { value: "LTE", inputMode: "single" },
  { value: "BETWEEN", inputMode: "range" },
  { value: "CONTAINS", inputMode: "single" },
  { value: "STARTS_WITH", inputMode: "single" },
  { value: "ENDS_WITH", inputMode: "single" },
  { value: "IS_NULL", inputMode: "none" },
  { value: "IS_NOT_NULL", inputMode: "none" },
];

const VERIFICATION_OPERATOR_LABELS: Record<LocaleCode, Partial<Record<VerificationRuleOperator, string>>> = {
  OZ: {
    EQ: "Teng",
    NOT_EQ: "Teng emas",
    GT: "Katta",
    GTE: "Katta yoki teng",
    LT: "Kichik",
    LTE: "Kichik yoki teng",
    BETWEEN: "Oraliqda",
    CONTAINS: "O'z ichiga oladi",
    STARTS_WITH: "Boshlanadi",
    ENDS_WITH: "Tugaydi",
    IS_NULL: "Bo'sh",
    IS_NOT_NULL: "Bo'sh emas",
  },
  UZ: {
    EQ: "Тенг",
    NOT_EQ: "Тенг эмас",
    GT: "Катта",
    GTE: "Катта ёки тенг",
    LT: "Кичик",
    LTE: "Кичик ёки тенг",
    CONTAINS: "Ўз ичига олади",
    STARTS_WITH: "Бошланади",
    ENDS_WITH: "Тугайди",
    IS_NULL: "Бўш",
    IS_NOT_NULL: "Бўш эмас",
  },
  RU: {
    EQ: "Равно",
    NOT_EQ: "Не равно",
    GT: "Больше",
    GTE: "Больше или равно",
    LT: "Меньше",
    LTE: "Меньше или равно",
    CONTAINS: "Содержит",
    STARTS_WITH: "Начинается с",
    ENDS_WITH: "Заканчивается на",
    IS_NULL: "Пусто",
    IS_NOT_NULL: "Не пусто",
  },
  EN: {
    EQ: "Is equal to",
    NOT_EQ: "Does not equal",
    GT: "Is bigger than",
    GTE: "Is bigger or equal",
    LT: "Is smaller than",
    LTE: "Is smaller or equal",
    BETWEEN: "Is between",
    CONTAINS: "Contains",
    STARTS_WITH: "Starts with",
    ENDS_WITH: "Ends with",
    IS_NULL: "Is empty",
    IS_NOT_NULL: "Is not empty",
  },
};

const VERIFICATION_OPERATOR_AUTOCOMPLETE_TEXT: Record<
  LocaleCode,
  { placeholder: string; searchPlaceholder: string; emptyLabel: string }
> = {
  OZ: {
    placeholder: "Operatorni tanlang",
    searchPlaceholder: "Operatorni qidiring...",
    emptyLabel: "Mos operator topilmadi",
  },
  UZ: {
    placeholder: "Операторни танланг",
    searchPlaceholder: "Операторни қидиринг...",
    emptyLabel: "Мос оператор топилмади",
  },
  RU: {
    placeholder: "Выберите оператор",
    searchPlaceholder: "Поиск оператора...",
    emptyLabel: "Оператор не найден",
  },
  EN: {
    placeholder: "Select operator",
    searchPlaceholder: "Search operator...",
    emptyLabel: "No operator found",
  },
};

const VERIFICATION_JOINER_LABELS: Record<LocaleCode, Record<VerificationRuleJoiner, string>> = {
  OZ: {
    AND: "Va",
    OR: "Yoki",
  },
  UZ: {
    AND: "Ва",
    OR: "Ёки",
  },
  RU: {
    AND: "И",
    OR: "Или",
  },
  EN: {
    AND: "And",
    OR: "Or",
  },
};

type VerificationFieldValueType = "text" | "number" | "date" | "datetime" | "time" | "boolean";

const VERIFICATION_TEMPORAL_OPERATOR_LABELS: Record<
  LocaleCode,
  Partial<Record<VerificationRuleOperator, string>>
> = {
  OZ: {
    EQ: "Aynan",
    GT: "Keyin",
    GTE: "Keyin yoki aynan",
    LT: "Oldin",
    LTE: "Oldin yoki aynan",
    BETWEEN: "Oraliqda",
  },
  UZ: {
    EQ: "\u0410\u0439\u043d\u0430\u043d",
    GT: "\u041a\u0435\u0439\u0438\u043d",
    GTE: "\u041a\u0435\u0439\u0438\u043d \u0451\u043a\u0438 \u0430\u0439\u043d\u0430\u043d",
    LT: "\u041e\u043b\u0434\u0438\u043d",
    LTE: "\u041e\u043b\u0434\u0438\u043d \u0451\u043a\u0438 \u0430\u0439\u043d\u0430\u043d",
    BETWEEN: "\u041e\u0440\u0430\u043b\u0438\u049b\u0434\u0430",
  },
  RU: {
    EQ: "\u0422\u043e\u0447\u043d\u043e",
    GT: "\u041f\u043e\u0437\u0436\u0435",
    GTE: "\u041f\u043e\u0437\u0436\u0435 \u0438\u043b\u0438 \u0442\u043e\u0447\u043d\u043e",
    LT: "\u0420\u0430\u043d\u044c\u0448\u0435",
    LTE: "\u0420\u0430\u043d\u044c\u0448\u0435 \u0438\u043b\u0438 \u0442\u043e\u0447\u043d\u043e",
    BETWEEN: "\u0412 \u0438\u043d\u0442\u0435\u0440\u0432\u0430\u043b\u0435",
  },
  EN: {
    EQ: "Exactly",
    GT: "After",
    GTE: "After or exactly",
    LT: "Before",
    LTE: "Before or exactly",
    BETWEEN: "Between",
  },
};

type VerificationRuleGroup = {
  id: string;
  head: VerificationRule;
  alternatives: VerificationRule[];
};

function groupVerificationRules(rules: VerificationRule[]): VerificationRuleGroup[] {
  return rules.reduce<VerificationRuleGroup[]>((groups, rule, index) => {
    if (index === 0 || rule.joiner === "AND" || groups.length === 0) {
      groups.push({
        id: `verification-group-${rule.id}`,
        head: rule,
        alternatives: [],
      });
      return groups;
    }

    groups[groups.length - 1]?.alternatives.push(rule);
    return groups;
  }, []);
}

function normalizeVerificationFieldSource(source: unknown): VerificationFieldSource {
  return String(source ?? "").toUpperCase() === "TABLE" ? "TABLE" : "PARAMS";
}

function detectVerificationFieldValueType(column?: ClassifierTableColumn | null): VerificationFieldValueType {
  const normalized = column?.dataType?.toLowerCase() ?? "";

  if (normalized.includes("bool")) return "boolean";
  if (normalized.includes("timestamp")) return "datetime";
  if (normalized.includes("time")) return "time";
  if (normalized.includes("date")) return "date";
  if (
    normalized.includes("int") ||
    normalized.includes("decimal") ||
    normalized.includes("numeric") ||
    normalized.includes("number") ||
    normalized.includes("float") ||
    normalized.includes("double") ||
    normalized.includes("real")
  ) {
    return "number";
  }

  return "text";
}

function getVerificationOperatorValues(
  fieldSource: VerificationFieldSource,
  fieldType?: VerificationFieldValueType,
): VerificationRuleOperator[] {
  if (fieldSource !== "TABLE") {
    return VERIFICATION_OPERATOR_OPTIONS.map((option) => option.value);
  }

  switch (fieldType) {
    case "number":
    case "date":
    case "datetime":
    case "time":
      return ["EQ", "NOT_EQ", "GT", "GTE", "LT", "LTE", "BETWEEN", "IS_NULL", "IS_NOT_NULL"];
    case "boolean":
      return ["EQ", "NOT_EQ", "IS_NULL", "IS_NOT_NULL"];
    case "text":
    default:
      return ["EQ", "NOT_EQ", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "IS_NULL", "IS_NOT_NULL"];
  }
}

function getVerificationOperatorLabel(
  locale: LocaleCode,
  operator: VerificationRuleOperator,
  fieldSource: VerificationFieldSource,
  fieldType?: VerificationFieldValueType,
) {
  if (fieldSource === "TABLE" && (fieldType === "date" || fieldType === "datetime" || fieldType === "time")) {
    return (
      VERIFICATION_TEMPORAL_OPERATOR_LABELS[locale][operator] ??
      VERIFICATION_TEMPORAL_OPERATOR_LABELS.OZ[operator] ??
      VERIFICATION_OPERATOR_LABELS[locale][operator] ??
      VERIFICATION_OPERATOR_LABELS.OZ[operator] ??
      operator
    );
  }

  return VERIFICATION_OPERATOR_LABELS[locale][operator] ?? VERIFICATION_OPERATOR_LABELS.OZ[operator] ?? operator;
}

function getVerificationInputType(fieldType?: VerificationFieldValueType) {
  switch (fieldType) {
    case "number":
      return "number" as const;
    case "date":
      return "date" as const;
    case "datetime":
      return "datetime-local" as const;
    case "time":
      return "time" as const;
    default:
      return "text" as const;
  }
}

function getVerificationValuePlaceholder(
  locale: LocaleCode,
  fieldType: VerificationFieldValueType | undefined,
  inputMode: VerificationInputMode,
  isSecond = false,
) {
  const localePlaceholders = {
    OZ: {
      none: "Qiymat kiritilmaydi",
      number: isSecond ? "Ikkinchi raqamni kiriting" : "Raqamni kiriting",
      date: isSecond ? "Ikkinchi sanani kiriting" : "Sanani kiriting",
      datetime: isSecond ? "Ikkinchi sana-vaqtni kiriting" : "Sana-vaqtni kiriting",
      time: isSecond ? "Ikkinchi vaqtni kiriting" : "Vaqtni kiriting",
      text: isSecond ? "Ikkinchi qiymatni kiriting" : "Qiymatni kiriting",
    },
    UZ: {
      none: "Қиймат киритилмайди",
      number: isSecond ? "Иккинчи рақамни киритинг" : "Рақамни киритинг",
      date: isSecond ? "Иккинчи санани киритинг" : "Санани киритинг",
      datetime: isSecond ? "Иккинчи сана-вақтни киритинг" : "Сана-вақтни киритинг",
      time: isSecond ? "Иккинчи вақтни киритинг" : "Вақтни киритинг",
      text: isSecond ? "Иккинчи қийматни киритинг" : "Қийматни киритинг",
    },
    RU: {
      none: "Значение не требуется",
      number: isSecond ? "Введите второе число" : "Введите число",
      date: isSecond ? "Введите вторую дату" : "Введите дату",
      datetime: isSecond ? "Введите вторую дату и время" : "Введите дату и время",
      time: isSecond ? "Введите второе время" : "Введите время",
      text: isSecond ? "Введите второе значение" : "Введите значение",
    },
    EN: {
      none: "No value is required",
      number: isSecond ? "Enter the second number" : "Enter a number",
      date: isSecond ? "Enter the second date" : "Enter a date",
      datetime: isSecond ? "Enter the second date and time" : "Enter a date and time",
      time: isSecond ? "Enter the second time" : "Enter a time",
      text: isSecond ? "Enter the second value" : "Enter a value",
    },
  }[locale];

  if (inputMode === "none") {
    return localePlaceholders.none;
  }

  if (fieldType === "number") {
    return localePlaceholders.number;
  }

  if (fieldType === "date") {
    return localePlaceholders.date;
  }

  if (fieldType === "datetime") {
    return localePlaceholders.datetime;
  }

  if (fieldType === "time") {
    return localePlaceholders.time;
  }

  return localePlaceholders.text;
}

function findPreferredClassifierTable(
  rows: ClassifierTable[],
  tableName: string,
  preferredSystemType?: string,
) {
  const normalizedTableName = tableName.trim().toLocaleLowerCase();
  if (!normalizedTableName) {
    return null;
  }

  const matchedTables = rows.filter((row) => row.tableName.trim().toLocaleLowerCase() === normalizedTableName);
  if (matchedTables.length === 0) {
    return null;
  }

  const normalizedPreferredSystemType = preferredSystemType?.trim().toLocaleLowerCase();
  if (!normalizedPreferredSystemType) {
    return matchedTables[0] ?? null;
  }

  return (
    matchedTables.find((row) => row.systemType.trim().toLocaleLowerCase() === normalizedPreferredSystemType) ??
    matchedTables[0] ??
    null
  );
}

function sortVerificationTables(
  rows: ClassifierTable[],
  preferredSystemType?: string,
  currentTableName?: string,
) {
  const normalizedPreferred = preferredSystemType?.trim().toLocaleLowerCase();
  const normalizedCurrent = currentTableName?.trim().toLocaleLowerCase();

  return [...rows].sort((left, right) => {
    const leftCurrent = normalizedCurrent && left.tableName.trim().toLocaleLowerCase() === normalizedCurrent ? 0 : 1;
    const rightCurrent = normalizedCurrent && right.tableName.trim().toLocaleLowerCase() === normalizedCurrent ? 0 : 1;
    const leftPreferred = normalizedPreferred && left.systemType.trim().toLocaleLowerCase() === normalizedPreferred ? 0 : 1;
    const rightPreferred = normalizedPreferred && right.systemType.trim().toLocaleLowerCase() === normalizedPreferred ? 0 : 1;

    return (
      leftCurrent - rightCurrent ||
      leftPreferred - rightPreferred ||
      left.systemType.localeCompare(right.systemType, "uz") ||
      left.tableName.localeCompare(right.tableName, "uz")
    );
  });
}

function sortClassifierTableColumns(columns: ClassifierTableColumn[]) {
  return [...columns].sort(
    (left, right) =>
      left.ordinalPosition - right.ordinalPosition || left.name.localeCompare(right.name, "uz"),
  );
}

function createUniqueId(prefix = "condition") {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeComplexConditions(source: unknown): ComplexCondition[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item, index) => {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};

    return {
      id: String(raw.id ?? createUniqueId("complex-condition")),
      parameterName: `param${index + 1}`,
      serverName: String(raw.serverName ?? ""),
      orderNumber: index + 1,
      sqlQuery: String(raw.sqlQuery ?? ""),
    };
  });
}

function resequenceConditions(conditions: ComplexCondition[]) {
  return conditions.map((condition, index) => ({
    ...condition,
    parameterName: `param${index + 1}`,
    orderNumber: index + 1,
  }));
}

function createEmptyCondition(nextIndex: number): ComplexCondition {
  return {
    id: createUniqueId("complex-condition"),
    parameterName: `param${nextIndex}`,
    serverName: "",
    orderNumber: nextIndex,
    sqlQuery: "",
  };
}

function normalizeVerificationRules(source: unknown): VerificationRule[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const rawJoiner = String(raw.joiner ?? "");
    const rawOperator = String(raw.operator ?? "");
    const rawLocalizedChecks =
      typeof raw.localizedChecks === "object" && raw.localizedChecks !== null
        ? (raw.localizedChecks as Record<string, unknown>)
        : null;
    const fallbackLocalizedCheck = ["OZ", "UZ", "RU", "EN"]
      .map((locale) => rawLocalizedChecks?.[locale])
      .find((localeCheck) => typeof localeCheck === "object" && localeCheck !== null) as Record<string, unknown> | undefined;
    const fallbackOperator = String(fallbackLocalizedCheck?.operator ?? "");
    const normalizedOperatorSource = rawOperator || fallbackOperator;
    const normalizedOperator = VERIFICATION_OPERATOR_OPTIONS.some((option) => option.value === normalizedOperatorSource)
      ? (normalizedOperatorSource as VerificationRuleOperator)
      : "EQ";
    const normalizedComparisonValue = String(
      raw.comparisonValue ?? fallbackLocalizedCheck?.comparisonValue ?? "",
    );
    const normalizedSecondaryComparisonValue = String(raw.secondaryComparisonValue ?? "");

    return {
      id: String(raw.id ?? createUniqueId("verification-rule")),
      joiner: rawJoiner === "OR" ? "OR" : "AND",
      fieldSource: normalizeVerificationFieldSource(raw.fieldSource),
      tableName: String(raw.tableName ?? ""),
      fieldRef: String(raw.fieldRef ?? ""),
      operator: normalizedOperator,
      comparisonValue: normalizedComparisonValue,
      secondaryComparisonValue: normalizedSecondaryComparisonValue,
    };
  }).map((rule) => ({
    ...rule,
    joiner: (rule.joiner === "OR" ? "OR" : "AND") as VerificationRuleJoiner,
  }));
}

function createEmptyVerificationRule(joiner: VerificationRuleJoiner = "AND"): VerificationRule {
  return {
    id: createUniqueId("verification-rule"),
    joiner,
    fieldSource: "PARAMS",
    tableName: "",
    fieldRef: "",
    operator: "EQ",
    comparisonValue: "",
    secondaryComparisonValue: "",
  };
}

function coerceVerificationRuleToTableMode(
  rule: VerificationRule,
  selectedTableName: string,
  classifierTables: ClassifierTable[],
  preferredSystemType?: string,
): VerificationRule {
  const fallbackTableName = sortVerificationTables(classifierTables, preferredSystemType, selectedTableName)[0]?.tableName ?? "";
  const nextTableName = rule.tableName || selectedTableName || fallbackTableName;
  const nextTable = findPreferredClassifierTable(classifierTables, nextTableName, preferredSystemType);
  const nextColumns = sortClassifierTableColumns(nextTable?.columns ?? []);
  const nextFieldRef = nextColumns.some((column) => column.name === rule.fieldRef)
    ? rule.fieldRef
    : nextColumns[0]?.name ?? "";
  const nextColumn = nextTable?.columns.find((column) => column.name === nextFieldRef) ?? null;
  const nextAllowedValues = getVerificationOperatorValues(
    "TABLE",
    detectVerificationFieldValueType(nextColumn),
  );
  const nextOperator = nextAllowedValues.includes(rule.operator) ? rule.operator : nextAllowedValues[0] ?? "EQ";
  const nextInputMode = getVerificationOperatorMeta(nextOperator).inputMode;

  return {
    ...rule,
    fieldSource: "TABLE",
    tableName: nextTableName,
    fieldRef: nextFieldRef,
    operator: nextOperator,
    comparisonValue: nextInputMode === "none" ? "" : rule.comparisonValue,
    secondaryComparisonValue: nextInputMode === "range" ? rule.secondaryComparisonValue : "",
  };
}

function normalizeVerificationTriggerMode(source: unknown): VerificationTriggerMode {
  return String(source ?? "").toUpperCase() === "FALSE" ? "FALSE" : "TRUE";
}

function toServerOptions(rows: ClassifierServer[], currentValue: string) {
  return buildClassifierServerOptions(rows, currentValue);
}

const COMPLEX_QUERY_TOKEN_REGEX = /\{\{\s*(param\d+)\.([A-Za-z_][\w$]*)\s*\}\}/g;
const COMPLEX_QUERY_RESULT_LIMIT = 1000;
const SQL_RUNNER_POLL_INTERVAL_MS = 900;
const TRACE_RESULT_PAGE_SIZE = 10;

const COMPLEX_EDITOR_COPY = {
  OZ: {
    fieldSourceTooltips: {
      PARAMS: "Dastlabki/Qo'shimcha shart parametrlaridan foydalanish",
      TABLE: "ETRANZIT jadval ma'lumotlaridan foydalanish",
    },
    warningFieldPlaceholders: {
      UZ: "O'zbekcha (kiril) uchun xabarni kiriting",
      OZ: "O'zbekcha (lotin) uchun xabarni kiriting",
      RU: "Ruscha uchun xabarni kiriting",
      EN: "Inglizcha uchun xabarni kiriting",
    },
    tokenInsert: {
      button: "Parametr",
      searchPlaceholder: "Parametr qidiring...",
      emptyLabel: "Mos parametr topilmadi",
    },
    phoneChipRemove: (chip: string) => `${chip} ni o'chirish`,
    verification: {
      selectTableColumn: "Jadval ustunini tanlang",
      selectTableFirst: "Avval jadval tanlang",
      waitForSelectResults: "Avval select natijasi shakllansin",
      selectParameterColumn: "Parametr ustunini tanlang",
      selectTable: "Jadvalni tanlang",
      searchTable: "Jadvalni qidiring...",
      noTable: "Mos jadval topilmadi",
      searchTableColumn: "Jadval ustunini qidiring...",
      searchColumn: "Ustunni qidiring...",
      noTableColumn: "Mos jadval ustuni topilmadi",
      noColumn: "Mos ustun topilmadi",
      noValueInput: "Qiymat kiritilmaydi",
      paramValuePlaceholder: "Qiymat yoki {{param1.id}}",
      deleteRuleTitle: "Shartni o'chirish",
      openTitle: "Tekshirish shartini ochish",
      collapseTitle: "Tekshirish shartini yig'ish",
      title: "Tekshirish sharti",
      descriptionPrefix: "Tekshirish shart",
      descriptionSuffix: "bo'lganda mantiqiy nazorat ishga tushsin.",
      addRule: "Shart qo'shish",
      truthy: "rost",
      falsy: "yolg'on",
    },
    warning: {
      openTitle: "Ogohlantirish xabarini ochish",
      collapseTitle: "Ogohlantirish xabarini yig'ish",
      title: "Ogohlantirish xabari",
      phonePlaceholder: "IP telefon raqamlari: 7716,7717...",
    },
    conditions: {
      initial: "Dastlabki shart",
      additional: "Qo'shimcha shart",
      open: (title: string) => `${title}ni ochish`,
      collapse: (title: string) => `${title}ni yig'ish`,
      previousResults: "Oldingi natijalar",
      format: "Format",
      expand: "Kattalashtirish",
      process: "Jarayon",
      delete: "O'chirish",
      parameterName: "Parametr nomi",
      serverName: "Server nomi",
    },
    trace: {
      rows: "qator",
      truncated: "limitlangan",
      page: "Sahifa",
      previous: "Oldingi",
      next: "Keyingi",
      historyTitle: "Jarayon tarixi",
      emptyTitle: "Jarayon tarixi hali mavjud emas",
      emptyDescription: "Shu qo'shimcha shart uchun run ishlatilgandan keyin bosqichma-bosqich bajarilish shu yerda ko'rinadi.",
      completed: "Bajarildi",
      failed: "Xatolik",
      originalQuery: "Asl query",
      emptyQuery: "-- bo'sh query",
      executedQuery: (index: number) => `Bajarilgan query ${index}`,
      boundParams: (count: number) => `${count} ta parametr qo'yildi`,
      finalSummary: "Yakuniy jamlanma",
    },
    execution: {
      queryFailed: "SQL query bajarilmadi",
      waitExpired: "Query kutish vaqti tugadi",
      stoppedByUser: "Query foydalanuvchi tomonidan to'xtatildi",
      noResult: "Natija topilmadi",
      truncatedLoaded: "Natija cheklangan hajmda yuklandi",
      successLoaded: "Natija muvaffaqiyatli yuklandi",
      inconsistentColumns: "Oldingi parametrlar bilan query turli ustun tuzilmasini qaytardi",
      conditionNotFound: "Shart topilmadi",
      previousResultMissing: (paramName: string) => `${paramName} uchun oldingi natija topilmadi`,
      noRowsForParam: (paramName: string) => `${paramName} bo'yicha natija topilmadi`,
      tokenValueMissing: (paramName: string, columnName: string) => `${paramName}.${columnName} uchun qiymat topilmadi`,
      tokenColumnMissing: (paramName: string, columnName: string) => `${paramName}.${columnName} ustuni topilmadi`,
      paramQueryFailed: (paramName: string) => `${paramName} query bajarilmadi`,
      finalResultMissing: "Yakuniy natija topilmadi",
    },
  },
  UZ: {
    fieldSourceTooltips: {
      PARAMS: "Дастлабки/Қўшимча шарт параметрларидан фойдаланиш",
      TABLE: "ETRANZIT жадвал маълумотларидан фойдаланиш",
    },
    warningFieldPlaceholders: {
      UZ: "Ўзбекча (кирил) учун хабарни киритинг",
      OZ: "Ўзбекча (лотин) учун хабарни киритинг",
      RU: "Русча учун хабарни киритинг",
      EN: "Инглизча учун хабарни киритинг",
    },
    tokenInsert: {
      button: "Параметр",
      searchPlaceholder: "Параметр қидиринг...",
      emptyLabel: "Мос параметр топилмади",
    },
    phoneChipRemove: (chip: string) => `${chip} ни ўчириш`,
    verification: {
      selectTableColumn: "Жадвал устунини танланг",
      selectTableFirst: "Аввал жадвал танланг",
      waitForSelectResults: "Аввал select натижаси шакллансин",
      selectParameterColumn: "Параметр устунини танланг",
      selectTable: "Жадвални танланг",
      searchTable: "Жадвални қидиринг...",
      noTable: "Мос жадвал топилмади",
      searchTableColumn: "Жадвал устунини қидиринг...",
      searchColumn: "Устунни қидиринг...",
      noTableColumn: "Мос жадвал устуни топилмади",
      noColumn: "Мос устун топилмади",
      noValueInput: "Қиймат киритилмайди",
      paramValuePlaceholder: "Қиймат ёки {{param1.id}}",
      deleteRuleTitle: "Шартни ўчириш",
      openTitle: "Текшириш шартини очиш",
      collapseTitle: "Текшириш шартини йиғиш",
      title: "Текшириш шарти",
      descriptionPrefix: "Текшириш шарт",
      descriptionSuffix: "бўлганда мантиқий назорат ишга тушсин.",
      addRule: "Шарт қўшиш",
      truthy: "рост",
      falsy: "ёлғон",
    },
    warning: {
      openTitle: "Огоҳлантириш хабарини очиш",
      collapseTitle: "Огоҳлантириш хабарини йиғиш",
      title: "Огоҳлантириш хабари",
      phonePlaceholder: "IP телефон рақамлари: 7716,7717...",
    },
    conditions: {
      initial: "Дастлабки шарт",
      additional: "Қўшимча шарт",
      open: (title: string) => `${title}ни очиш`,
      collapse: (title: string) => `${title}ни йиғиш`,
      previousResults: "Олдинги натижалар",
      format: "Format",
      expand: "Катталаштириш",
      process: "Жараён",
      delete: "Ўчириш",
      parameterName: "Параметр номи",
      serverName: "Сервер номи",
    },
    trace: {
      rows: "қатор",
      truncated: "чекланган",
      page: "Саҳифа",
      previous: "Олдинги",
      next: "Кейинги",
      historyTitle: "Жараён тарихи",
      emptyTitle: "Жараён тарихи ҳали мавжуд эмас",
      emptyDescription: "Шу қўшимча шарт учун run ишлатилгандан кейин босқичма-босқич бажарилиш шу ерда кўринади.",
      completed: "Бажарилди",
      failed: "Хатолик",
      originalQuery: "Асл query",
      emptyQuery: "-- бўш query",
      executedQuery: (index: number) => `Бажарилган query ${index}`,
      boundParams: (count: number) => `${count} та параметр қўйилди`,
      finalSummary: "Якуний жамланма",
    },
    execution: {
      queryFailed: "SQL query бажарилмади",
      waitExpired: "Query кутиш вақти тугади",
      noResult: "Натижа топилмади",
      truncatedLoaded: "Натижа чекланган ҳажмда юкланди",
      successLoaded: "Натижа муваффақиятли юкланди",
      inconsistentColumns: "Олдинги параметрлар билан query турли устун тузилмасини қайтарди",
      conditionNotFound: "Шарт топилмади",
      previousResultMissing: (paramName: string) => `${paramName} учун олдинги натижа топилмади`,
      noRowsForParam: (paramName: string) => `${paramName} бўйича натижа топилмади`,
      tokenValueMissing: (paramName: string, columnName: string) => `${paramName}.${columnName} учун қиймат топилмади`,
      tokenColumnMissing: (paramName: string, columnName: string) => `${paramName}.${columnName} устуни топилмади`,
      paramQueryFailed: (paramName: string) => `${paramName} query бажарилмади`,
      finalResultMissing: "Якуний натижа топилмади",
    },
  },
  RU: {
    fieldSourceTooltips: {
      PARAMS: "Использовать параметры из первичного/дополнительного условия",
      TABLE: "Использовать данные таблиц ETRANZIT",
    },
    warningFieldPlaceholders: {
      UZ: "Введите сообщение для узбекского (кириллица)",
      OZ: "Введите сообщение для узбекского (латиница)",
      RU: "Введите сообщение для русского",
      EN: "Введите сообщение для английского",
    },
    tokenInsert: {
      button: "Параметр",
      searchPlaceholder: "Поиск параметра...",
      emptyLabel: "Параметр не найден",
    },
    phoneChipRemove: (chip: string) => `Удалить ${chip}`,
    verification: {
      selectTableColumn: "Выберите колонку таблицы",
      selectTableFirst: "Сначала выберите таблицу",
      waitForSelectResults: "Сначала должен появиться результат select",
      selectParameterColumn: "Выберите колонку параметра",
      selectTable: "Выберите таблицу",
      searchTable: "Поиск таблицы...",
      noTable: "Таблица не найдена",
      searchTableColumn: "Поиск колонки таблицы...",
      searchColumn: "Поиск колонки...",
      noTableColumn: "Колонка таблицы не найдена",
      noColumn: "Колонка не найдена",
      noValueInput: "Значение не требуется",
      paramValuePlaceholder: "Значение или {{param1.id}}",
      deleteRuleTitle: "Удалить условие",
      openTitle: "Открыть условие проверки",
      collapseTitle: "Свернуть условие проверки",
      title: "Условие проверки",
      descriptionPrefix: "Если условие проверки",
      descriptionSuffix: "то логический контроль должен сработать.",
      addRule: "Добавить условие",
      truthy: "истина",
      falsy: "ложь",
    },
    warning: {
      openTitle: "Открыть предупреждение",
      collapseTitle: "Свернуть предупреждение",
      title: "Предупреждение",
      phonePlaceholder: "IP-телефоны: 7716,7717...",
    },
    conditions: {
      initial: "Первичное условие",
      additional: "Дополнительное условие",
      open: (title: string) => `Открыть: ${title}`,
      collapse: (title: string) => `Свернуть: ${title}`,
      previousResults: "Предыдущие результаты",
      format: "Формат",
      expand: "Развернуть",
      process: "История",
      delete: "Удалить",
      parameterName: "Имя параметра",
      serverName: "Имя сервера",
    },
    trace: {
      rows: "строк",
      truncated: "ограничено",
      page: "Страница",
      previous: "Назад",
      next: "Вперёд",
      historyTitle: "История выполнения",
      emptyTitle: "История выполнения пока недоступна",
      emptyDescription: "После запуска этого дополнительного условия пошаговое выполнение будет отображаться здесь.",
      completed: "Выполнено",
      failed: "Ошибка",
      originalQuery: "Исходный запрос",
      emptyQuery: "-- пустой запрос",
      executedQuery: (index: number) => `Выполненный запрос ${index}`,
      boundParams: (count: number) => `Подставлено параметров: ${count}`,
      finalSummary: "Итоговый результат",
    },
    execution: {
      queryFailed: "SQL-запрос не выполнен",
      waitExpired: "Истекло время ожидания запроса",
      noResult: "Результат не найден",
      truncatedLoaded: "Результат загружен с ограничением",
      successLoaded: "Результат успешно загружен",
      inconsistentColumns: "Запрос с предыдущими параметрами вернул другую структуру колонок",
      conditionNotFound: "Условие не найдено",
      previousResultMissing: (paramName: string) => `Не найден предыдущий результат для ${paramName}`,
      noRowsForParam: (paramName: string) => `Для ${paramName} результат не найден`,
      tokenValueMissing: (paramName: string, columnName: string) => `Не найдено значение для ${paramName}.${columnName}`,
      tokenColumnMissing: (paramName: string, columnName: string) => `Колонка ${paramName}.${columnName} не найдена`,
      paramQueryFailed: (paramName: string) => `Запрос ${paramName} не выполнен`,
      finalResultMissing: "Итоговый результат не найден",
    },
  },
  EN: {
    fieldSourceTooltips: {
      PARAMS: "Use parameters from the initial/additional conditions",
      TABLE: "Use data from ETRANZIT tables",
    },
    warningFieldPlaceholders: {
      UZ: "Enter the message for Uzbek (Cyrillic)",
      OZ: "Enter the message for Uzbek (Latin)",
      RU: "Enter the message for Russian",
      EN: "Enter the message for English",
    },
    tokenInsert: {
      button: "Parameter",
      searchPlaceholder: "Search parameter...",
      emptyLabel: "No parameter found",
    },
    phoneChipRemove: (chip: string) => `Remove ${chip}`,
    verification: {
      selectTableColumn: "Select a table column",
      selectTableFirst: "Select a table first",
      waitForSelectResults: "Wait until a select result is available",
      selectParameterColumn: "Select a parameter column",
      selectTable: "Select a table",
      searchTable: "Search table...",
      noTable: "No table found",
      searchTableColumn: "Search table column...",
      searchColumn: "Search column...",
      noTableColumn: "No table column found",
      noColumn: "No column found",
      noValueInput: "No value is required",
      paramValuePlaceholder: "Value or {{param1.id}}",
      deleteRuleTitle: "Delete condition",
      openTitle: "Open verification condition",
      collapseTitle: "Collapse verification condition",
      title: "Verification condition",
      descriptionPrefix: "When the verification condition is",
      descriptionSuffix: "the logical control should trigger.",
      addRule: "Add condition",
      truthy: "true",
      falsy: "false",
    },
    warning: {
      openTitle: "Open warning message",
      collapseTitle: "Collapse warning message",
      title: "Warning message",
      phonePlaceholder: "IP phone numbers: 7716,7717...",
    },
    conditions: {
      initial: "Initial condition",
      additional: "Additional condition",
      open: (title: string) => `Open ${title}`,
      collapse: (title: string) => `Collapse ${title}`,
      previousResults: "Previous results",
      format: "Format",
      expand: "Expand",
      process: "History",
      delete: "Delete",
      parameterName: "Parameter name",
      serverName: "Server name",
    },
    trace: {
      rows: "rows",
      truncated: "truncated",
      page: "Page",
      previous: "Previous",
      next: "Next",
      historyTitle: "Execution history",
      emptyTitle: "Execution history is not available yet",
      emptyDescription: "After running this additional condition, the step-by-step execution will appear here.",
      completed: "Completed",
      failed: "Failed",
      originalQuery: "Original query",
      emptyQuery: "-- empty query",
      executedQuery: (index: number) => `Executed query ${index}`,
      boundParams: (count: number) => `${count} parameter(s) were applied`,
      finalSummary: "Final summary",
    },
    execution: {
      queryFailed: "The SQL query did not complete",
      waitExpired: "The query wait time expired",
      stoppedByUser: "The query was stopped by the user",
      noResult: "No result was found",
      truncatedLoaded: "The result was loaded with a limit",
      successLoaded: "The result was loaded successfully",
      inconsistentColumns: "The query returned a different column structure for the previous parameters",
      conditionNotFound: "The condition was not found",
      previousResultMissing: (paramName: string) => `No previous result was found for ${paramName}`,
      noRowsForParam: (paramName: string) => `No rows were found for ${paramName}`,
      tokenValueMissing: (paramName: string, columnName: string) => `No value was found for ${paramName}.${columnName}`,
      tokenColumnMissing: (paramName: string, columnName: string) => `The column ${paramName}.${columnName} was not found`,
      paramQueryFailed: (paramName: string) => `The query for ${paramName} did not complete`,
      finalResultMissing: "The final result was not found",
    },
  },
} as const;

function getComplexEditorCopy(locale: LocaleCode) {
  return COMPLEX_EDITOR_COPY[locale];
}

function getStoppedByUserMessage(locale: LocaleCode) {
  switch (locale) {
    case "UZ":
      return "Query фойдаланувчи томонидан тўхтатилди";
    case "RU":
      return "Запрос остановлен пользователем";
    case "EN":
      return "The query was stopped by the user";
    case "OZ":
    default:
      return "Query foydalanuvchi tomonidan to'xtatildi";
  }
}

function delay(timeoutMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
}

function createSyntheticExecution(
  serverName: string,
  status: SqlQueryExecutionStatusResponse["status"],
  logMessage: string,
  result: SqlQueryExecutionResult | null,
  errorMessage: string | null = null,
  timestamps?: {
    createdAt?: string;
    startedAt?: string;
    finishedAt?: string;
  },
) {
  const now = new Date().toISOString();

  return {
    executionId: `complex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status,
    serverName,
    logMessage,
    errorMessage,
    stopAvailable: false,
    createdAt: timestamps?.createdAt ?? now,
    startedAt: timestamps?.startedAt ?? timestamps?.createdAt ?? now,
    finishedAt: timestamps?.finishedAt ?? now,
    result,
  } satisfies SqlQueryExecutionStatusResponse;
}

function normalizeColumnKey(columnName: string) {
  return columnName.trim().toLowerCase();
}

function toSqlLiteral(value: string | null) {
  if (value === null) {
    return "null";
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    return value.trim();
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function applyProjectionColumnNames(sqlQuery: string, result: SqlQueryExecutionResult) {
  const projection = extractSelectProjectionColumns(sqlQuery);
  if (!projection.isSelectQuery || projection.columns.length !== result.columns.length) {
    return result;
  }

  return {
    ...result,
    columns: projection.columns.map((column) => column.displayName),
  } satisfies SqlQueryExecutionResult;
}

async function executeSqlAndWait(
  sql: string,
  serverName: string,
  locale: LocaleCode,
  options: {
    onStart?: (executionId: string) => void;
    onFinish?: () => void;
    isCancelled?: () => boolean;
  },
) {
  const copy = getComplexEditorCopy(locale);
  const stoppedByUserMessage = getStoppedByUserMessage(locale);

  try {
    const startedExecution = await startSqlQueryExecution({
      sql,
      serverName,
    });
    options.onStart?.(startedExecution.executionId);

    if (options.isCancelled?.()) {
      try {
        await cancelSqlQueryExecution(startedExecution.executionId);
      } catch {
        // Ignore cancel race; caller already requested stop.
      }
      return createSyntheticExecution(serverName, "CANCELLED", stoppedByUserMessage, null, stoppedByUserMessage);
    }

    let attempts = 0;
    while (attempts < 240) {
      if (options.isCancelled?.()) {
        return createSyntheticExecution(serverName, "CANCELLED", stoppedByUserMessage, null, stoppedByUserMessage);
      }

      const execution = await fetchSqlQueryExecutionStatus(startedExecution.executionId);
      if (execution.status !== "QUEUED" && execution.status !== "RUNNING") {
        return execution;
      }

      attempts += 1;
      await delay(SQL_RUNNER_POLL_INTERVAL_MS);
    }

    return createSyntheticExecution(serverName, "FAILED", copy.execution.queryFailed, null, copy.execution.waitExpired);
  } finally {
    options.onFinish?.();
  }
}

function mergeExecutionResults(
  serverName: string,
  sourceResults: SqlQueryExecutionResult[],
  locale: LocaleCode,
  timestamps?: {
    createdAt?: string;
    startedAt?: string;
    finishedAt?: string;
  },
) {
  const copy = getComplexEditorCopy(locale);
  if (sourceResults.length === 0) {
    return createSyntheticExecution(serverName, "COMPLETED", copy.execution.noResult, {
      columns: [],
      rows: [],
      totalRows: 0,
      truncated: false,
    }, null, timestamps);
  }

  const baselineColumns = sourceResults[0]?.columns ?? [];
  const sameShape = sourceResults.every(
    (result) => result.columns.length === baselineColumns.length && result.columns.every((column, index) => column === baselineColumns[index]),
  );

  if (!sameShape) {
    return createSyntheticExecution(
      serverName,
      "FAILED",
      copy.execution.queryFailed,
      null,
      copy.execution.inconsistentColumns,
      timestamps,
    );
  }

  const aggregatedRows: Array<Array<string | null>> = [];
  let totalRows = 0;
  let truncated = false;

  sourceResults.forEach((result) => {
    totalRows += result.totalRows;

    result.rows.forEach((row) => {
      if (aggregatedRows.length < COMPLEX_QUERY_RESULT_LIMIT) {
        aggregatedRows.push([...row]);
      } else {
        truncated = true;
      }
    });

    if (result.truncated) {
      truncated = true;
    }
  });

  const result = {
    columns: baselineColumns,
    rows: aggregatedRows,
    totalRows,
    truncated,
  } satisfies SqlQueryExecutionResult;

  return createSyntheticExecution(
    serverName,
    "COMPLETED",
    totalRows === 0
      ? copy.execution.noResult
      : truncated
        ? copy.execution.truncatedLoaded
        : copy.execution.successLoaded,
    result,
    null,
    timestamps,
  );
}

function createTraceResultPreview(result: SqlQueryExecutionResult): ComplexTraceResultPreview {
  return {
    columns: [...result.columns],
    rows: result.rows,
    totalRows: result.totalRows,
    truncated: result.truncated,
  };
}

function getWarningMessageFields(locale: LocaleCode) {
  const copy = getComplexEditorCopy(locale);
  return (["UZ", "OZ", "RU", "EN"] as const).map((key) => ({
    key,
    placeholder: copy.warningFieldPlaceholders[key],
  }));
}

function groupTokensByParamName(tokens: ComplexOutputToken[]) {
  const groups = new Map<string, ComplexOutputToken[]>();

  tokens.forEach((token) => {
    const items = groups.get(token.paramName) ?? [];
    items.push(token);
    groups.set(token.paramName, items);
  });

  return [...groups.entries()];
}

function WarningTokenInsertMenu({
  tokens,
  onSelect,
  className,
}: {
  tokens: ComplexOutputToken[];
  onSelect: (tokenText: string) => void;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTokens = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return tokens;
    }

    return tokens.filter((token) =>
      `${token.label} ${token.tokenText}`.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, tokens]);
  const groupedTokens = useMemo(() => groupTokensByParamName(filteredTokens), [filteredTokens]);

  if (tokens.length === 0) {
    return null;
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 rounded-full border border-border/70 bg-white/96 px-2.5 text-[10px] text-muted-foreground shadow-sm hover:bg-muted",
              className,
            )}
          >
            <Braces className="size-3" />
            {copy.tokenInsert.button}
            <ChevronDown className="size-3 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-[260px] rounded-[14px] border border-border/70 bg-popover/98 p-1.5 shadow-[0_18px_38px_-24px_rgba(15,23,42,0.28)]">
        <div className="px-1 pb-1.5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.tokenInsert.searchPlaceholder}
            className="h-8 rounded-[10px] border-border/70 bg-background px-2.5 text-xs shadow-none"
          />
        </div>
        {groupedTokens.length === 0 ? (
          <div className="px-2 py-5 text-center text-xs text-muted-foreground">{copy.tokenInsert.emptyLabel}</div>
        ) : null}
        {groupedTokens.map(([paramName, groupedItems]) => (
          <DropdownMenuGroup key={paramName}>
            <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-[0.14em]">{paramName}</DropdownMenuLabel>
            {groupedItems.map((token) => (
              <DropdownMenuItem
                key={token.id}
                onClick={() => {
                  onSelect(token.tokenText);
                  setOpen(false);
                }}
                className="flex items-start rounded-[10px] px-2 py-1.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs font-medium text-foreground">{token.label}</span>
                  <span className="text-[11px] text-muted-foreground">{token.tokenText}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function normalizePhoneExtensionValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parsePhoneExtensionState(value: unknown) {
  const digitsOnly = normalizePhoneExtensionValue(value).replace(/\D/g, "");
  const chips: string[] = [];
  let cursor = 0;

  while (cursor + 4 <= digitsOnly.length) {
    chips.push(digitsOnly.slice(cursor, cursor + 4));
    cursor += 4;
  }

  return {
    chips,
    draft: digitsOnly.slice(cursor, cursor + 4),
  };
}

function serializePhoneExtensionState(chips: string[], draft = "") {
  return [...chips, ...(draft ? [draft] : [])].join(",");
}

function PhoneExtensionChipInput({
  value,
  onChange,
  placeholder,
  hasError = false,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  hasError?: boolean;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const [{ chips, draft }, setState] = useState(() => parsePhoneExtensionState(value));

  useEffect(() => {
    const nextState = parsePhoneExtensionState(value);
    const currentSerialized = serializePhoneExtensionState(chips, draft);
    const nextSerialized = serializePhoneExtensionState(nextState.chips, nextState.draft);

    if (currentSerialized !== nextSerialized) {
      setState(nextState);
    }
  }, [chips, draft, value]);

  const commitState = useCallback(
    (nextChips: string[], nextDraft: string) => {
      setState({
        chips: nextChips,
        draft: nextDraft,
      });
      onChange(serializePhoneExtensionState(nextChips, nextDraft));
    },
    [onChange],
  );

  const handleDraftChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      const nextDigits = event.target.value.replace(/\D/g, "");
      const nextChips = [...chips];
      let remaining = nextDigits;

      while (remaining.length >= 4) {
        nextChips.push(remaining.slice(0, 4));
        remaining = remaining.slice(4);
      }

      commitState(nextChips, remaining);
    },
    [chips, commitState],
  );

  const handleRemoveChip = useCallback(
    (chipIndex: number) => {
      commitState(
        chips.filter((_, index) => index !== chipIndex),
        draft,
      );
    },
    [chips, commitState, draft],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && draft.length === 0 && chips.length > 0) {
        event.preventDefault();
        commitState(chips.slice(0, -1), "");
      }
    },
    [chips, commitState, draft.length],
  );

  return (
      <div
        className={cn(
        "flex min-h-[2rem] w-full flex-wrap items-center gap-1 rounded-[14px] border border-border/70 bg-background/90 px-2 py-0.5 shadow-none transition-colors focus-within:border-primary/35 focus-within:bg-background",
          hasError && "border-destructive focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive/20",
          className,
        )}
      >
        {chips.map((chip, index) => (
          <div
            key={`${chip}-${index}`}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border/70 bg-muted/45 px-2.5 text-[12px] font-medium text-foreground"
          >
            <span>{chip}</span>
            <button
            type="button"
            onClick={() => handleRemoveChip(index)}
            className="rounded-full p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
            aria-label={copy.phoneChipRemove(chip)}
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={handleDraftChange}
        onKeyDown={handleKeyDown}
        placeholder={chips.length === 0 ? placeholder : "XXXX"}
        className="h-6 min-w-[88px] flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function WarningMessageField({
  fieldKey,
  placeholder,
  value,
  hasError = false,
  multiline = true,
  allowTokenInsert = true,
  tokens,
  onChange,
  wrapperClassName,
}: {
  fieldKey: WarningMessageFieldKey;
  placeholder: string;
  value: string;
  hasError?: boolean;
  multiline?: boolean;
  allowTokenInsert?: boolean;
  tokens: ComplexOutputToken[];
  onChange: (value: string) => void;
  wrapperClassName?: string;
}) {
  const fieldId = `warning-message-${fieldKey}`;
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const captureSelection = useCallback((event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    selectionRef.current = { start, end };
  }, []);

  const handleTokenInsert = useCallback(
    (tokenText: string) => {
      const target = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
      const selection = selectionRef.current;
      const start = target?.selectionStart ?? selection?.start ?? value.length;
      const end = target?.selectionEnd ?? selection?.end ?? start;
      const nextValue = `${value.slice(0, start)}${tokenText}${value.slice(end)}`;
      const nextCaretPosition = start + tokenText.length;

      onChange(nextValue);

      window.requestAnimationFrame(() => {
        const nextTarget = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!nextTarget) {
          return;
        }

        nextTarget.focus();
        nextTarget.setSelectionRange(nextCaretPosition, nextCaretPosition);
        selectionRef.current = {
          start: nextCaretPosition,
          end: nextCaretPosition,
        };
      });
    },
    [fieldId, onChange, value],
  );

  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      {multiline ? (
        <div className="relative">
          {allowTokenInsert ? (
            <WarningTokenInsertMenu
              tokens={tokens}
              onSelect={handleTokenInsert}
              className="absolute right-2 top-2 z-10"
            />
          ) : null}
          <Textarea
            id={fieldId}
            rows={3}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onSelect={captureSelection}
            onClick={captureSelection}
            onKeyUp={captureSelection}
            placeholder={placeholder}
            className={cn(
              "h-[76px] min-h-0 max-h-[76px] resize-none overflow-y-auto rounded-[14px] border-border/70 bg-background/90 px-3 py-2.5 text-sm leading-5 shadow-none",
              hasError && "border-destructive focus-visible:ring-destructive/20",
              allowTokenInsert && "pr-[118px] pt-9",
            )}
          />
        </div>
      ) : (
        <Input
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={captureSelection}
          onClick={captureSelection}
          onKeyUp={captureSelection}
          placeholder={placeholder}
          className={cn(
            "h-10 rounded-[14px] border-border/70 bg-background/90 px-3.5 shadow-none",
            hasError && "border-destructive focus-visible:ring-destructive/20",
          )}
        />
      )}
    </div>
  );
}

function getVerificationOperatorMeta(operator: VerificationRuleOperator) {
  return VERIFICATION_OPERATOR_OPTIONS.find((option) => option.value === operator) ?? VERIFICATION_OPERATOR_OPTIONS[0];
}

function resolveCurrentLocale(language: string): LocaleCode {
  return language === "UZ" || language === "RU" || language === "EN" ? language : "OZ";
}

function IconHoverTooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  return (
    <div className="group/field-tooltip relative inline-flex shrink-0 items-center justify-center">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[220px] -translate-x-1/2 rounded-[12px] border border-slate-200/80 bg-slate-950 px-3 py-1.5 text-center text-[11px] font-medium leading-4 text-white opacity-0 shadow-[0_18px_36px_-18px_rgba(15,23,42,0.6)] transition-all duration-150 group-hover/field-tooltip:translate-y-0 group-hover/field-tooltip:opacity-100 group-focus-within/field-tooltip:translate-y-0 group-focus-within/field-tooltip:opacity-100 dark:border-slate-700/80 dark:bg-slate-900">
        {content}
      </div>
    </div>
  );
}

function VerificationJoinerSelect({
  value,
  onChange,
}: {
  value: VerificationRuleJoiner;
  onChange: (value: VerificationRuleJoiner) => void;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "relative z-10 h-8 min-w-[80px] justify-between rounded-full px-3 text-[11px] font-semibold shadow-sm",
              value === "OR"
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
            )}
          >
            {VERIFICATION_JOINER_LABELS[currentLocale][value]}
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent className="min-w-[96px] rounded-[14px] border border-border/70 bg-popover/98 p-1 shadow-[0_18px_38px_-24px_rgba(15,23,42,0.28)]">
        {(["AND", "OR"] as const).map((joiner) => (
          <DropdownMenuItem
            key={joiner}
            onClick={() => onChange(joiner)}
            className="rounded-[10px] px-3 py-2 text-xs font-medium"
          >
            {VERIFICATION_JOINER_LABELS[currentLocale][joiner]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollapseToggleButton({
  collapsed,
  onClick,
  title,
}: {
  collapsed: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-expanded={!collapsed}
      className="rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    >
      <ChevronDown className={cn("size-4 transition-transform duration-200", collapsed && "-rotate-90")} />
    </Button>
  );
}

function VerificationRulesPanel({
  rules,
  tokens,
  simpleView = false,
  selectedTableName,
  preferredSystemType,
  classifierTables,
  validationErrors,
  triggerMode,
  collapsed,
  onAddRule,
  onToggleTriggerMode,
  onToggleCollapsed,
  onUpdateRule,
  onRemoveRule,
}: {
  rules: VerificationRule[];
  tokens: ComplexOutputToken[];
  simpleView?: boolean;
  selectedTableName: string;
  preferredSystemType?: string;
  classifierTables: ClassifierTable[];
  validationErrors?: RuleCanvasComplexValidationErrors | null;
  triggerMode: VerificationTriggerMode;
  collapsed: boolean;
  onAddRule: () => void;
  onToggleTriggerMode: () => void;
  onToggleCollapsed: () => void;
  onUpdateRule: (ruleId: string, updater: (rule: VerificationRule) => VerificationRule) => void;
  onRemoveRule: (ruleId: string) => void;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const fieldOptions = useMemo<BuilderAutocompleteOption[]>(
    () =>
      tokens.map((token) => ({
        value: `${token.paramName}.${token.columnName}`,
        label: `${token.paramName}.${token.columnName}`,
        hint: token.tokenText,
        searchText: `${token.paramName} ${token.columnName} ${token.label}`,
      })),
    [tokens],
  );
  const selectedClassifierTable = useMemo(
    () => findPreferredClassifierTable(classifierTables, selectedTableName, preferredSystemType),
    [classifierTables, preferredSystemType, selectedTableName],
  );
  const tableOptions = useMemo<BuilderAutocompleteOption[]>(
    () =>
      sortVerificationTables(classifierTables, preferredSystemType, selectedTableName).map((table) => ({
        value: table.tableName,
        label: table.tableName,
        hint: table.systemType,
        searchText: `${table.tableName} ${table.systemType} ${table.description ?? ""}`,
      })),
    [classifierTables, preferredSystemType, selectedTableName],
  );
  const tableFieldOptions = useMemo<BuilderAutocompleteOption[]>(
    () =>
      sortClassifierTableColumns(selectedClassifierTable?.columns ?? []).map((column) => ({
        value: column.name,
        label: column.name,
        hint: `[${column.dataType}]`,
        searchText: `${column.name} ${column.dataType} ${column.description ?? ""}`,
      })),
    [selectedClassifierTable],
  );
  const operatorAutocompleteText = VERIFICATION_OPERATOR_AUTOCOMPLETE_TEXT[currentLocale];
  const groupedRules = useMemo(() => groupVerificationRules(rules), [rules]);

  const renderRuleCard = useCallback(
    (rule: VerificationRule, options?: { tone?: "and" | "or"; nested?: boolean }) => {
      const tone = options?.tone ?? "and";
      const nested = options?.nested ?? false;
      const ruleValidationError = validationErrors?.verificationRuleErrorsById?.[rule.id];
      const isTableMode = simpleView || rule.fieldSource === "TABLE";
      const resolvedTableName = isTableMode ? (rule.tableName || selectedTableName) : "";
      const activeTable = isTableMode
        ? findPreferredClassifierTable(classifierTables, resolvedTableName, preferredSystemType)
        : null;
      const resolvedFieldOptions = isTableMode
        ? sortClassifierTableColumns(activeTable?.columns ?? []).map((column) => ({
            value: column.name,
            label: column.name,
            hint: `[${column.dataType}]`,
            searchText: `${column.name} ${column.dataType} ${column.description ?? ""}`,
          }))
        : fieldOptions;
      const selectedTableColumn = isTableMode
        ? activeTable?.columns.find((column) => column.name === rule.fieldRef) ?? null
        : null;
      const selectedFieldType = isTableMode ? detectVerificationFieldValueType(selectedTableColumn) : undefined;
      const allowedOperatorValues = getVerificationOperatorValues(
        rule.fieldSource,
        selectedFieldType,
      );
      const effectiveOperator = allowedOperatorValues.includes(rule.operator)
        ? rule.operator
        : allowedOperatorValues[0] ?? "EQ";
      const operatorOptions = allowedOperatorValues.map((operatorValue) => ({
        value: operatorValue,
        label: getVerificationOperatorLabel(currentLocale, operatorValue, rule.fieldSource, selectedFieldType),
        searchText: `${operatorValue} ${getVerificationOperatorLabel("OZ", operatorValue, rule.fieldSource, selectedFieldType)} ${getVerificationOperatorLabel("RU", operatorValue, rule.fieldSource, selectedFieldType)} ${getVerificationOperatorLabel("EN", operatorValue, rule.fieldSource, selectedFieldType)}`,
      }));
      const fieldPlaceholder = isTableMode
        ? activeTable
          ? copy.verification.selectTableColumn
          : copy.verification.selectTableFirst
        : fieldOptions.length === 0
          ? copy.verification.waitForSelectResults
          : copy.verification.selectParameterColumn;
      const operatorMeta = getVerificationOperatorMeta(effectiveOperator);
      const inputMode = operatorMeta.inputMode;
      const toneClasses =
        tone === "or"
          ? "border-cyan-200/90 border-l-cyan-400/95 bg-cyan-50/50"
          : "border-violet-200/90 border-l-violet-400/95 bg-background/95";
      const switchTooltip = copy.fieldSourceTooltips[rule.fieldSource];
      const inputType = isTableMode ? getVerificationInputType(selectedFieldType) : "text";

      return (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-[20px] border border-l-[3px] p-3 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.18)] md:flex-row md:flex-wrap md:items-center",
            toneClasses,
            nested && "rounded-[18px]",
          )}
        >
          <div className="flex h-10 shrink-0 items-center gap-2 rounded-[12px] border border-border/70 bg-background/90 px-2.5 shadow-none">
            <IconHoverTooltip content={copy.fieldSourceTooltips.PARAMS}>
              <Braces className={cn("size-4", !isTableMode ? "text-violet-600" : "text-muted-foreground")} />
            </IconHoverTooltip>
            <Switch
              size="sm"
              checked={isTableMode}
              disabled={simpleView}
              onCheckedChange={(checked) =>
                onUpdateRule(rule.id, (current) => {
                  if (simpleView) {
                    return current;
                  }
                  const nextFieldSource: VerificationFieldSource = checked ? "TABLE" : "PARAMS";
                  const nextTableName =
                    nextFieldSource === "TABLE"
                      ? current.tableName || selectedTableName || tableOptions[0]?.value || ""
                      : "";
                  const nextTable =
                    nextFieldSource === "TABLE"
                      ? findPreferredClassifierTable(classifierTables, nextTableName, preferredSystemType)
                      : null;
                  const nextFieldOptions =
                    nextFieldSource === "TABLE"
                      ? sortClassifierTableColumns(nextTable?.columns ?? []).map((column) => ({
                          value: column.name,
                          label: column.name,
                          hint: `[${column.dataType}]`,
                          searchText: `${column.name} ${column.dataType} ${column.description ?? ""}`,
                        }))
                      : fieldOptions;
                  const nextFieldRef = nextFieldOptions.some((option) => option.value === current.fieldRef)
                    ? current.fieldRef
                    : nextFieldOptions[0]?.value ?? "";
                  const nextColumn =
                    nextFieldSource === "TABLE"
                      ? nextTable?.columns.find((column) => column.name === nextFieldRef) ?? null
                      : null;
                  const nextAllowedValues = getVerificationOperatorValues(
                    nextFieldSource,
                    detectVerificationFieldValueType(nextColumn),
                  );
                  const nextOperator = nextAllowedValues.includes(current.operator)
                    ? current.operator
                    : nextAllowedValues[0] ?? "EQ";

                  return {
                    ...current,
                    fieldSource: nextFieldSource,
                    tableName: nextTableName,
                    fieldRef: nextFieldRef,
                    operator: nextOperator,
                    comparisonValue: getVerificationOperatorMeta(nextOperator).inputMode === "none" ? "" : current.comparisonValue,
                    secondaryComparisonValue: getVerificationOperatorMeta(nextOperator).inputMode === "range" ? current.secondaryComparisonValue : "",
                  };
                })
              }
              aria-label={switchTooltip}
            />
            <IconHoverTooltip content={copy.fieldSourceTooltips.TABLE}>
              <Database className={cn("size-4", isTableMode ? "text-cyan-600" : "text-muted-foreground")} />
            </IconHoverTooltip>
          </div>

          {isTableMode ? (
            <div className="min-w-0 flex-[0.85]">
              <BuilderAutocompleteSelect
                value={resolvedTableName}
                onChange={(nextValue) =>
                  onUpdateRule(rule.id, (current) => {
                    const nextTable = findPreferredClassifierTable(classifierTables, nextValue, preferredSystemType);
                    const nextColumns = sortClassifierTableColumns(nextTable?.columns ?? []);
                    const nextFieldRef = nextColumns.some((column) => column.name === current.fieldRef)
                      ? current.fieldRef
                      : nextColumns[0]?.name ?? "";
                    const nextColumn = nextTable?.columns.find((column) => column.name === nextFieldRef) ?? null;
                    const nextAllowedValues = getVerificationOperatorValues(
                      "TABLE",
                      detectVerificationFieldValueType(nextColumn),
                    );
                    const nextOperator = nextAllowedValues.includes(current.operator)
                      ? current.operator
                      : nextAllowedValues[0] ?? "EQ";

                    return {
                      ...current,
                      tableName: nextValue,
                      fieldRef: nextFieldRef,
                      operator: nextOperator,
                      comparisonValue: getVerificationOperatorMeta(nextOperator).inputMode === "none" ? "" : current.comparisonValue,
                      secondaryComparisonValue: getVerificationOperatorMeta(nextOperator).inputMode === "range" ? current.secondaryComparisonValue : "",
                    };
                  })
                }
                options={tableOptions}
                placeholder={copy.verification.selectTable}
                searchPlaceholder={copy.verification.searchTable}
                emptyLabel={copy.verification.noTable}
                disabled={tableOptions.length === 0}
                hasError={Boolean(ruleValidationError?.tableName)}
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-[1.15]">
            <BuilderAutocompleteSelect
              value={rule.fieldRef}
              onChange={(nextValue) =>
                onUpdateRule(rule.id, (current) => ({
                  ...current,
                  fieldRef: nextValue,
                  operator: (() => {
                    if (current.fieldSource !== "TABLE") {
                      return current.operator;
                    }

                    const nextColumn =
                      activeTable?.columns.find((column) => column.name === nextValue) ?? null;
                    const nextAllowedValues = getVerificationOperatorValues(
                      current.fieldSource,
                      detectVerificationFieldValueType(nextColumn),
                    );

                    return nextAllowedValues.includes(current.operator)
                      ? current.operator
                      : nextAllowedValues[0] ?? "EQ";
                  })(),
                  secondaryComparisonValue: (() => {
                    if (current.fieldSource !== "TABLE") {
                      return current.secondaryComparisonValue;
                    }

                    const nextColumn =
                      activeTable?.columns.find((column) => column.name === nextValue) ?? null;
                    const nextAllowedValues = getVerificationOperatorValues(
                      current.fieldSource,
                      detectVerificationFieldValueType(nextColumn),
                    );
                    const nextOperator = nextAllowedValues.includes(current.operator)
                      ? current.operator
                      : nextAllowedValues[0] ?? "EQ";
                    return getVerificationOperatorMeta(nextOperator).inputMode === "range"
                      ? current.secondaryComparisonValue
                      : "";
                  })(),
                }))
              }
              options={resolvedFieldOptions}
              placeholder={fieldPlaceholder}
              searchPlaceholder={isTableMode ? copy.verification.searchTableColumn : copy.verification.searchColumn}
              emptyLabel={isTableMode ? copy.verification.noTableColumn : copy.verification.noColumn}
              disabled={resolvedFieldOptions.length === 0}
              hasError={Boolean(ruleValidationError?.fieldRef)}
            />
          </div>

          <div className="w-full md:w-[220px]">
            <BuilderAutocompleteSelect
              value={effectiveOperator}
              onChange={(nextValue) => {
                const nextOperator = allowedOperatorValues.includes(nextValue as VerificationRuleOperator)
                  ? (nextValue as VerificationRuleOperator)
                  : "EQ";
                onUpdateRule(rule.id, (current) => ({
                  ...current,
                  operator: nextOperator,
                  comparisonValue: getVerificationOperatorMeta(nextOperator).inputMode === "none" ? "" : current.comparisonValue,
                  secondaryComparisonValue: getVerificationOperatorMeta(nextOperator).inputMode === "range" ? current.secondaryComparisonValue : "",
                }));
              }}
              options={operatorOptions}
              placeholder={operatorAutocompleteText.placeholder}
              searchPlaceholder={operatorAutocompleteText.searchPlaceholder}
              emptyLabel={operatorAutocompleteText.emptyLabel}
            />
          </div>

          <div className="min-w-0 flex-1">
            {inputMode === "range" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  type={inputType}
                  value={rule.comparisonValue}
                  onChange={(event) =>
                    onUpdateRule(rule.id, (current) => ({
                      ...current,
                      comparisonValue: event.target.value,
                    }))
                  }
                  placeholder={getVerificationValuePlaceholder(currentLocale, selectedFieldType, inputMode)}
                  className={cn(
                    "h-10 rounded-[12px] border-border/70 bg-background/90 shadow-none",
                    ruleValidationError?.comparisonValue && "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
                <Input
                  type={inputType}
                  value={rule.secondaryComparisonValue}
                  onChange={(event) =>
                    onUpdateRule(rule.id, (current) => ({
                      ...current,
                      secondaryComparisonValue: event.target.value,
                    }))
                  }
                  placeholder={getVerificationValuePlaceholder(currentLocale, selectedFieldType, inputMode, true)}
                  className={cn(
                    "h-10 rounded-[12px] border-border/70 bg-background/90 shadow-none",
                    ruleValidationError?.secondaryComparisonValue && "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
              </div>
            ) : (
              <Input
                type={inputMode === "none" ? "text" : inputType}
                value={inputMode === "none" ? "" : rule.comparisonValue}
                onChange={(event) =>
                  onUpdateRule(rule.id, (current) => ({
                    ...current,
                    comparisonValue: event.target.value,
                  }))
                }
                placeholder={
                  inputMode === "none"
                    ? copy.verification.noValueInput
                    : isTableMode
                      ? getVerificationValuePlaceholder(currentLocale, selectedFieldType, inputMode)
                      : copy.verification.paramValuePlaceholder
                }
                disabled={inputMode === "none"}
                className={cn(
                  "h-10 rounded-[12px] border-border/70 bg-background/90 shadow-none disabled:opacity-70",
                  ruleValidationError?.comparisonValue && "border-destructive focus-visible:ring-destructive/20",
                )}
              />
            )}
          </div>

          {rules.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemoveRule(rule.id)}
              className="self-end rounded-full text-muted-foreground hover:text-rose-700 md:self-start"
              title={copy.verification.deleteRuleTitle}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      );
    },
    [
      classifierTables,
      currentLocale,
      fieldOptions,
      validationErrors,
      onRemoveRule,
      onUpdateRule,
      operatorAutocompleteText.emptyLabel,
      operatorAutocompleteText.placeholder,
      operatorAutocompleteText.searchPlaceholder,
      preferredSystemType,
      rules.length,
      selectedClassifierTable,
      selectedTableName,
      simpleView,
      tableOptions,
      tableFieldOptions,
    ],
  );

  return (
    <section
      className={cn(
        "rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] shadow-[0_18px_38px_-28px_rgba(15,23,42,0.18)]",
        validationErrors?.hasVerificationError && "border-destructive/80 ring-1 ring-destructive/10",
        "p-0",
      )}
    >
        <div className={cn("flex min-h-16 items-center justify-between gap-3 px-3.5 py-2.5", !collapsed && "border-b border-border/70")}>
          <div className="flex items-center gap-2.5">
            <CollapseToggleButton
              collapsed={collapsed}
              onClick={onToggleCollapsed}
              title={collapsed ? copy.verification.openTitle : copy.verification.collapseTitle}
            />
          <div className="flex size-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-4.5" />
          </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <p className="font-semibold text-foreground">{copy.verification.title}</p>
              <p className="text-muted-foreground">
                {copy.verification.descriptionPrefix}{" "}
                <button
                  type="button"
                  onClick={onToggleTriggerMode}
                  className={cn(
                    "cursor-pointer font-bold lowercase transition-colors",
                    triggerMode === "TRUE" ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {triggerMode === "TRUE" ? copy.verification.truthy : copy.verification.falsy}
                </button>{" "}
                {copy.verification.descriptionSuffix}
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddRule}
          className="rounded-[12px] border-border/80 bg-background/90"
        >
          <Plus className="size-4" />
          {copy.verification.addRule}
        </Button>
      </div>

      {!collapsed ? (
        <div className="space-y-3 px-3.5 pb-3.5 pt-3">
          {groupedRules.map((group, groupIndex) => {
            const hasAlternatives = group.alternatives.length > 0;

            return (
              <div key={group.id} className="relative pl-[7rem] md:pl-[7.5rem]">
                <div className="absolute left-0 top-0 bottom-0 w-[6.5rem]">
                  <div className="relative h-full">
                    {groupIndex === 0 ? (
                      <>
                        <div className="absolute left-[34px] top-[38px] z-10 size-3 rounded-full border-2 border-violet-500 bg-background shadow-[0_0_0_4px_rgba(255,255,255,0.92)]" />
                        <div className="absolute left-10 top-[44px] h-px w-[4.75rem] rounded-full bg-violet-400/90" />
                        {groupedRules.length > 1 ? (
                          <div className="absolute left-10 top-[44px] bottom-[-16px] w-px rounded-full bg-violet-400/90" />
                        ) : null}
                      </>
                    ) : null}
                    {groupIndex > 0 ? (
                      <>
                      <div className="absolute left-10 top-[-16px] h-[60px] w-px rounded-full bg-violet-400/90" />
                      <div className="absolute left-0 top-[28px] z-10 flex w-[84px] items-center justify-center">
                        <VerificationJoinerSelect
                          value={group.head.joiner}
                          onChange={(nextJoiner) =>
                            onUpdateRule(group.head.id, (current) => ({
                              ...current,
                              joiner: nextJoiner,
                            }))
                          }
                        />
                      </div>
                      <div className="absolute left-[84px] top-[44px] h-px w-[18px] rounded-full bg-violet-400/90" />
                      {groupIndex < groupedRules.length - 1 ? (
                        <div className="absolute left-10 top-[44px] bottom-[-16px] w-px rounded-full bg-violet-400/90" />
                      ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[22px] border border-violet-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,243,255,0.88))] p-3 shadow-[0_18px_36px_-30px_rgba(76,29,149,0.24)]">
                  {renderRuleCard(group.head, { tone: "and" })}

                  {hasAlternatives ? (
                    <div className="relative mt-3 rounded-[18px] border border-cyan-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.86),rgba(236,254,255,0.74))] p-3 shadow-[0_14px_30px_-28px_rgba(8,145,178,0.3)]">
                      {group.alternatives.map((alternativeRule, alternativeIndex) => (
                        <div
                          key={alternativeRule.id}
                          className={cn("relative pl-[6rem] md:pl-[6.25rem]", alternativeIndex > 0 && "mt-2 pt-2")}
                        >
                          <div className="absolute inset-y-0 left-0 w-[6rem]">
                            <div className="relative h-full">
                              {alternativeIndex > 0 ? (
                                <div className="absolute left-10 top-[-12px] h-[calc(50%+12px)] w-px rounded-full bg-cyan-400/90" />
                              ) : null}
                              <div className="absolute left-0 top-1/2 z-10 flex w-[84px] -translate-y-1/2 items-center justify-center">
                                <VerificationJoinerSelect
                                  value={alternativeRule.joiner}
                                  onChange={(nextJoiner) =>
                                    onUpdateRule(alternativeRule.id, (current) => ({
                                      ...current,
                                      joiner: nextJoiner,
                                    }))
                                  }
                                />
                              </div>
                              <div className="absolute left-[84px] top-1/2 h-px w-[12px] -translate-y-1/2 rounded-full bg-cyan-400/90" />
                              {alternativeIndex < group.alternatives.length - 1 ? (
                                <div className="absolute left-10 top-1/2 bottom-[-12px] w-px rounded-full bg-cyan-400/90" />
                              ) : null}
                            </div>
                          </div>

                          {renderRuleCard(alternativeRule, { tone: "or", nested: true })}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function WarningMessagesPanel({
  messages,
  phoneExtension,
  tokens,
  validationErrors,
  collapsed,
  onMessageChange,
  onPhoneExtensionChange,
  onToggleCollapsed,
}: {
  messages: Partial<Record<LocaleCode, string>>;
  phoneExtension: string;
  tokens: ComplexOutputToken[];
  validationErrors?: RuleCanvasComplexValidationErrors | null;
  collapsed: boolean;
  onMessageChange: (locale: LocaleCode, value: string) => void;
  onPhoneExtensionChange: (value: string) => void;
  onToggleCollapsed: () => void;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const warningMessageFields = getWarningMessageFields(currentLocale);

  return (
    <section
      className={cn(
        "rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] shadow-[0_18px_38px_-28px_rgba(15,23,42,0.18)]",
        validationErrors?.hasWarningMessagesError && "border-destructive/80 ring-1 ring-destructive/10",
        "p-0",
      )}
    >
      <div className={cn("flex min-h-16 flex-col gap-2.5 px-3.5 py-2.5 md:flex-row md:items-center", !collapsed && "border-b border-border/70")}>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <CollapseToggleButton
            collapsed={collapsed}
            onClick={onToggleCollapsed}
            title={collapsed ? copy.warning.openTitle : copy.warning.collapseTitle}
          />
          <BellRing className="size-4 shrink-0 text-amber-600" />
          <p className="truncate text-sm font-semibold text-foreground">{copy.warning.title}</p>
        </div>
        <div className={cn("min-w-0 md:ml-auto md:w-full md:max-w-[680px]", collapsed && "hidden")}>
          <PhoneExtensionChipInput
            value={phoneExtension}
            onChange={onPhoneExtensionChange}
            placeholder={copy.warning.phonePlaceholder}
            hasError={Boolean(validationErrors?.phoneExtension)}
            className="w-full"
          />
        </div>
      </div>

      {!collapsed ? (
        <div className="grid gap-3 px-3.5 pb-3.5 pt-3 md:grid-cols-2">
          {warningMessageFields.map((field) => (
            <WarningMessageField
              key={field.key}
              fieldKey={field.key}
              placeholder={field.placeholder}
              value={messages[field.key] ?? ""}
              tokens={tokens}
              hasError={Boolean(validationErrors?.warningMessageErrorsByLocale?.[field.key])}
              onChange={(nextValue) => onMessageChange(field.key, nextValue)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getConditionTitle(condition: ComplexCondition, locale: LocaleCode) {
  const copy = getComplexEditorCopy(locale);
  return condition.orderNumber === 1 ? copy.conditions.initial : copy.conditions.additional;
}

function getTraceStatusTone(status: SqlQueryExecutionStatusResponse["status"]) {
  if (status === "COMPLETED") {
    return {
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    icon: AlertTriangle,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
}

function formatTraceValue(value: string | null) {
  return value === null ? "null" : value;
}

function TraceResultPreviewTable({
  result,
}: {
  result: ComplexTraceResultPreview;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(result.rows.length / TRACE_RESULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = result.rows.slice((safePage - 1) * TRACE_RESULT_PAGE_SIZE, safePage * TRACE_RESULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [result]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="overflow-hidden rounded-[16px] border border-border/70 bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{result.totalRows} {copy.trace.rows}</span>
          {result.truncated ? <span className="rounded-full border border-border/70 bg-background px-2 py-0.5">{copy.trace.truncated}</span> : null}
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {copy.trace.page} {safePage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-[10px] px-2.5 text-[11px]"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
            >
              {copy.trace.previous}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-[10px] px-2.5 text-[11px]"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
            >
              {copy.trace.next}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-10 border-b border-r border-border bg-background px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                №
              </th>
              {result.columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-r border-border bg-background px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground last:border-r-0"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIndex) => {
              const absoluteRowIndex = (safePage - 1) * TRACE_RESULT_PAGE_SIZE + rowIndex;

              return (
              <tr key={`${absoluteRowIndex}-${row.join("|")}`}>
                <td className="sticky left-0 border-b border-r border-border bg-background px-3 py-2 font-medium text-foreground">
                  {absoluteRowIndex + 1}
                </td>
                {row.map((cell, columnIndex) => (
                  <td
                    key={`${absoluteRowIndex}-${columnIndex}`}
                    className="max-w-[240px] border-b border-r border-border px-3 py-2 font-mono text-xs text-foreground last:border-r-0"
                  >
                    <span className="block truncate" title={formatTraceValue(cell)}>
                      {formatTraceValue(cell)}
                    </span>
                  </td>
                ))}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplexExecutionHistoryModal({
  trace,
  onClose,
}: {
  trace: ComplexExecutionTrace;
  onClose: () => void;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/32 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex h-[min(88vh,920px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,249,255,0.93))] shadow-[0_30px_90px_-34px_rgba(15,23,42,0.5)]">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                {copy.trace.historyTitle}
              </span>
              <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
                {trace.targetParameterName}
              </span>
            </div>
          </div>

          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-6 py-6">
            {trace.steps.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-background/80 px-6 py-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border/70 bg-muted/30">
                  <History className="size-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{copy.trace.emptyTitle}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {copy.trace.emptyDescription}
                </p>
              </div>
            ) : trace.steps.map((step, stepIndex) => {
              const tone = getTraceStatusTone(step.status);
              const StatusIcon = tone.icon;

              return (
                <div key={step.conditionId} className="relative pl-16">
                  {stepIndex < trace.steps.length - 1 ? (
                    <div className="absolute left-[27px] top-12 bottom-[-26px] w-px bg-border/80" />
                  ) : null}
                  <div className="absolute left-0 top-0 flex size-[54px] items-center justify-center rounded-full border border-border/70 bg-background shadow-sm">
                    <span className="text-sm font-semibold text-foreground">{step.orderNumber}</span>
                  </div>
                  <div className="overflow-hidden rounded-[24px] border border-border/70 bg-white/88 shadow-[0_20px_44px_-32px_rgba(15,23,42,0.22)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/24 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
                            {step.conditionTitle}
                          </span>
                          <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                            {step.parameterName}
                          </span>
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", tone.className)}>
                            <StatusIcon className="size-3.5" />
                            {step.status === "COMPLETED" ? copy.trace.completed : copy.trace.failed}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Server className="size-3.5" />
                            {step.serverName}
                          </span>
                          <span>{step.logMessage}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-5">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{copy.trace.originalQuery}</p>
                        <pre className="overflow-auto rounded-[18px] border border-border/70 bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
                          {step.originalSql || copy.trace.emptyQuery}
                        </pre>
                      </div>

                      <div className="space-y-4">
                        {step.resolvedQueries.map((query, queryIndex) => (
                          <div key={`${step.conditionId}-${queryIndex}`} className="rounded-[20px] border border-border/70 bg-background/92 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  <GitBranch className="size-3.5" />
                                  {copy.trace.executedQuery(queryIndex + 1)}
                                </span>
                                {query.bindings.length > 0 ? (
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                    {copy.trace.boundParams(query.bindings.length)}
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-xs text-muted-foreground">{query.serverName}</span>
                            </div>

                            {query.bindings.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {query.bindings.map((binding) => (
                                  <div
                                    key={`${query.sql}-${binding.tokenText}-${binding.valueLiteral}`}
                                    className="rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 text-xs text-foreground"
                                  >
                                    <span className="font-semibold text-sky-700">{binding.tokenText}</span>
                                    <span className="mx-1.5 text-muted-foreground">→</span>
                                    <span className="font-mono">{binding.valueLiteral}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <pre className="mt-3 overflow-auto rounded-[16px] border border-border/70 bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
                              {query.sql}
                            </pre>

                            {query.errorMessage ? (
                              <div className="mt-3 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {query.errorMessage}
                              </div>
                            ) : query.result ? (
                              <div className="mt-3">
                                <TraceResultPreviewTable result={query.result} />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {step.errorMessage ? (
                        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {step.errorMessage}
                        </div>
                      ) : step.mergedResult && step.resolvedQueries.length > 1 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{copy.trace.finalSummary}</p>
                          <TraceResultPreviewTable result={step.mergedResult} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>,
    document.body,
  );
}

function ComplexField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Database;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </Label>
      {children}
    </div>
  );
}

function ComplexConditionCardContent({
  condition,
  conditionTitle,
  isFirstCondition,
  collapsed,
  validationError,
  serverOptions,
  serversLoading,
  classifierTables,
  availableTokens,
  pendingInsertion,
  onUpdateCondition,
  onChangeServerName,
  onRequestTokenInsert,
  onInsertionHandled,
  onRunCondition,
  onCancelConditionRun,
  onRemoveCondition,
  onEditorFocusChange,
  executionTrace,
  onOpenExecutionHistory,
  onToggleCollapsed,
  headerDragHandleProps,
}: ComplexConditionCardContentProps) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const groupedTokens = useMemo(() => groupTokensByParamName(availableTokens), [availableTokens]);
  const sqlEditorRef = useRef<SqlCodeEditorHandle | null>(null);
  const hasConditionError = Boolean(validationError?.serverName || validationError?.sqlQuery);

  const previousResultsAction = availableTokens.length > 0 ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px] border-border/80 bg-background/90"
          >
            <Braces className="size-4" />
            {copy.conditions.previousResults}
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-[280px]">
        {groupedTokens.map(([paramName, tokens]) => (
          <DropdownMenuGroup key={paramName}>
            <DropdownMenuLabel>{paramName}</DropdownMenuLabel>
            {tokens.map((token) => (
              <DropdownMenuItem
                key={token.id}
                onClick={() => onRequestTokenInsert(condition.id, token.tokenText)}
                className="flex items-start"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium text-foreground">{token.label}</span>
                  <span className="text-xs text-muted-foreground">{token.tokenText}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <div>
      <div
        className={cn(
          "flex min-h-16 justify-between gap-3 px-3.5 py-3",
          collapsed ? "items-center" : "items-start border-b border-border/70",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
            <CollapseToggleButton
              collapsed={collapsed}
              onClick={() => onToggleCollapsed(condition.id)}
              title={collapsed ? copy.conditions.open(conditionTitle) : copy.conditions.collapse(conditionTitle)}
            />
          <div
            onPointerDown={headerDragHandleProps?.onPointerDown}
            title={headerDragHandleProps?.title}
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-2",
              headerDragHandleProps?.onPointerDown &&
                "cursor-grab select-none rounded-[10px] px-1 active:cursor-grabbing hover:bg-muted/45",
              headerDragHandleProps?.className,
            )}
          >
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-emerald-700">
              {conditionTitle}
            </span>
            <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
              #{condition.orderNumber}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {previousResultsAction}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onUpdateCondition(condition.id, (current) => ({
                ...current,
                sqlQuery: formatSqlScript(current.sqlQuery),
              }))
            }
            className="rounded-[10px] border-border/80 bg-background/90"
          >
            {copy.conditions.format}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sqlEditorRef.current?.expand()}
            className="rounded-[10px] border-border/80 bg-background/90"
          >
            <Maximize2 className="size-4" />
            {copy.conditions.expand}
          </Button>
          {!isFirstCondition ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenExecutionHistory(condition.id)}
              className="rounded-[10px] border-border/80 bg-background/90"
            >
              <History className="size-4" />
              {copy.conditions.process}
              {executionTrace ? (
                <span className="rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {executionTrace.steps.length}
                </span>
              ) : (
                <Eye className="size-3.5 opacity-70" />
              )}
            </Button>
          ) : null}
          {!isFirstCondition ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemoveCondition(condition.id)}
              className="rounded-[10px] border-rose-200 bg-rose-50/80 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
            >
              <Trash2 className="size-4" />
              {copy.conditions.delete}
            </Button>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <div className="grid items-stretch xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-3 bg-muted/18 p-3.5 xl:border-r xl:border-border/70">
            <ComplexField label={copy.conditions.parameterName} icon={Database}>
              <Input value={`param${condition.orderNumber}`} readOnly className="bg-muted/40 font-semibold" />
            </ComplexField>

            <ComplexField label={copy.conditions.serverName} icon={Server}>
              <SqlExecutionServerAutocomplete
                value={condition.serverName}
                onChange={(value) => onChangeServerName(condition.id, value)}
                options={serverOptions}
                placeholder={
                  serversLoading ? "Serverlar yuklanmoqda..." : serverOptions.length === 0 ? "Server topilmadi" : "Serverni tanlang"
                }
                disabled={serversLoading || serverOptions.length === 0}
                hasError={Boolean(validationError?.serverName)}
              />
            </ComplexField>

            <ComplexField label="Tartib raqami">
              <Input value={String(condition.orderNumber)} readOnly className="bg-muted/40 font-semibold" />
            </ComplexField>
          </div>

          <div className="min-w-0 border-t border-border/70 xl:border-t-0">
            <SqlCodeEditor
              ref={sqlEditorRef}
              value={condition.sqlQuery}
              onChange={(nextValue) =>
                onUpdateCondition(condition.id, (current) => ({
                  ...current,
                  sqlQuery: nextValue,
                }))
              }
              placeholder="select * from ..."
              headerLabel={null}
              minHeightClassName="h-[240px]"
              showSelectedColumnsPanel
              pendingInsertion={pendingInsertion}
              onInsertionHandled={(requestId) => onInsertionHandled(condition.id, requestId)}
              getSelectedColumnDragText={(column: SqlProjectionColumn) => `{{${condition.parameterName}.${column.displayName}}}`}
              selectedColumnDragContextId={condition.id}
              disallowSelectedColumnSelfDrop
              hideInlineHeader
              queryExecutionContext={{
                serverName: condition.serverName,
                serverOptions,
                onServerNameChange: (nextServerName) => onChangeServerName(condition.id, nextServerName),
                classifierTables,
                runExecution: ({ sql, serverName }) => onRunCondition(condition.id, serverName, sql),
                cancelExecution: (execution) => onCancelConditionRun(condition.id, execution),
              }}
              onEditorFocusChange={(focused) => onEditorFocusChange(condition.id, focused)}
              className={cn(
                "h-[240px] rounded-none bg-transparent shadow-none",
                hasConditionError ? "border border-destructive" : "border-0",
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableComplexConditionCard({
  condition,
  conditionTitle,
  isFirstCondition,
  collapsed,
  validationError,
  serverOptions,
  serversLoading,
  classifierTables,
  availableTokens,
  pendingInsertion,
  onUpdateCondition,
  onChangeServerName,
  onRequestTokenInsert,
  onInsertionHandled,
  onRunCondition,
  onCancelConditionRun,
  onRemoveCondition,
  onEditorFocusChange,
  executionTrace,
  onOpenExecutionHistory,
  onToggleCollapsed,
  isDragging,
  onDragStateChange,
  motionDisabled,
}: SortableComplexConditionCardProps) {
  const dragControls = useDragControls();
  const hasConditionError = Boolean(validationError?.serverName || validationError?.sqlQuery);

  return (
    <Reorder.Item
      as="div"
      value={condition.id}
      drag={motionDisabled ? false : "y"}
      dragListener={false}
      dragControls={dragControls}
      layout={motionDisabled ? undefined : "position"}
      onDragStart={() => onDragStateChange(condition.id)}
      onDragEnd={() => onDragStateChange(null)}
      whileDrag={{
        scale: 1.012,
        boxShadow: "0 28px 58px -28px rgba(15,23,42,0.34)",
      }}
      transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.8 }}
      className={cn(
        "sql-editor-transform-safe relative overflow-hidden rounded-[20px] border border-border/70 bg-background/96 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.22)]",
        hasConditionError && "border-destructive/80 ring-1 ring-destructive/10",
        isDragging && "z-30 ring-1 ring-primary/20 shadow-[0_28px_58px_-28px_rgba(15,23,42,0.34)]",
      )}
    >
      <ComplexConditionCardContent
        condition={condition}
        conditionTitle={conditionTitle}
        isFirstCondition={isFirstCondition}
        collapsed={collapsed}
        validationError={validationError}
        serverOptions={serverOptions}
        serversLoading={serversLoading}
        classifierTables={classifierTables}
        availableTokens={availableTokens}
        pendingInsertion={pendingInsertion}
        onUpdateCondition={onUpdateCondition}
        onChangeServerName={onChangeServerName}
        onRequestTokenInsert={onRequestTokenInsert}
        onInsertionHandled={onInsertionHandled}
        onRunCondition={onRunCondition}
        onCancelConditionRun={onCancelConditionRun}
        onRemoveCondition={onRemoveCondition}
        onEditorFocusChange={onEditorFocusChange}
        executionTrace={executionTrace}
        onOpenExecutionHistory={onOpenExecutionHistory}
        onToggleCollapsed={onToggleCollapsed}
        headerDragHandleProps={{
          onPointerDown: (event) => {
            event.preventDefault();
            dragControls.start(event, { snapToCursor: false });
          },
          title: "Shart joyini surish",
        }}
      />
    </Reorder.Item>
  );
}

export const RuleCanvasComplexEditor = forwardRef<RuleCanvasComplexEditorHandle, RuleCanvasComplexEditorProps>(
function RuleCanvasComplexEditor({
  canvas,
  simpleView = false,
  onCanvasChange,
  messages,
  phoneExtension,
  onMessageChange,
  onPhoneExtensionChange,
  onAllSectionsCollapsedChange,
  selectedTableName = "",
  preferredSystemType,
  validationErrors,
  className,
}: RuleCanvasComplexEditorProps, ref) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const copy = getComplexEditorCopy(currentLocale);
  const [draggingConditionId, setDraggingConditionId] = useState<string | null>(null);
  const [activeEditorConditionId, setActiveEditorConditionId] = useState<string | null>(null);
  const [collapsedConditionIds, setCollapsedConditionIds] = useState<Record<string, boolean>>({});
  const [verificationCollapsed, setVerificationCollapsed] = useState(false);
  const [warningMessagesCollapsed, setWarningMessagesCollapsed] = useState(false);
  const [pendingInsertions, setPendingInsertions] = useState<Record<string, SqlCodeEditorInsertionRequest | null>>({});
  const [executionHistoryByConditionId, setExecutionHistoryByConditionId] = useState<Record<string, ComplexExecutionTrace | null>>({});
  const [historyModalConditionId, setHistoryModalConditionId] = useState<string | null>(null);
  const activeExecutionIdByConditionIdRef = useRef<Record<string, string | null>>({});
  const cancelRequestedByConditionIdRef = useRef<Record<string, boolean>>({});
  const serversQuery = useQuery({
    queryKey: classifierQueryKeys.servers,
    queryFn: getClassifierServers,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const tablesQuery = useQuery({
    queryKey: classifierQueryKeys.tables,
    queryFn: getClassifierTables,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });

  const servers = useMemo(() => serversQuery.data ?? [], [serversQuery.data]);
  const classifierTables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  const conditions = useMemo(() => normalizeComplexConditions(canvas.complexConditions), [canvas.complexConditions]);
  const verificationRules = useMemo(() => normalizeVerificationRules(canvas.verificationRules), [canvas.verificationRules]);
  const verificationTriggerMode = useMemo(
    () => normalizeVerificationTriggerMode(canvas.verificationTriggerMode),
    [canvas.verificationTriggerMode],
  );

  const commitCanvasState = useCallback((patch: Partial<Record<string, unknown>>) => {
    onCanvasChange({
      ...canvas,
      complexConditions:
        (patch.complexConditions as ComplexCondition[] | undefined) ??
        (conditions.length > 0 ? resequenceConditions(conditions) : simpleView ? [] : [createEmptyCondition(1)]),
      verificationRules:
        (patch.verificationRules as VerificationRule[] | undefined) ??
        (verificationRules.length > 0 ? verificationRules : [createEmptyVerificationRule()]),
      verificationTriggerMode:
        (patch.verificationTriggerMode as VerificationTriggerMode | undefined) ?? verificationTriggerMode,
    });
  }, [canvas, conditions, onCanvasChange, simpleView, verificationRules, verificationTriggerMode]);

  const commitConditions = useCallback((nextConditions: ComplexCondition[]) => {
    commitCanvasState({
      complexConditions: resequenceConditions(nextConditions),
    });
  }, [commitCanvasState]);

  const commitVerificationRules = useCallback((nextRules: VerificationRule[]) => {
    commitCanvasState({
      verificationRules: nextRules.map((rule, index) => ({
        ...rule,
        joiner: index === 0 ? "AND" : rule.joiner,
      })),
    });
  }, [commitCanvasState]);

  useEffect(() => {
    if ((simpleView || conditions.length > 0) && verificationRules.length > 0) {
      return;
    }

    commitCanvasState({
      complexConditions: conditions.length > 0 ? resequenceConditions(conditions) : simpleView ? [] : [createEmptyCondition(1)],
      verificationRules: verificationRules.length > 0 ? verificationRules : [createEmptyVerificationRule()],
    });
  }, [commitCanvasState, conditions, simpleView, verificationRules]);

  const renderedConditions = simpleView ? [] : conditions.length > 0 ? conditions : [createEmptyCondition(1)];
  const renderedVerificationRules = verificationRules.length > 0 ? verificationRules : [createEmptyVerificationRule()];
  const firstCondition = renderedConditions[0];
  const additionalConditions = renderedConditions.slice(1);
  const areVisibleConditionsCollapsed =
    renderedConditions.length === 0 || renderedConditions.every((condition) => collapsedConditionIds[condition.id] ?? false);
  const allSectionsCollapsed = areVisibleConditionsCollapsed && verificationCollapsed && warningMessagesCollapsed;
  const additionalConditionIds = useMemo(() => additionalConditions.map((condition) => condition.id), [additionalConditions]);
  const conditionsById = useMemo(
    () => new Map(renderedConditions.map((condition) => [condition.id, condition])),
    [renderedConditions],
  );
  const availableTokensByConditionId = useMemo(() => {
    const tokensByConditionId = new Map<string, ComplexOutputToken[]>();

    renderedConditions.forEach((condition, conditionIndex) => {
      const tokens = renderedConditions.slice(0, conditionIndex).flatMap((previousCondition) => {
        const projection = extractSelectProjectionColumns(previousCondition.sqlQuery);
        if (!projection.isSelectQuery) {
          return [];
        }

        return projection.columns.map((column) => ({
          id: `${condition.id}-${previousCondition.parameterName}-${column.displayName}`,
          paramName: previousCondition.parameterName,
          columnName: column.displayName,
          label: `${previousCondition.parameterName}.${column.displayName}`,
          tokenText: `{{${previousCondition.parameterName}.${column.displayName}}}`,
        }));
      });

      tokensByConditionId.set(condition.id, tokens);
    });

    return tokensByConditionId;
  }, [renderedConditions]);
  const warningMessageTokens = useMemo(
    () =>
      renderedConditions.flatMap((condition) => {
        const projection = extractSelectProjectionColumns(condition.sqlQuery);
        if (!projection.isSelectQuery) {
          return [];
        }

        return projection.columns.map((column) => ({
          id: `warning-${condition.parameterName}-${column.displayName}`,
          paramName: condition.parameterName,
          columnName: column.displayName,
          label: `${condition.parameterName}.${column.displayName}`,
          tokenText: `{{${condition.parameterName}.${column.displayName}}}`,
        }));
      }),
    [renderedConditions],
  );

  useEffect(() => {
    setCollapsedConditionIds((current) => {
      const next: Record<string, boolean> = {};
      let changed = Object.keys(current).length !== renderedConditions.length;

      renderedConditions.forEach((condition) => {
        const preserved = current[condition.id] ?? false;
        next[condition.id] = preserved;
        if (current[condition.id] !== preserved) {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [renderedConditions]);

  const addCondition = () => {
    if (simpleView) {
      return;
    }
    commitConditions([...renderedConditions, createEmptyCondition(renderedConditions.length + 1)]);
  };

  const toggleAllSectionsCollapsed = useCallback(() => {
    const nextCollapsedState = !allSectionsCollapsed;
    if (renderedConditions.length > 0) {
      setCollapsedConditionIds(
        Object.fromEntries(renderedConditions.map((condition) => [condition.id, nextCollapsedState])) as Record<string, boolean>,
      );
    }
    setVerificationCollapsed(nextCollapsedState);
    setWarningMessagesCollapsed(nextCollapsedState);
  }, [allSectionsCollapsed, renderedConditions]);

  const toggleConditionCollapsed = useCallback((conditionId: string) => {
    setCollapsedConditionIds((current) => ({
      ...current,
      [conditionId]: !current[conditionId],
    }));
  }, []);

  useEffect(() => {
    onAllSectionsCollapsedChange?.(allSectionsCollapsed);
  }, [allSectionsCollapsed, onAllSectionsCollapsedChange]);

  useEffect(() => {
    if (!validationErrors) {
      return;
    }

    if (validationErrors.hasVerificationError) {
      setVerificationCollapsed(false);
    }

    if (validationErrors.hasWarningMessagesError) {
      setWarningMessagesCollapsed(false);
    }

    if (!validationErrors.conditionErrorsById) {
      return;
    }

    setCollapsedConditionIds((current) => {
      let changed = false;
      const next = { ...current };

      Object.keys(validationErrors.conditionErrorsById ?? {}).forEach((conditionId) => {
        if (next[conditionId]) {
          next[conditionId] = false;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [validationErrors]);

  useEffect(() => {
    if (!simpleView) {
      return;
    }

    const nextRules = renderedVerificationRules.map((rule) =>
      coerceVerificationRuleToTableMode(rule, selectedTableName, classifierTables, preferredSystemType),
    );

    if (JSON.stringify(nextRules) === JSON.stringify(renderedVerificationRules)) {
      return;
    }

    commitVerificationRules(nextRules);
  }, [classifierTables, commitVerificationRules, preferredSystemType, renderedVerificationRules, selectedTableName, simpleView]);

  const addVerificationRule = useCallback(() => {
    commitVerificationRules([
      ...renderedVerificationRules,
      simpleView
        ? coerceVerificationRuleToTableMode(
            createEmptyVerificationRule(renderedVerificationRules.length === 0 ? "AND" : "AND"),
            selectedTableName,
            classifierTables,
            preferredSystemType,
          )
        : createEmptyVerificationRule(renderedVerificationRules.length === 0 ? "AND" : "AND"),
    ]);
  }, [classifierTables, commitVerificationRules, preferredSystemType, renderedVerificationRules, selectedTableName, simpleView]);

  const updateVerificationRule = useCallback((ruleId: string, updater: (rule: VerificationRule) => VerificationRule) => {
    commitVerificationRules(
      renderedVerificationRules.map((rule) => (rule.id === ruleId ? updater(rule) : rule)),
    );
  }, [commitVerificationRules, renderedVerificationRules]);

  const removeVerificationRule = useCallback((ruleId: string) => {
    const nextRules = renderedVerificationRules.filter((rule) => rule.id !== ruleId);
    commitVerificationRules(
      nextRules.length > 0
        ? nextRules
        : [
            simpleView
              ? coerceVerificationRuleToTableMode(
                  createEmptyVerificationRule(),
                  selectedTableName,
                  classifierTables,
                  preferredSystemType,
                )
              : createEmptyVerificationRule(),
          ],
    );
  }, [classifierTables, commitVerificationRules, preferredSystemType, renderedVerificationRules, selectedTableName, simpleView]);

  const toggleVerificationTriggerMode = useCallback(() => {
    commitCanvasState({
      verificationTriggerMode: verificationTriggerMode === "TRUE" ? "FALSE" : "TRUE",
    });
  }, [commitCanvasState, verificationTriggerMode]);

  const handleEditorFocusChange = useCallback((conditionId: string, focused: boolean) => {
    setActiveEditorConditionId((current) => {
      if (focused) {
        return conditionId;
      }

      return current === conditionId ? null : current;
    });
  }, []);

  const openExecutionHistory = useCallback((conditionId: string) => {
    setHistoryModalConditionId(conditionId);
  }, []);

  const closeExecutionHistory = useCallback(() => {
    setHistoryModalConditionId(null);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      addCondition,
      toggleAllSectionsCollapsed,
    }),
    [addCondition, toggleAllSectionsCollapsed],
  );

  const updateCondition = (conditionId: string, updater: (condition: ComplexCondition) => ComplexCondition) => {
    commitConditions(renderedConditions.map((condition) => (condition.id === conditionId ? updater(condition) : condition)));
  };

  const changeServerName = (conditionId: string, serverName: string) => {
    const initialConditionId = renderedConditions[0]?.id;

    commitConditions(
      renderedConditions.map((condition) => {
        if (condition.id === conditionId) {
          return {
            ...condition,
            serverName,
          };
        }

        if (initialConditionId && condition.id === initialConditionId) {
          return {
            ...condition,
            serverName,
          };
        }

        return condition;
      }),
    );
  };

  const requestTokenInsert = (conditionId: string, text: string) => {
    setPendingInsertions((current) => ({
      ...current,
      [conditionId]: {
        id: createUniqueId("sql-token"),
        text,
      },
    }));
  };

  const markTokenInsertionHandled = (conditionId: string, requestId: string) => {
    setPendingInsertions((current) => {
      if (current[conditionId]?.id !== requestId) {
        return current;
      }

      return {
        ...current,
        [conditionId]: null,
      };
    });
  };

  const isConditionCancellationRequested = useCallback(
    (conditionId: string) => Boolean(cancelRequestedByConditionIdRef.current[conditionId]),
    [],
  );

  const buildCancelledExecution = useCallback(
    (serverName: string) => {
      const stoppedByUserMessage = getStoppedByUserMessage(currentLocale);
      return createSyntheticExecution(
        serverName,
        "CANCELLED",
        stoppedByUserMessage,
        null,
        stoppedByUserMessage,
        {
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        },
      );
    },
    [currentLocale],
  );

  const runCondition = useCallback(
    async (conditionId: string, serverName: string, sqlQueryOverride?: string) => {
      const overallStartedAt = new Date().toISOString();
      const targetIndex = renderedConditions.findIndex((condition) => condition.id === conditionId);
      if (targetIndex < 0) {
        return createSyntheticExecution(serverName, "FAILED", copy.execution.queryFailed, null, copy.execution.conditionNotFound, {
          createdAt: overallStartedAt,
          startedAt: overallStartedAt,
          finishedAt: new Date().toISOString(),
        });
      }

      const targetCondition = renderedConditions[targetIndex];
      cancelRequestedByConditionIdRef.current[conditionId] = false;
      activeExecutionIdByConditionIdRef.current[conditionId] = null;
      const executionMap = new Map<string, SqlQueryExecutionResult>();
      const traceSteps: ComplexTraceStep[] = [];

      const persistExecutionTrace = (
        status: SqlQueryExecutionStatusResponse["status"],
        logMessage: string,
        errorMessage: string | null,
      ) => {
        setExecutionHistoryByConditionId((current) => ({
          ...current,
          [targetCondition.id]: {
            targetConditionId: targetCondition.id,
            targetParameterName: targetCondition.parameterName,
            targetOrderNumber: targetCondition.orderNumber,
            status,
            logMessage,
            errorMessage,
            createdAt: overallStartedAt,
            finishedAt: new Date().toISOString(),
            steps: traceSteps,
          },
        }));
      };

      const buildRowContexts = (paramName: string) => {
        const result = executionMap.get(paramName);
        if (!result) {
          throw new Error(copy.execution.previousResultMissing(paramName));
        }

        if (result.rows.length === 0) {
          throw new Error(copy.execution.noRowsForParam(paramName));
        }

        return result.rows.map((row) => {
          const rowMap = new Map<string, string | null>();
          result.columns.forEach((column, index) => {
            rowMap.set(normalizeColumnKey(column), row[index] ?? null);
          });
          return rowMap;
        });
      };

      const substituteSqlTokens = (sourceSql: string, rowContexts: Map<string, Map<string, string | null>>) =>
        sourceSql.replace(COMPLEX_QUERY_TOKEN_REGEX, (_match, rawParamName: string, rawColumnName: string) => {
          const paramContext = rowContexts.get(rawParamName.toLowerCase());
          if (!paramContext) {
            throw new Error(copy.execution.tokenValueMissing(rawParamName, rawColumnName));
          }

          const normalizedColumnName = normalizeColumnKey(rawColumnName);
          if (!paramContext.has(normalizedColumnName)) {
            throw new Error(copy.execution.tokenColumnMissing(rawParamName, rawColumnName));
          }

          return toSqlLiteral(paramContext.get(normalizedColumnName) ?? null);
        });

      const buildResolvedQueries = (sourceSql: string) => {
        const tokenReferences = [...sourceSql.matchAll(COMPLEX_QUERY_TOKEN_REGEX)].map((match) => ({
          paramName: match[1]?.toLowerCase() ?? "",
          columnName: match[2] ?? "",
        }));
        const referencedParams = tokenReferences.map((reference) => reference.paramName);
        const uniqueParams = [...new Set(referencedParams.filter((paramName) => paramName.length > 0))];

        if (uniqueParams.length === 0) {
          return [
            {
              sql: sourceSql,
              bindings: [] as ComplexTraceTokenBinding[],
            },
          ];
        }

        const contexts = uniqueParams.map((paramName) => ({
          paramName,
          rows: buildRowContexts(paramName),
        }));

        const combinations: Array<Map<string, Map<string, string | null>>> = [];

        const walk = (index: number, current: Map<string, Map<string, string | null>>) => {
          if (index >= contexts.length) {
            combinations.push(new Map(current));
            return;
          }

          const context = contexts[index];
          context.rows.forEach((row) => {
            current.set(context.paramName, row);
            walk(index + 1, current);
            current.delete(context.paramName);
          });
        };

        walk(0, new Map());

        const resolvedBySql = new Map<string, { sql: string; bindings: ComplexTraceTokenBinding[] }>();

        combinations.forEach((context) => {
          const resolvedSql = substituteSqlTokens(sourceSql, context);
          if (resolvedBySql.has(resolvedSql)) {
            return;
          }

          const bindings = tokenReferences.map((reference) => {
            const rowContext = context.get(reference.paramName);
            const normalizedColumnName = normalizeColumnKey(reference.columnName);
            const value = rowContext?.get(normalizedColumnName) ?? null;

            return {
              tokenText: `{{${reference.paramName}.${reference.columnName}}}`,
              paramName: reference.paramName,
              columnName: reference.columnName,
              value,
              valueLiteral: toSqlLiteral(value),
            } satisfies ComplexTraceTokenBinding;
          });

          resolvedBySql.set(resolvedSql, {
            sql: resolvedSql,
            bindings,
          });
        });

        return [...resolvedBySql.values()];
      };

      let activeCondition: ComplexCondition | null = null;
      let activeOriginalSql = "";

      try {
        for (const condition of renderedConditions.slice(0, targetIndex + 1)) {
          if (isConditionCancellationRequested(conditionId)) {
            const cancelledExecution = buildCancelledExecution(condition.serverName || serverName);
            persistExecutionTrace(cancelledExecution.status, cancelledExecution.logMessage, cancelledExecution.errorMessage);
            return cancelledExecution;
          }
          activeCondition = condition;
          const effectiveSqlQuery =
            condition.id === conditionId && typeof sqlQueryOverride === "string"
              ? sqlQueryOverride
              : condition.sqlQuery;
          activeOriginalSql = effectiveSqlQuery;
          const resolvedQueries = buildResolvedQueries(effectiveSqlQuery);
          const resolvedResults: SqlQueryExecutionResult[] = [];
          const traceResolvedQueries: ComplexTraceResolvedQuery[] = [];

          for (const resolvedQuery of resolvedQueries) {
            if (isConditionCancellationRequested(conditionId)) {
              const cancelledExecution = buildCancelledExecution(condition.serverName || serverName);
              persistExecutionTrace(cancelledExecution.status, cancelledExecution.logMessage, cancelledExecution.errorMessage);
              return cancelledExecution;
            }

            const execution = await executeSqlAndWait(
              resolvedQuery.sql,
              condition.serverName || serverName,
              currentLocale,
              {
                onStart: (executionId) => {
                  activeExecutionIdByConditionIdRef.current[conditionId] = executionId;
                },
                onFinish: () => {
                  activeExecutionIdByConditionIdRef.current[conditionId] = null;
                },
                isCancelled: () => isConditionCancellationRequested(conditionId),
              },
            );
            const normalizedServerName = condition.serverName || serverName;
            if (execution.status !== "COMPLETED" || !execution.result) {
              const failedExecution = {
                ...execution,
                serverName: normalizedServerName,
                errorMessage:
                  execution.status === "CANCELLED"
                    ? execution.errorMessage ?? getStoppedByUserMessage(currentLocale)
                    : execution.errorMessage ?? copy.execution.paramQueryFailed(condition.parameterName),
                logMessage:
                  execution.status === "CANCELLED"
                    ? execution.logMessage || getStoppedByUserMessage(currentLocale)
                    : execution.logMessage || copy.execution.queryFailed,
              } satisfies SqlQueryExecutionStatusResponse;

              traceResolvedQueries.push({
                sql: resolvedQuery.sql,
                bindings: resolvedQuery.bindings,
                result: null,
                status: failedExecution.status,
                logMessage: failedExecution.logMessage,
                errorMessage: failedExecution.errorMessage,
                serverName: normalizedServerName,
              });

              traceSteps.push({
                conditionId: condition.id,
                parameterName: condition.parameterName,
                orderNumber: condition.orderNumber,
                conditionTitle: getConditionTitle(condition, currentLocale),
                serverName: normalizedServerName,
                originalSql: effectiveSqlQuery,
                resolvedQueries: traceResolvedQueries,
                mergedResult: null,
                status: failedExecution.status,
                logMessage: failedExecution.logMessage,
                errorMessage: failedExecution.errorMessage,
              });

              persistExecutionTrace(failedExecution.status, failedExecution.logMessage, failedExecution.errorMessage);
              return failedExecution;
            }

            const normalizedResult = applyProjectionColumnNames(effectiveSqlQuery, execution.result);
            resolvedResults.push(normalizedResult);
            traceResolvedQueries.push({
              sql: resolvedQuery.sql,
              bindings: resolvedQuery.bindings,
              result: createTraceResultPreview(normalizedResult),
              status: execution.status,
              logMessage: execution.logMessage,
              errorMessage: execution.errorMessage,
              serverName: normalizedServerName,
            });
          }

          const mergedExecution = mergeExecutionResults(condition.serverName || serverName, resolvedResults, currentLocale);
          traceSteps.push({
            conditionId: condition.id,
            parameterName: condition.parameterName,
            orderNumber: condition.orderNumber,
            conditionTitle: getConditionTitle(condition, currentLocale),
            serverName: condition.serverName || serverName,
            originalSql: effectiveSqlQuery,
            resolvedQueries: traceResolvedQueries,
            mergedResult: mergedExecution.result ? createTraceResultPreview(mergedExecution.result) : null,
            status: mergedExecution.status,
            logMessage: mergedExecution.logMessage,
            errorMessage: mergedExecution.errorMessage,
          });

          if (mergedExecution.status !== "COMPLETED" || !mergedExecution.result) {
            persistExecutionTrace(mergedExecution.status, mergedExecution.logMessage, mergedExecution.errorMessage);
            return mergedExecution;
          }

          executionMap.set(condition.parameterName.toLowerCase(), mergedExecution.result);
        }

        if (isConditionCancellationRequested(conditionId)) {
          const cancelledExecution = buildCancelledExecution(targetCondition.serverName || serverName);
          persistExecutionTrace(cancelledExecution.status, cancelledExecution.logMessage, cancelledExecution.errorMessage);
          return cancelledExecution;
        }

        const finalResult = executionMap.get(targetCondition.parameterName.toLowerCase());
        if (!finalResult) {
          const failedExecution = createSyntheticExecution(serverName, "FAILED", copy.execution.queryFailed, null, copy.execution.finalResultMissing);
          persistExecutionTrace(failedExecution.status, failedExecution.logMessage, failedExecution.errorMessage);
          return failedExecution;
        }

        const completedExecution = createSyntheticExecution(
          targetCondition.serverName || serverName,
          "COMPLETED",
          finalResult.totalRows === 0
            ? copy.execution.noResult
            : finalResult.truncated
              ? copy.execution.truncatedLoaded
              : copy.execution.successLoaded,
          finalResult,
          null,
          {
            createdAt: overallStartedAt,
            startedAt: overallStartedAt,
            finishedAt: new Date().toISOString(),
          },
        );

        persistExecutionTrace(completedExecution.status, completedExecution.logMessage, completedExecution.errorMessage);
        return completedExecution;
      } catch (error) {
        if (isConditionCancellationRequested(conditionId)) {
          const cancelledExecution = buildCancelledExecution(targetCondition.serverName || serverName);
          persistExecutionTrace(cancelledExecution.status, cancelledExecution.logMessage, cancelledExecution.errorMessage);
          return cancelledExecution;
        }

        const errorMessage = error instanceof Error ? error.message : copy.execution.queryFailed;

        if (activeCondition) {
          traceSteps.push({
            conditionId: activeCondition.id,
            parameterName: activeCondition.parameterName,
            orderNumber: activeCondition.orderNumber,
            conditionTitle: getConditionTitle(activeCondition, currentLocale),
            serverName: activeCondition.serverName || serverName,
            originalSql: activeOriginalSql,
            resolvedQueries: [],
            mergedResult: null,
            status: "FAILED",
            logMessage: copy.execution.queryFailed,
            errorMessage,
          });
        }

        const failedExecution = createSyntheticExecution(
          targetCondition.serverName || serverName,
          "FAILED",
          copy.execution.queryFailed,
          null,
          errorMessage,
          {
            createdAt: overallStartedAt,
            startedAt: overallStartedAt,
            finishedAt: new Date().toISOString(),
          },
        );
        persistExecutionTrace(failedExecution.status, failedExecution.logMessage, failedExecution.errorMessage);
        return failedExecution;
      } finally {
        activeExecutionIdByConditionIdRef.current[conditionId] = null;
        delete cancelRequestedByConditionIdRef.current[conditionId];
      }
    },
    [buildCancelledExecution, copy.execution, currentLocale, isConditionCancellationRequested, renderedConditions],
  );

  const cancelConditionRun = useCallback(
    async (conditionId: string, execution: SqlQueryExecutionStatusResponse) => {
      cancelRequestedByConditionIdRef.current[conditionId] = true;
      const activeExecutionId = activeExecutionIdByConditionIdRef.current[conditionId];

      if (activeExecutionId) {
        try {
          const nextExecution = await cancelSqlQueryExecution(activeExecutionId);
          activeExecutionIdByConditionIdRef.current[conditionId] = null;
          return nextExecution;
        } catch {
          activeExecutionIdByConditionIdRef.current[conditionId] = null;
        }
      }

      return buildCancelledExecution(execution.serverName || renderedConditions.find((condition) => condition.id === conditionId)?.serverName || "");
    },
    [buildCancelledExecution, renderedConditions],
  );

  const removeCondition = (conditionId: string) => {
    commitConditions(renderedConditions.filter((condition) => condition.id !== conditionId));
    setActiveEditorConditionId((current) => (current === conditionId ? null : current));
    setExecutionHistoryByConditionId((current) => {
      const next = { ...current };
      delete next[conditionId];
      return next;
    });
    setHistoryModalConditionId((current) => (current === conditionId ? null : current));
  };

  const handleAdditionalConditionsReorder = (nextConditionIds: string[]) => {
    if (!firstCondition) {
      return;
    }

    const nextAdditionalConditions = nextConditionIds.flatMap((conditionId) => {
      const condition = conditionsById.get(conditionId);
      return condition ? [condition] : [];
    });

    commitConditions([firstCondition, ...nextAdditionalConditions]);
  };

  const motionDisabled = activeEditorConditionId !== null;

  return (
    <div className={cn("h-full overflow-auto pr-1", className)}>
      <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] shadow-[0_22px_48px_-30px_rgba(15,23,42,0.22)]">
        <CardContent className="flex flex-col gap-4 pt-6">
          {!simpleView && firstCondition ? (
            <motion.div
              layout={motionDisabled ? undefined : "position"}
              transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.8 }}
              className={cn(
                "sql-editor-transform-safe relative overflow-hidden rounded-[20px] border border-border/70 bg-background/96 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.22)]",
                (validationErrors?.conditionErrorsById?.[firstCondition.id]?.serverName ||
                  validationErrors?.conditionErrorsById?.[firstCondition.id]?.sqlQuery) &&
                  "border-destructive/80 ring-1 ring-destructive/10",
              )}
            >
              <ComplexConditionCardContent
                condition={firstCondition}
                conditionTitle={copy.conditions.initial}
                isFirstCondition
                collapsed={collapsedConditionIds[firstCondition.id] ?? false}
                validationError={validationErrors?.conditionErrorsById?.[firstCondition.id] ?? null}
                serverOptions={toServerOptions(servers, firstCondition.serverName)}
                serversLoading={serversQuery.isLoading}
                classifierTables={classifierTables}
                availableTokens={availableTokensByConditionId.get(firstCondition.id) ?? []}
                pendingInsertion={pendingInsertions[firstCondition.id] ?? null}
                onUpdateCondition={updateCondition}
                onChangeServerName={changeServerName}
                onRequestTokenInsert={requestTokenInsert}
                onInsertionHandled={markTokenInsertionHandled}
                onRunCondition={runCondition}
                onCancelConditionRun={cancelConditionRun}
                onRemoveCondition={removeCondition}
                onEditorFocusChange={handleEditorFocusChange}
                executionTrace={executionHistoryByConditionId[firstCondition.id] ?? null}
                onOpenExecutionHistory={openExecutionHistory}
                onToggleCollapsed={toggleConditionCollapsed}
              />
            </motion.div>
          ) : null}

          {!simpleView && additionalConditions.length > 0 ? (
            <Reorder.Group
              as="div"
              axis="y"
              values={additionalConditionIds}
              onReorder={handleAdditionalConditionsReorder}
              layoutScroll
              className="flex flex-col gap-4"
            >
              {additionalConditions.map((condition) => (
                <SortableComplexConditionCard
                  key={condition.id}
                  condition={condition}
                  conditionTitle={copy.conditions.additional}
                  isFirstCondition={false}
                  collapsed={collapsedConditionIds[condition.id] ?? false}
                  validationError={validationErrors?.conditionErrorsById?.[condition.id] ?? null}
                  serverOptions={toServerOptions(servers, condition.serverName)}
                  serversLoading={serversQuery.isLoading}
                  classifierTables={classifierTables}
                  availableTokens={availableTokensByConditionId.get(condition.id) ?? []}
                  pendingInsertion={pendingInsertions[condition.id] ?? null}
                  onUpdateCondition={updateCondition}
                  onChangeServerName={changeServerName}
                  onRequestTokenInsert={requestTokenInsert}
                  onInsertionHandled={markTokenInsertionHandled}
                  onRunCondition={runCondition}
                  onCancelConditionRun={cancelConditionRun}
                  onRemoveCondition={removeCondition}
                  onEditorFocusChange={handleEditorFocusChange}
                  executionTrace={executionHistoryByConditionId[condition.id] ?? null}
                  onOpenExecutionHistory={openExecutionHistory}
                  onToggleCollapsed={toggleConditionCollapsed}
                  isDragging={draggingConditionId === condition.id}
                  onDragStateChange={setDraggingConditionId}
                  motionDisabled={motionDisabled}
                />
              ))}
            </Reorder.Group>
          ) : null}

          <VerificationRulesPanel
            rules={renderedVerificationRules}
            tokens={warningMessageTokens}
            simpleView={simpleView}
            selectedTableName={selectedTableName}
            preferredSystemType={preferredSystemType}
            classifierTables={classifierTables}
            validationErrors={validationErrors}
            triggerMode={verificationTriggerMode}
            collapsed={verificationCollapsed}
            onAddRule={addVerificationRule}
            onToggleTriggerMode={toggleVerificationTriggerMode}
            onToggleCollapsed={() => setVerificationCollapsed((current) => !current)}
            onUpdateRule={updateVerificationRule}
            onRemoveRule={removeVerificationRule}
          />

          <WarningMessagesPanel
            messages={messages}
            phoneExtension={phoneExtension}
            tokens={warningMessageTokens}
            validationErrors={validationErrors}
            collapsed={warningMessagesCollapsed}
            onMessageChange={onMessageChange}
            onPhoneExtensionChange={onPhoneExtensionChange}
            onToggleCollapsed={() => setWarningMessagesCollapsed((current) => !current)}
          />
        </CardContent>
      </Card>

      {historyModalConditionId && executionHistoryByConditionId[historyModalConditionId] ? (
        <ComplexExecutionHistoryModal
          trace={executionHistoryByConditionId[historyModalConditionId] as ComplexExecutionTrace}
          onClose={closeExecutionHistory}
        />
      ) : historyModalConditionId ? (
        <ComplexExecutionHistoryModal
          trace={{
            targetConditionId: historyModalConditionId,
            targetParameterName: renderedConditions.find((condition) => condition.id === historyModalConditionId)?.parameterName ?? "",
            targetOrderNumber: renderedConditions.find((condition) => condition.id === historyModalConditionId)?.orderNumber ?? 0,
            status: "FAILED",
            logMessage: {
              OZ: "Jarayon hali bajarilmagan",
              UZ: "Жараён ҳали бажарилмаган",
              RU: "Процесс ещё не выполнялся",
              EN: "The process has not been run yet",
            }[currentLocale],
            errorMessage: null,
            createdAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            steps: [],
          }}
          onClose={closeExecutionHistory}
        />
      ) : null}
    </div>
  );
});

RuleCanvasComplexEditor.displayName = "RuleCanvasComplexEditor";


