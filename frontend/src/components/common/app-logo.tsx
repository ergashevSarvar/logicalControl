import { useTranslation } from "react-i18next";

import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  frameClassName?: string;
  imageClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showText?: boolean;
  subtitle?: string;
  title?: string;
  titleMultiline?: boolean;
};

export function AppLogo({
  className,
  frameClassName,
  imageClassName,
  titleClassName,
  subtitleClassName,
  showText = true,
  subtitle,
  title,
  titleMultiline = false,
}: AppLogoProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("appName");

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex shrink-0 items-center justify-center overflow-hidden", frameClassName)}>
        <img src={logo} alt={`${resolvedTitle} logo`} className={cn("size-12 object-contain", imageClassName)} />
      </div>

      {showText ? (
        <div className="min-w-0">
          <p className={cn(titleMultiline ? "text-base font-semibold text-foreground" : "truncate text-base font-semibold text-foreground", titleClassName)}>{resolvedTitle}</p>
          {subtitle ? <p className={cn("truncate text-sm text-muted-foreground", subtitleClassName)}>{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
