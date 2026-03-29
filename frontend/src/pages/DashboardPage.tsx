import type { ReactNode } from "react";
import {
  Activity,
  Clock3,
  Flame,
  GitBranch,
  Grip,
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
  { key: "AT", label: "AT", color: "#1d4ed8", description: "AT tizimidagi triggerlar oqimi" },
  { key: "EK", label: "EK", color: "#0ea5e9", description: "EK tizimidagi triggerlar oqimi" },
  { key: "RW", label: "RW", color: "#14b8a6", description: "RW tizimidagi triggerlar oqimi" },
  { key: "EC", label: "EC", color: "#8b5cf6", description: "EC tizimidagi triggerlar oqimi" },
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

type HeatmapCell = {
  count: number;
  dateLabel: string;
  intensity: 0 | 1 | 2 | 3 | 4;
};

type HeatmapMonth = {
  label: string;
  weeks: Array<Array<HeatmapCell | null>>;
};

const weekdayScale = [0.72, 0.82, 0.94, 1.08, 1.18, 0.9, 0.66] as const;
const monthTotals = trendData.map((item) => ({
  label: item.label,
  total: lineConfig.reduce((sum, line) => sum + item[line.key], 0),
}));

function buildHeatmapData() {
  const year = new Date().getFullYear();
  const values: number[] = [];
  const months: HeatmapMonth[] = [];

  monthTotals.forEach((month, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const averagePerDay = month.total / daysInMonth;
    const monthCells: Array<HeatmapCell | null> = Array.from({ length: firstWeekday }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      const weekday = (date.getDay() + 6) % 7;
      const wave = 0.86 + Math.sin((day / daysInMonth) * Math.PI) * 0.24;
      const variation = ((monthIndex + day) % 4) * 0.08;
      const count = Math.round(averagePerDay * weekdayScale[weekday] * wave + averagePerDay * variation);

      values.push(count);
      monthCells.push({
        count,
        dateLabel: `${day} ${month.label}`,
        intensity: 0,
      });
    }

    const monthWeeks: Array<Array<HeatmapCell | null>> = [];
    for (let index = 0; index < monthCells.length; index += 7) {
      monthWeeks.push(monthCells.slice(index, index + 7));
    }

    const lastWeek = monthWeeks.at(-1);
    if (lastWeek && lastWeek.length < 7) {
      while (lastWeek.length < 7) {
        lastWeek.push(null);
      }
    }

    months.push({
      label: month.label,
      weeks: monthWeeks,
    });
  });

  const maxValue = Math.max(...values, 1);

  months.forEach((month) => {
    month.weeks = month.weeks.map((week) =>
      week.map((cell) => {
        if (!cell) {
          return null;
        }

        const ratio = cell.count / maxValue;
        const intensity = ratio >= 0.82 ? 4 : ratio >= 0.58 ? 3 : ratio >= 0.34 ? 2 : ratio >= 0.16 ? 1 : 0;
        return { ...cell, intensity: intensity as HeatmapCell["intensity"] };
      }),
    );
  });

  return {
    total: values.reduce((sum, value) => sum + value, 0),
    maxValue,
    months,
  };
}

const heatmapData = buildHeatmapData();
const heatmapLegend = [0, 1, 2, 3, 4] as const;
const heatmapLevels: Record<number, string> = {
  0: "bg-muted/55 dark:bg-white/7",
  1: "bg-primary/18 dark:bg-primary/24",
  2: "bg-primary/34 dark:bg-primary/40",
  3: "bg-primary/56 dark:bg-primary/62",
  4: "bg-primary/84 dark:bg-primary/88",
};

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
                <GitBranch className="size-4 text-primary" />
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
              {lineConfig.map((line) => (
                <div
                  key={line.key}
                  className="rounded-[20px] border border-border/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,255,0.8))] px-4 py-3 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(180deg,rgba(28,34,46,0.86),rgba(22,28,38,0.74))]"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-[3px] w-10 rounded-full" style={{ backgroundColor: line.color }} />
                    <span className="text-sm font-semibold text-foreground">{line.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{line.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[26px] border border-border/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,255,0.84))] p-4 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.2)] dark:bg-[linear-gradient(180deg,rgba(28,34,46,0.9),rgba(22,28,38,0.78))]">
              <div className="flex flex-col gap-3 border-b border-border/55 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary/70">Faollik xaritasi</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {heatmapData.total.toLocaleString("en-US")} ta ishga tushish oxirgi 12 oyda
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Har bir katak bir kunni bildiradi. Ishga tushish qancha ko'p bo'lsa, rang shuncha to'q ko'rinadi.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-[16px] border border-border/65 bg-background/80 px-3 py-2 shadow-sm">
                  <Flame className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Kunlik MN zichligi</span>
                </div>
              </div>

              <div className="mt-4 overflow-hidden">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="grid shrink-0 grid-rows-7 gap-1 pt-5 text-[11px] text-muted-foreground">
                    {["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Yak"].map((day) => (
                      <span key={day} className="flex h-2.5 items-center leading-none md:h-3">
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="grid grid-cols-4 gap-x-2 gap-y-3 md:grid-cols-6 xl:grid-cols-12">
                      {heatmapData.months.map((month) => (
                        <div key={month.label} className="min-w-0">
                          <p className="mb-2 pl-0.5 text-xs font-medium text-muted-foreground">{month.label}</p>
                          <div className="flex gap-0.5 md:gap-1">
                            {month.weeks.map((week, weekIndex) => (
                              <div key={`${month.label}-${weekIndex}`} className="grid grid-rows-7 gap-0.5 md:gap-1">
                                {week.map((cell, dayIndex) => (
                                  <div
                                    key={`${month.label}-${weekIndex}-${dayIndex}`}
                                    title={cell ? `${cell.dateLabel}: ${cell.count} ta ishga tushish` : ""}
                                    className={cn(
                                      "size-2.5 rounded-[3px] border border-border/35 transition-transform duration-150 hover:scale-[1.18] md:size-3",
                                      cell ? heatmapLevels[cell.intensity] : "border-transparent bg-transparent",
                                    )}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-[18px] border border-border/60 bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                Oylar alohida bloklarda ko'rsatilgan. Har bir katak bitta kunga teng.
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-border/55 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Grip className="size-4 text-primary/80" />
                  <span>Eng yuqori kunlik qiymat: {heatmapData.maxValue.toLocaleString("en-US")} ta trigger</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Kam</span>
                  <div className="flex items-center gap-1">
                    {heatmapLegend.map((level) => (
                      <span
                        key={level}
                        className={cn("size-3 rounded-[4px] border border-border/35", heatmapLevels[level])}
                      />
                    ))}
                  </div>
                  <span>Ko'p</span>
                </div>
              </div>
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
    <Card className="relative overflow-hidden border-border/70 bg-card/94 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.26)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-[28px] bg-[radial-gradient(circle_at_top,rgba(var(--primary-rgb),0.14),transparent_72%)] blur-2xl" />
      <div className="pointer-events-none absolute top-5 right-5 size-20 rounded-full bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.16),transparent_68%)] blur-2xl" />
      <div className="pointer-events-none absolute top-4 left-4 h-10 w-10 rounded-[16px] border border-white/40 bg-white/22 opacity-60 dark:border-white/8 dark:bg-white/5" />

      <CardContent className="relative space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-[16px] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(var(--primary-rgb),0.08))] text-primary shadow-[0_16px_28px_-22px_rgba(var(--primary-rgb),0.46)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(var(--primary-rgb),0.12))]">
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
