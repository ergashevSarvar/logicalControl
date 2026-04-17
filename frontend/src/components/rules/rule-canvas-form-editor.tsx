import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SqlCodeEditor } from "@/components/rules/rule-canvas-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buildClassifierServerOptions, classifierQueryKeys, getClassifierServers, getClassifierTables } from "@/lib/classifiers";
import type { ClassifierTable, ClassifierTableColumn, LocaleCode } from "@/lib/types";
import { cn } from "@/lib/utils";

type RuleCanvasFormEditorProps = {
  canvas: Record<string, unknown>;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  preferredSystemType?: string;
  rootLabel?: string;
  className?: string;
};

type ClauseJoiner = "AND" | "OR";
type ComparisonMode = "VALUE" | "COLUMN";
type ConditionValueType = "text" | "number" | "date" | "datetime" | "boolean";
type ConditionInputMode = "single" | "range" | "list" | "none";
type BuilderNodeKind = "start" | "condition" | "branch" | "action";

type ConditionClause = {
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

type CanvasNodeRecord = Record<string, unknown> & {
  id: string;
  kind: BuilderNodeKind;
  rawLabel: string;
  type: string;
  position: { x: number; y: number };
  conditions?: ConditionClause[];
  notifyMessages?: Record<LocaleCode, string>;
  notifyPhone?: string;
  sqlEnabled?: boolean;
  sqlScript?: string;
  sqlServer?: string;
};

type CanvasEdgeRecord = Record<string, unknown> & {
  id: string;
  source: string;
  target: string;
};

type OperatorOption = {
  value: string;
  label: string;
  inputMode: ConditionInputMode;
};

type AutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
  searchText?: string;
};

const PRIMARY_CONDITION_NODE_ID = "root-primary-condition";
const notifyLocaleFields: Array<{ key: LocaleCode; label: string }> = [
  { key: "uzCyrl", label: "O'zbekcha (kiril)" },
  { key: "uzLatn", label: "O'zbekcha (lotin)" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

const logicalOptions: Array<{ value: ClauseJoiner; label: string }> = [
  { value: "AND", label: "VA" },
  { value: "OR", label: "YOKI" },
];

const textOperators: OperatorOption[] = [
  { value: "eq", label: "Teng", inputMode: "single" },
  { value: "neq", label: "Teng emas", inputMode: "single" },
  { value: "contains", label: "O'z ichiga oladi", inputMode: "single" },
  { value: "not_contains", label: "O'z ichiga olmaydi", inputMode: "single" },
  { value: "starts_with", label: "Bilan boshlanadi", inputMode: "single" },
  { value: "ends_with", label: "Bilan tugaydi", inputMode: "single" },
  { value: "in_list", label: "Ro'yxatda", inputMode: "list" },
  { value: "is_empty", label: "Bo'sh", inputMode: "none" },
  { value: "is_not_empty", label: "Bo'sh emas", inputMode: "none" },
];

const numberOperators: OperatorOption[] = [
  { value: "eq", label: "Teng", inputMode: "single" },
  { value: "neq", label: "Teng emas", inputMode: "single" },
  { value: "gt", label: "Katta", inputMode: "single" },
  { value: "gte", label: "Katta yoki teng", inputMode: "single" },
  { value: "lt", label: "Kichik", inputMode: "single" },
  { value: "lte", label: "Kichik yoki teng", inputMode: "single" },
  { value: "between", label: "Oraliqda", inputMode: "range" },
  { value: "not_between", label: "Oraliqda emas", inputMode: "range" },
  { value: "in_list", label: "Ro'yxatda", inputMode: "list" },
  { value: "is_empty", label: "Bo'sh", inputMode: "none" },
  { value: "is_not_empty", label: "Bo'sh emas", inputMode: "none" },
];

const dateOperators: OperatorOption[] = [
  { value: "eq", label: "Aynan sana", inputMode: "single" },
  { value: "before", label: "Oldin", inputMode: "single" },
  { value: "after", label: "Keyin", inputMode: "single" },
  { value: "on_or_before", label: "Oldin yoki aynan", inputMode: "single" },
  { value: "on_or_after", label: "Keyin yoki aynan", inputMode: "single" },
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

function createEmptyNotifyMessages(): Record<LocaleCode, string> {
  return {
    uzCyrl: "",
    uzLatn: "",
    ru: "",
    en: "",
  };
}

function normalizeNotifyMessages(source: unknown) {
  const raw = typeof source === "object" && source !== null ? (source as Record<string, unknown>) : {};

  return {
    uzCyrl: String(raw.uzCyrl ?? ""),
    uzLatn: String(raw.uzLatn ?? ""),
    ru: String(raw.ru ?? ""),
    en: String(raw.en ?? ""),
  } satisfies Record<LocaleCode, string>;
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
      return isSecond ? "Ikkinchi raqam" : "Raqam";
    case "date":
      return isSecond ? "Ikkinchi sana" : "Sana";
    case "datetime":
      return isSecond ? "Ikkinchi sana-vaqt" : "Sana-vaqt";
    default:
      return isSecond ? "Ikkinchi qiymat" : "Qiymat";
  }
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

function FormAutocompleteSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-[10px] border border-input bg-background px-2.5 text-left text-[13px] outline-none transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
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
            "absolute left-0 z-40 w-full overflow-hidden rounded-[16px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
        >
          <div className="border-b border-border/70 p-2.5">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded-[10px] text-[13px]"
              autoComplete="off"
            />
          </div>

          <div className="max-h-[18rem] overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="min-w-0">
                    <p className="truncate leading-5 text-foreground">{option.label}</p>
                    {option.hint ? <p className="truncate text-[11px] text-muted-foreground">{option.hint}</p> : null}
                  </div>
                  {value === option.value ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-5 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getDefaultTable(tables: ClassifierTable[], preferredSystemType?: string) {
  return sortTablesForBuilder(tables, preferredSystemType)[0] ?? null;
}

function getDefaultColumn(table: ClassifierTable | null) {
  return table ? sortColumns(table.columns)[0] ?? null : null;
}

function createConditionFromMetadata(
  tables: ClassifierTable[],
  preferredSystemType?: string,
  joiner: ClauseJoiner = "AND",
): ConditionClause {
  const defaultTable = getDefaultTable(tables, preferredSystemType);
  const defaultColumn = getDefaultColumn(defaultTable);
  const defaultOperator = getOperatorOptions(detectColumnValueType(defaultColumn))[0]?.value ?? "eq";

  return {
    id: createUniqueId("condition"),
    joiner,
    tableName: defaultTable?.tableName ?? "",
    columnName: defaultColumn?.name ?? "",
    operator: defaultOperator,
    comparisonMode: "VALUE",
    value: "",
    secondValue: "",
    compareTableName: defaultTable?.tableName ?? "",
    compareColumnName: "",
    sqlEnabled: false,
    sqlScript: "",
  };
}

function normalizeConditionList(
  source: unknown,
  tables: ClassifierTable[],
  preferredSystemType?: string,
) {
  const rawConditions = Array.isArray(source) ? source : [];

  if (rawConditions.length === 0) {
    return [createConditionFromMetadata(tables, preferredSystemType)];
  }

  return rawConditions.map((item, index) => {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const selectedTable = findTable(tables, String(raw.tableName ?? ""));
    const selectedColumn = findColumn(selectedTable, String(raw.columnName ?? ""));
    const valueType = detectColumnValueType(selectedColumn);
    const operator = String(raw.operator ?? getOperatorOptions(valueType)[0]?.value ?? "eq");
    const operatorMeta = getOperatorMeta(valueType, operator);

    return {
      id: String(raw.id ?? createUniqueId("condition")),
      joiner: index === 0 ? "AND" : String(raw.joiner ?? "AND") === "OR" ? "OR" : "AND",
      tableName: String(raw.tableName ?? ""),
      columnName: String(raw.columnName ?? ""),
      operator: operatorMeta.value,
      comparisonMode: "VALUE",
      value: operatorMeta.inputMode === "none" ? "" : String(raw.value ?? ""),
      secondValue: operatorMeta.inputMode === "range" ? String(raw.secondValue ?? "") : "",
      compareTableName: String(raw.compareTableName ?? ""),
      compareColumnName: String(raw.compareColumnName ?? ""),
      sqlEnabled: Boolean(raw.sqlEnabled ?? false),
      sqlScript: String(raw.sqlScript ?? ""),
    } satisfies ConditionClause;
  });
}

function createConditionSqlState(source: Record<string, unknown>) {
  const rawConditions = Array.isArray(source.conditions) ? (source.conditions as Array<Record<string, unknown>>) : [];
  const legacySqlCondition =
    rawConditions.find((condition) => Boolean(condition.sqlEnabled) || String(condition.sqlScript ?? "").trim().length > 0) ??
    null;
  const resolvedScript = String(source.sqlScript ?? legacySqlCondition?.sqlScript ?? "");
  const hasExplicitEnabled = "sqlEnabled" in source;

  return {
    sqlEnabled: hasExplicitEnabled ? Boolean(source.sqlEnabled) : resolvedScript.trim().length > 0 || Boolean(legacySqlCondition?.sqlEnabled),
    sqlScript: resolvedScript,
    sqlServer: String(source.sqlServer ?? ""),
  };
}

function createRootNode(rootLabel: string): CanvasNodeRecord {
  return {
    id: "root-node",
    kind: "start",
    rawLabel: rootLabel,
    label: rootLabel,
    type: "RESULT",
    position: { x: 220, y: 80 },
  };
}

function createConditionNode(
  rawLabel: string,
  position: { x: number; y: number },
  tables: ClassifierTable[],
  preferredSystemType?: string,
  id = createUniqueId("condition-node"),
): CanvasNodeRecord {
  return {
    id,
    kind: "condition",
    rawLabel,
    label: rawLabel,
    type: "CONDITION",
    position,
    conditions: [createConditionFromMetadata(tables, preferredSystemType)],
    notifyMessages: createEmptyNotifyMessages(),
    notifyPhone: "",
    sqlEnabled: false,
    sqlScript: "",
    sqlServer: "",
  };
}

function normalizeNode(
  sourceNode: unknown,
  index: number,
  rootLabel: string,
  tables: ClassifierTable[],
  preferredSystemType?: string,
): CanvasNodeRecord {
  const raw = typeof sourceNode === "object" && sourceNode !== null ? (sourceNode as Record<string, unknown>) : {};
  const id = String(raw.id ?? `node-${index}`);
  const kind =
    id === "root-node"
      ? "start"
      : raw.kind === "condition" || raw.type === "CONDITION"
        ? "condition"
        : raw.kind === "branch" || raw.type === "GROUP"
          ? "branch"
          : "action";
  const sqlState = kind === "condition" ? createConditionSqlState(raw) : { sqlEnabled: false, sqlScript: "", sqlServer: "" };

  return {
    ...raw,
    id,
    kind,
    rawLabel: id === "root-node" ? rootLabel : String(raw.rawLabel ?? raw.label ?? ""),
    label: id === "root-node" ? rootLabel : String(raw.label ?? raw.rawLabel ?? ""),
    type: String(raw.type ?? (kind === "condition" ? "CONDITION" : kind === "branch" ? "GROUP" : "ACTION")),
    position:
      typeof raw.position === "object" && raw.position !== null
        ? {
            x: Number((raw.position as { x?: number }).x ?? 220 + index * 120),
            y: Number((raw.position as { y?: number }).y ?? 140 + index * 80),
          }
        : { x: 220 + index * 120, y: 140 + index * 80 },
    conditions: kind === "condition" ? normalizeConditionList(raw.conditions, tables, preferredSystemType) : undefined,
    notifyMessages: kind === "condition" ? normalizeNotifyMessages(raw.notifyMessages) : undefined,
    notifyPhone: kind === "condition" ? String(raw.notifyPhone ?? "") : undefined,
    sqlEnabled: kind === "condition" ? sqlState.sqlEnabled : undefined,
    sqlScript: kind === "condition" ? sqlState.sqlScript : undefined,
    sqlServer: kind === "condition" ? sqlState.sqlServer : undefined,
  };
}

function normalizeEdge(sourceEdge: unknown, index: number): CanvasEdgeRecord {
  const raw = typeof sourceEdge === "object" && sourceEdge !== null ? (sourceEdge as Record<string, unknown>) : {};

  return {
    ...raw,
    id: String(raw.id ?? `edge-${index}`),
    source: String(raw.source ?? ""),
    target: String(raw.target ?? ""),
  };
}

function getPrimaryConditionId(nodes: CanvasNodeRecord[], edges: CanvasEdgeRecord[]) {
  return (
    edges.find((edge) => edge.source === "root-node" && nodes.find((node) => node.id === edge.target)?.kind === "condition")?.target ??
    null
  );
}

function normalizeCanvas(
  canvas: Record<string, unknown>,
  rootLabel: string,
  tables: ClassifierTable[],
  preferredSystemType?: string,
) {
  const rawNodes = Array.isArray(canvas.nodes) ? canvas.nodes : [];
  const rawEdges = Array.isArray(canvas.edges) ? canvas.edges : [];
  const normalizedNodes = rawNodes.map((node, index) => normalizeNode(node, index, rootLabel, tables, preferredSystemType));
  const normalizedEdges = rawEdges.map((edge, index) => normalizeEdge(edge, index));

  const nodes = normalizedNodes.some((node) => node.id === "root-node")
    ? normalizedNodes.map((node) =>
        node.id === "root-node"
          ? ({
              ...node,
              rawLabel: rootLabel,
              label: rootLabel,
              kind: "start" as const,
              type: "RESULT",
            } satisfies CanvasNodeRecord)
          : node,
      )
    : [createRootNode(rootLabel), ...normalizedNodes];
  const edges = [...normalizedEdges];

  if (!getPrimaryConditionId(nodes, edges)) {
    const primaryNode = createConditionNode("", { x: 220, y: 220 }, tables, preferredSystemType, PRIMARY_CONDITION_NODE_ID);
    nodes.push(primaryNode);
    edges.push({
      id: `edge-root-node-${primaryNode.id}`,
      source: "root-node",
      target: primaryNode.id,
    });
  }

  return {
    ...canvas,
    nodes,
    edges,
  };
}

function getOrderedConditionNodes(nodes: CanvasNodeRecord[], edges: CanvasEdgeRecord[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const ordered: CanvasNodeRecord[] = [];
  const visited = new Set<string>();
  let currentId = getPrimaryConditionId(nodes, edges);

  while (currentId && !visited.has(currentId)) {
    const currentNode = nodeMap.get(currentId);
    if (!currentNode || currentNode.kind !== "condition") {
      break;
    }

    ordered.push(currentNode);
    visited.add(currentId);

    currentId =
      edges
        .filter((edge) => edge.source === currentNode.id)
        .map((edge) => nodeMap.get(edge.target))
        .filter((node): node is CanvasNodeRecord => Boolean(node && node.kind === "condition" && (node.rawLabel || "AGAR") === "AKS HOLDA AGAR"))
        .sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0))
        .at(0)?.id ?? null;
  }

  nodes
    .filter((node) => node.kind === "condition" && !visited.has(node.id))
    .sort((left, right) => left.position.y - right.position.y || left.position.x - right.position.x)
    .forEach((node) => ordered.push(node));

  return ordered;
}

function serializeCanvas(canvas: Record<string, unknown>, nodes: CanvasNodeRecord[], edges: CanvasEdgeRecord[]) {
  return {
    ...canvas,
    nodes,
    edges,
  };
}

export function RuleCanvasFormEditor({
  canvas,
  onCanvasChange,
  preferredSystemType,
  rootLabel,
  className,
}: RuleCanvasFormEditorProps) {
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
  const normalizedCanvas = useMemo(
    () => normalizeCanvas(canvas, normalizedRootLabel, classifierTables, preferredSystemType),
    [canvas, classifierTables, normalizedRootLabel, preferredSystemType],
  );
  const orderedConditionNodes = useMemo(
    () => getOrderedConditionNodes(normalizedCanvas.nodes as CanvasNodeRecord[], normalizedCanvas.edges as CanvasEdgeRecord[]),
    [normalizedCanvas.edges, normalizedCanvas.nodes],
  );
  const incomingSignature = useMemo(() => JSON.stringify(canvas), [canvas]);
  const normalizedSignature = useMemo(() => JSON.stringify(normalizedCanvas), [normalizedCanvas]);

  useEffect(() => {
    if (incomingSignature !== normalizedSignature) {
      onCanvasChange(normalizedCanvas);
    }
  }, [incomingSignature, normalizedCanvas, normalizedSignature, onCanvasChange]);

  const commitCanvas = useCallback(
    (nextNodes: CanvasNodeRecord[], nextEdges: CanvasEdgeRecord[]) => {
      onCanvasChange(serializeCanvas(normalizedCanvas, nextNodes, nextEdges));
    },
    [normalizedCanvas, onCanvasChange],
  );

  const updateConditionNode = useCallback(
    (nodeId: string, updater: (node: CanvasNodeRecord) => CanvasNodeRecord) => {
      const nextNodes = (normalizedCanvas.nodes as CanvasNodeRecord[]).map((node) =>
        node.id === nodeId ? updater(node) : node,
      );
      commitCanvas(nextNodes, normalizedCanvas.edges as CanvasEdgeRecord[]);
    },
    [commitCanvas, normalizedCanvas.edges, normalizedCanvas.nodes],
  );

  const updateClause = useCallback(
    (nodeId: string, clauseId: string, updater: (clause: ConditionClause) => ConditionClause) => {
      updateConditionNode(nodeId, (node) => ({
        ...node,
        conditions: (node.conditions ?? []).map((clause) => (clause.id === clauseId ? updater(clause) : clause)),
      }));
    },
    [updateConditionNode],
  );

  const addClause = useCallback(
    (nodeId: string) => {
      updateConditionNode(nodeId, (node) => ({
        ...node,
        conditions: [
          ...(node.conditions ?? [createConditionFromMetadata(classifierTables, preferredSystemType)]),
          createConditionFromMetadata(classifierTables, preferredSystemType, "AND"),
        ],
      }));
    },
    [classifierTables, preferredSystemType, updateConditionNode],
  );

  const removeClause = useCallback(
    (nodeId: string, clauseId: string) => {
      updateConditionNode(nodeId, (node) => {
        const remaining = (node.conditions ?? []).filter((clause) => clause.id !== clauseId);
        return {
          ...node,
          conditions: remaining.length > 0 ? remaining : [createConditionFromMetadata(classifierTables, preferredSystemType)],
        };
      });
    },
    [classifierTables, preferredSystemType, updateConditionNode],
  );

  const addElseIf = useCallback(() => {
    const nodes = normalizedCanvas.nodes as CanvasNodeRecord[];
    const edges = normalizedCanvas.edges as CanvasEdgeRecord[];
    const sourceNode = orderedConditionNodes.at(-1);

    if (!sourceNode) {
      return;
    }

    const nextNode = createConditionNode(
      "AKS HOLDA AGAR",
      {
        x: sourceNode.position.x + 1280,
        y: sourceNode.position.y,
      },
      classifierTables,
      preferredSystemType,
    );

    commitCanvas(
      [...nodes, nextNode],
      [...edges, { id: `edge-${sourceNode.id}-${nextNode.id}`, source: sourceNode.id, target: nextNode.id }],
    );
  }, [classifierTables, commitCanvas, normalizedCanvas.edges, normalizedCanvas.nodes, orderedConditionNodes, preferredSystemType]);

  const removeConditionNode = useCallback(
    (nodeId: string) => {
      const nodes = normalizedCanvas.nodes as CanvasNodeRecord[];
      const edges = normalizedCanvas.edges as CanvasEdgeRecord[];
      if (nodeId === PRIMARY_CONDITION_NODE_ID) {
        return;
      }

      const incomingEdge = edges.find((edge) => edge.target === nodeId);
      const nextConditionEdge = edges.find((edge) => edge.source === nodeId && nodes.find((node) => node.id === edge.target)?.kind === "condition");
      const filteredNodes = nodes.filter((node) => node.id !== nodeId);
      const filteredEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

      if (incomingEdge && nextConditionEdge) {
        filteredEdges.push({
          id: `edge-${incomingEdge.source}-${nextConditionEdge.target}`,
          source: incomingEdge.source,
          target: nextConditionEdge.target,
        });
      }

      commitCanvas(filteredNodes, filteredEdges);
    },
    [commitCanvas, normalizedCanvas.edges, normalizedCanvas.nodes],
  );

  return (
    <div className={cn("h-full min-h-0 overflow-hidden", className)}>
      <div className="h-full min-h-0 overflow-auto">
      <div className="grid items-start gap-4 p-1 pr-2 md:grid-cols-2">
        {orderedConditionNodes.map((node, index) => {
          const conditions = node.conditions ?? [createConditionFromMetadata(classifierTables, preferredSystemType)];

          return (
            <div key={node.id} className="rounded-[22px] bg-muted/30 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Card className="h-full border border-border/80 bg-card/95 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <CardHeader className="gap-2.5 pb-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Shart-{index + 1}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">
                        <span>SQL</span>
                        <Switch
                          size="sm"
                          checked={Boolean(node.sqlEnabled)}
                          onCheckedChange={(checked) =>
                            updateConditionNode(node.id, (current) => ({
                              ...current,
                              sqlEnabled: checked,
                            }))
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addClause(node.id)}
                        disabled={Boolean(node.sqlEnabled)}
                      >
                        <Plus className="size-4" />
                        Shart
                      </Button>
                      {node.id !== PRIMARY_CONDITION_NODE_ID ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => removeConditionNode(node.id)}>
                          <Trash2 className="size-4" />
                          O'chirish
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.16fr)_minmax(260px,0.84fr)]">
                  <div className="space-y-3">
                    {node.sqlEnabled ? (
                      <>
                        {(() => {
                          const sqlServerOptions = buildClassifierServerOptions(classifierServers, node.sqlServer ?? "").map((server) => ({
                            value: server,
                            label: server,
                          }));

                          return (
                            <FormAutocompleteSelect
                              value={node.sqlServer ?? ""}
                              onChange={(nextValue) =>
                                updateConditionNode(node.id, (current) => ({
                                  ...current,
                                  sqlServer: nextValue,
                                }))
                              }
                              options={sqlServerOptions}
                              placeholder="Serverni tanlang"
                              searchPlaceholder="Serverni qidiring..."
                              emptyLabel="Mos server topilmadi"
                            />
                          );
                        })()}
                        <SqlCodeEditor
                          value={node.sqlScript ?? ""}
                          onChange={(nextValue) =>
                            updateConditionNode(node.id, (current) => ({
                              ...current,
                              sqlScript: nextValue,
                            }))
                          }
                          className="min-h-[320px]"
                          placeholder="AGAR box uchun to'liq SQL scriptni kiriting"
                          queryExecutionContext={{
                            serverName: node.sqlServer ?? "",
                            serverOptions: buildClassifierServerOptions(classifierServers, node.sqlServer ?? ""),
                            onServerNameChange: (nextServerName) =>
                              updateConditionNode(node.id, (current) => ({
                                ...current,
                                sqlServer: nextServerName,
                              })),
                            classifierTables,
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {tablesQuery.isLoading ? (
                          <div className="rounded-[14px] border border-dashed border-border bg-muted/35 px-3 py-2.5 text-sm text-muted-foreground">
                            Jadval va ustun ma'lumotlari yuklanmoqda...
                          </div>
                        ) : null}

                        {conditions.map((clause, clauseIndex) => {
                        const selectedTable = findTable(classifierTables, clause.tableName);
                        const selectedColumn = findColumn(selectedTable, clause.columnName);
                        const columns = sortColumns(selectedTable?.columns ?? []);
                        const valueType = detectColumnValueType(selectedColumn);
                        const operatorMeta = getOperatorMeta(valueType, clause.operator);
                        const operatorOptions = getOperatorOptions(valueType);
                        const selectedOperatorLabel = operatorOptions.find((option) => option.value === clause.operator)?.label;
                        const conditionInputType = getConditionInputType(valueType);
                        const tableOptions = sortTablesForBuilder(classifierTables, preferredSystemType).map((table) => ({
                          value: table.tableName,
                          label: table.tableName,
                          hint: table.systemType,
                          searchText: `${table.systemType} ${table.description ?? ""}`,
                        }));
                        const columnOptions = columns.map((column) => ({
                          value: column.name,
                          label: column.name,
                          hint: column.dataType,
                          searchText: `${column.description ?? ""} ${column.dataType}`,
                        }));
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
                          <div key={clause.id} className="space-y-2.5 rounded-[16px] border border-border/70 bg-background/70 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                {clauseIndex === 0 ? (
                                  <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                    1-shart
                                  </span>
                                ) : (
                                  <select
                                    value={clause.joiner}
                                    onChange={(event) =>
                                      updateClause(node.id, clause.id, (current) => ({
                                        ...current,
                                        joiner: event.target.value === "OR" ? "OR" : "AND",
                                      }))
                                    }
                                    className="h-9 rounded-[10px] border border-input bg-background px-3 text-[13px]"
                                  >
                                    {logicalOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                                  {typeLabel}
                                </span>
                              </div>

                              <Button type="button" variant="outline" size="sm" onClick={() => removeClause(node.id, clause.id)}>
                                <Trash2 className="size-4" />
                                O'chirish
                              </Button>
                            </div>

                            <div className="grid gap-2.5 xl:grid-cols-2">
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Jadval</p>
                                <FormAutocompleteSelect
                                  value={clause.tableName}
                                  onChange={(nextValue) =>
                                    updateClause(node.id, clause.id, (current) => ({
                                      ...current,
                                      tableName: nextValue,
                                      columnName: "",
                                      operator: "eq",
                                      value: "",
                                      secondValue: "",
                                    }))
                                  }
                                  options={tableOptions}
                                  placeholder="Jadvalni tanlang"
                                  searchPlaceholder="Jadvalni qidiring..."
                                  emptyLabel="Mos jadval topilmadi"
                                  disabled={tablesQuery.isLoading || tableOptions.length === 0}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ustun</p>
                                <FormAutocompleteSelect
                                  value={clause.columnName}
                                  onChange={(nextValue) =>
                                    updateClause(node.id, clause.id, (current) => ({
                                      ...current,
                                      columnName: nextValue,
                                      operator:
                                        getOperatorOptions(
                                          detectColumnValueType(findColumn(findTable(classifierTables, current.tableName), nextValue)),
                                        )[0]?.value ?? "eq",
                                      value: "",
                                      secondValue: "",
                                    }))
                                  }
                                  options={columnOptions}
                                  placeholder={columnOptions.length === 0 ? "Ustun topilmadi" : "Ustunni tanlang"}
                                  searchPlaceholder="Ustunni qidiring..."
                                  emptyLabel="Mos ustun topilmadi"
                                  disabled={columnOptions.length === 0}
                                />
                              </div>
                            </div>

                            <div className="grid gap-2.5 xl:grid-cols-2">
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Operator</p>
                                <Select
                                  value={clause.operator}
                                  onValueChange={(value) =>
                                    updateClause(node.id, clause.id, (current) => ({
                                      ...current,
                                      operator: value ?? current.operator,
                                      value: "",
                                      secondValue: "",
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full rounded-[10px] px-2.5 text-[13px]">
                                    <SelectValue placeholder="Operatorni tanlang">{selectedOperatorLabel}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent align="start">
                                    {operatorOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Qiymat</p>
                                {operatorMeta.inputMode === "none" ? (
                                  <div className="flex h-9 items-center rounded-[12px] border border-dashed border-border bg-muted/25 px-3 text-[13px] text-muted-foreground">
                                    Bu operator uchun qiymat kerak emas
                                  </div>
                                ) : operatorMeta.inputMode === "range" ? (
                                  <div className="grid gap-2.5 xl:grid-cols-2">
                                    <Input
                                      type={conditionInputType}
                                      value={clause.value}
                                      onChange={(event) =>
                                        updateClause(node.id, clause.id, (current) => ({
                                          ...current,
                                          value: event.target.value,
                                        }))
                                      }
                                      placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode)}
                                      className="h-9 text-[13px]"
                                    />
                                    <Input
                                      type={conditionInputType}
                                      value={clause.secondValue}
                                      onChange={(event) =>
                                        updateClause(node.id, clause.id, (current) => ({
                                          ...current,
                                          secondValue: event.target.value,
                                        }))
                                      }
                                      placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode, true)}
                                      className="h-9 text-[13px]"
                                    />
                                  </div>
                                ) : (
                                  <Input
                                    type={operatorMeta.inputMode === "list" ? "text" : conditionInputType}
                                    value={clause.value}
                                    onChange={(event) =>
                                      updateClause(node.id, clause.id, (current) => ({
                                        ...current,
                                        value: event.target.value,
                                      }))
                                    }
                                    placeholder={getConditionValuePlaceholder(valueType, operatorMeta.inputMode)}
                                    className="h-9 text-[13px]"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </>
                    )}
                  </div>

                  <div className="space-y-2.5 rounded-[16px] border border-amber-200/75 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,247,214,0.88))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
                    <div className="rounded-[12px] border border-amber-200/70 bg-white/82 px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm">
                      Ogohlantirish xabari
                    </div>

                    <div className="grid gap-2.5">
                      {notifyLocaleFields.map((field) => (
                        <div key={field.key}>
                          <Textarea
                            value={node.notifyMessages?.[field.key] ?? ""}
                            onChange={(event) =>
                              updateConditionNode(node.id, (current) => ({
                                ...current,
                                notifyMessages: {
                                  ...(current.notifyMessages ?? createEmptyNotifyMessages()),
                                  [field.key]: event.target.value,
                                },
                              }))
                            }
                            className="min-h-[72px] bg-white text-[13px]"
                            placeholder={`${field.label} uchun xabar`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">IP telefon raqamlari</p>
                      <Input
                        value={node.notifyPhone ?? ""}
                        onChange={(event) =>
                          updateConditionNode(node.id, (current) => ({
                            ...current,
                            notifyPhone: event.target.value,
                          }))
                        }
                        placeholder="7716,7717...."
                        className="h-9 bg-white text-[13px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-20 mt-6 flex justify-end px-1 pb-2 pr-3">
        <Button
          type="button"
          size="icon-lg"
          onClick={addElseIf}
          aria-label="AKS HOLDA AGAR qo'shish"
          title="AKS HOLDA AGAR qo'shish"
          className="!size-11 rounded-full shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
        >
          <Plus className="size-6" />
        </Button>
      </div>
      </div>
    </div>
  );
}
