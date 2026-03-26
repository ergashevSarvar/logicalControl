import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
};

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="border-border/60 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
        </div>
        <Badge variant="secondary" className="h-10 rounded-2xl px-3 text-primary">
          {icon}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
