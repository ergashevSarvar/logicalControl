import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, PencilLine, Plus, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, SystemBadge, TypeBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  getClassifierSystemTypes,
} from "@/lib/classifiers";
import type { ControlStatus, ControlSystem } from "@/lib/types";

export function ControlsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ControlStatus | "ALL">("ALL");
  const [system, setSystem] = useState<ControlSystem | "ALL">("ALL");
  const deferredSearch = useDeferredValue(search);
  const systemTypesQuery = useQuery({
    queryKey: classifierQueryKeys.systemTypes,
    queryFn: getClassifierSystemTypes,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const availableSystems = [...new Set((systemTypesQuery.data ?? []).filter((item) => item.active).map((item) => item.systemName))];

  const controlsQuery = useQuery({
    queryKey: ["controls", deferredSearch, status, system],
    queryFn: () =>
      fetchControls({
        q: deferredSearch || undefined,
        status: status === "ALL" ? undefined : status,
        system: system === "ALL" ? undefined : system,
      }),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateControl,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      toast.success("MN duplicated");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("controls.title")}
        subtitle={t("controls.subtitle")}
        actions={
          <Button onClick={() => navigate("/controls/new")}>
            <Plus className="size-4" />
            {t("controls.add")}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("common.search")} />
          <Select value={status} onValueChange={(value) => setStatus(value as ControlStatus | "ALL")}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={system} onValueChange={(value) => setSystem(value as ControlSystem | "ALL")}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.system")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All systems</SelectItem>
              {availableSystems.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <Card className="border-border/70 bg-card/90">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MN</TableHead>
                <TableHead>{t("common.system")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.priority")}</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Logs</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(controlsQuery.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.code}</p>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.processStage}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <SystemBadge system={item.systemName} />
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={item.controlType} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item.priorityOrder ?? "-"}</TableCell>
                  <TableCell>{item.ruleCount}</TableCell>
                  <TableCell>{item.logCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
