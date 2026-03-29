import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ResultBadge, SystemBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const overviewCards = [
  {
    key: "all",
    title: "Jami MN",
    value: "148",
    helper: "Barcha tizimlar bo'yicha faol va passiv oqimlar",
    delta: "+12 ta",
    icon: <ShieldCheck className="size-4.5" />,
  },
  {
    key: "active",
    title: "Faol MN",
    value: "126",
    helper: "Hozir ishlayotgan nazoratlar soni",
    delta: "+8.4%",
    icon: <TrendingUp className="size-4.5" />,
  },
  {
    key: "daily",
    title: "Bugungi trigger",
    value: "2 846",
    helper: "So'nggi 24 soatda qayd etilgan ishga tushishlar",
    delta: "+154",
    icon: <Activity className="size-4.5" />,
  },
  {
    key: "latency",
    title: "O'rtacha vaqt",
    value: "184 ms",
    helper: "Mantiqiy nazoratning o'rtacha javob vaqti",
    delta: "-12 ms",
    icon: <Clock3 className="size-4.5" />,
  },
] as const;

const trendData = [
  { label: "Yan", AT: 220, EK: 186, RW: 172, EC: 154 },
  { label: "Fev", AT: 268, EK: 198, RW: 190, EC: 162 },
  { label: "Mar", AT: 312, EK: 224, RW: 214, EC: 180 },
  { label: "Apr", AT: 286, EK: 236, RW: 208, EC: 194 },
  { label: "May", AT: 338, EK: 252, RW: 226, EC: 210 },
  { label: "Iyun", AT: 372, EK: 274, RW: 240, EC: 224 },
  { label: "Iyul", AT: 418, EK: 298, RW: 264, EC: 240 },
  { label: "Avg", AT: 394, EK: 286, RW: 252, EC: 231 },
  { label: "Sen", AT: 436, EK: 314, RW: 278, EC: 246 },
  { label: "Okt", AT: 468, EK: 332, RW: 296, EC: 264 },
  { label: "Noy", AT: 442, EK: 320, RW: 288, EC: 251 },
  { label: "Dek", AT: 488, EK: 348, RW: 304, EC: 270 },
] as const;

const lineConfig = [
  { key: "AT", label: "AT", color: "#1d4ed8" },
  { key: "EK", label: "EK", color: "#0ea5e9" },
  { key: "RW", label: "RW", color: "#14b8a6" },
  { key: "EC", label: "EC", color: "#8b5cf6" },
] as const;

const systemCounts = [
  { key: "AT", label: "AT", value: 41, tone: "from-blue-500/18 via-blue-500/8 to-transparent" },
  { key: "EK", label: "EK", value: 36, tone: "from-sky-500/18 via-sky-500/8 to-transparent" },
  { key: "RW", label: "RW", value: 34, tone: "from-teal-500/18 via-teal-500/8 to-transparent" },
  { key: "EC", label: "EC", value: 37, tone: "from-violet-500/18 via-violet-500/8 to-transparent" },
] as const;

const recentControls = [
  {
    id: 1,
    code: "MN-AT-014",
    name: "Ruxsatnoma muddati bo'yicha nazorat",
    system: "AT",
    when: "17:42",
    count: 124,
    result: "NEGATIVE" as const,
  },
  {
    id: 2,
    code: "MN-EK-021",
    name: "Risk toifasi bo'yicha ogohlantirish",
    system: "EK",
    when: "17:35",
    count: 96,
    result: "POSITIVE" as const,
  },
  {
    id: 3,
    code: "MN-RW-009",
    name: "Transport vositasi mosligi tekshiruvi",
    system: "RW",
    when: "17:28",
    count: 88,
    result: "POSITIVE" as const,
  },
  {
    id: 4,
    code: "MN-EC-031",
    name: "Qabul qiluvchi istisnolari nazorati",
    system: "EC",
    when: "17:11",
    count: 73,
    result: "NEGATIVE" as const,
  },
  {
    id: 5,
    code: "MN-AT-033",
    name: "Avtomatik bekor bo'lish muddati tekshiruvi",
    system: "AT",
    when: "16:58",
    count: 61,
    result: "POSITIVE" as const,
  },
] as const;

const triggerTotals = lineConfig.map((line) => ({
  key: line.key,
  label: line.label,
  color: line.color,
  total: trendData.reduce((sum, item) => sum + item[line.key], 0),
}));

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <OverviewCard
            key={card.key}
            title={card.title}
            value={card.value}
            helper={card.helper}
            delta={card.delta}
            icon={card.icon}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.72fr]">
        <Card className="overflow-hidden border-border/70 bg-card/94 shadow-[0_26px_56px_-36px_rgba(15,23,42,0.28)]">
          <CardHeader className="border-b border-border/55 pb-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/70">Analytics</p>
                <CardTitle className="mt-2 text-2xl">AT / EK / RW / EC ishlash dinamikasi</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tizimlar kesimida mantiqiy nazoratlarning ishga tushish trayektoriyasi.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-[18px] border border-border/70 bg-background/80 px-3 py-2 shadow-sm">
                <BarChart3 className="size-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Yillik monitoring</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 12, right: 10, left: -16, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid var(--border)",
                      background: "color-mix(in srgb, var(--card) 97%, white 3%)",
                      boxShadow: "0 18px 40px -28px rgba(15,23,42,0.38)",
                    }}
                  />
                  {lineConfig.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      stroke={line.color}
                      strokeWidth={3}
                      dot={{ r: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0, fill: line.color }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {triggerTotals.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[20px] border border-border/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,255,0.82))] px-4 py-3 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.2)] dark:bg-[linear-gradient(180deg,rgba(28,34,46,0.9),rgba(22,28,38,0.78))]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="h-2.5 w-10 rounded-full" style={{ backgroundColor: item.color }} />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                    {item.total.toLocaleString("en-US")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">jami ishga tushgan holatlar</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/70 bg-card/94 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)]">
            <CardHeader>
              <CardTitle>Tizimlar kesimida MN soni</CardTitle>
              <p className="text-sm text-muted-foreground">
                Har bir tizim ichida hozir mavjud bo'lgan mantiqiy nazoratlar.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemCounts.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "rounded-[20px] border border-border/70 bg-[linear-gradient(90deg,rgba(255,255,255,0.92),rgba(248,250,255,0.82))] px-4 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.2)] dark:bg-[linear-gradient(90deg,rgba(28,34,46,0.9),rgba(22,28,38,0.78))]",
                    `bg-gradient-to-r ${item.tone}`,
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <SystemBadge system={item.key} />
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <span className="text-lg font-semibold text-foreground">{item.value}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/94 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Oxirgi ishlagan MNlar</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">So'nggi trigger qaydlarining qisqa ro'yxati</p>
                </div>
                <Sparkles className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentControls.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,255,0.82))] p-4 shadow-[0_18px_32px_-30px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(180deg,rgba(28,34,46,0.88),rgba(22,28,38,0.76))]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.code}</p>
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</p>
                    </div>
                    <ResultBadge result={item.result} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <SystemBadge system={item.system} />
                    <span className="text-sm text-muted-foreground">{item.when}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{item.count}</span> marta ishlagan
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  helper,
  delta,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  delta: string;
  icon: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/94 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.26)]">
      <div className="h-1.5 bg-[linear-gradient(90deg,var(--primary),var(--chart-2),var(--chart-3))]" />
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {delta}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-[2rem] font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}
