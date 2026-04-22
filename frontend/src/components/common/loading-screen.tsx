import { useTranslation } from "react-i18next";

import { AppLogo } from "@/components/common/app-logo";

export function LoadingScreen() {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === "UZ" || i18n.language === "OZ" || i18n.language === "RU" || i18n.language === "EN"
    ? i18n.language
    : "OZ";
  const subtitleByLocale = {
    OZ: "Ishchi muhit yuklanmoqda...",
    UZ: "Ишчи муҳит юкланмоқда...",
    RU: "Рабочая среда загружается...",
    EN: "Workspace is loading...",
  } as const;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="space-y-4 text-center">
        <AppLogo className="justify-center" imageClassName="size-16 animate-pulse" showText={false} />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("appName")}</h2>
          <p className="text-sm text-muted-foreground">{subtitleByLocale[currentLocale]}</p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;

