import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createClassifierDepartment,
  createClassifierProcessStage,
  createClassifierSystemType,
  deleteClassifierDepartment,
  deleteClassifierProcessStage,
  deleteClassifierSystemType,
  updateClassifierDepartment,
  updateClassifierProcessStage,
  updateClassifierSystemType,
} from "@/lib/api";
import {
  classifierQueryKeys,
  getClassifierDepartments,
  getClassifierProcessStages,
  getClassifierSystemTypes,
  sortClassifierDepartments,
  sortClassifierProcessStages,
  sortClassifierSystemTypes,
} from "@/lib/classifiers";
import type {
  ClassifierDepartment,
  ClassifierDepartmentRequest,
  ClassifierProcessStage,
  ClassifierProcessStageRequest,
  ClassifierSystemType,
  ClassifierSystemTypeRequest,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TabValue = "departments" | "stages" | "systemTypes";
type DepartmentTypeFilter = "all" | (typeof departmentTypeOptions)[number];
type SystemTypeScopeFilter = "all" | "Ichki" | "Tashqi";
type EditorState =
  | { kind: "department"; mode: "create" | "edit"; id?: string }
  | { kind: "stage"; mode: "create" | "edit"; id?: string }
  | { kind: "systemType"; mode: "create" | "edit"; id?: string };
type DeleteState = { kind: "department" | "stage" | "systemType"; id: string; label: string };

const departmentTypeOptions = ["Boshqarma", "Bo'lim", "Sektor", "Laboratoriya"] as const;
const systemScopeOptions = ["Ichki", "Tashqi"] as const;

function createEmptyDepartmentForm(): ClassifierDepartmentRequest {
  return {
    name: "",
    departmentType: "Boshqarma",
    active: true,
  };
}

function createEmptyStageForm(): ClassifierProcessStageRequest {
  return {
    name: "",
    description: "",
    active: true,
  };
}

function createEmptySystemTypeForm(): ClassifierSystemTypeRequest {
  return {
    systemName: "",
    scopeType: "Ichki",
    active: true,
  };
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) {
      return detail;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function StatusChip({ active }: { active: boolean }) {
  return active ? (
    <Badge className="h-7 rounded-full bg-emerald-500/12 px-3 text-emerald-600 hover:bg-emerald-500/12 dark:text-emerald-300">
      Faol
    </Badge>
  ) : (
    <Badge className="h-7 rounded-full bg-slate-500/12 px-3 text-slate-500 hover:bg-slate-500/12 dark:text-slate-300">
      Nofaol
    </Badge>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-[20rem] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-[1.75rem] leading-none font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

function ScopeFilter({
  value,
  onChange,
}: {
  value: SystemTypeScopeFilter;
  onChange: (value: SystemTypeScopeFilter) => void;
}) {
  const options: Array<{ value: SystemTypeScopeFilter; label: string }> = [
    { value: "all", label: "Barchasi" },
    { value: "Ichki", label: "Ichki" },
    { value: "Tashqi", label: "Tashqi" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Ichki yoki tashqi bo'yicha filtrlash"
      className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-border/70 bg-background/80 p-1"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            variant={selected ? "default" : "ghost"}
            className={cn(
              "h-9 rounded-[12px] px-4 text-sm shadow-none",
              !selected && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

function DepartmentTypeFilterTabs({
  value,
  onChange,
}: {
  value: DepartmentTypeFilter;
  onChange: (value: DepartmentTypeFilter) => void;
}) {
  const options: Array<{ value: DepartmentTypeFilter; label: string }> = [
    { value: "all", label: "Barchasi" },
    ...departmentTypeOptions.map((option) => ({ value: option, label: option })),
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Boshqarma turi bo'yicha filtrlash"
      className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-border/70 bg-background/80 p-1"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            variant={selected ? "default" : "ghost"}
            className={cn(
              "h-9 rounded-[12px] px-4 text-sm shadow-none",
              !selected && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full xl:w-[20rem]">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Qidirish..."
        className="h-11 rounded-[14px] pl-10"
      />
    </div>
  );
}

function ActionButtons({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-primary hover:bg-primary/10 hover:text-primary"
        onClick={onEdit}
        title={`${label} ni tahrirlash`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600"
        onClick={onDelete}
        title={`${label} ni o'chirish`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,33,46,0.96),rgba(20,26,37,0.92))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ClassifiersPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("departments");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [departmentTypeFilter, setDepartmentTypeFilter] = useState<DepartmentTypeFilter>("all");
  const [stageQuery, setStageQuery] = useState("");
  const [systemTypeQuery, setSystemTypeQuery] = useState("");
  const [systemTypeScopeFilter, setSystemTypeScopeFilter] = useState<SystemTypeScopeFilter>("all");
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [departmentForm, setDepartmentForm] = useState<ClassifierDepartmentRequest>(createEmptyDepartmentForm);
  const [stageForm, setStageForm] = useState<ClassifierProcessStageRequest>(createEmptyStageForm);
  const [systemTypeForm, setSystemTypeForm] = useState<ClassifierSystemTypeRequest>(createEmptySystemTypeForm);
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: classifierQueryKeys.departments,
    queryFn: getClassifierDepartments,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const stagesQuery = useQuery({
    queryKey: classifierQueryKeys.processStages,
    queryFn: getClassifierProcessStages,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const systemTypesQuery = useQuery({
    queryKey: classifierQueryKeys.systemTypes,
    queryFn: getClassifierSystemTypes,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (departmentsQuery.error) {
      toast.error(extractErrorMessage(departmentsQuery.error, "Boshqarmalarni yuklab bo'lmadi."));
    }
  }, [departmentsQuery.error]);

  useEffect(() => {
    if (stagesQuery.error) {
      toast.error(extractErrorMessage(stagesQuery.error, "Bosqichlarni yuklab bo'lmadi."));
    }
  }, [stagesQuery.error]);

  useEffect(() => {
    if (systemTypesQuery.error) {
      toast.error(extractErrorMessage(systemTypesQuery.error, "Tizim turlarini yuklab bo'lmadi."));
    }
  }, [systemTypesQuery.error]);

  const departments = departmentsQuery.data ?? [];
  const stages = stagesQuery.data ?? [];
  const systemTypes = systemTypesQuery.data ?? [];

  const filteredDepartments = useMemo(() => {
    const query = departmentQuery.trim().toLocaleLowerCase();
    return departments.filter((row) => {
      const matchesType = departmentTypeFilter === "all" || row.departmentType === departmentTypeFilter;
      const matchesQuery = !query || `${row.name} ${row.departmentType} ${row.active ? "faol" : "nofaol"}`
        .toLocaleLowerCase()
        .includes(query);

      return matchesType && matchesQuery;
    });
  }, [departmentQuery, departmentTypeFilter, departments]);

  const filteredStages = useMemo(() => {
    const query = stageQuery.trim().toLocaleLowerCase();
    if (!query) {
      return stages;
    }

    return stages.filter((row) =>
      `${row.name} ${row.description ?? ""} ${row.active ? "faol" : "nofaol"}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [stageQuery, stages]);

  const filteredSystemTypes = useMemo(() => {
    const query = systemTypeQuery.trim().toLocaleLowerCase();
    return systemTypes.filter((row) => {
      const matchesScope = systemTypeScopeFilter === "all" || row.scopeType === systemTypeScopeFilter;
      const matchesQuery = !query || `${row.systemName} ${row.scopeType} ${row.active ? "faol" : "nofaol"}`
        .toLocaleLowerCase()
        .includes(query);

      return matchesScope && matchesQuery;
    });
  }, [systemTypeQuery, systemTypeScopeFilter, systemTypes]);

  function openCreateModal() {
    if (activeTab === "departments") {
      setDepartmentForm(createEmptyDepartmentForm());
      setEditorState({ kind: "department", mode: "create" });
      return;
    }

    if (activeTab === "stages") {
      setStageForm(createEmptyStageForm());
      setEditorState({ kind: "stage", mode: "create" });
      return;
    }

    setSystemTypeForm(createEmptySystemTypeForm());
    setEditorState({ kind: "systemType", mode: "create" });
  }

  function openDepartmentEditor(item: ClassifierDepartment) {
    setDepartmentForm({
      name: item.name,
      departmentType: item.departmentType,
      active: item.active,
    });
    setEditorState({ kind: "department", mode: "edit", id: item.id });
  }

  function openStageEditor(item: ClassifierProcessStage) {
    setStageForm({
      name: item.name,
      description: item.description ?? "",
      active: item.active,
    });
    setEditorState({ kind: "stage", mode: "edit", id: item.id });
  }

  function openSystemTypeEditor(item: ClassifierSystemType) {
    setSystemTypeForm({
      systemName: item.systemName,
      scopeType: item.scopeType,
      active: item.active,
    });
    setEditorState({ kind: "systemType", mode: "edit", id: item.id });
  }

  async function handleEditorSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editorState) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editorState.kind === "department") {
        const payload = {
          name: departmentForm.name.trim(),
          departmentType: departmentForm.departmentType,
          active: departmentForm.active,
        } satisfies ClassifierDepartmentRequest;

        const saved = editorState.mode === "create"
          ? await createClassifierDepartment(payload)
          : await updateClassifierDepartment(editorState.id!, payload);

        queryClient.setQueryData<ClassifierDepartment[]>(classifierQueryKeys.departments, (current = []) =>
          sortClassifierDepartments([...current.filter((item) => item.id !== saved.id), saved]),
        );

        toast.success(
          editorState.mode === "create"
            ? "Boshqarma muvaffaqiyatli qo'shildi."
            : "Boshqarma muvaffaqiyatli yangilandi.",
        );
      } else if (editorState.kind === "stage") {
        const payload = {
          name: stageForm.name.trim(),
          description: stageForm.description.trim(),
          active: stageForm.active,
        } satisfies ClassifierProcessStageRequest;

        const saved = editorState.mode === "create"
          ? await createClassifierProcessStage(payload)
          : await updateClassifierProcessStage(editorState.id!, payload);

        queryClient.setQueryData<ClassifierProcessStage[]>(classifierQueryKeys.processStages, (current = []) =>
          sortClassifierProcessStages([...current.filter((item) => item.id !== saved.id), saved]),
        );

        toast.success(
          editorState.mode === "create"
            ? "Bosqich muvaffaqiyatli qo'shildi."
            : "Bosqich muvaffaqiyatli yangilandi.",
        );
      } else {
        const payload = {
          systemName: systemTypeForm.systemName.trim(),
          scopeType: systemTypeForm.scopeType,
          active: systemTypeForm.active,
        } satisfies ClassifierSystemTypeRequest;

        const saved = editorState.mode === "create"
          ? await createClassifierSystemType(payload)
          : await updateClassifierSystemType(editorState.id!, payload);

        queryClient.setQueryData<ClassifierSystemType[]>(classifierQueryKeys.systemTypes, (current = []) =>
          sortClassifierSystemTypes([...current.filter((item) => item.id !== saved.id), saved]),
        );

        toast.success(
          editorState.mode === "create"
            ? "Tizim turi muvaffaqiyatli qo'shildi."
            : "Tizim turi muvaffaqiyatli yangilandi.",
        );
      }

      setEditorState(null);
    } catch (error) {
      toast.error(
        extractErrorMessage(
          error,
          editorState.kind === "department"
            ? "Boshqarma saqlanmadi."
            : editorState.kind === "stage"
              ? "Bosqich saqlanmadi."
              : "Tizim turi saqlanmadi.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteState) {
      return;
    }

    setIsDeleting(true);

    try {
      if (deleteState.kind === "department") {
        await deleteClassifierDepartment(deleteState.id);
        queryClient.setQueryData<ClassifierDepartment[]>(classifierQueryKeys.departments, (current = []) =>
          current.filter((item) => item.id !== deleteState.id),
        );
        toast.success("Boshqarma o'chirildi.");
      } else if (deleteState.kind === "stage") {
        await deleteClassifierProcessStage(deleteState.id);
        queryClient.setQueryData<ClassifierProcessStage[]>(classifierQueryKeys.processStages, (current = []) =>
          current.filter((item) => item.id !== deleteState.id),
        );
        toast.success("Bosqich o'chirildi.");
      } else {
        await deleteClassifierSystemType(deleteState.id);
        queryClient.setQueryData<ClassifierSystemType[]>(classifierQueryKeys.systemTypes, (current = []) =>
          current.filter((item) => item.id !== deleteState.id),
        );
        toast.success("Tizim turi o'chirildi.");
      }

      setDeleteState(null);
    } catch (error) {
      toast.error(
        extractErrorMessage(
          error,
          deleteState.kind === "department"
            ? "Boshqarma o'chirilmadi."
            : deleteState.kind === "stage"
              ? "Bosqich o'chirilmadi."
              : "Tizim turi o'chirilmadi.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="relative space-y-6 pb-24">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="gap-6">
        <div className="w-full rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,249,255,0.72))] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22)] backdrop-blur-xl">
          <TabsList className="inline-flex h-auto w-auto gap-2 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-0">
            <TabsTrigger
              value="departments"
              className="h-10 min-w-[13rem] rounded-[14px] border border-transparent bg-white/52 px-5 text-sm font-semibold text-foreground/75 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.2)] backdrop-blur data-active:border-[color:rgba(var(--primary-rgb),0.12)] data-active:bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.12),rgba(var(--accent-rgb),0.08))] data-active:text-primary data-active:shadow-[0_16px_26px_-20px_rgba(var(--primary-rgb),0.26)]"
            >
              Boshqarmalar ro'yxati
            </TabsTrigger>
            <TabsTrigger
              value="stages"
              className="h-10 min-w-[15rem] rounded-[14px] border border-transparent bg-white/52 px-5 text-sm font-semibold text-foreground/75 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.2)] backdrop-blur data-active:border-[color:rgba(var(--primary-rgb),0.12)] data-active:bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.12),rgba(var(--accent-rgb),0.08))] data-active:text-primary data-active:shadow-[0_16px_26px_-20px_rgba(var(--primary-rgb),0.26)]"
            >
              Mantiqiy nazorat bosqichlar
            </TabsTrigger>
            <TabsTrigger
              value="systemTypes"
              className="h-10 min-w-[13rem] rounded-[14px] border border-transparent bg-white/52 px-5 text-sm font-semibold text-foreground/75 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.2)] backdrop-blur data-active:border-[color:rgba(var(--primary-rgb),0.12)] data-active:bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.12),rgba(var(--accent-rgb),0.08))] data-active:text-primary data-active:shadow-[0_16px_26px_-20px_rgba(var(--primary-rgb),0.26)]"
            >
              Tizim turlari
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="departments">
          <Card className="border-border/70 bg-card/90 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <SectionHeader
                  icon={Building2}
                  title={`Boshqarmalar ro'yxati (${filteredDepartments.length} ta)`}
                />
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <DepartmentTypeFilterTabs value={departmentTypeFilter} onChange={setDepartmentTypeFilter} />
                  <SearchBox value={departmentQuery} onChange={setDepartmentQuery} />
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/70">
                <ScrollArea className="h-[34rem]">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 px-5">No</TableHead>
                        <TableHead className="min-w-[28rem]">Nomi</TableHead>
                        <TableHead className="min-w-[10rem]">Turi</TableHead>
                        <TableHead className="min-w-[8rem]">Holat</TableHead>
                        <TableHead className="w-32 px-5 text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentsQuery.isLoading ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="h-[20rem] px-5">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              <span>Ma'lumotlar yuklanmoqda...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredDepartments.length === 0 ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="px-0 py-0">
                            <EmptyState
                              title="Boshqarmalar topilmadi"
                              description="Qidiruvni o'zgartirib ko'ring yoki yangi boshqarma qo'shing."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDepartments.map((row, index) => (
                          <TableRow key={row.id} className="bg-transparent">
                            <TableCell className="px-5 font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-4 whitespace-normal">
                              <p className="max-w-[42rem] text-sm leading-6 font-medium text-foreground">{row.name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="h-7 rounded-full px-3">
                                {row.departmentType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusChip active={row.active} />
                            </TableCell>
                            <TableCell className="px-5">
                              <ActionButtons
                                label={row.name}
                                onEdit={() => openDepartmentEditor(row)}
                                onDelete={() =>
                                  setDeleteState({
                                    kind: "department",
                                    id: row.id,
                                    label: row.name,
                                  })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card className="border-border/70 bg-card/90 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <SectionHeader
                  icon={ClipboardList}
                  title={`Mantiqiy nazorat bosqichlar (${filteredStages.length} ta)`}
                />
                <SearchBox value={stageQuery} onChange={setStageQuery} />
              </div>

              <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/70">
                <ScrollArea className="h-[34rem]">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 px-5">No</TableHead>
                        <TableHead className="min-w-[18rem]">Bosqich nomi</TableHead>
                        <TableHead className="min-w-[28rem]">Tavsif</TableHead>
                        <TableHead className="min-w-[8rem]">Holat</TableHead>
                        <TableHead className="w-32 px-5 text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagesQuery.isLoading ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="h-[20rem] px-5">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              <span>Ma'lumotlar yuklanmoqda...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredStages.length === 0 ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="px-0 py-0">
                            <EmptyState
                              title="Bosqichlar topilmadi"
                              description="Qidiruvni o'zgartirib ko'ring yoki yangi bosqich qo'shing."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStages.map((row, index) => (
                          <TableRow key={row.id} className="bg-transparent">
                            <TableCell className="px-5 font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-4 whitespace-normal">
                              <p className="text-sm font-medium text-foreground">{row.name}</p>
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              <p className="max-w-[42rem] text-sm leading-6 text-muted-foreground">
                                {row.description || "Tavsif kiritilmagan"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusChip active={row.active} />
                            </TableCell>
                            <TableCell className="px-5">
                              <ActionButtons
                                label={row.name}
                                onEdit={() => openStageEditor(row)}
                                onDelete={() =>
                                  setDeleteState({
                                    kind: "stage",
                                    id: row.id,
                                    label: row.name,
                                  })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="systemTypes">
          <Card className="border-border/70 bg-card/90 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <SectionHeader
                  icon={Building2}
                  title={`Tizim turlari (${filteredSystemTypes.length} ta)`}
                />
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <ScopeFilter value={systemTypeScopeFilter} onChange={setSystemTypeScopeFilter} />
                  <SearchBox value={systemTypeQuery} onChange={setSystemTypeQuery} />
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/70">
                <ScrollArea className="h-[34rem]">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 px-5">No</TableHead>
                        <TableHead className="min-w-[18rem]">Tizim nomi</TableHead>
                        <TableHead className="min-w-[10rem]">Ichki / Tashqi</TableHead>
                        <TableHead className="min-w-[8rem]">Holat</TableHead>
                        <TableHead className="w-32 px-5 text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemTypesQuery.isLoading ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="h-[20rem] px-5">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              <span>Ma'lumotlar yuklanmoqda...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredSystemTypes.length === 0 ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="px-0 py-0">
                            <EmptyState
                              title="Tizim turlari topilmadi"
                              description="Qidiruvni o'zgartirib ko'ring yoki yangi tizim turi qo'shing."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSystemTypes.map((row, index) => (
                          <TableRow key={row.id} className="bg-transparent">
                            <TableCell className="px-5 font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-4 whitespace-normal">
                              <p className="text-sm font-medium text-foreground">{row.systemName}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="h-7 rounded-full px-3">
                                {row.scopeType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusChip active={row.active} />
                            </TableCell>
                            <TableCell className="px-5">
                              <ActionButtons
                                label={row.systemName}
                                onEdit={() => openSystemTypeEditor(row)}
                                onDelete={() =>
                                  setDeleteState({
                                    kind: "systemType",
                                    id: row.id,
                                    label: row.systemName,
                                  })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button
        type="button"
        size="icon-lg"
        onClick={openCreateModal}
        className="fixed right-8 bottom-8 z-40 size-16 rounded-full shadow-[0_26px_48px_-20px_rgba(var(--primary-rgb),0.65)]"
        title={
          activeTab === "departments"
            ? "Yangi boshqarma qo'shish"
            : activeTab === "stages"
              ? "Yangi bosqich qo'shish"
              : "Yangi tizim turi qo'shish"
        }
      >
        <Plus className="size-7" />
      </Button>

      {editorState ? (
        <ModalShell
          title={
            editorState.kind === "department"
              ? editorState.mode === "create"
                ? "Yangi boshqarma qo'shish"
                : "Boshqarma ma'lumotlarini tahrirlash"
              : editorState.kind === "stage"
                ? editorState.mode === "create"
                  ? "Yangi bosqich qo'shish"
                  : "Bosqich ma'lumotlarini tahrirlash"
                : editorState.mode === "create"
                  ? "Yangi tizim turi qo'shish"
                  : "Tizim turi ma'lumotlarini tahrirlash"
          }
          description={
            editorState.kind === "department"
              ? "Boshqarma nomi, turi va holatini boshqaring."
              : editorState.kind === "stage"
                ? "Bosqich nomi, tavsifi va holatini boshqaring."
                : "Tizim nomi va ichki yoki tashqi turini boshqaring."
          }
          onClose={() => setEditorState(null)}
        >
          <form onSubmit={handleEditorSubmit} className="space-y-5">
            {editorState.kind === "department" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="department-name">Boshqarma nomi</Label>
                  <Input
                    id="department-name"
                    value={departmentForm.name}
                    onChange={(event) =>
                      setDepartmentForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Boshqarma nomini kiriting"
                    className="h-11 rounded-[14px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department-type">Boshqarma turi</Label>
                  <Select
                    value={departmentForm.departmentType}
                    onValueChange={(value) =>
                      setDepartmentForm((current) => ({ ...current, departmentType: value ?? current.departmentType }))
                    }
                  >
                    <SelectTrigger id="department-type" className="h-11 w-full rounded-[14px]">
                      <SelectValue placeholder="Turini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-[18px] border border-border/70 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Faol holatda saqlash</p>
                    <p className="mt-1 text-xs text-muted-foreground">Nofaol yozuvlar tanlovlarda ishlatilmaydi.</p>
                  </div>
                  <Switch
                    checked={departmentForm.active}
                    onCheckedChange={(checked) =>
                      setDepartmentForm((current) => ({ ...current, active: Boolean(checked) }))
                    }
                  />
                </div>
              </>
            ) : editorState.kind === "stage" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stage-name">Bosqich nomi</Label>
                  <Input
                    id="stage-name"
                    value={stageForm.name}
                    onChange={(event) => setStageForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Bosqich nomini kiriting"
                    className="h-11 rounded-[14px]"
                    required
                  />
                </div>

                <div className="flex items-center justify-between rounded-[18px] border border-border/70 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Faol holatda saqlash</p>
                    <p className="mt-1 text-xs text-muted-foreground">Faqat faol bosqichlar formaga chiqadi.</p>
                  </div>
                  <Switch
                    checked={stageForm.active}
                    onCheckedChange={(checked) =>
                      setStageForm((current) => ({ ...current, active: Boolean(checked) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage-description">Tavsif</Label>
                  <Textarea
                    id="stage-description"
                    value={stageForm.description}
                    onChange={(event) =>
                      setStageForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Bosqich haqida qisqacha tavsif yozing"
                    className="min-h-28 rounded-[14px]"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="system-type-name">Tizim nomi</Label>
                  <Input
                    id="system-type-name"
                    value={systemTypeForm.systemName}
                    onChange={(event) =>
                      setSystemTypeForm((current) => ({ ...current, systemName: event.target.value }))
                    }
                    placeholder="Tizim nomini kiriting"
                    className="h-11 rounded-[14px]"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="system-scope-type">Ichki / Tashqi</Label>
                    <Select
                      value={systemTypeForm.scopeType}
                      onValueChange={(value) =>
                        setSystemTypeForm((current) => ({ ...current, scopeType: value ?? current.scopeType }))
                      }
                    >
                      <SelectTrigger id="system-scope-type" className="h-11 w-full rounded-[14px]">
                        <SelectValue placeholder="Turini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemScopeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[18px] border border-border/70 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Faol holatda saqlash</p>
                    <p className="mt-1 text-xs text-muted-foreground">Faqat faol tizim turlari tanlovlarda ishlatiladi.</p>
                  </div>
                  <Switch
                    checked={systemTypeForm.active}
                    onCheckedChange={(checked) =>
                      setSystemTypeForm((current) => ({ ...current, active: Boolean(checked) }))
                    }
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditorState(null)} disabled={isSubmitting}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {editorState.mode === "create" ? "Saqlash" : "Yangilash"}
              </Button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {deleteState ? (
        <ModalShell
          title="O'chirishni tasdiqlang"
          description={`"${deleteState.label}" yozuvi butunlay o'chiriladi.`}
          onClose={() => setDeleteState(null)}
        >
          <div className="space-y-5">
            <div className="rounded-[20px] border border-red-200/70 bg-red-50/70 px-4 py-3 text-sm leading-6 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              Bu amal ortga qaytarilmaydi. Davom etishni xohlaysizmi?
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDeleteState(null)} disabled={isDeleting}>
                Bekor qilish
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className={cn("bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:text-white dark:hover:bg-red-400")}
              >
                {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                O'chirish
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
