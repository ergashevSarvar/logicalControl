import { Badge } from "@/components/ui/badge";
import type { ControlStatus, ControlType, ControlSystem, LogResult } from "@/lib/types";

const statusMap: Record<ControlStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Faol", variant: "default" },
  CANCELLED: { label: "Bekor", variant: "outline" },
  SUSPENDED: { label: "To'xtatilgan", variant: "secondary" },
};

const typeMap: Record<ControlType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  WARNING: { label: "Ogohlantirish", variant: "secondary" },
  ALLOW: { label: "Istisno", variant: "default" },
  BLOCK: { label: "Taqiqlash", variant: "destructive" },
};

const resultMap: Record<LogResult, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  POSITIVE: { label: "Ijobiy", variant: "default" },
  NEGATIVE: { label: "Salbiy", variant: "destructive" },
};

export function StatusBadge({ status }: { status: ControlStatus }) {
  const item = statusMap[status];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function TypeBadge({ type }: { type: ControlType }) {
  const item = typeMap[type];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function ResultBadge({ result }: { result: LogResult }) {
  const item = resultMap[result];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function SystemBadge({ system }: { system: ControlSystem }) {
  return (
    <Badge variant="outline" className="max-w-[20rem] font-medium whitespace-normal">
      {system}
    </Badge>
  );
}
