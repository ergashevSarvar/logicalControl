import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

import { RU, US, UZ } from "country-flag-icons/react/3x2";
import { Bell, ChevronDown, Clock3, LogOut, Menu, Monitor, Moon, Palette, Search, SunMedium, User, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";

import defaultAvatar from "@/assets/default-avatar.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGE_STORAGE_KEY } from "@/i18n";
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
const RECENT_SEARCHES_KEY = "logical-control.recent-searches";
const MAX_RECENT_SEARCHES = 7;
const SEARCH_PLACEHOLDER_POOL = [
  "Ruxsatnoma muddati nazorati",
  "Risk toifasi ogohlantirishi",
  "Transport mosligi tekshiruvi",
  "Qabul qiluvchi istisnolari",
  "Avto bekor qilish muddati",
  "Deklaratsiya qiymati nazorati",
  "Broker faolligi monitoringi",
  "Yuk kodi verifikatsiyasi",
  "Hududiy post cheklovi",
  "Import limiti tekshiruvi",
] as const;

function pickRandomSearchHints(count: number) {
  return [...SEARCH_PLACEHOLDER_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

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
  const [searchValue, setSearchValue] = useState("");
  const [searchHints] = useState(() => pickRandomSearchHints(5));
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderLength, setPlaceholderLength] = useState(0);
  const [isDeletingPlaceholder, setIsDeletingPlaceholder] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
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
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }

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
  const activeSearchHint = searchHints[placeholderIndex] ?? `${t("common.search")}...`;
  const animatedSearchHint = activeSearchHint.slice(0, placeholderLength);

  function persistRecentSearches(nextSearches: string[]) {
    setRecentSearches(nextSearches);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches));
  }

  function commitSearch(rawValue: string) {
    const normalized = rawValue.trim();
    if (!normalized) {
      return;
    }

    const nextSearches = [
      normalized,
      ...recentSearches.filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    persistRecentSearches(nextSearches);
    setSearchValue(normalized);
    setIsSearchOpen(true);
  }

  function removeRecentSearch(value: string) {
    persistRecentSearches(recentSearches.filter((item) => item !== value));
  }

  useEffect(() => {
    if (searchValue || searchHints.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!isDeletingPlaceholder && placeholderLength < activeSearchHint.length) {
        setPlaceholderLength((current) => current + 1);
        return;
      }

      if (!isDeletingPlaceholder && placeholderLength === activeSearchHint.length) {
        setIsDeletingPlaceholder(true);
        return;
      }

      if (isDeletingPlaceholder && placeholderLength > 0) {
        setPlaceholderLength((current) => current - 1);
        return;
      }

      setIsDeletingPlaceholder(false);
      setPlaceholderIndex((current) => (current + 1) % searchHints.length);
    }, !isDeletingPlaceholder && placeholderLength === activeSearchHint.length ? 1500 : isDeletingPlaceholder ? 45 : 75);

    return () => window.clearTimeout(timeout);
  }, [activeSearchHint, isDeletingPlaceholder, placeholderLength, searchHints, searchValue]);

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

        <div ref={searchRef} className="relative xl:max-w-[28rem] xl:flex-1">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              commitSearch(searchValue);
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute top-1/2 left-5 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchValue}
              placeholder=""
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="h-13 rounded-[18px] border-white/60 bg-[color:rgba(var(--primary-rgb),0.05)] pr-14 pl-13 text-sm shadow-[0_14px_30px_-24px_rgba(15,23,42,0.28)] placeholder:text-slate-500 dark:border-white/10 dark:bg-white/8 dark:placeholder:text-slate-400"
            />
            {!searchValue ? (
              <div className="pointer-events-none absolute inset-y-0 left-13 right-14 flex items-center overflow-hidden">
                <span className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {animatedSearchHint || `${t("common.search")}...`}
                  <span className="ml-0.5 inline-block animate-pulse text-primary">|</span>
                </span>
              </div>
            ) : null}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 size-9 -translate-y-1/2 rounded-[14px] bg-white/66 text-muted-foreground shadow-sm hover:bg-white dark:bg-white/8 dark:hover:bg-white/12"
              aria-label="Qidirish"
            >
              <Search className="size-4" />
            </Button>
          </form>

          {isSearchOpen && recentSearches.length > 0 ? (
            <div className="absolute top-[calc(100%+0.75rem)] left-0 z-40 w-full overflow-hidden rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,250,255,0.95))] shadow-[0_26px_56px_-32px_rgba(15,23,42,0.34)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,33,46,0.96),rgba(20,26,37,0.94))]">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Yaqinda qidirilganlar</p>
                <button
                  type="button"
                  onClick={() => persistRecentSearches([])}
                  className="text-sm font-medium text-primary transition hover:text-primary/80"
                >
                  Tozalash
                </button>
              </div>

              <div className="max-h-[22rem] overflow-y-auto p-2">
                {recentSearches.slice(0, MAX_RECENT_SEARCHES).map((item) => (
                  <div
                    key={item}
                    className="group flex items-center gap-3 rounded-[18px] px-3 py-3 transition hover:bg-black/[0.03] dark:hover:bg-white/6"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue(item);
                        commitSearch(item);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground">
                        <Clock3 className="size-4" />
                      </div>
                      <span className="truncate text-sm font-medium text-foreground">{item}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeRecentSearch(item)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/8"
                      aria-label={`${item} ni o'chirish`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className={cn("flex h-11 min-w-[12rem] flex-col items-center justify-center rounded-[16px] px-3 text-center", chromeBlockClass)}>
            <p className="text-xs font-medium text-primary">{dateLabel}</p>
            <p className="text-[1.1rem] font-semibold tracking-[0.18em] text-primary">{timeLabel}</p>
          </div>

          <div className={cn("flex items-center px-1.5", chromeBlockClass)}>
            <Select
              value={i18n.language}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
                void i18n.changeLanguage(value);
              }}
            >
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
