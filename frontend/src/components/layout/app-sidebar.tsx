import { LayoutDashboard, ListChecks, PlusSquare, Route, ScrollText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: LayoutDashboard, key: "dashboard", accent: "Live" },
  { to: "/controls", icon: ListChecks, key: "controls", accent: "MN" },
  { to: "/controls/new", icon: PlusSquare, key: "create", accent: "New" },
  { to: "/builder", icon: Route, key: "builder", accent: "Flow" },
  { to: "/logs", icon: ScrollText, key: "logs", accent: "Audit" },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();

  return (
    <aside className="flex h-full flex-col gap-6 bg-sidebar px-4 py-5 text-sidebar-foreground">
      <div className="rounded-[26px] border border-sidebar-border/80 bg-sidebar-primary/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sidebar-foreground/55">Control</p>
            <h2 className="mt-3 text-xl font-semibold">{t("appName")}</h2>
            <p className="mt-2 text-sm text-sidebar-foreground/70">MN life-cycle, builder, logs va dashboard bir joyda.</p>
          </div>
          <Badge className="h-7 rounded-full bg-sidebar-primary text-sidebar-primary-foreground">v4</Badge>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-[22px] border px-3 py-3 transition-all",
                  isActive
                    ? "border-sidebar-primary/35 bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "border-transparent bg-transparent text-sidebar-foreground/80 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-2xl border",
                        isActive ? "border-white/15 bg-white/10" : "border-sidebar-border/70 bg-sidebar-accent/50",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{t(`nav.${item.key}`)}</p>
                      <p className="text-xs text-current/70">{item.accent}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-current/70">{String(items.indexOf(item) + 1).padStart(2, "0")}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-sidebar-border/80 bg-sidebar-accent/80 p-4 text-sidebar-accent-foreground">
        <p className="text-xs uppercase tracking-[0.28em] text-sidebar-accent-foreground/55">Best practice</p>
        <p className="mt-3 text-sm leading-6">
          Critical MNlar uchun avval builder orqali oqimni tekshirib, keyin aktiv holatga o'tkazing.
        </p>
      </div>
    </aside>
  );
}
