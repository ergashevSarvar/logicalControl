import { LayoutDashboard, ListChecks, PlusSquare, Route, ScrollText } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/controls", label: "MN", icon: ListChecks },
  { to: "/controls/new", label: "New", icon: PlusSquare },
  { to: "/builder", label: "Builder", icon: Route },
  { to: "/logs", label: "Logs", icon: ScrollText },
] as const;

export function MobileNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-[112px] items-center gap-2 rounded-[20px] border px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "border-primary/35 bg-primary text-primary-foreground"
                  : "border-border/70 bg-card/80 text-muted-foreground",
              )
            }
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
