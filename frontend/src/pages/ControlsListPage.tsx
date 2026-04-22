import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, PencilLine, Plus, Route, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/page-header";
import { SystemBadge, TypeBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { duplicateControl, fetchControls } from "@/lib/api";
import {
  classifierQueryKeys,
  getClassifierProcessStages,
  getClassifierStates,
  getClassifierSystemTypes,
} from "@/lib/classifiers";
import { normalizeConfidentialityLevelKey, type ControlDirection, type ControlSystem, type ControlType, type DeploymentScope, type LocaleCode } from "@/lib/types";
import { cn, formatIsoDate } from "@/lib/utils";

const ALL_FILTER_VALUE = "ALL" as const;

function normalizeMultiValueSelection<T extends string>(
  currentValues: T[],
  toggledValue: T,
  allValue: T,
  totalSpecificOptionCount: number,
) {
  if (toggledValue === allValue) {
    return [allValue];
  }

  const nextValues = currentValues.filter((value) => value !== allValue);
  const existingIndex = nextValues.indexOf(toggledValue);

  if (existingIndex >= 0) {
    const filteredValues = nextValues.filter((value) => value !== toggledValue);
    return filteredValues.length > 0 ? filteredValues : [allValue];
  }

  const expandedValues = [...nextValues, toggledValue];
  if (expandedValues.length >= totalSpecificOptionCount) {
    return [allValue];
  }

  return expandedValues;
}

function isAllFilterSelected(values: string[]) {
  return values.includes(ALL_FILTER_VALUE);
}

function areSameSelections(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatDate(date: string | null) {
  return formatIsoDate(date);
}

function formatDateRange(startDate: string | null, finishDate: string | null) {
  return `${formatDate(startDate)} - ${formatDate(finishDate)}`;
}

function resolveStatePalette(stateCode: string | null | undefined) {
  switch (stateCode?.trim().toUpperCase()) {
    case "APPROVED":
      return {
        dotClassName: "bg-primary",
        textClassName: "text-primary",
      };
    case "APPROVED_BY_DEPARTMENT":
      return {
        dotClassName: "bg-sky-500",
        textClassName: "text-sky-700 dark:text-sky-300",
      };
    case "SAVED":
      return {
        dotClassName: "bg-emerald-500",
        textClassName: "text-emerald-700 dark:text-emerald-300",
      };
    case "NEW":
      return {
        dotClassName: "bg-sky-500",
        textClassName: "text-sky-700 dark:text-sky-300",
      };
    default:
      return {
        dotClassName: "bg-slate-400 dark:bg-slate-500",
        textClassName: "text-slate-700 dark:text-slate-300",
      };
  }
}

function isConfidential(level: string | null | undefined) {
  return normalizeConfidentialityLevelKey(level) === "CONFIDENTIAL";
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: Array<number | "ellipsis"> = [];
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-[13px] font-medium tracking-normal text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MultiSelectFilter({
  value,
  onChange,
  options,
  allLabel,
  disabled = false,
}: {
  value: string[];
  onChange: (nextValue: string[]) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const triggerLabel = useMemo(() => {
    if (isAllFilterSelected(value)) {
      return allLabel;
    }

    const selectedLabels = options
      .filter((option) => value.includes(option.value))
      .map((option) => option.label);

    if (selectedLabels.length <= 2) {
      return selectedLabels.join(", ");
    }

    return `${selectedLabels.length} ta tanlandi`;
  }, [allLabel, options, value]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[14px] border border-input bg-transparent px-4 text-left text-[15px] transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground hover:border-input",
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]">
          <div className="max-h-[19.5rem] overflow-y-auto p-2">
            {options.map((option) => {
              const checked = value.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange(
                      normalizeMultiValueSelection(value, option.value, ALL_FILTER_VALUE, options.length - 1),
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{option.label}</span>
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border border-border/70",
                      checked ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    {checked ? <Check className="size-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ControlsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLocale = (i18n.language === "UZ" || i18n.language === "OZ" || i18n.language === "RU" || i18n.language === "EN"
    ? i18n.language
    : "OZ") as LocaleCode;
  const pageText = {
    title: {
      OZ: "Mantiqiy nazoratlar",
      UZ: "Мантиқий назоратлар",
      RU: "Логические контроли",
      EN: "Logical controls",
    },
    duration: {
      OZ: "Amal qilish muddati",
      UZ: "Амал қилиш муддати",
      RU: "Срок действия",
      EN: "Validity period",
    },
    typeAndStage: {
      OZ: "Turi va bosqichi",
      UZ: "Тури ва босқичи",
      RU: "Тип и этап",
      EN: "Type and stage",
    },
    loadError: {
      OZ: "Ma'lumotlarni yuklab bo'lmadi",
      UZ: "Маълумотларни юклаб бўлмади",
      RU: "Не удалось загрузить данные",
      EN: "Failed to load data",
    },
    confidential: {
      OZ: "Maxfiy",
      UZ: "Махфий",
      RU: "Конфиденциально",
      EN: "Confidential",
    },
    confidentialTitle: {
      OZ: "Maxfiy mantiqiy nazorat",
      UZ: "Махфий мантиқий назорат",
      RU: "Конфиденциальный логический контроль",
      EN: "Confidential logical control",
    },
    showing: {
      OZ: "ko'rsatilmoqda",
      UZ: "кўрсатилмоқда",
      RU: "показано",
      EN: "shown",
    },
    previous: {
      OZ: "Oldingi",
      UZ: "Олдинги",
      RU: "Назад",
      EN: "Previous",
    },
    next: {
      OZ: "Keyingi",
      UZ: "Кейинги",
      RU: "Далее",
      EN: "Next",
    },
    countSuffix: {
      OZ: "ta",
      UZ: "та",
      RU: "шт.",
      EN: "items",
    },
    controlColumn: {
      OZ: "Mantiqiy nazorat",
      UZ: "Мантиқий назорат",
      RU: "Логический контроль",
      EN: "Logical control",
    },
  } as const;
  const localizedScopeLabels: Record<DeploymentScope, string> = {
    INTERNAL: t("editor.options.internal"),
    EXTERNAL: t("editor.options.external"),
    HYBRID: t("editor.options.hybrid"),
  };
  const localizedDirectionLabels: Record<ControlDirection, string> = {
    ENTRY: currentLocale === "RU" ? "Вход" : currentLocale === "EN" ? "Entry" : currentLocale === "UZ" ? "Кириш" : "Kirish",
    EXIT: currentLocale === "RU" ? "Выход" : currentLocale === "EN" ? "Exit" : currentLocale === "UZ" ? "Чиқиш" : "Chiqish",
  };
  const [search, setSearch] = useState("");
  const [deploymentScope, setDeploymentScope] = useState<Array<DeploymentScope | typeof ALL_FILTER_VALUE>>([ALL_FILTER_VALUE]);
  const [directionType, setDirectionType] = useState<Array<ControlDirection | typeof ALL_FILTER_VALUE>>([ALL_FILTER_VALUE]);
  const [systemName, setSystemName] = useState<Array<ControlSystem | typeof ALL_FILTER_VALUE>>([ALL_FILTER_VALUE]);
  const [controlType, setControlType] = useState<Array<ControlType | typeof ALL_FILTER_VALUE>>([ALL_FILTER_VALUE]);
  const [processStage, setProcessStage] = useState<string[]>([ALL_FILTER_VALUE]);
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDuplicateControl, setPendingDuplicateControl] = useState<{ id: string; code: string } | null>(null);
  const deferredSearch = useDeferredValue(search);
  const allLabel = t("controls.filters.all", { defaultValue: "Barchasi" });
  const searchPlaceholder = t("controls.filters.searchPlaceholder", { defaultValue: "LC raqami yoki nomi" });
  const deploymentScopeLabel = t("controls.filters.deploymentScope", { defaultValue: "Tizim turi" });
  const directionTypeLabel = t("controls.filters.directionType", { defaultValue: "Yo'nalish" });
  const systemNameLabel = t("controls.filters.systemName", { defaultValue: "Tizim nomi" });
  const controlTypeLabel = t("controls.filters.controlType", { defaultValue: "Mantiqiy nazorat turi" });
  const processStageLabel = t("controls.filters.processStage", { defaultValue: "Mantiqiy nazorat bosqichi" });
  const resetFiltersLabel = t("controls.filters.reset", { defaultValue: "Filtrlarni tozalash" });
  const editActionLabel = t("common.edit");
  const builderActionLabel = t("ruleBuilder.title", { defaultValue: "Builder" });
  const duplicateActionLabel = t("common.duplicate");

  const deploymentScopeOptions: Array<{ value: DeploymentScope | typeof ALL_FILTER_VALUE; label: string }> = [
    { value: ALL_FILTER_VALUE, label: allLabel },
    { value: "INTERNAL", label: t("editor.options.internal") },
    { value: "EXTERNAL", label: t("editor.options.external") },
  ];
  const directionTypeOptions: Array<{ value: ControlDirection | typeof ALL_FILTER_VALUE; label: string }> = [
    { value: ALL_FILTER_VALUE, label: allLabel },
    { value: "ENTRY", label: currentLocale === "RU" ? "Вход" : currentLocale === "EN" ? "Entry" : currentLocale === "UZ" ? "Кириш" : "Kirish" },
    { value: "EXIT", label: currentLocale === "RU" ? "Выход" : currentLocale === "EN" ? "Exit" : currentLocale === "UZ" ? "Чиқиш" : "Chiqish" },
  ];
  const controlTypeOptions: Array<{ value: ControlType | typeof ALL_FILTER_VALUE; label: string }> = [
    { value: ALL_FILTER_VALUE, label: allLabel },
    { value: "BLOCK", label: t("editor.options.block") },
    { value: "WARNING", label: t("editor.options.warning") },
    { value: "ALLOW", label: t("editor.options.allow") },
  ];

  const systemTypesQuery = useQuery({
    queryKey: classifierQueryKeys.systemTypes,
    queryFn: getClassifierSystemTypes,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const processStagesQuery = useQuery({
    queryKey: classifierQueryKeys.processStages,
    queryFn: getClassifierProcessStages,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const statesQuery = useQuery({
    queryKey: classifierQueryKeys.states(currentLocale),
    queryFn: () => getClassifierStates(currentLocale),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });

  const availableSystems = useMemo(() => {
    const rows = (systemTypesQuery.data ?? []).filter((item) => item.active);
    if (isAllFilterSelected(deploymentScope)) {
      return [...new Set(rows.map((item) => item.systemName))];
    }

    const scopeLabelsToMatch: string[] = deploymentScope.map((scope) => (scope === "EXTERNAL" ? "Tashqi" : "Ichki"));
    return [...new Set(rows.filter((item) => scopeLabelsToMatch.includes(item.scopeType)).map((item) => item.systemName))];
  }, [deploymentScope, systemTypesQuery.data]);
  const availableProcessStages = useMemo(
    () => (processStagesQuery.data ?? []).filter((item) => item.active).map((item) => item.name),
    [processStagesQuery.data],
  );
  const stateLabels = useMemo(
    () =>
      new Map(
        (statesQuery.data ?? [])
          .filter((item) => item.active)
          .map((item) => [item.code, item.name] as const),
      ),
    [statesQuery.data],
  );

  useEffect(() => {
    if (!isAllFilterSelected(deploymentScope) && !deploymentScope.includes("INTERNAL") && !isAllFilterSelected(directionType)) {
      setDirectionType([ALL_FILTER_VALUE]);
    }
  }, [deploymentScope, directionType]);

  useEffect(() => {
    if (isAllFilterSelected(systemName)) {
      return;
    }

    const nextValues = systemName.filter((value) => availableSystems.includes(value));
    const normalizedValues = nextValues.length > 0 ? nextValues : [ALL_FILTER_VALUE];
    if (!areSameSelections(systemName, normalizedValues)) {
      setSystemName(normalizedValues);
    }
  }, [availableSystems, systemName]);

  const controlsQuery = useQuery({
    queryKey: ["controls", deferredSearch],
    queryFn: () =>
      fetchControls({
        q: deferredSearch || undefined,
      }),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateControl,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      setPendingDuplicateControl(null);
      toast.success(t("controls.duplicate.success", { defaultValue: "Mantiqiy nazorat nusxalandi" }));
    },
    onError: () => {
      toast.error(t("controls.duplicate.error", { defaultValue: "Mantiqiy nazoratni nusxalab bo'lmadi" }));
    },
  });

  const rows = useMemo(() => {
    const sourceRows = controlsQuery.data ?? [];

    return sourceRows.filter((item) => {
      const deploymentScopeMatches =
        isAllFilterSelected(deploymentScope) || deploymentScope.includes(item.deploymentScope);
      const directionTypeMatches =
        isAllFilterSelected(directionType) || (item.directionType ? directionType.includes(item.directionType) : false);
      const systemNameMatches = isAllFilterSelected(systemName) || systemName.includes(item.systemName);
      const controlTypeMatches = isAllFilterSelected(controlType) || controlType.includes(item.controlType);
      const processStageMatches = isAllFilterSelected(processStage) || processStage.includes(item.processStage);

      return (
        deploymentScopeMatches &&
        directionTypeMatches &&
        systemNameMatches &&
        controlTypeMatches &&
        processStageMatches
      );
    });
  }, [controlType, controlsQuery.data, deploymentScope, directionType, processStage, systemName]);
  const totalRows = rows.length;
  const parsedPageSize = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalRows / parsedPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalRows === 0 ? 0 : (safeCurrentPage - 1) * parsedPageSize;
  const pageEndIndex = Math.min(pageStartIndex + parsedPageSize, totalRows);
  const paginatedRows = rows.slice(pageStartIndex, pageEndIndex);
  const paginationItems = buildPaginationItems(safeCurrentPage, totalPages);

  const resetFilters = () => {
    setSearch("");
    setDeploymentScope([ALL_FILTER_VALUE]);
    setDirectionType([ALL_FILTER_VALUE]);
    setSystemName([ALL_FILTER_VALUE]);
    setControlType([ALL_FILTER_VALUE]);
    setProcessStage([ALL_FILTER_VALUE]);
    setCurrentPage(1);
  };

  const openDuplicateDialog = (id: string, code: string) => {
    setPendingDuplicateControl({ id, code });
  };

  const confirmDuplicate = () => {
    if (!pendingDuplicateControl) {
      return;
    }

    duplicateMutation.mutate(pendingDuplicateControl.id);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, deploymentScope, directionType, systemName, controlType, processStage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${pageText.title[currentLocale]} (${totalRows} ${pageText.countSuffix[currentLocale]})`}
        titleClassName="text-[1.6rem] md:text-[1.9rem]"
        showLogo={false}
        actions={
          <>
            <Button type="button" variant="outline" onClick={resetFilters}>
              {resetFiltersLabel}
            </Button>
            <Button onClick={() => navigate("/controls/new")}>
              <Plus className="size-4" />
              {t("controls.add")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterField label={deploymentScopeLabel}>
              <MultiSelectFilter
                value={deploymentScope}
                onChange={(nextValue) => setDeploymentScope(nextValue as Array<DeploymentScope | typeof ALL_FILTER_VALUE>)}
                options={deploymentScopeOptions}
                allLabel={allLabel}
              />
            </FilterField>
            <FilterField label={directionTypeLabel}>
              <MultiSelectFilter
                value={directionType}
                onChange={(nextValue) => setDirectionType(nextValue as Array<ControlDirection | typeof ALL_FILTER_VALUE>)}
                options={directionTypeOptions}
                allLabel={allLabel}
                disabled={!isAllFilterSelected(deploymentScope) && !deploymentScope.includes("INTERNAL")}
              />
            </FilterField>
            <FilterField label={systemNameLabel}>
              <MultiSelectFilter
                value={systemName}
                onChange={(nextValue) => setSystemName(nextValue as Array<ControlSystem | typeof ALL_FILTER_VALUE>)}
                options={[
                  { value: ALL_FILTER_VALUE, label: allLabel },
                  ...availableSystems.map((option) => ({ value: option, label: option })),
                ]}
                allLabel={allLabel}
              />
            </FilterField>
            <FilterField label={controlTypeLabel}>
              <MultiSelectFilter
                value={controlType}
                onChange={(nextValue) => setControlType(nextValue as Array<ControlType | typeof ALL_FILTER_VALUE>)}
                options={controlTypeOptions}
                allLabel={allLabel}
              />
            </FilterField>
            <FilterField label={processStageLabel}>
              <MultiSelectFilter
                value={processStage}
                onChange={setProcessStage}
                options={[
                  { value: ALL_FILTER_VALUE, label: allLabel },
                  ...availableProcessStages.map((option) => ({ value: option, label: option })),
                ]}
                allLabel={allLabel}
              />
            </FilterField>
          </div>
        </div>
      </PageHeader>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="flex flex-col gap-4 border-b border-border/70 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={pageSize} onValueChange={(value) => setPageSize(value ?? "10")}>
              <SelectTrigger className="h-10 w-[92px]">
                <SelectValue>{pageSize}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["10", "20", "50", "100"].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[280px] flex-1 flex-wrap items-center justify-start gap-3 sm:min-w-[420px] sm:justify-end">
            <div className="w-full sm:max-w-[320px]">
                <Input
                  className="w-full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                <TableRow>
                  <TableHead>{pageText.controlColumn[currentLocale]}</TableHead>
                  <TableHead className="min-w-[220px]">{t("common.status")}</TableHead>
                  <TableHead className="min-w-[180px]">{t("common.system")}</TableHead>
                  <TableHead>{pageText.duration[currentLocale]}</TableHead>
                  <TableHead>{pageText.typeAndStage[currentLocale]}</TableHead>
                  <TableHead className="w-[88px] text-center">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controlsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : null}
                {controlsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                      {pageText.loadError[currentLocale]}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!controlsQuery.isLoading && !controlsQuery.isError && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {t("common.noData")}
                    </TableCell>
                  </TableRow>
                ) : null}
                {paginatedRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/controls/${item.id}/edit`)}
                            className="cursor-pointer font-mono text-sm font-extrabold tracking-normal text-primary transition-colors hover:text-primary/80 hover:underline sm:text-base"
                          >
                            {item.uniqueNumber || item.code}
                          </button>
                          {isConfidential(item.confidentialityLevel) ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                              title={pageText.confidentialTitle[currentLocale]}
                            >
                              <Shield className="size-3.5" />
                              {pageText.confidential[currentLocale]}
                            </span>
                          ) : null}
                        </div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] align-top">
                      {(() => {
                        const statePalette = resolveStatePalette(item.currentStateCode);
                        const stateLabel =
                          stateLabels.get(item.currentStateCode || "NEW") ??
                          item.currentStateName ??
                          stateLabels.get("NEW") ??
                          "NEW";

                        return (
                          <div className={cn("flex items-start gap-2.5 pt-0.5", statePalette.textClassName)}>
                            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", statePalette.dotClassName)} />
                            <span className="text-sm font-semibold leading-5">{stateLabel}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="min-w-[180px] align-top">
                      <div className="space-y-2">
                        <SystemBadge system={item.systemName} />
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{localizedScopeLabels[item.deploymentScope]}</Badge>
                          {item.directionType ? <Badge variant="outline">{localizedDirectionLabels[item.directionType]}</Badge> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="font-medium text-foreground">{formatDateRange(item.startDate, item.finishDate)}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <TypeBadge type={item.controlType} />
                        <p className="text-sm text-muted-foreground">{item.processStage}</p>
                      </div>
                    </TableCell>
                    <TableCell className="w-[88px] align-top">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={editActionLabel}
                          aria-label={editActionLabel}
                          onClick={() => navigate(`/controls/${item.id}/edit`)}
                        >
                          <PencilLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={builderActionLabel}
                          aria-label={builderActionLabel}
                          onClick={() => navigate(`/controls/${item.id}/builder`)}
                        >
                          <Route className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={duplicateActionLabel}
                          aria-label={duplicateActionLabel}
                          onClick={() => openDuplicateDialog(item.id, item.uniqueNumber || item.code)}
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {totalRows === 0
                ? `0 / 0 ${pageText.showing[currentLocale]}`
                : `${pageStartIndex + 1}-${pageEndIndex} / ${totalRows} ${pageText.showing[currentLocale]}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft className="size-4" />
                {pageText.previous[currentLocale]}
              </Button>
              <div className="flex flex-wrap items-center gap-1">
                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-sm text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={item}
                      type="button"
                      variant={item === safeCurrentPage ? "default" : "outline"}
                      size="sm"
                      className="min-w-9 px-3"
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </Button>
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                {pageText.next[currentLocale]}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {pendingDuplicateControl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !duplicateMutation.isPending) {
              setPendingDuplicateControl(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,33,46,0.96),rgba(20,26,37,0.92))]">
            <div className="flex size-12 items-center justify-center rounded-[18px] bg-amber-500/10 text-amber-600 dark:bg-amber-500/14 dark:text-amber-300">
              <AlertTriangle className="size-5" />
            </div>

            <div className="mt-4 space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                {t("controls.duplicate.title", { defaultValue: "Nusxalashni tasdiqlaysizmi?" })}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                <span className="font-extrabold text-foreground">{pendingDuplicateControl.code}</span>{" "}
                {t("controls.duplicate.messageSuffix", {
                  defaultValue: "raqamli ushbu Mantiqiy nazoratni nusxalashni tasdiqlaysizmi?",
                })}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDuplicateControl(null)}
                disabled={duplicateMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={confirmDuplicate}
                disabled={duplicateMutation.isPending}
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-400"
              >
                {duplicateMutation.isPending
                  ? t("common.loading")
                  : t("controls.duplicate.confirm", { defaultValue: "Tasdiqlash" })}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

