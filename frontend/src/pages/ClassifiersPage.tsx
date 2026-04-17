import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  Database,
  Loader2,
  Pencil,
  Plus,
  Search,
  Server,
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
  createClassifierServer,
  createClassifierSystemType,
  deleteClassifierDepartment,
  deleteClassifierProcessStage,
  deleteClassifierServer,
  deleteClassifierSystemType,
  deleteClassifierTable,
  updateClassifierDepartment,
  updateClassifierProcessStage,
  updateClassifierServer,
  updateClassifierSystemType,
  updateClassifierTable,
} from "@/lib/api";
import {
  classifierQueryKeys,
  getClassifierDepartments,
  getClassifierProcessStages,
  getClassifierServers,
  getClassifierSystemTypes,
  getClassifierTables,
  sortClassifierDepartments,
  sortClassifierProcessStages,
  sortClassifierServers,
  sortClassifierSystemTypes,
  sortClassifierTables,
} from "@/lib/classifiers";
import type {
  ClassifierDepartment,
  ClassifierDepartmentRequest,
  ClassifierProcessStage,
  ClassifierProcessStageRequest,
  ClassifierServer,
  ClassifierServerRequest,
  ClassifierSystemType,
  ClassifierSystemTypeRequest,
  ClassifierTable,
  ClassifierTableColumn,
  ClassifierTableRequest,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TabValue = "departments" | "stages" | "systemTypes" | "tables" | "servers";
type DepartmentTypeFilter = "all" | (typeof departmentTypeOptions)[number];
type SystemTypeScopeFilter = "all" | "Ichki" | "Tashqi";
type TableSystemFilterValue = string;
type EditorState =
  | { kind: "department"; mode: "create" | "edit"; id?: string }
  | { kind: "stage"; mode: "create" | "edit"; id?: string }
  | { kind: "systemType"; mode: "create" | "edit"; id?: string }
  | { kind: "server"; mode: "create" | "edit"; id?: string };
type DeleteState = { kind: "department" | "stage" | "systemType" | "server" | "table"; id: string; label: string };

const departmentTypeOptions = ["Boshqarma", "Bo'lim", "Sektor", "Laboratoriya"] as const;
const systemScopeOptions = ["Ichki", "Tashqi"] as const;
const ALL_FILTER_VALUE = "ALL";

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

function createEmptyServerForm(): ClassifierServerRequest {
  return {
    name: "",
    description: "",
    active: true,
  };
}

function cloneClassifierTable(table: ClassifierTable): ClassifierTable {
  return {
    ...table,
    columns: table.columns.map((column) => ({ ...column })),
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

function AutocompleteMultiSelectFilter({
  value,
  onChange,
  options,
  allLabel,
  placeholder,
}: {
  value: string[];
  onChange: (nextValue: string[]) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const triggerLabel = useMemo(() => {
    if (isAllFilterSelected(value)) {
      return allLabel;
    }

    const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
    if (selectedLabels.length <= 2) {
      return selectedLabels.join(", ");
    }

    return `${selectedLabels.length} ta tanlandi`;
  }, [allLabel, options, value]);

  return (
    <div ref={containerRef} className="relative w-full xl:w-[22rem]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-[14px] border border-input bg-transparent px-4 text-left text-[15px] transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]">
          <div className="border-b border-border/70 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="h-10 rounded-[12px] pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="max-h-[19.5rem] overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Mos variant topilmadi</div>
            ) : (
              filteredOptions.map((option) => {
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
              })
            )}
          </div>
        </div>
      ) : null}
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
  contentClassName,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  contentClassName?: string;
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
      <div
        className={cn(
          "w-full max-w-xl rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,33,46,0.96),rgba(20,26,37,0.92))]",
          contentClassName,
        )}
      >
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
  const [tableQuery, setTableQuery] = useState("");
  const [serverQuery, setServerQuery] = useState("");
  const [tableSystemTypeFilter, setTableSystemTypeFilter] = useState<TableSystemFilterValue[]>([ALL_FILTER_VALUE]);
  const [selectedTable, setSelectedTable] = useState<ClassifierTable | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTableSubmitting, setIsTableSubmitting] = useState(false);
  const [departmentForm, setDepartmentForm] = useState<ClassifierDepartmentRequest>(createEmptyDepartmentForm);
  const [stageForm, setStageForm] = useState<ClassifierProcessStageRequest>(createEmptyStageForm);
  const [systemTypeForm, setSystemTypeForm] = useState<ClassifierSystemTypeRequest>(createEmptySystemTypeForm);
  const [serverForm, setServerForm] = useState<ClassifierServerRequest>(createEmptyServerForm);
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
  const serversQuery = useQuery({
    queryKey: classifierQueryKeys.servers,
    queryFn: getClassifierServers,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const tablesQuery = useQuery({
    queryKey: classifierQueryKeys.tables,
    queryFn: getClassifierTables,
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

  useEffect(() => {
    if (serversQuery.error) {
      toast.error(extractErrorMessage(serversQuery.error, "Serverlarni yuklab bo'lmadi."));
    }
  }, [serversQuery.error]);

  useEffect(() => {
    if (tablesQuery.error) {
      toast.error(extractErrorMessage(tablesQuery.error, "Jadvallarni yuklab bo'lmadi."));
    }
  }, [tablesQuery.error]);

  const departments = departmentsQuery.data ?? [];
  const stages = stagesQuery.data ?? [];
  const systemTypes = systemTypesQuery.data ?? [];
  const servers = serversQuery.data ?? [];
  const tables = tablesQuery.data ?? [];
  const tableSystemTypeOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Barchasi" },
      ...[...new Set(tables.map((item) => item.systemType))]
        .sort((left, right) => left.localeCompare(right, "uz"))
        .map((item) => ({ value: item, label: item })),
    ],
    [tables],
  );
  const editableTableSystemTypeOptions = useMemo(() => {
    const baseOptions = [
      ...new Set(
        systemTypes
          .map((item) => item.systemName)
          .filter((value) => value.trim().length > 0),
      ),
    ].sort((left, right) => left.localeCompare(right, "uz"));

    if (selectedTable?.systemType && !baseOptions.includes(selectedTable.systemType)) {
      return [selectedTable.systemType, ...baseOptions];
    }

    return baseOptions;
  }, [selectedTable?.systemType, systemTypes]);

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

  const filteredTables = useMemo(() => {
    const query = tableQuery.trim().toLocaleLowerCase();
    return tables.filter((row) =>
      (isAllFilterSelected(tableSystemTypeFilter) || tableSystemTypeFilter.includes(row.systemType)) &&
      (!query ||
        `${row.tableName} ${row.description} ${row.systemType} ${row.columns.map((column) => `${column.name} ${column.description ?? ""}`).join(" ")}`
          .toLocaleLowerCase()
          .includes(query)),
    );
  }, [tableQuery, tableSystemTypeFilter, tables]);

  const filteredServers = useMemo(() => {
    const query = serverQuery.trim().toLocaleLowerCase();
    if (!query) {
      return servers;
    }

    return servers.filter((row) =>
      `${row.name} ${row.description ?? ""} ${row.active ? "faol" : "nofaol"}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [serverQuery, servers]);

  useEffect(() => {
    if (isAllFilterSelected(tableSystemTypeFilter)) {
      return;
    }

    const availableValues = tableSystemTypeOptions.slice(1).map((option) => option.value);
    const nextValues = tableSystemTypeFilter.filter((value) => availableValues.includes(value));
    if (nextValues.length === 0) {
      setTableSystemTypeFilter([ALL_FILTER_VALUE]);
      return;
    }

    if (nextValues.length !== tableSystemTypeFilter.length) {
      setTableSystemTypeFilter(nextValues);
    }
  }, [tableSystemTypeFilter, tableSystemTypeOptions]);

  function openCreateModal() {
    if (activeTab === "tables") {
      return;
    }

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

    if (activeTab === "servers") {
      setServerForm(createEmptyServerForm());
      setEditorState({ kind: "server", mode: "create" });
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

  function openServerEditor(item: ClassifierServer) {
    setServerForm({
      name: item.name,
      description: item.description ?? "",
      active: item.active,
    });
    setEditorState({ kind: "server", mode: "edit", id: item.id });
  }

  function openTableEditor(item: ClassifierTable) {
    setSelectedTable(cloneClassifierTable(item));
  }

  function updateSelectedTableColumn(
    columnId: string | null,
    updater: (column: ClassifierTableColumn) => ClassifierTableColumn,
  ) {
    if (!columnId) {
      return;
    }

    setSelectedTable((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        columns: current.columns.map((column) => (column.id === columnId ? updater(column) : column)),
      };
    });
  }

  async function handleSelectedTableSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTable?.id) {
      return;
    }

    setIsTableSubmitting(true);

    try {
      const payload = {
        tableName: selectedTable.tableName.trim(),
        description: selectedTable.description.trim(),
        systemType: selectedTable.systemType.trim(),
        columns: selectedTable.columns.map((column) => ({
          id: column.id!,
          name: column.name.trim(),
          dataType: column.dataType.trim(),
          description: (column.description ?? "").trim(),
          nullable: column.nullable,
          ordinalPosition: column.ordinalPosition,
        })),
      } satisfies ClassifierTableRequest;

      const saved = await updateClassifierTable(selectedTable.id, payload);
      queryClient.setQueryData<ClassifierTable[]>(classifierQueryKeys.tables, (current = []) =>
        sortClassifierTables([...current.filter((item) => item.id !== saved.id), saved]),
      );
      setSelectedTable(cloneClassifierTable(saved));
      toast.success("Jadval muvaffaqiyatli yangilandi.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Jadval saqlanmadi."));
    } finally {
      setIsTableSubmitting(false);
    }
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
      } else if (editorState.kind === "systemType") {
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
      } else {
        const payload = {
          name: serverForm.name.trim(),
          description: serverForm.description.trim(),
          active: serverForm.active,
        } satisfies ClassifierServerRequest;

        const saved = editorState.mode === "create"
          ? await createClassifierServer(payload)
          : await updateClassifierServer(editorState.id!, payload);

        queryClient.setQueryData<ClassifierServer[]>(classifierQueryKeys.servers, (current = []) =>
          sortClassifierServers([...current.filter((item) => item.id !== saved.id), saved]),
        );

        toast.success(
          editorState.mode === "create"
            ? "Server muvaffaqiyatli qo'shildi."
            : "Server muvaffaqiyatli yangilandi.",
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
              : editorState.kind === "systemType"
                ? "Tizim turi saqlanmadi."
                : "Server saqlanmadi.",
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
      } else if (deleteState.kind === "systemType") {
        await deleteClassifierSystemType(deleteState.id);
        queryClient.setQueryData<ClassifierSystemType[]>(classifierQueryKeys.systemTypes, (current = []) =>
          current.filter((item) => item.id !== deleteState.id),
        );
        toast.success("Tizim turi o'chirildi.");
      } else if (deleteState.kind === "table") {
        await deleteClassifierTable(deleteState.id);
        queryClient.setQueryData<ClassifierTable[]>(classifierQueryKeys.tables, (current = []) =>
          current.filter((item) => item.id !== deleteState.id),
        );
        setSelectedTable((current) => (current?.id === deleteState.id ? null : current));
        toast.success("Jadval o'chirildi.");
      } else {
        await deleteClassifierServer(deleteState.id);
        queryClient.setQueryData<ClassifierServer[]>(classifierQueryKeys.servers, (current = []) =>
          current.filter((item) => item.id !== deleteState.id),
        );
        toast.success("Server o'chirildi.");
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
              : deleteState.kind === "systemType"
                ? "Tizim turi o'chirilmadi."
                : deleteState.kind === "table"
                  ? "Jadval o'chirilmadi."
                  : "Server o'chirilmadi.",
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
            <TabsTrigger
              value="tables"
              className="h-10 min-w-[11rem] rounded-[14px] border border-transparent bg-white/52 px-5 text-sm font-semibold text-foreground/75 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.2)] backdrop-blur data-active:border-[color:rgba(var(--primary-rgb),0.12)] data-active:bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.12),rgba(var(--accent-rgb),0.08))] data-active:text-primary data-active:shadow-[0_16px_26px_-20px_rgba(var(--primary-rgb),0.26)]"
            >
              Jadvallar
            </TabsTrigger>
            <TabsTrigger
              value="servers"
              className="h-10 min-w-[11rem] rounded-[14px] border border-transparent bg-white/52 px-5 text-sm font-semibold text-foreground/75 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.2)] backdrop-blur data-active:border-[color:rgba(var(--primary-rgb),0.12)] data-active:bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.12),rgba(var(--accent-rgb),0.08))] data-active:text-primary data-active:shadow-[0_16px_26px_-20px_rgba(var(--primary-rgb),0.26)]"
            >
              Serverlar
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

        <TabsContent value="tables">
          <Card className="border-border/70 bg-card/90 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <SectionHeader
                  icon={Database}
                  title={`Jadvallar (${filteredTables.length} ta)`}
                />
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <AutocompleteMultiSelectFilter
                    value={tableSystemTypeFilter}
                    onChange={setTableSystemTypeFilter}
                    options={tableSystemTypeOptions}
                    allLabel="Barchasi"
                    placeholder="Tizim turini qidiring"
                  />
                  <SearchBox value={tableQuery} onChange={setTableQuery} />
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/70">
                <ScrollArea className="h-[34rem]">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 px-5">No</TableHead>
                        <TableHead className="min-w-[16rem]">Jadval nomi</TableHead>
                        <TableHead className="min-w-[26rem]">Jadval tavsifi</TableHead>
                        <TableHead className="min-w-[14rem]">Tizim turi</TableHead>
                        <TableHead className="min-w-[8rem]">Ustunlar</TableHead>
                        <TableHead className="w-32 px-5 text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tablesQuery.isLoading ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={6} className="h-[20rem] px-5">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              <span>Ma'lumotlar yuklanmoqda...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredTables.length === 0 ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={6} className="px-0 py-0">
                            <EmptyState
                              title="Jadvallar topilmadi"
                              description="Qidiruvni o'zgartirib ko'ring yoki metadata manbasini tekshiring."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTables.map((row, index) => (
                          <TableRow key={row.tableName} className="bg-transparent">
                            <TableCell className="px-5 font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-4 whitespace-normal">
                              <button
                                type="button"
                                onClick={() => openTableEditor(row)}
                                className="cursor-pointer text-left text-sm font-semibold text-primary transition hover:underline"
                              >
                                {row.tableName}
                              </button>
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              <p className="max-w-[42rem] text-sm leading-6 text-muted-foreground">{row.description}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="h-7 rounded-full px-3">
                                {row.systemType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="h-7 rounded-full px-3">
                                {row.columns.length} ta
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5">
                              {row.id ? (
                                <ActionButtons
                                  label={row.tableName}
                                  onEdit={() => openTableEditor(row)}
                                  onDelete={() =>
                                    setDeleteState({
                                      kind: "table",
                                      id: row.id!,
                                      label: row.tableName,
                                    })
                                  }
                                />
                              ) : (
                                <p className="text-right text-xs text-muted-foreground">Faqat ko'rish</p>
                              )}
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

        <TabsContent value="servers">
          <Card className="border-border/70 bg-card/90 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <SectionHeader
                  icon={Server}
                  title={`Serverlar (${filteredServers.length} ta)`}
                />
                <SearchBox value={serverQuery} onChange={setServerQuery} />
              </div>

              <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/70">
                <ScrollArea className="h-[34rem]">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 px-5">No</TableHead>
                        <TableHead className="min-w-[16rem]">Server nomi</TableHead>
                        <TableHead className="min-w-[24rem]">Ta'rif</TableHead>
                        <TableHead className="min-w-[8rem]">Holat</TableHead>
                        <TableHead className="w-32 px-5 text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serversQuery.isLoading ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="h-[20rem] px-5">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              <span>Ma'lumotlar yuklanmoqda...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredServers.length === 0 ? (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={5} className="px-0 py-0">
                            <EmptyState
                              title="Serverlar topilmadi"
                              description="Qidiruvni o'zgartirib ko'ring yoki yangi server qo'shing."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServers.map((row, index) => (
                          <TableRow key={row.id} className="bg-transparent">
                            <TableCell className="px-5 font-semibold text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="py-4 whitespace-normal">
                              <p className="text-sm font-medium text-foreground">{row.name}</p>
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              <p className="max-w-[42rem] text-sm leading-6 text-muted-foreground">
                                {row.description || "Ta'rif kiritilmagan"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusChip active={row.active} />
                            </TableCell>
                            <TableCell className="px-5">
                              <ActionButtons
                                label={row.name}
                                onEdit={() => openServerEditor(row)}
                                onDelete={() =>
                                  setDeleteState({
                                    kind: "server",
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
      </Tabs>

      {activeTab !== "tables" ? (
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
                : activeTab === "systemTypes"
                  ? "Yangi tizim turi qo'shish"
                  : "Yangi server qo'shish"
          }
        >
          <Plus className="size-7" />
        </Button>
      ) : null}

      {selectedTable ? (
        <ModalShell
          title={selectedTable.tableName}
          description="Jadval ma'lumotlari va ustunlar ro'yxatini shu oynada tahrirlang."
          onClose={() => setSelectedTable(null)}
          contentClassName="max-w-7xl"
        >
          <form onSubmit={handleSelectedTableSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.8fr]">
              <div className="space-y-2">
                <Label htmlFor="table-name">Jadval nomi</Label>
                <Input
                  id="table-name"
                  value={selectedTable.tableName}
                  onChange={(event) =>
                    setSelectedTable((current) => (current ? { ...current, tableName: event.target.value } : current))
                  }
                  className="h-11 rounded-[14px]"
                  disabled={!selectedTable.id || isTableSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-system-type">Tizim turi</Label>
                {editableTableSystemTypeOptions.length > 0 ? (
                  <Select
                    value={selectedTable.systemType}
                    onValueChange={(value) =>
                      setSelectedTable((current) =>
                        current ? { ...current, systemType: value ?? current.systemType } : current
                      )
                    }
                    disabled={!selectedTable.id || isTableSubmitting}
                  >
                    <SelectTrigger id="table-system-type" className="h-11 w-full rounded-[14px]">
                      <SelectValue placeholder="Tizim turini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {editableTableSystemTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="table-system-type"
                    value={selectedTable.systemType}
                    onChange={(event) =>
                      setSelectedTable((current) => (current ? { ...current, systemType: event.target.value } : current))
                    }
                    className="h-11 rounded-[14px]"
                    disabled={!selectedTable.id || isTableSubmitting}
                    required
                  />
                )}
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Ustunlar soni</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{selectedTable.columns.length} ta</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-description">Jadval tavsifi</Label>
              <Textarea
                id="table-description"
                value={selectedTable.description}
                onChange={(event) =>
                  setSelectedTable((current) => (current ? { ...current, description: event.target.value } : current))
                }
                className="min-h-28 rounded-[14px]"
                disabled={!selectedTable.id || isTableSubmitting}
                required
              />
            </div>

            <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background/70">
              <ScrollArea className="h-[28rem]">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-24 px-5">Tartib</TableHead>
                      <TableHead className="min-w-[14rem]">Ustun nomi</TableHead>
                      <TableHead className="min-w-[12rem]">Ma'lumot turi</TableHead>
                      <TableHead className="min-w-[18rem]">Tavsif</TableHead>
                      <TableHead className="min-w-[8rem]">Null</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTable.columns.length === 0 ? (
                      <TableRow className="bg-transparent hover:bg-transparent">
                        <TableCell colSpan={5} className="px-0 py-0">
                          <EmptyState
                            title="Ustunlar topilmadi"
                            description="Datasource ichida bu jadval uchun ustun metadata topilmadi."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedTable.columns.map((column) => (
                        <TableRow key={`${selectedTable.id ?? selectedTable.tableName}-${column.id ?? column.name}`} className="bg-transparent align-top">
                          <TableCell className="px-5">
                            <Input
                              type="number"
                              min={1}
                              value={column.ordinalPosition}
                              onChange={(event) =>
                                updateSelectedTableColumn(column.id, (current) => ({
                                  ...current,
                                  ordinalPosition: Math.max(1, Number(event.target.value) || 1),
                                }))
                              }
                              className="h-10 rounded-[12px]"
                              disabled={!selectedTable.id || isTableSubmitting || !column.id}
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <Input
                              value={column.name}
                              onChange={(event) =>
                                updateSelectedTableColumn(column.id, (current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              className="h-10 rounded-[12px]"
                              disabled={!selectedTable.id || isTableSubmitting || !column.id}
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={column.dataType}
                              onChange={(event) =>
                                updateSelectedTableColumn(column.id, (current) => ({
                                  ...current,
                                  dataType: event.target.value,
                                }))
                              }
                              className="h-10 rounded-[12px]"
                              disabled={!selectedTable.id || isTableSubmitting || !column.id}
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={column.description ?? ""}
                              onChange={(event) =>
                                updateSelectedTableColumn(column.id, (current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              className="h-10 rounded-[12px]"
                              disabled={!selectedTable.id || isTableSubmitting || !column.id}
                              placeholder="Tavsif kiriting"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex min-h-10 items-center">
                              <Switch
                                checked={Boolean(column.nullable)}
                                onCheckedChange={(checked) =>
                                  updateSelectedTableColumn(column.id, (current) => ({
                                    ...current,
                                    nullable: Boolean(checked),
                                  }))
                                }
                                disabled={!selectedTable.id || isTableSubmitting || !column.id}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                {!selectedTable.id ? "Bu jadval faqat ko'rish rejimida." : "O'zgarishlar jadval va barcha ustunlarga birgalikda saqlanadi."}
              </p>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => setSelectedTable(null)} disabled={isTableSubmitting}>
                  Yopish
                </Button>
                <Button type="submit" disabled={!selectedTable.id || isTableSubmitting}>
                  {isTableSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Saqlash
                </Button>
              </div>
            </div>
          </form>
        </ModalShell>
      ) : null}

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
                : editorState.kind === "systemType"
                  ? editorState.mode === "create"
                    ? "Yangi tizim turi qo'shish"
                    : "Tizim turi ma'lumotlarini tahrirlash"
                  : editorState.mode === "create"
                    ? "Yangi server qo'shish"
                    : "Server ma'lumotlarini tahrirlash"
          }
          description={
            editorState.kind === "department"
              ? "Boshqarma nomi, turi va holatini boshqaring."
              : editorState.kind === "stage"
                ? "Bosqich nomi, tavsifi va holatini boshqaring."
                : editorState.kind === "systemType"
                  ? "Tizim nomi va ichki yoki tashqi turini boshqaring."
                  : "Server nomi, ta'rifi va holatini boshqaring."
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
            ) : editorState.kind === "systemType" ? (
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
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="server-name">Server nomi</Label>
                  <Input
                    id="server-name"
                    value={serverForm.name}
                    onChange={(event) =>
                      setServerForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Server nomini kiriting"
                    className="h-11 rounded-[14px]"
                    required
                  />
                </div>

                <div className="flex items-center justify-between rounded-[18px] border border-border/70 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Faol holatda saqlash</p>
                    <p className="mt-1 text-xs text-muted-foreground">Nofaol serverlar tanlovlarda ishlatilmaydi.</p>
                  </div>
                  <Switch
                    checked={serverForm.active}
                    onCheckedChange={(checked) =>
                      setServerForm((current) => ({ ...current, active: Boolean(checked) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server-description">Ta'rif</Label>
                  <Textarea
                    id="server-description"
                    value={serverForm.description}
                    onChange={(event) =>
                      setServerForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Server haqida qisqacha ta'rif yozing"
                    className="min-h-28 rounded-[14px]"
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
