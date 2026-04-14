import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/common/page-header";
import { ResultBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchLogs } from "@/lib/api";
import { formatIsoDate } from "@/lib/utils";

export function LogsPage() {
  const [result, setResult] = useState<"ALL" | "POSITIVE" | "NEGATIVE">("ALL");
  const logsQuery = useQuery({
    queryKey: ["logs", result],
    queryFn: () => fetchLogs(result === "ALL" ? undefined : result),
  });

  const chartData = useMemo(() => {
    const items = logsQuery.data?.items ?? [];
    const buckets = new Map<string, { label: string; positive: number; negative: number }>();

    items.forEach((item) => {
      const label = formatIsoDate(item.instime);
      if (!buckets.has(label)) {
        buckets.set(label, { label, positive: 0, negative: 0 });
      }
      const entry = buckets.get(label)!;
      if (item.result === "POSITIVE") {
        entry.positive += 1;
      } else {
        entry.negative += 1;
      }
    });

    return [...buckets.values()].reverse();
  }, [logsQuery.data?.items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs & statistics"
        subtitle="Ijro bo'yicha ijobiy-salbiy natijalar, declaration identifikatorlari va trigger qoidalarni kuzating."
        actions={
          <Select value={result} onValueChange={(value) => setResult(value as typeof result)}>
            <SelectTrigger className="min-w-40">
              <SelectValue placeholder="Result filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All results</SelectItem>
              <SelectItem value="POSITIVE">Positive</SelectItem>
              <SelectItem value="NEGATIVE">Negative</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total logs" value={logsQuery.data?.total ?? 0} hint="Filtered result set" />
        <SummaryCard label="Positive" value={logsQuery.data?.positive ?? 0} hint="Ijobiy o'tgan checks" />
        <SummaryCard label="Negative" value={logsQuery.data?.negative ?? 0} hint="Salbiy javob berganlar" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>Execution distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Bar dataKey="positive" fill="var(--chart-2)" radius={[10, 10, 0, 0]} />
                <Bar dataKey="negative" fill="var(--chart-5)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>Fast filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "All results", value: "ALL" },
              { label: "Only positive", value: "POSITIVE" },
              { label: "Only negative", value: "NEGATIVE" },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={result === item.value ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setResult(item.value as typeof result)}
              >
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Execution log list</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Control</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Declaration</TableHead>
                <TableHead>UNCoD</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Matched rule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logsQuery.data?.items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.controlCode}</p>
                      <p className="font-semibold">{item.controlName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ResultBadge result={item.result} />
                  </TableCell>
                  <TableCell>{item.declarationId ?? "-"}</TableCell>
                  <TableCell>{item.declarationUncodId ?? "-"}</TableCell>
                  <TableCell>{item.durationMs ? `${item.durationMs} ms` : "-"}</TableCell>
                  <TableCell>{item.matchedRuleName ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="border-border/70 bg-card/90">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
