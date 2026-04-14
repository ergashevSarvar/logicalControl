import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
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
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Ban,
  BellRing,
  ChevronDown,
  GitBranchPlus,
  Plus,
  ShieldCheck,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { classifierQueryKeys, getClassifierTables } from "@/lib/classifiers";
import { cn } from "@/lib/utils";
import type { ClassifierTable, ClassifierTableColumn, RuleType } from "@/lib/types";

type RuleCanvasEditorProps = {
  canvas: Record<string, unknown>;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  canvasHeightClassName?: string;
  rootLabel?: string;
  preferredSystemType?: string;
};

type BuilderNodeKind = "start" | "condition" | "branch" | "action";
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
};

type RuleCanvasNodeData = {
  kind: BuilderNodeKind;
  rawLabel: string;
  ruleType: RuleType;
  isRoot?: boolean;
  conditions?: RuleConditionClause[];
  actionTone?: ActionTone;
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

type BuilderAutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
  searchText?: string;
};

type RuleCanvasActions = {
  updateNode: (nodeId: string, patch: Partial<RuleCanvasNodeData>) => void;
  appendTemplate: (templateId: BuilderTemplateId, sourceNodeId?: string) => void;
  openTemplatePicker: (nodeId: string) => void;
  removeNode: (nodeId: string) => void;
  addCondition: (nodeId: string) => void;
  updateCondition: (nodeId: string, conditionId: string, updater: (current: RuleConditionClause) => RuleConditionClause) => void;
  removeCondition: (nodeId: string, conditionId: string) => void;
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
    label: "AKS HOLDA",
    description: "Muqobil yo'nalish",
    kind: "branch",
    ruleType: "GROUP",
    icon: GitBranchPlus,
    accentClassName: "border-indigo-400/35 bg-indigo-500/18 text-indigo-100 hover:bg-indigo-500/26",
    defaults: { rawLabel: "AKS HOLDA" },
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
    label: "Xabarnoma",
    description: "Bildirish bloki",
    kind: "action",
    ruleType: "ACTION",
    icon: BellRing,
    accentClassName: "border-amber-400/35 bg-amber-500/18 text-amber-100 hover:bg-amber-500/26",
    actionTone: "info",
    defaults: { rawLabel: "Xabarnoma yuborish" },
  },
];

const nodeTypes = {
  ruleNode: RuleNode,
};

const RuleCanvasActionsContext = createContext<RuleCanvasActions | null>(null);
const defaultFitViewOptions = { padding: 0.12, maxZoom: 1.05 } as const;
const viewportTopOffset = 84;

function useRuleCanvasActions() {
  const context = useContext(RuleCanvasActionsContext);
  if (!context) {
    throw new Error("RuleCanvas actions context is missing");
  }
  return context;
}

function getTemplate(templateId: BuilderTemplateId) {
  return builderTemplates.find((template) => template.id === templateId)!;
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
    id: crypto.randomUUID(),
    joiner,
    tableName: "",
    columnName: "",
    operator: "eq",
    comparisonMode: "VALUE",
    value: "",
    secondValue: "",
    compareTableName: "",
    compareColumnName: "",
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
    id: crypto.randomUUID(),
    joiner,
    tableName: defaultTable?.tableName ?? "",
    columnName: defaultColumn?.name ?? "",
    operator: defaultOperator,
    comparisonMode: "VALUE" as ComparisonMode,
    value: "",
    secondValue: "",
    compareTableName: defaultTable?.tableName ?? "",
    compareColumnName: "",
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
    id: condition.id || crypto.randomUUID(),
    joiner: index === 0 ? "AND" : condition.joiner ?? "AND",
    tableName: selectedTable?.tableName ?? "",
    columnName: selectedColumn?.name ?? "",
    operator: operatorMeta.value,
    comparisonMode,
    value: operatorMeta.inputMode === "none" ? "" : condition.value ?? "",
    secondValue: operatorMeta.inputMode === "range" ? condition.secondValue ?? "" : "",
    compareTableName: comparisonMode === "COLUMN" ? compareTable?.tableName ?? selectedTable?.tableName ?? "" : "",
    compareColumnName: comparisonMode === "COLUMN" ? compareColumn?.name ?? "" : "",
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
        id: String(raw.id ?? crypto.randomUUID()),
        joiner: String(raw.joiner ?? (index === 0 ? "AND" : "AND")) === "OR" ? "OR" : "AND",
        tableName: String(raw.tableName ?? ""),
        columnName: String(raw.columnName ?? ""),
        operator: String(raw.operator ?? "eq"),
        comparisonMode: String(raw.comparisonMode ?? "VALUE") === "COLUMN" ? "COLUMN" : "VALUE",
        value: String(raw.value ?? ""),
        secondValue: String(raw.secondValue ?? ""),
        compareTableName: String(raw.compareTableName ?? ""),
        compareColumnName: String(raw.compareColumnName ?? ""),
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

function withNodePorts(node: RuleCanvasNode): RuleCanvasNode {
  return {
    ...node,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    deletable: node.id !== "root-node",
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
        conditions:
          kind === "condition"
            ? normalizeConditionListWithMetadata(normalizeConditions(source), classifierTables, preferredSystemType)
            : undefined,
        actionTone: inferActionTone(label, source.actionTone),
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
        actionTone: data.actionTone,
        position: node.position,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
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
      return "Xabarnoma";
    case "success":
    default:
      return "Tasdiqlash";
  }
}

function getNodeDisplayLabel(data: RuleCanvasNodeData | undefined, rootLabel: string) {
  if (!data) return rootLabel;

  switch (data.kind) {
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

function NodeActionButton({
  title,
  onClick,
  variant = "light",
  children,
}: {
  title: string;
  onClick?: () => void;
  variant?: "light" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors",
        variant === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
          : "border-white/20 bg-white/12 text-white hover:bg-white/20",
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

function BuilderAutocompleteSelect({
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
  options: BuilderAutocompleteOption[];
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
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current || !(event.target instanceof globalThis.Node)) {
        return;
      }

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
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
          "nodrag flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[12px] border border-input bg-background px-3 text-left text-sm outline-none transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
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
            "absolute left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
        >
          <div className="border-b border-border/70 p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="nodrag h-10 rounded-[12px]"
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
                  className="nodrag flex w-full items-start justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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

function BuilderSourceHandle({ nodeId }: { nodeId: string }) {
  const { openTemplatePicker } = useRuleCanvasActions();

  return (
    <Handle
      type="source"
      position={Position.Bottom}
      title="Keyingi amal qo'shish"
      role="button"
      aria-label="Keyingi amal qo'shish"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openTemplatePicker(nodeId);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          openTemplatePicker(nodeId);
        }
      }}
      className="!h-4 !w-4 !border-2 !border-background !bg-primary transition-transform hover:!scale-110 focus-visible:!ring-4 focus-visible:!ring-primary/25"
    />
  );
}

function BuilderTemplatePickerModal({
  sourceLabel,
  onClose,
  onSelect,
}: {
  sourceLabel: string;
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
          {builderTemplates.map((template) => {
            const Icon = template.icon;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                className="flex items-start gap-4 rounded-[22px] border border-border/70 bg-background/90 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-primary/4"
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[16px]", template.accentClassName)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{template.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{template.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-[20px] border border-primary/12 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
          `AGAR` tanlangach yangi condition blok ichida jadval, ustun va operator bo'yicha shartlarni kiritishingiz mumkin.
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RuleNode({ id, data, selected }: NodeProps<RuleCanvasNode>) {
  const source = data as RuleCanvasNodeData;
  const {
    appendTemplate,
    removeNode,
    updateNode,
    addCondition,
    updateCondition,
    removeCondition,
    classifierTables,
    classifierTablesLoading,
    preferredSystemType,
  } = useRuleCanvasActions();

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">Boshlanish</p>
            <p className="mt-2 text-sm font-semibold leading-6">{source.rawLabel || "Mantiqiy nazorat"}</p>
          </div>
          <NodeActionButton title="Shart qo'shish" onClick={() => appendTemplate("condition", id)}>
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
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">{source.rawLabel || "UNDA"}</span>
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

    return (
      <div
        className={cn(
          "relative min-w-[286px] rounded-[20px] border bg-white shadow-[0_24px_44px_-28px_rgba(15,23,42,0.24)]",
          frameClassesForActionTone(tone),
          selected && "ring-4 ring-primary/14",
        )}
      >
        <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
        <div className={cn("flex items-start justify-between gap-3 rounded-t-[20px] px-4 py-3 text-white", headerClassesForActionTone(tone))}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">Action</p>
            <p className="mt-1 text-sm font-semibold">{actionTitleForTone(tone)}</p>
          </div>
          <div className="flex items-center gap-2">
            <NodeActionButton title="Keyingi shartni qo'shish" onClick={() => appendTemplate("condition", id)}>
              <Plus className="size-4" />
            </NodeActionButton>
            <NodeActionButton title="Tugunni o'chirish" onClick={() => removeNode(id)} variant="danger">
              <Trash2 className="size-4" />
            </NodeActionButton>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <Input
            value={source.rawLabel}
            onChange={(event) => updateNode(id, { rawLabel: event.target.value })}
            className="h-10 rounded-[12px] bg-white"
            placeholder="Natija nomi"
          />
        </div>
        <BuilderSourceHandle nodeId={id} />
      </div>
    );
  }

  const conditions = source.conditions ?? [createBlankCondition()];
  const tableOptions = sortTablesForBuilder(classifierTables, preferredSystemType).map((table) => ({
    value: table.tableName,
    label: table.tableName,
    hint: table.systemType,
    searchText: `${table.systemType} ${table.description ?? ""}`,
  }));

  return (
    <div
      className={cn(
        "relative min-w-[480px] max-w-[580px] rounded-[22px] border border-primary/18 bg-white shadow-[0_28px_50px_-30px_rgba(15,23,42,0.24)]",
        selected && "ring-4 ring-primary/16",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
      <div
        className="flex items-start justify-between gap-3 rounded-t-[22px] px-4 py-3 text-primary-foreground"
        style={{ background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.98), rgba(var(--primary-rgb), 0.76))" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">AGAR</p>
        </div>
        <div className="flex items-center gap-2">
          <NodeActionButton title="Ichki shart qo'shish" onClick={() => addCondition(id)}>
            <Plus className="size-4" />
          </NodeActionButton>
          <NodeActionButton title="UNDA yo'nalishini qo'shish" onClick={() => appendTemplate("then", id)}>
            <GitBranchPlus className="size-4" />
          </NodeActionButton>
          <NodeActionButton title="AKS HOLDA yo'nalishini qo'shish" onClick={() => appendTemplate("else", id)}>
            <GitBranchPlus className="size-4" />
          </NodeActionButton>
          <NodeActionButton title="Tasdiqlash natijasi" onClick={() => appendTemplate("approve", id)}>
            <ShieldCheck className="size-4" />
          </NodeActionButton>
          <NodeActionButton title="Taqiqlash natijasi" onClick={() => appendTemplate("block", id)}>
            <Ban className="size-4" />
          </NodeActionButton>
          <NodeActionButton title="Tugunni o'chirish" onClick={() => removeNode(id)} variant="danger">
            <Trash2 className="size-4" />
          </NodeActionButton>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {classifierTablesLoading ? (
          <div className="rounded-[16px] border border-dashed border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            Jadval va ustun ma'lumotlari yuklanmoqda...
          </div>
        ) : null}

        {conditions.map((condition, index) => {
          const selectedTable = findTable(classifierTables, condition.tableName);
          const tableColumns = sortColumns(selectedTable?.columns ?? []);
          const selectedColumn = findColumn(selectedTable, condition.columnName);
          const valueType = detectColumnValueType(selectedColumn);
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
                <div className="flex flex-wrap items-center gap-2">
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
                      className="h-8 min-w-[86px] rounded-full bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
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
                      operator: "",
                      compareColumnName: "",
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

                <div className="min-w-[11rem] flex-[1_1_11rem]">
                  <BuilderSelect
                    value={condition.operator}
                    onChange={(nextValue) =>
                      updateCondition(id, condition.id, (current) => ({
                        ...current,
                        operator: nextValue,
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
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => addCondition(id)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-primary/25 bg-primary/6 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <Plus className="size-4" />
          Yana shart qo'shish
        </button>
      </div>

      <BuilderSourceHandle nodeId={id} />
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

  const classifierTables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  const normalizedIncomingNodes = useMemo(
    () => normalizeNodes(canvas.nodes, normalizedRootLabel, classifierTables, preferredSystemType),
    [canvas.nodes, classifierTables, normalizedRootLabel, preferredSystemType],
  );
  const normalizedIncomingEdges = useMemo(() => normalizeEdges(canvas.edges), [canvas.edges]);
  const incomingCanvas = useMemo(() => serializeCanvas(normalizedIncomingNodes, normalizedIncomingEdges), [normalizedIncomingEdges, normalizedIncomingNodes]);
  const incomingSignature = useMemo(() => JSON.stringify(incomingCanvas), [incomingCanvas]);

  const [nodes, setNodes, onNodesChange] = useNodesState(normalizedIncomingNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(normalizedIncomingEdges);

  const appliedIncomingSignatureRef = useRef(incomingSignature);
  const emittedSignatureRef = useRef(incomingSignature);
  const reactFlowRef = useRef<ReactFlowInstance<RuleCanvasNode, Edge> | null>(null);

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

  useEffect(() => {
    const currentSignature = JSON.stringify(serializeCanvas(nodes, edges));
    if (incomingSignature === appliedIncomingSignatureRef.current) return;

    appliedIncomingSignatureRef.current = incomingSignature;
    emittedSignatureRef.current = incomingSignature;

    if (incomingSignature !== currentSignature) {
      setNodes(normalizedIncomingNodes);
      setEdges(normalizedIncomingEdges);
    }
  }, [edges, incomingSignature, nodes, normalizedIncomingEdges, normalizedIncomingNodes, setEdges, setNodes]);

  useEffect(() => {
    const nextCanvas = serializeCanvas(nodes, edges);
    const nextSignature = JSON.stringify(nextCanvas);
    if (nextSignature === emittedSignatureRef.current) return;

    emittedSignatureRef.current = nextSignature;

    if (nextSignature !== incomingSignature) {
      onCanvasChange({
        ...(canvas ?? {}),
        ...nextCanvas,
      });
    }
  }, [canvas, edges, incomingSignature, nodes, onCanvasChange]);

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

  useEffect(() => {
    const instance = reactFlowRef.current;
    if (!instance) return;

    const frameId = requestAnimationFrame(() => alignViewportToTop(instance));
    return () => cancelAnimationFrame(frameId);
  }, [alignViewportToTop, incomingSignature]);

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

          const nextCondition = createConditionFromMetadata(classifierTables, preferredSystemType, "AND");
          return {
            ...node,
            data: {
              ...node.data,
              conditions: normalizeConditionListWithMetadata(
                [...(node.data.conditions ?? []), nextCondition],
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
      if (nodeId === "root-node") return;
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNodeId("root-node");
    },
    [setEdges, setNodes],
  );

  const appendTemplate = useCallback(
    (templateId: BuilderTemplateId, sourceNodeId?: string) => {
      const sourceId = sourceNodeId ?? selectedNodeId ?? "root-node";
      const template = getTemplate(templateId);
      const nextNode = withNodePorts({
        id: `${template.kind}-${crypto.randomUUID()}`,
        type: "ruleNode",
        position: getNextChildPosition(sourceId, templateId, nodes as RuleCanvasNode[], edges),
        data: {
          kind: template.kind,
          rawLabel: template.defaults?.rawLabel ?? template.label,
          ruleType: template.ruleType,
          conditions:
            template.kind === "condition"
              ? [createConditionFromMetadata(classifierTables, preferredSystemType)]
              : undefined,
          actionTone: template.actionTone ?? "success",
        },
      });

      setNodes((currentNodes) => [...currentNodes, nextNode]);
      setEdges((currentEdges) =>
        addEdge(
          {
            id: `edge-${sourceId}-${nextNode.id}`,
            source: sourceId,
            target: nextNode.id,
            animated: true,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
            style: { strokeWidth: 2, stroke: "var(--primary)" },
          },
          currentEdges,
        ),
      );
      setSelectedNodeId(nextNode.id);
    },
    [classifierTables, edges, nodes, preferredSystemType, selectedNodeId, setEdges, setNodes],
  );

  const openTemplatePicker = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setTemplatePickerSourceId(nodeId);
  }, []);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes.find((node) => node.id === "root-node");
  const templatePickerSourceNode = templatePickerSourceId
    ? (nodes.find((node) => node.id === templatePickerSourceId) as RuleCanvasNode | undefined)
    : undefined;

  const actions = useMemo<RuleCanvasActions>(
    () => ({
      updateNode,
      appendTemplate,
      openTemplatePicker,
      removeNode,
      addCondition,
      updateCondition,
      removeCondition,
      classifierTables,
      classifierTablesLoading: tablesQuery.isLoading,
      preferredSystemType,
    }),
    [
      addCondition,
      appendTemplate,
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
                  {getNodeDisplayLabel(selectedNode?.data as RuleCanvasNodeData | undefined, normalizedRootLabel)}
                </p>
              </div>
            </div>
          </div>

          <ReactFlow<RuleCanvasNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowRef.current = instance;
              alignViewportToTop(instance);
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId("root-node")}
            fitView
            fitViewOptions={defaultFitViewOptions}
            defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
            minZoom={0.2}
            maxZoom={1.4}
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
              onClose={() => setTemplatePickerSourceId(null)}
              onSelect={(templateId) => {
                appendTemplate(templateId, templatePickerSourceNode.id);
                setTemplatePickerSourceId(null);
              }}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-4">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[26px] border border-slate-900/85 bg-slate-950/88 px-3 py-3 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.58)] backdrop-blur">
              {builderTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => appendTemplate(template.id)}
                    className="group flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/12"
                  >
                    <span className={cn("flex size-8 items-center justify-center rounded-full border", template.accentClassName)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="hidden sm:inline">{template.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </CardContent>
        </Card>
      </RuleCanvasActionsContext.Provider>
    </ReactFlowProvider>
  );
}
