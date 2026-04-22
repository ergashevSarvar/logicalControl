import {
  Blocks,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusSquare,
  Route,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { matchPath, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import type { LocaleCode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const items = [
  { to: "/", icon: LayoutDashboard, key: "dashboard" },
  { to: "/classifiers", icon: Blocks, key: "classifiers" },
  { to: "/controls", icon: ListChecks, key: "controls" },
  { to: "/controls/new", icon: PlusSquare, key: "create" },
  { to: "/builder", icon: Route, key: "builder" },
  { to: "/logs", icon: ScrollText, key: "logs" },
] as const;

const fallbackLabels: Record<(typeof items)[number]["key"], string> = {
  dashboard: "Bosh sahifa",
  classifiers: "Tasniflagichlar",
  controls: "Mantiqiy nazoratlar",
  create: "Yangi yaratish",
  builder: "Visual Rule Builder",
  logs: "Logs va statistika",
};

type AppSidebarProps = {
  expanded: boolean;
  onToggle: () => void;
};

export function AppSidebar({ expanded, onToggle }: AppSidebarProps) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { pathname } = useLocation();
  const currentLocale = (i18n.language === "UZ" || i18n.language === "OZ" || i18n.language === "RU" || i18n.language === "EN"
    ? i18n.language
    : "OZ") as LocaleCode;
  const appNameLines: Record<LocaleCode, [string, string]> = {
    OZ: ["Mantiqiy", "Nazorat"],
    UZ: ["Мантиқий", "Назорат"],
    RU: ["Логический", "Контроль"],
    EN: ["Logical", "Control"],
  };
  const sidebarText = {
    expand: {
      OZ: "Yon panelni kengaytirish",
      UZ: "Ён панелни кенгайтириш",
      RU: "Развернуть боковую панель",
      EN: "Expand sidebar",
    },
    logoutTitle: {
      OZ: "Tizimdan chiqishni tasdiqlaysizmi?",
      UZ: "Тизимдан чиқишни тасдиқлайсизми?",
      RU: "Подтвердить выход из системы?",
      EN: "Confirm sign out?",
    },
    logoutDescription: {
      OZ: "Joriy sessiya yakunlanadi va siz login sahifasiga qaytasiz.",
      UZ: "Жорий сессия якунланади ва сиз логин саҳифасига қайтаcиз.",
      RU: "Текущая сессия завершится, и вы вернетесь на страницу входа.",
      EN: "Your current session will end and you will return to the login page.",
    },
  } as const;

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
    <>
      <aside
        className={cn(
          "fixed inset-y-3 left-3 z-40 hidden transition-[width] duration-300 ease-out lg:flex",
          expanded ? "w-[15rem]" : "w-[4.75rem]",
        )}
      >
        <div className="relative flex h-full w-full flex-col rounded-[28px] border border-white/62 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,250,255,0.9))] px-3 py-4 text-sidebar-foreground shadow-[0_24px_60px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(25,31,43,0.72),rgba(20,26,37,0.62))]">
        <div className={cn("flex items-start", expanded ? "justify-between gap-2" : "justify-center")}>
          {expanded ? (
            <div className="w-full px-1 py-2">
              <div className="flex items-center gap-2.5">
                <AppLogo
                  showText={false}
                  imageClassName="size-11"
                  frameClassName="rounded-[16px] bg-transparent"
                />
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary/75">
                    {appNameLines[currentLocale][0]}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary/75">
                    {appNameLines[currentLocale][1]}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onToggle}
              className="h-auto rounded-[24px] bg-transparent p-0 hover:bg-transparent"
            >
              <AppLogo
                showText={false}
                imageClassName="size-11"
                frameClassName="rounded-[18px] bg-transparent"
              />
              <span className="sr-only">{sidebarText.expand[currentLocale]}</span>
            </Button>
          )}
        </div>

        <div className="my-4 h-px bg-sidebar-border/55" />

        <nav className="sidebar-scroll flex-1 overflow-y-auto pr-0.5">
          <div className={cn(expanded ? "space-y-2" : "space-y-3")}>
            {items.map((item) => {
              const Icon = item.icon;
              const translatedLabel = t(`nav.${item.key}`);
              const label = translatedLabel === `nav.${item.key}` ? fallbackLabels[item.key] : translatedLabel;
              const isActive = isItemActive(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                  title={!expanded ? label : undefined}
                  className={cn(
                    "group relative flex transition-all duration-200",
                    expanded
                      ? "h-12 items-center gap-3 overflow-hidden rounded-[14px] border px-3.5"
                      : "mx-auto size-12 items-center justify-center rounded-full border",
                    isActive
                      ? expanded
                        ? "border-[color:rgba(var(--primary-rgb),0.18)] bg-[linear-gradient(90deg,rgba(var(--primary-rgb),0.14),rgba(var(--accent-rgb),0.08))] text-primary shadow-[0_12px_24px_-22px_rgba(var(--primary-rgb),0.3)]"
                        : "border-primary/20 bg-primary text-primary-foreground shadow-[0_16px_30px_-18px_rgba(var(--primary-rgb),0.95)]"
                      : expanded
                        ? "border-[color:rgba(var(--primary-rgb),0.08)] bg-[color:rgba(var(--primary-rgb),0.055)] text-sidebar-foreground shadow-[0_12px_26px_-22px_rgba(15,23,42,0.18)] backdrop-blur-lg hover:border-[color:rgba(var(--primary-rgb),0.16)] hover:bg-[color:rgba(var(--primary-rgb),0.09)] dark:border-white/10 dark:bg-white/7 dark:hover:bg-white/11"
                        : "border-white/45 bg-white/46 text-sidebar-foreground shadow-[0_12px_26px_-22px_rgba(15,23,42,0.28)] backdrop-blur-lg hover:border-primary/16 hover:bg-white/62 dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10",
                  )}
                >
                  {expanded && isActive ? (
                    <span className="absolute inset-y-0 left-0 w-[6px] rounded-r-[10px] bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.96),rgba(var(--accent-rgb),0.76))] shadow-[0_0_16px_rgba(var(--primary-rgb),0.34)]" />
                  ) : null}
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center",
                      expanded ? "size-8 rounded-[10px]" : "size-12 rounded-full",
                      isActive
                        ? expanded
                          ? "bg-primary/10 text-primary"
                          : "bg-white/15 text-current"
                        : "bg-transparent text-sidebar-foreground/80 group-hover:text-sidebar-foreground dark:text-sidebar-foreground/85",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  {expanded ? <span className="truncate text-sm font-medium">{label}</span> : null}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="mt-4 h-px bg-sidebar-border/55" />

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsLogoutDialogOpen(true)}
            title={!expanded ? t("common.logout") : undefined}
            className={cn(
              "mt-4 border border-red-200/75 bg-red-50/86 text-red-500 shadow-[0_14px_24px_-20px_rgba(239,68,68,0.32)] backdrop-blur-lg hover:bg-red-100 hover:text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/16",
              expanded ? "h-12 w-full justify-start rounded-[18px] px-3.5" : "mx-auto size-12 rounded-full p-0",
            )}
          >
            <LogOut className="size-5" />
            {expanded ? <span>{t("common.logout")}</span> : null}
          </Button>
        </div>
      </aside>

      {isLogoutDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsLogoutDialogOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,33,46,0.96),rgba(20,26,37,0.92))]">
            <div className="flex size-12 items-center justify-center rounded-[18px] bg-red-500/10 text-red-500 dark:bg-red-500/14 dark:text-red-300">
              <LogOut className="size-5" />
            </div>

            <div className="mt-4 space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{sidebarText.logoutTitle[currentLocale]}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {sidebarText.logoutDescription[currentLocale]}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsLogoutDialogOpen(false);
                  logout();
                }}
                className="bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
              >
                {t("common.logout")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

