import "@xyflow/react/dist/style.css";

import { Background, Controls, MiniMap, Position, ReactFlow, addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import { useEffect, useMemo } from "react";
import { Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RuleType } from "@/lib/types";

type RuleCanvasEditorProps = {
  canvas: Record<string, unknown>;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  onRuleAdd?: (type: RuleType) => void;
};

const palette: Array<{ type: RuleType; label: string; description: string }> = [
  { type: "CONDITION", label: "Condition", description: "Field/operator/value check" },
  { type: "GROUP", label: "Group", description: "Combine multiple checks" },
  { type: "ACTION", label: "Action", description: "Trigger internal or external action" },
  { type: "RESULT", label: "Result", description: "Allow, warn, or block" },
];

function toNodeType(type: RuleType) {
  switch (type) {
    case "CONDITION":
      return { background: "bg-sky-500/15", border: "border-sky-500/30", label: "Condition" };
    case "GROUP":
      return { background: "bg-amber-500/15", border: "border-amber-500/30", label: "Group" };
    case "ACTION":
      return { background: "bg-emerald-500/15", border: "border-emerald-500/30", label: "Action" };
    case "RESULT":
      return { background: "bg-rose-500/15", border: "border-rose-500/30", label: "Result" };
  }
}

function normalizeNodes(nodes: unknown): Node[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.map((node, index) => {
    const source = node as Record<string, any>;
    const type = (source.type as RuleType | undefined) ?? "CONDITION";
    const tone = toNodeType(type);

    return {
      id: String(source.id ?? `node-${index}`),
      type: "default",
      position: source.position ?? { x: 60 + index * 180, y: 140 },
      data: {
        rawLabel: String(source.label ?? source.id ?? tone.label),
        ruleType: type,
        label: (
          <div className={cn("min-w-[160px] rounded-2xl border p-3 text-left shadow-sm", tone.background, tone.border)}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{tone.label}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{String(source.label ?? source.id ?? tone.label)}</p>
          </div>
        ),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
}

function normalizeEdges(edges: unknown): Edge[] {
  if (!Array.isArray(edges)) {
    return [];
  }

  return edges.map((edge, index) => {
    const source = edge as Record<string, any>;
    return {
      id: String(source.id ?? `edge-${index}`),
      source: String(source.source),
      target: String(source.target),
      label: source.label ? String(source.label) : undefined,
      animated: true,
      style: { strokeWidth: 2 },
    };
  });
}

function serializeCanvas(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: inferRuleTypeFromNode(node),
      label: extractNodeLabel((node.data as Record<string, unknown> | undefined)?.rawLabel),
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? "",
    })),
  };
}

function extractNodeLabel(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : "Rule node";
}

function inferRuleTypeFromNode(node: Node): RuleType {
  const source = (node.data as Record<string, unknown> | undefined)?.ruleType;
  return (source as RuleType | undefined) ?? "CONDITION";
}

export function RuleCanvasEditor({ canvas, onCanvasChange, onRuleAdd }: RuleCanvasEditorProps) {
  const initialNodes = useMemo(() => normalizeNodes(canvas.nodes), [canvas]);
  const initialEdges = useMemo(() => normalizeEdges(canvas.edges), [canvas]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

  useEffect(() => {
    onCanvasChange({
      ...(canvas ?? {}),
      ...serializeCanvas(nodes, edges),
    });
  }, [canvas, edges, nodes, onCanvasChange]);

  function handleConnect(connection: Connection) {
    setEdges((current) => addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, current));
  }

  function addNode(type: RuleType) {
    const id = `${type.toLowerCase()}-${crypto.randomUUID()}`;
    const tone = toNodeType(type);
    const nextNode: Node = {
      id,
      type: "default",
      position: { x: 100 + nodes.length * 36, y: 120 + nodes.length * 28 },
      data: {
        rawLabel: `${tone.label} node`,
        ruleType: type,
        label: (
          <div className={cn("min-w-[160px] rounded-2xl border p-3 text-left shadow-sm", tone.background, tone.border)}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{tone.label}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{tone.label} node</p>
          </div>
        ),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    setNodes((current) => [...current, nextNode]);
    onRuleAdd?.(type);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="min-h-[560px] overflow-hidden border-border/70">
        <CardContent className="h-[560px] p-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            fitView
          >
            <MiniMap className="rounded-2xl border border-border/70 bg-card" />
            <Controls className="rounded-2xl border border-border/70 bg-card" />
            <Background gap={20} size={1} />
          </ReactFlow>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Node palette</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {palette.map((item) => (
            <button
              type="button"
              key={item.type}
              onClick={() => addNode(item.type)}
              className="flex w-full items-start justify-between rounded-[22px] border border-border/70 bg-background/80 p-4 text-left transition hover:border-primary/35 hover:bg-primary/5"
            >
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <span className="rounded-full border border-border/70 p-2">
                <Plus className="size-4" />
              </span>
            </button>
          ))}
          <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Tugunlarni qo'shing, keyin ular orasini chiziq bilan ulang. Bu canvas backendga JSON sifatida saqlanadi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
