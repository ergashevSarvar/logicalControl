import "@xyflow/react/dist/style.css";

import {
  Background,
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
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Ban,
  BellRing,
  GitBranchPlus,
  Plus,
  ShieldCheck,
  Trash2,
  Workflow,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RuleType } from "@/lib/types";

type RuleCanvasEditorProps = {
  canvas: Record<string, unknown>;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  canvasHeightClassName?: string;
  rootLabel?: string;
};

type BuilderNodeKind = "start" | "condition" | "branch" | "action";
type BuilderTemplateId = "condition" | "then" | "else" | "approve" | "block" | "notify";
type ActionTone = "success" | "danger" | "info";

type RuleCanvasNodeData = {
  kind: BuilderNodeKind;
  rawLabel: string;
  ruleType: RuleType;
  isRoot?: boolean;
  field?: string;
  operator?: string;
  value?: string;
  combinator?: string;
  secondField?: string;
  secondValue?: string;
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

type RuleCanvasActions = {
  updateNode: (nodeId: string, patch: Partial<RuleCanvasNodeData>) => void;
  appendTemplate: (templateId: BuilderTemplateId, sourceNodeId?: string) => void;
  removeNode: (nodeId: string) => void;
};

const fieldOptions = ["Mijoz ID", "To'lov summasi", "Tranzaksiya turi", "Shahar"] as const;
const operatorOptions = [">", "<", "=", "!="] as const;
const logicalOptions = ["AND", "OR"] as const;

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
      rawLabel: "Shart tekshiruvi",
      field: "To'lov summasi",
      operator: ">",
      value: "100000",
      combinator: "AND",
      secondField: "Tranzaksiya turi",
      secondValue: "Tashqi",
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
    defaults: { rawLabel: "ELSE" },
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

function normalizeNodes(nodes: unknown, rootLabel: string): RuleCanvasNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [createRootNode(rootLabel)];

  const normalized = nodes.map((sourceNode, index) => {
    const source = sourceNode as Record<string, unknown>;
    const id = String(source.id ?? `node-${index}`);
    const kind = inferNodeKind(source, id);
    const label = String(
      source.label ??
        source.rawLabel ??
        (id === "root-node" ? rootLabel : kind === "condition" ? "Shart tekshiruvi" : "Node"),
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
        field: String(source.field ?? "To'lov summasi"),
        operator: String(source.operator ?? ">"),
        value: String(source.value ?? "100000"),
        combinator: String(source.combinator ?? "AND"),
        secondField: String(source.secondField ?? "Tranzaksiya turi"),
        secondValue: String(source.secondValue ?? "Tashqi"),
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
      return {
        id: node.id,
        type: inferRuleTypeFromNode(node),
        kind: data.kind,
        label: data.rawLabel,
        field: data.field,
        operator: data.operator,
        value: data.value,
        combinator: data.combinator,
        secondField: data.secondField,
        secondValue: data.secondValue,
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

function createNodeFromTemplate(templateId: BuilderTemplateId, position: { x: number; y: number }): RuleCanvasNode {
  const template = getTemplate(templateId);

  return withNodePorts({
    id: `${template.kind}-${crypto.randomUUID()}`,
    type: "ruleNode",
    position,
    data: {
      kind: template.kind,
      rawLabel: template.defaults?.rawLabel ?? template.label,
      ruleType: template.ruleType,
      field: template.defaults?.field ?? "To'lov summasi",
      operator: template.defaults?.operator ?? ">",
      value: template.defaults?.value ?? "100000",
      combinator: template.defaults?.combinator ?? "AND",
      secondField: template.defaults?.secondField ?? "Tranzaksiya turi",
      secondValue: template.defaults?.secondValue ?? "Tashqi",
      actionTone: template.actionTone ?? "success",
    },
  });
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

function RuleNode({ id, data, selected }: NodeProps<RuleCanvasNode>) {
  const source = data as RuleCanvasNodeData;
  const { appendTemplate, removeNode, updateNode } = useRuleCanvasActions();

  if (source.kind === "start") {
    return (
      <div
        className={cn(
          "relative min-w-[258px] rounded-[22px] border border-primary/15 px-5 py-4 text-primary-foreground shadow-[0_28px_50px_-30px_rgba(15,23,42,0.4)]",
          selected && "ring-4 ring-primary/20",
        )}
        style={{ background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.98), rgba(var(--primary-rgb), 0.78))" }}
      >
        <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">Rule Start</p>
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
        <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
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
        <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative min-w-[320px] rounded-[22px] border border-primary/18 bg-white shadow-[0_28px_50px_-30px_rgba(15,23,42,0.24)]",
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
          <p className="mt-1 text-sm font-semibold">{source.rawLabel || "Shart tekshiruvi"}</p>
        </div>
        <div className="flex items-center gap-2">
          <NodeActionButton title="Yo'nalish qo'shish" onClick={() => appendTemplate("then", id)}>
            <GitBranchPlus className="size-4" />
          </NodeActionButton>
          <NodeActionButton title="Natija qo'shish" onClick={() => appendTemplate("approve", id)}>
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
          placeholder="Shart nomi"
        />
        <div className="grid grid-cols-[1fr_84px_1fr] gap-2">
          <select
            value={source.field ?? "To'lov summasi"}
            onChange={(event) => updateNode(id, { field: event.target.value })}
            className="h-10 rounded-[12px] border border-input bg-background px-3 text-sm outline-none"
          >
            {fieldOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={source.operator ?? ">"}
            onChange={(event) => updateNode(id, { operator: event.target.value })}
            className="h-10 rounded-[12px] border border-input bg-background px-3 text-sm outline-none"
          >
            {operatorOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Input
            value={source.value ?? ""}
            onChange={(event) => updateNode(id, { value: event.target.value })}
            className="h-10 rounded-[12px] bg-white"
            placeholder="Qiymat"
          />
        </div>

        <div className="grid grid-cols-[84px_1fr_1fr] gap-2">
          <select
            value={source.combinator ?? "AND"}
            onChange={(event) => updateNode(id, { combinator: event.target.value })}
            className="h-10 rounded-[12px] border border-input bg-background px-3 text-sm outline-none"
          >
            {logicalOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={source.secondField ?? "Tranzaksiya turi"}
            onChange={(event) => updateNode(id, { secondField: event.target.value })}
            className="h-10 rounded-[12px] border border-input bg-background px-3 text-sm outline-none"
          >
            {fieldOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Input
            value={source.secondValue ?? ""}
            onChange={(event) => updateNode(id, { secondValue: event.target.value })}
            className="h-10 rounded-[12px] bg-white"
            placeholder="Ikkinchi qiymat"
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-background !bg-primary" />
    </div>
  );
}

export function RuleCanvasEditor({ canvas, onCanvasChange, canvasHeightClassName, rootLabel }: RuleCanvasEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState("root-node");
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<RuleCanvasNode, Edge> | null>(null);
  const normalizedRootLabel = rootLabel?.trim() || "Mantiqiy nazorat";

  const normalizedIncomingNodes = useMemo(() => normalizeNodes(canvas.nodes, normalizedRootLabel), [canvas.nodes, normalizedRootLabel]);
  const normalizedIncomingEdges = useMemo(() => normalizeEdges(canvas.edges), [canvas.edges]);
  const incomingCanvas = useMemo(() => serializeCanvas(normalizedIncomingNodes, normalizedIncomingEdges), [normalizedIncomingEdges, normalizedIncomingNodes]);
  const incomingSignature = useMemo(() => JSON.stringify(incomingCanvas), [incomingCanvas]);

  const [nodes, setNodes, onNodesChange] = useNodesState(normalizedIncomingNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(normalizedIncomingEdges);

  const appliedIncomingSignatureRef = useRef(incomingSignature);
  const emittedSignatureRef = useRef(incomingSignature);

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
      const nextNode = createNodeFromTemplate(templateId, getNextChildPosition(sourceId, templateId, nodes as RuleCanvasNode[], edges));

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
    [edges, nodes, selectedNodeId, setEdges, setNodes],
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes.find((node) => node.id === "root-node");

  const actions = useMemo<RuleCanvasActions>(
    () => ({
      updateNode,
      appendTemplate,
      removeNode,
    }),
    [appendTemplate, removeNode, updateNode],
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
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-[0_22px_48px_-28px_rgba(15,23,42,0.24)]">
          <CardContent className={cn("relative h-[72vh] min-h-[640px] overflow-hidden p-0", canvasHeightClassName)}>
          <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 px-4 py-4">
            <div className="rounded-[20px] border border-border/70 bg-card/92 px-4 py-3 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Workflow className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">Qoida kanvasi</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{normalizedRootLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-[18px] border border-border/70 bg-card/92 px-4 py-2.5 text-right shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tanlangan tugun</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{selectedNode?.data.rawLabel || normalizedRootLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => flowInstance?.fitView({ padding: 0.24, duration: 320 })}
                className="h-11 rounded-[18px] border border-border/70 bg-card/92 px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25 hover:text-primary"
              >
                Markazlash
              </button>
            </div>
          </div>

          <ReactFlow<RuleCanvasNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => setFlowInstance(instance)}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId("root-node")}
            fitView
            fitViewOptions={{ padding: 0.24 }}
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
          >
            <Controls className="rounded-2xl border border-border/70 bg-card" showInteractive={false} />
            <Background gap={22} size={1.1} color="rgba(59,130,246,0.16)" />
          </ReactFlow>

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
