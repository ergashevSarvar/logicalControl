import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

import { RU, US, UZ } from "country-flag-icons/react/3x2";
import { Bell, ChevronDown, LogOut, Menu, Monitor, Moon, Palette, Search, SunMedium, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";

import defaultAvatar from "@/assets/default-avatar.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localeLabels, paletteOptions, type LocaleCode, type PaletteName, type ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { usePalette } from "@/providers/palette-provider";

const languageFlags: Record<LocaleCode, ComponentType<{ title?: string; className?: string }>> = {
  uzCyrl: UZ,
  uzLatn: UZ,
  ru: RU,
  en: US,
};

const localeMap: Record<LocaleCode, string> = {
  uzCyrl: "uz-Cyrl-UZ",
  uzLatn: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

const weekdayLabels: Record<LocaleCode, string[]> = {
  uzCyrl: ["Якшанба", "Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба"],
  uzLatn: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
  ru: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const themeOptions: Array<{ value: ThemeMode; icon: typeof SunMedium; label: string }> = [
  { value: "light", icon: SunMedium, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

type TopbarProps = {
  expanded: boolean;
  onToggle: () => void;
};

export function Topbar({ expanded, onToggle }: TopbarProps) {
  const { t, i18n } = useTranslation();
  const { setTheme, theme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { user, logout } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const currentLocale = (i18n.language in localeLabels ? i18n.language : "uzLatn") as LocaleCode;
  const CurrentFlag = languageFlags[currentLocale];
  const currentLocaleLabel = localeLabels[currentLocale];
  const activeTheme = (theme ?? "system") as ThemeMode;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const weekdayLabel = weekdayLabels[currentLocale][now.getDay()] ?? capitalize(
    new Intl.DateTimeFormat(localeMap[currentLocale], {
      weekday: "long",
    }).format(now),
  );
  const dateLabel = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()}, ${weekdayLabel}`;
  const timeLabel = `${pad2(now.getHours())} : ${pad2(now.getMinutes())} : ${pad2(now.getSeconds())}`;
  const chromeBlockClass =
    "h-11 rounded-[16px] border border-white/60 bg-[color:rgba(var(--primary-rgb),0.06)] shadow-sm backdrop-blur-lg dark:border-white/10 dark:bg-white/8";
  const chromeTriggerClass =
    "h-11 rounded-[14px] border-transparent bg-transparent px-2.5 shadow-none hover:bg-white/50 dark:hover:bg-white/10";

  return (
    <header className="sticky top-3 z-30 rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,249,255,0.62))] px-5 py-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(25,31,43,0.84),rgba(20,26,37,0.8))]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-4 xl:w-[26rem]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("size-11 rounded-[16px]", chromeBlockClass, "hover:bg-white/70 dark:hover:bg-white/12")}
          >
            <Menu className="size-4.5" />
            <span className="sr-only">{expanded ? "Collapse sidebar" : "Expand sidebar"}</span>
          </Button>

          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium text-muted-foreground">{t("appName")}</p>
            <h2 className="truncate text-[1.65rem] leading-none font-semibold text-foreground">Administrator</h2>
          </div>
        </div>

        <div className="relative xl:max-w-sm xl:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={`${t("common.search")}...`}
            className="h-11 rounded-[16px] border-white/60 bg-[color:rgba(var(--primary-rgb),0.045)] pr-4 pl-11 shadow-sm placeholder:text-slate-500 dark:border-white/10 dark:bg-white/8 dark:placeholder:text-slate-400"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className={cn("flex h-11 min-w-[12rem] flex-col items-center justify-center rounded-[16px] px-3 text-center", chromeBlockClass)}>
            <p className="text-xs font-medium text-primary">{dateLabel}</p>
            <p className="text-[1.1rem] font-semibold tracking-[0.18em] text-primary">{timeLabel}</p>
          </div>

          <div className={cn("flex items-center px-1.5", chromeBlockClass)}>
            <Select value={i18n.language} onValueChange={(value) => value && i18n.changeLanguage(value)}>
              <SelectTrigger className={cn("min-w-[9.5rem]", chromeTriggerClass)}>
                <CurrentFlag className="h-3.5 w-5 rounded-[2px] shadow-sm" />
                <span className="truncate text-sm">{currentLocaleLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(localeLabels) as LocaleCode[]).map((locale) => {
                  const Flag = languageFlags[locale];
                  return (
                    <SelectItem key={locale} value={locale}>
                      <span className="flex items-center gap-2">
                        <Flag className="h-3.5 w-5 rounded-[2px] shadow-sm" />
                        <span>{localeLabels[locale]}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={palette} onValueChange={(value) => value && setPalette(value as PaletteName)}>
              <SelectTrigger className={cn("min-w-[7.75rem]", chromeTriggerClass)}>
                <Palette className="size-4 text-muted-foreground" />
                <SelectValue placeholder={t("common.palette")} />
              </SelectTrigger>
              <SelectContent>
                {paletteOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("flex items-center gap-1 px-1.5", chromeBlockClass)}>
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = activeTheme === option.value;

              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "size-9 rounded-[12px]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_14px_24px_-18px_rgba(var(--primary-rgb),0.95)]"
                      : "bg-transparent text-sidebar-foreground hover:bg-white/55 dark:hover:bg-white/10",
                  )}
                  title={option.label}
                >
                  <Icon className="size-4.5" />
                  <span className="sr-only">{option.label}</span>
                </Button>
              );
            })}
          </div>

          <div className={cn("flex items-center justify-center p-1", chromeBlockClass)}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-[12px] bg-transparent hover:bg-white/55 dark:hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
            </Button>
          </div>

          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              className={cn("flex items-center gap-3 px-3", chromeBlockClass, "min-w-[10.5rem]")}
            >
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/55 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/10">
                <img src={defaultAvatar} alt="Default avatar" className="size-9 object-cover" />
              </div>
              <div className="hidden text-right md:block">
                <p className="max-w-[12rem] truncate text-sm font-medium text-foreground">{user?.username ?? "superadmin"}</p>
              </div>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isUserMenuOpen && "rotate-180")} />
            </button>

            {isUserMenuOpen ? (
              <div className="absolute top-[calc(100%+0.6rem)] right-0 z-50 w-56 overflow-hidden rounded-[18px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,255,0.94))] shadow-[0_22px_46px_-24px_rgba(15,23,42,0.34)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,33,46,0.96),rgba(20,26,37,0.94))]">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    toast.info("Profil bo'limi tez orada qo'shiladi.");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition hover:bg-black/[0.03] dark:hover:bg-white/6"
                >
                  <User className="size-4 text-muted-foreground" />
                  <span>Profil</span>
                </button>
                <div className="h-px bg-border/80" />
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutDialogOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-500/6 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  <LogOut className="size-4" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isLogoutDialogOpen ? createPortal(
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
              <h3 className="text-xl font-semibold text-foreground">Tizimdan chiqishni tasdiqlaysizmi?</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Joriy sessiya yakunlanadi va siz login sahifasiga qaytasiz.
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
        </div>,
        document.body,
      ) : null}
    </header>
  );
}
