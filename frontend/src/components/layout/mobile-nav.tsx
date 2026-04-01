import { Blocks, LayoutDashboard, ListChecks, PlusSquare, Route, ScrollText } from "lucide-react";
import { matchPath, NavLink, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/classifiers", label: "Tasniflagichlar", icon: Blocks },
  { to: "/controls", label: "MN", icon: ListChecks },
  { to: "/controls/new", label: "New", icon: PlusSquare },
  { to: "/builder", label: "Builder", icon: Route },
  { to: "/logs", label: "Logs", icon: ScrollText },
] as const;

export function MobileNav() {
  const { pathname } = useLocation();

  const isItemActive = (to: (typeof items)[number]["to"]) => {
    switch (to) {
      case "/":
        return pathname === "/";
      case "/controls":
        return pathname === "/controls";
      case "/classifiers":
        return pathname === "/classifiers";
      case "/controls/new":
        return pathname === "/controls/new" || Boolean(matchPath("/controls/:id/edit", pathname));
      case "/builder":
        return pathname === "/builder" || Boolean(matchPath("/controls/:id/builder", pathname));
      case "/logs":
        return pathname === "/logs";
      default:
        return false;
    }
  };

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isItemActive(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-[112px] items-center gap-2 rounded-[20px] border px-3 py-2 text-sm font-medium transition",
              isActive
                ? "border-primary/35 bg-primary text-primary-foreground"
                : "border-border/70 bg-card/80 text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
