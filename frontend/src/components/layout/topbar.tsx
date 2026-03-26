import { LogOut, Moon, Palette, SunMedium, SwatchBook } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localeLabels, paletteOptions, type LocaleCode, type PaletteName, type ThemeMode } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { usePalette } from "@/providers/palette-provider";

export function Topbar() {
  const { t, i18n } = useTranslation();
  const { setTheme, theme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { logout, user } = useAuth();

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/70 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Workspace</p>
        <h3 className="mt-1 text-lg font-semibold">{user?.fullName ?? "Operator"}</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={i18n.language} onValueChange={(value) => value && i18n.changeLanguage(value)}>
          <SelectTrigger className="min-w-36">
            <SwatchBook className="size-4 text-muted-foreground" />
            <SelectValue placeholder={t("common.language")} />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(localeLabels) as LocaleCode[]).map((locale) => (
              <SelectItem key={locale} value={locale}>
                {localeLabels[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={(theme ?? "system") as ThemeMode} onValueChange={(value) => value && setTheme(value)}>
          <SelectTrigger className="min-w-32">
            {theme === "dark" ? <Moon className="size-4 text-muted-foreground" /> : <SunMedium className="size-4 text-muted-foreground" />}
            <SelectValue placeholder={t("common.theme")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select value={palette} onValueChange={(value) => value && setPalette(value as PaletteName)}>
          <SelectTrigger className="min-w-36">
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

        <Button variant="outline" onClick={logout}>
          <LogOut className="size-4" />
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );
}
