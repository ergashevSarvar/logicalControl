import { useQuery } from "@tanstack/react-query";
import { Activity, AlertOctagon, CheckCircle2, LayoutGrid } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ResultBadge, SystemBadge, TypeBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchControls, fetchDashboard } from "@/lib/api";

export function DashboardPage() {
  const { t } = useTranslation();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });
  const controlsQuery = useQuery({
    queryKey: ["controls", "dashboard"],
    queryFn: () => fetchControls(),
  });

  const metrics = dashboardQuery.data?.metrics ?? [];
  const trend = dashboardQuery.data?.trend ?? [];
  const controls = (controlsQuery.data ?? []).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <StatCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            icon={[<LayoutGrid key="0" className="size-4" />, <CheckCircle2 key="1" className="size-4" />, <AlertOctagon key="2" className="size-4" />, <Activity key="3" className="size-4" />][index]}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>{t("dashboard.trend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area type="monotone" dataKey="daily" stroke="var(--chart-1)" fill="url(#dailyGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="monthly" stroke="var(--chart-2)" fillOpacity={0} strokeWidth={2} />
                <Area type="monotone" dataKey="yearly" stroke="var(--chart-3)" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>{t("dashboard.recent")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboardQuery.data?.recentActivities ?? []).map((item) => (
              <div key={`${item.controlId}-${item.whenLabel}`} className="rounded-[22px] border border-border/70 bg-background/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{item.controlCode}</p>
                    <p className="mt-1 font-semibold">{item.controlName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.whenLabel}</p>
                  </div>
                  <ResultBadge result={item.result} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Priority controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {controls.map((control) => (
            <div key={control.id} className="rounded-[24px] border border-border/70 bg-background/85 p-4">
              <div className="flex items-center justify-between">
                <SystemBadge system={control.systemName} />
                <TypeBadge type={control.controlType} />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{control.code}</p>
                <h3 className="line-clamp-2 text-lg font-semibold">{control.name}</h3>
                <p className="text-sm text-muted-foreground">{control.processStage}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
