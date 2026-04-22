import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { ControlStatus, ControlType, ControlSystem, LocaleCode, LogResult } from "@/lib/types";

const statusMap: Record<ControlStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Faol", variant: "default" },
  CANCELLED: { label: "Bekor", variant: "outline" },
  SUSPENDED: { label: "To'xtatilgan", variant: "secondary" },
};

const typeMap: Record<ControlType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  WARNING: { label: "Ogohlantirish", variant: "secondary" },
  ALLOW: { label: "Istisno", variant: "default" },
  BLOCK: { label: "Taqiqlash", variant: "destructive" },
};

const resultMap: Record<LogResult, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  POSITIVE: { label: "Ijobiy", variant: "default" },
  NEGATIVE: { label: "Salbiy", variant: "destructive" },
};

export function StatusBadge({ status }: { status: ControlStatus }) {
  const { t } = useTranslation();
  const item = statusMap[status];
  const labelMap: Record<ControlStatus, string> = {
    ACTIVE: t("editor.options.active"),
    CANCELLED: t("editor.options.cancelled"),
    SUSPENDED: t("editor.options.suspended"),
  };
  return <Badge variant={item.variant}>{labelMap[status]}</Badge>;
}

export function TypeBadge({ type }: { type: ControlType }) {
  const { t } = useTranslation();
  const item = typeMap[type];
  const labelMap: Record<ControlType, string> = {
    WARNING: t("editor.options.warning"),
    ALLOW: t("editor.options.allow"),
    BLOCK: t("editor.options.block"),
  };
  return <Badge variant={item.variant}>{labelMap[type]}</Badge>;
}

export function ResultBadge({ result }: { result: LogResult }) {
  const { i18n } = useTranslation();
  const item = resultMap[result];
  const currentLocale = (i18n.language === "UZ" || i18n.language === "OZ" || i18n.language === "RU" || i18n.language === "EN"
    ? i18n.language
    : "OZ") as LocaleCode;
  const labelsByLocale: Record<LocaleCode, Record<LogResult, string>> = {
    OZ: { POSITIVE: "Ijobiy", NEGATIVE: "Salbiy" },
    UZ: { POSITIVE: "Ижобий", NEGATIVE: "Салбий" },
    RU: { POSITIVE: "Положительный", NEGATIVE: "Отрицательный" },
    EN: { POSITIVE: "Positive", NEGATIVE: "Negative" },
  };
  return <Badge variant={item.variant}>{labelsByLocale[currentLocale][result]}</Badge>;
}

export function SystemBadge({ system }: { system: ControlSystem }) {
  return (
    <Badge variant="outline" className="max-w-[20rem] font-medium whitespace-normal">
      {system}
    </Badge>
  );
}

