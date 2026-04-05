import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, PencilLine, Plus, Route, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/page-header";
import { SystemBadge, TypeBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  getClassifierSystemTypes,
} from "@/lib/classifiers";
import type { ControlDirection, ControlSystem, ControlType, DeploymentScope } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const scopeLabels: Record<DeploymentScope, string> = {
  INTERNAL: "Ichki",
  EXTERNAL: "Tashqi",
  HYBRID: "Aralash",
};

const directionLabels: Record<ControlDirection, string> = {
  ENTRY: "Kirish",
  EXIT: "Chiqish",
};

function formatDate(date: string | null) {
  if (!date) {
    return "Belgilanmagan";
  }

  const normalized = new Date(`${date}T00:00:00`);
  if (Number.isNaN(normalized.getTime())) {
    return "Belgilanmagan";
  }

  return dateFormatter.format(normalized);
}

function formatDateRange(startDate: string | null, finishDate: string | null) {
  return `${formatDate(startDate)} - ${formatDate(finishDate)}`;
}

function isConfidential(level: string | null | undefined) {
  return level?.trim().toLowerCase() === "maxfiy";
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function ControlsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deploymentScope, setDeploymentScope] = useState<DeploymentScope | "ALL">("ALL");
  const [directionType, setDirectionType] = useState<ControlDirection | "ALL">("ALL");
  const [systemName, setSystemName] = useState<ControlSystem | "ALL">("ALL");
  const [controlType, setControlType] = useState<ControlType | "ALL">("ALL");
  const [processStage, setProcessStage] = useState<string>("ALL");
  const deferredSearch = useDeferredValue(search);

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

  const availableSystems = useMemo(() => {
    const rows = (systemTypesQuery.data ?? []).filter((item) => item.active);
    if (deploymentScope === "ALL") {
      return [...new Set(rows.map((item) => item.systemName))];
    }

    const scopeLabel = deploymentScope === "EXTERNAL" ? "Tashqi" : "Ichki";
    return [...new Set(rows.filter((item) => item.scopeType === scopeLabel).map((item) => item.systemName))];
  }, [deploymentScope, systemTypesQuery.data]);
  const availableProcessStages = useMemo(
    () => (processStagesQuery.data ?? []).filter((item) => item.active).map((item) => item.name),
    [processStagesQuery.data],
  );

  useEffect(() => {
    if (deploymentScope !== "INTERNAL" && directionType !== "ALL") {
      setDirectionType("ALL");
    }
  }, [deploymentScope, directionType]);

  useEffect(() => {
    if (systemName !== "ALL" && !availableSystems.includes(systemName)) {
      setSystemName("ALL");
    }
  }, [availableSystems, systemName]);

  const controlsQuery = useQuery({
    queryKey: ["controls", deferredSearch, deploymentScope, directionType, systemName, controlType, processStage],
    queryFn: () =>
      fetchControls({
        q: deferredSearch || undefined,
        deploymentScope: deploymentScope === "ALL" ? undefined : deploymentScope,
        directionType: directionType === "ALL" ? undefined : directionType,
        systemName: systemName === "ALL" ? undefined : systemName,
        controlType: controlType === "ALL" ? undefined : controlType,
        processStage: processStage === "ALL" ? undefined : processStage,
      }),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateControl,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      toast.success("MN duplicated");
    },
  });

  const rows = controlsQuery.data ?? [];

  const resetFilters = () => {
    setSearch("");
    setDeploymentScope("ALL");
    setDirectionType("ALL");
    setSystemName("ALL");
    setControlType("ALL");
    setProcessStage("ALL");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mantiqiy nazoratlar"
        subtitle="Saqlangan mantiqiy nazoratlarni filtrlang, ko'ring va boshqaring."
        actions={
          <Button onClick={() => navigate("/controls/new")}>
            <Plus className="size-4" />
            {t("controls.add")}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FilterField label="Qidirish">
              <Input
                className="w-full"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="LC raqami yoki nomi"
              />
            </FilterField>
            <FilterField label="Tizim turi">
              <Select
                value={deploymentScope}
                onValueChange={(value) => setDeploymentScope((value ?? "ALL") as DeploymentScope | "ALL")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Barchasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barchasi</SelectItem>
                  <SelectItem value="INTERNAL">Ichki</SelectItem>
                  <SelectItem value="EXTERNAL">Tashqi</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Yo'nalish">
              <Select
                value={directionType}
                onValueChange={(value) => setDirectionType((value ?? "ALL") as ControlDirection | "ALL")}
                disabled={deploymentScope !== "ALL" && deploymentScope !== "INTERNAL"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Barchasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barchasi</SelectItem>
                  <SelectItem value="ENTRY">Kirish</SelectItem>
                  <SelectItem value="EXIT">Chiqish</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Tizim nomi">
              <Select
                value={systemName}
                onValueChange={(value) => setSystemName((value ?? "ALL") as ControlSystem | "ALL")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Barchasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barchasi</SelectItem>
                  {availableSystems.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Mantiqiy nazorat turi">
              <Select
                value={controlType}
                onValueChange={(value) => setControlType((value ?? "ALL") as ControlType | "ALL")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Barchasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barchasi</SelectItem>
                  <SelectItem value="BLOCK">Taqiqlash</SelectItem>
                  <SelectItem value="WARNING">Ogohlantirish</SelectItem>
                  <SelectItem value="ALLOW">Istisno</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Mantiqiy nazorat bosqichi">
              <Select value={processStage} onValueChange={(value) => setProcessStage(value ?? "ALL")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Barchasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Barchasi</SelectItem>
                  {availableProcessStages.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">{rows.length} ta mantiqiy nazorat topildi</p>
            <Button type="button" variant="outline" onClick={resetFilters}>
              Filtrlarni tozalash
            </Button>
          </div>
        </div>
      </PageHeader>

      <Card className="border-border/70 bg-card/90">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mantiqiy nazorat</TableHead>
                <TableHead>Tizim</TableHead>
                <TableHead>Amal qilish muddati</TableHead>
                <TableHead>Turi va bosqichi</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controlsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              ) : null}
              {controlsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-destructive">
                    Ma'lumotlarni yuklab bo'lmadi
                  </TableCell>
                </TableRow>
              ) : null}
              {!controlsQuery.isLoading && !controlsQuery.isError && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {t("common.noData")}
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-bold tracking-normal text-primary sm:text-base">
                          {item.uniqueNumber || item.code}
                        </p>
                        {isConfidential(item.confidentialityLevel) ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                            title="Maxfiy mantiqiy nazorat"
                          >
                            <Shield className="size-3.5" />
                            Maxfiy
                          </span>
                        ) : null}
                      </div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <SystemBadge system={item.systemName} />
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{scopeLabels[item.deploymentScope]}</Badge>
                        {item.directionType ? <Badge variant="outline">{directionLabels[item.directionType]}</Badge> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{formatDateRange(item.startDate, item.finishDate)}</p>
                      <p className="text-xs text-muted-foreground">Boshlanish va yakunlanish sanalari</p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <TypeBadge type={item.controlType} />
                      <p className="text-sm text-muted-foreground">{item.processStage}</p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/controls/${item.id}/edit`)}>
                        <PencilLine className="size-4" />
                        {t("common.edit")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/controls/${item.id}/builder`)}>
                        <Route className="size-4" />
                        Builder
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(item.id)}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="size-4" />
                        {t("common.duplicate")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
