import { startTransition, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Maximize2, Minimize2, Plus, Upload, X } from "lucide-react";

import { TagInput } from "@/components/common/tag-input";
import { DateInput } from "@/components/common/date-input";
import { RuleCanvasEditor } from "@/components/rules/rule-canvas-editor";
import { RuleCanvasComplexEditor, type RuleCanvasComplexEditorHandle } from "@/components/rules/rule-canvas-complex-editor";
import { RuleCanvasFormEditor } from "@/components/rules/rule-canvas-form-editor";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/animate/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createControlOverview,
  createControl,
  downloadControlBasisFile,
  fetchControl,
  fetchNextControlUniqueNumber,
  updateControlOverview,
  updateControl,
} from "@/lib/api";
import {
  buildClassifierTableOptions,
  buildSystemNameOptions,
  buildProcessStageOptions,
  classifierQueryKeys,
  getClassifierProcessStages,
  getClassifierSystemTypes,
  getClassifierTables,
  getDefaultProcessStageName,
  getDefaultSystemName,
  resolveProcessStageValue,
} from "@/lib/classifiers";
import {
  controlDetailToRequest,
  createDefaultControlRequest,
  type ControlDetail,
  type ControlOverviewRequest,
  type ControlRequest,
  type DeploymentScope,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const stepIds = ["overview", "execution"] as const;
const OVERVIEW_REQUIRED_FIELDS: Array<keyof ControlRequest> = [
  "deploymentScope",
  "systemName",
  "controlType",
  "name",
  "processStage",
  "objective",
  "startDate",
  "finishDate",
];
/*
const deprecatedDepartmentNames = ["Risk boshqarmasi"] as const;
const departmentOptions = [
  "Bojxona nazorati va rasmiylashtiruvini tashkil etish boshqarmasi",
  "Notarif tartibga solish boshqarmasi",
  "Targetlash va xavflarni monitoring qilish boshqarmasi",
  "Axborot-kommunikatsiya texnologiyalari va kiberxavfsizligini ta'minlash boshqarmasi",
  "Strategik rejalashtirish va bojxona tartib-taomillarini soddalashtirish boshqarmasi",
  "Bojxona to'lovlari boshqarmasi",
  "Tashqi savdo bojxona statistikasi boshqarmasi",
  "Valyuta nazorati boshqarmasi",
  "Moliya-iqtisodiyot boshqarmasi",
  "Moddiy-texnika ta'minoti boshqarmasi",
  "Kapital qurilish laboratoriyasi",
  "Kontrabandaga qarshi kurashish boshqarmasi",
  "Bojxona audit boshqarmasi",
  "Harbiy safarbarlik, jangovar tayyorgarlik va qo'riqlash boshqarmasi",
  "Xalqaro hamkorlik boshqarmasi",
  "Surishtiruv va ma'muriy amaliyot boshqarmasi",
  "Rais maslahatchisi",
  "Inson resurslarini rivojlantirish va boshqarish boshqarmasi",
  "Shaxsiy xavfsizlik boshqarmasi",
  "Tashkiliy-nazorat, xizmat faoliyatini tahlil qilish va baholash boshqarmasi",
  "Yuridik boshqarma",
  "Jamoatchilik va ommaviy axborot vositalari bilan aloqalar bo'limi",
  "Murojaatlar bilan ishlash bo'limi",
  "Tibbiy ijtimoiy muassasalar bilan ishlash bo'limi",
  "Ichki audit va moliyaviy nazorat bo'limi",
  "Birinchi bo'lim",
  "«A» sektori",
] as const;
const processStageOptions = [
  "Verifikatsiyadan o'tkazish",
  "Dastlabki tekshiruvda qabul qilish",
  "Rasmiylashtirish",
  "Jo'natish",
  "Bekor qilish",
  "Ortga qaytarish",
] as const;
const legacyProcessStageMap: Record<string, string> = {
  VERIFICATION: "Verifikatsiyadan o'tkazish",
  ACCEPTANCE: "Dastlabki tekshiruvda qabul qilish",
  CLEARANCE: "Rasmiylashtirish",
  DISPATCH: "Jo'natish",
  CANCELLED: "Bekor qilish",
  RETURNED: "Ortga qaytarish",
};
*/
/* const territoryOptions = [
  "1700 - Toshkent-Aero IBK",
  "1701 - UzR BQ Markaziy apparati",
  "1703 - Andijon viloyati bojxona boshqarmasi",
  "1706 - Buxoro viloyati bojxona boshqarmasi",
  "1708 - Jizzax viloyati bojxona boshqarmasi",
  "1710 - Qashqadaryo viloyati bojxona boshqarmasi",
  "1712 - Navoiy viloyati bojxona boshqarmasi",
  "1714 - Namangan viloyati bojxona boshqarmasi",
  "1718 - Samarqand viloyati bojxona boshqarmasi",
  "1722 - Surxondaryo viloyati bojxona boshqarmasi",
  "1724 - Sirdaryo viloyati bojxona boshqarmasi",
  "1726 - Toshkent shaxar bojxona boshqarmasi",
  "1727 - Toshkent viloyati bojxona boshqarmasi",
  "1730 - Farg‘ona viloyati bojxona boshqarmasi",
  "1733 - Xorazm viloyati bojxona boshqarmasi",
  "1735 - Qoraqalpog‘iston Respublikasi bojxona boshqarmasi",
  "1790 - Iqtisodiyot va moliya vazirligi huzuridagi Bojxona Instituti",
  "1791 - Milliy kinologiya markazi",
  "1702 - Bojxona rasmiylashtiruvi markazi",
] as const; */
/* const postOptions = [
  "26012 - Fayzobod TIF",
  "33006 - Urganch temir yo‘l chegara posti",
  "00101 - Islom Karimov nomidagi \"Toshkent\" xalqaro AEROi» chegara bojxona posti",
  "00102 - Avia yuklar TIF",
  "03002 - Do‘stlik chegara posti (Andijan)",
  "03003 - Andijan AERO",
  "03004 - Bobur TIF",
  "03009 - Madaniyat chegara posti",
  "03011 - Andijon TIF",
  "03014 - Savay temir yo‘l chegara posti",
  "03015 - Asaka TIF",
  "06001 - Buxoro AERO",
  "06002 - Kogon TIF",
  "06006 - Buxoro TIF",
  "06007 - Qorovulbozor TIF",
  "06008 - G‘ijduvon TIF",
  "06009 - Qorako‘l TIF",
  "06010 - Olot chegara posti",
  "06011 - Xo‘jadavlat temir yo‘l chegara posti",
  "08003 - Uchto‘rg‘on chegara posti",
  "08004 - Jizax TIF",
  "08007 - Qo‘shkent chegara posti",
  "10002 - Nasaf TIF",
  "10003 - Qarshi temir yo‘l chegara posti",
  "10005 - Muborak TIF",
  "10006 - Kitob TIF",
  "10007 - Qamashi-G‘uzor TIF",
  "10008 - Qarshi-Kerki chegara posti",
  "10010 - Qarshi-tola TIF",
  "10011 - Talimarjon TIF",
  "10012 - Qarshi AERO",
  "12001 - Tinchlik TIF",
  "12002 - Navoiy AERO",
  "12003 - Navoiy TIF",
  "12008 - Zarafshon TIF",
  "12012 - Navoiy industrial TIF",
  "14002 - Namangan AERO",
  "14003 - Uchqo‘rg‘on chegara posti",
  "14004 - Kosonsoy chegara posti",
  "14005 - Pop chegara posti",
  "14010 - Namangan TIF",
] as const; */
function buildOverviewRequest(values: ControlRequest): ControlOverviewRequest {
  return {
    name: values.name,
    objective: values.objective,
    basis: values.basis,
    tableName: values.tableName,
    basisFileName: values.basisFileName,
    basisFileContentType: values.basisFileContentType,
    basisFileSize: values.basisFileSize,
    basisFileBase64: values.basisFileBase64,
    basisFileRemoved: values.basisFileRemoved,
    systemName: values.systemName,
    startDate: values.startDate,
    finishDate: values.finishDate,
    controlType: values.controlType,
    processStage: values.processStage,
    smsNotificationEnabled: values.smsNotificationEnabled,
    smsPhones: values.smsPhones,
    deploymentScope: values.deploymentScope,
    directionType: values.deploymentScope === "INTERNAL" ? values.directionType : null,
    confidentialityLevel: values.confidentialityLevel,
  };
}

function mergeAutosavedDetail(detail: ControlDetail, currentValues: ControlRequest): ControlDetail {
  return {
    ...detail,
    tableName: detail.tableName || currentValues.tableName,
    approvers: currentValues.approvers,
    messages: currentValues.messages,
    authorName: currentValues.authorName,
    responsibleDepartment: currentValues.responsibleDepartment,
    status: currentValues.status,
    phoneExtension: currentValues.phoneExtension,
    priorityOrder: currentValues.priorityOrder,
    versionNumber: currentValues.versionNumber,
    timeoutMs: currentValues.timeoutMs,
    lastExecutionDurationMs: currentValues.lastExecutionDurationMs,
    territories: currentValues.territories,
    posts: currentValues.posts,
    autoCancelAfterDays: currentValues.autoCancelAfterDays,
    conflictMonitoringEnabled: currentValues.conflictMonitoringEnabled,
    copiedFromControlId: currentValues.copiedFromControlId,
    ruleBuilderCanvas: currentValues.ruleBuilderCanvas,
    rules: currentValues.rules,
  };
}

function isDateRangeValid(startDate: string | null, finishDate: string | null) {
  if (!startDate || !finishDate) {
    return true;
  }

  return startDate < finishDate;
}

function shiftIsoDate(date: string | null, days: number) {
  if (!date) {
    return undefined;
  }

  const normalized = new Date(`${date}T00:00:00`);
  if (Number.isNaN(normalized.getTime())) {
    return undefined;
  }

  normalized.setDate(normalized.getDate() + days);
  return normalized.toISOString().slice(0, 10);
}

function isPdfFile(file: File) {
  const normalizedName = file.name.trim().toLocaleLowerCase();
  return file.type === "application/pdf" || normalizedName.endsWith(".pdf");
}

function areCanvasStatesEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

type EditorStep = (typeof stepIds)[number];
type BuilderViewMode = "constructor" | "standard";
type StandardBuilderViewMode = "complex" | "simple";

export function ControlEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const routeControlId = params.id ?? null;
  const [currentStep, setCurrentStep] = useState<EditorStep>("overview");
  const [isBuilderExpanded, setIsBuilderExpanded] = useState(false);
  const [builderViewMode, setBuilderViewMode] = useState<BuilderViewMode>("standard");
  const [standardBuilderViewMode, setStandardBuilderViewMode] = useState<StandardBuilderViewMode>("complex");
  const [persistedControlId, setPersistedControlId] = useState<string | null>(routeControlId);
  const complexEditorRef = useRef<RuleCanvasComplexEditorHandle | null>(null);

  const form = useForm<ControlRequest>({
    defaultValues: createDefaultControlRequest(),
  });
  const dateRangeMessage = t("editor.validation.dateRange", {
    defaultValue: "Boshlanish sana yakunlanish sanasidan oldin bo'lishi kerak",
  });
  const pdfOnlyMessage = t("editor.validation.basisFilePdfOnly", {
    defaultValue: "Mantiqiy nazorat asosi hujjati uchun faqat PDF fayl yuklash mumkin",
  });
  const requiredMessages = {
    deploymentScope: t("editor.validation.deploymentScopeRequired", {
      defaultValue: "Tizim turini tanlash majburiy",
    }),
    directionType: t("editor.validation.directionTypeRequired", {
      defaultValue: "Yo'nalishni tanlash majburiy",
    }),
    systemName: t("editor.validation.systemNameRequired", {
      defaultValue: "Tizim nomini tanlash majburiy",
    }),
    controlType: t("editor.validation.controlTypeRequired", {
      defaultValue: "Mantiqiy nazorat turini tanlash majburiy",
    }),
    name: t("editor.validation.nameRequired", {
      defaultValue: "Mantiqiy nazorat nomini to'ldirish majburiy",
    }),
    processStage: t("editor.validation.processStageRequired", {
      defaultValue: "Mantiqiy nazorat bosqichini tanlash majburiy",
    }),
    tableName: t("editor.validation.tableNameRequired", {
      defaultValue: "Jadvalni tanlash majburiy",
    }),
    objective: t("editor.validation.objectiveRequired", {
      defaultValue: "Mantiqiy nazorat maqsadini to'ldirish majburiy",
    }),
    startDate: t("editor.validation.startDateRequired", {
      defaultValue: "Boshlanish sanasini kiritish majburiy",
    }),
    finishDate: t("editor.validation.finishDateRequired", {
      defaultValue: "Yakunlanish sanasini kiritish majburiy",
    }),
  } satisfies Partial<Record<keyof ControlRequest, string>>;

  useEffect(() => {
    setPersistedControlId(routeControlId);
  }, [routeControlId]);

  const detailQuery = useQuery({
    queryKey: ["control", persistedControlId],
    queryFn: () => fetchControl(persistedControlId!),
    enabled: Boolean(persistedControlId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const nextUniqueNumberQuery = useQuery({
    queryKey: ["controls", "nextUniqueNumber"],
    queryFn: fetchNextControlUniqueNumber,
    enabled: !persistedControlId,
    staleTime: 0,
  });
  const processStagesQuery = useQuery({
    queryKey: classifierQueryKeys.processStages,
    queryFn: getClassifierProcessStages,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const tablesQuery = useQuery({
    queryKey: classifierQueryKeys.tables,
    queryFn: getClassifierTables,
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
    if (detailQuery.data) {
      form.reset(controlDetailToRequest(detailQuery.data));
    }
  }, [detailQuery.data, form]);

  useEffect(() => {
    if (persistedControlId || form.getValues("uniqueNumber") || !nextUniqueNumberQuery.data?.uniqueNumber) {
      return;
    }

    form.setValue("uniqueNumber", nextUniqueNumberQuery.data.uniqueNumber, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form, nextUniqueNumberQuery.data?.uniqueNumber, persistedControlId]);

  useEffect(() => {
    const currentStage = form.getValues("processStage");
    const defaultProcessStageName = getDefaultProcessStageName(processStagesQuery.data ?? []);
    const resolvedStage = resolveProcessStageValue(currentStage) || defaultProcessStageName;

    if (resolvedStage && resolvedStage !== currentStage) {
      form.setValue("processStage", resolvedStage, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [form, processStagesQuery.data]);

  const watchDeploymentScope = form.watch("deploymentScope");
  const watchSystemName = form.watch("systemName");

  useEffect(() => {
    if (watchDeploymentScope === "INTERNAL") {
      if (!form.getValues("directionType")) {
        form.setValue("directionType", "ENTRY", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }
      return;
    }

    if (form.getValues("directionType") !== null) {
      form.setValue("directionType", null, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [form, watchDeploymentScope]);

  const overviewAutosaveMutation = useMutation({
    mutationFn: async (payload: ControlOverviewRequest) =>
      persistedControlId ? updateControlOverview(persistedControlId, payload) : createControlOverview(payload),
    onSuccess: (result) => {
      const mergedResult = mergeAutosavedDetail(result, form.getValues());
      setPersistedControlId(result.id);
      queryClient.setQueryData(["control", result.id], mergedResult);
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      form.reset(controlDetailToRequest(mergedResult));
      startTransition(() => navigate(`/controls/${result.id}/edit`, { replace: true }));
    },
    onError: () => {
      toast.error(t("editor.notifications.saveFailed"));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ControlRequest) => {
      const wasUpdate = Boolean(persistedControlId);
      const normalizedPayload = {
        ...payload,
        code: payload.uniqueNumber.trim() || payload.code,
        phoneExtension: "",
      };

      const result = persistedControlId
        ? await updateControl(persistedControlId, normalizedPayload)
        : await createControl(normalizedPayload);

      return { result, wasUpdate };
    },
    onSuccess: ({ result, wasUpdate }) => {
      setPersistedControlId(result.id);
      queryClient.setQueryData(["control", result.id], result);
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      toast.success(
        wasUpdate
          ? t("editor.notifications.updated", { defaultValue: "Mantiqiy nazorat ma'lumotlari yangilandi" })
          : t("editor.notifications.created", { defaultValue: "Mantiqiy nazorat saqlandi" }),
      );
      startTransition(() => navigate(`/controls/${result.id}/edit`, { replace: true }));
    },
    onError: () => {
      toast.error(t("editor.notifications.saveFailed"));
    },
  });

  const watchSms = form.watch("smsNotificationEnabled");
  const watchUniqueNumber = form.watch("uniqueNumber");
  const watchProcessStage = form.watch("processStage");
  const watchTableName = form.watch("tableName");
  const watchConfidentiality = form.watch("confidentialityLevel");
  const watchRuleCanvas = form.watch("ruleBuilderCanvas");
  const watchControlName = form.watch("name");
  const builderContentHeightClassName = isBuilderExpanded ? "h-[calc(100vh-12rem)] min-h-0" : "h-[74vh] min-h-[680px]";
  const isComplexStandardMode = builderViewMode === "standard" && standardBuilderViewMode === "complex";
  const watchBasisFileName = form.watch("basisFileName");
  const watchBasisFileSize = form.watch("basisFileSize");
  const watchBasisFileContentType = form.watch("basisFileContentType");
  const watchBasisFileBase64 = form.watch("basisFileBase64");
  const watchBasisFileRemoved = form.watch("basisFileRemoved");
  const watchStartDate = form.watch("startDate");
  const watchFinishDate = form.watch("finishDate");
  const watchHasStoredBasisFile = Boolean(detailQuery.data?.hasBasisFile) && !watchBasisFileRemoved && !watchBasisFileBase64;
  const controlTypeLabels = {
    WARNING: "Ogohlantrish",
    BLOCK: "Taqiqlash",
    ALLOW: "Istisno",
  } as const;
  const deploymentScopeLabels = {
    INTERNAL: "Ichki",
    EXTERNAL: "Tashqi",
    HYBRID: t("editor.options.hybrid"),
  } as const;
  const directionTypeLabels = {
    ENTRY: "Kirish",
    EXIT: "Chiqish",
  } as const;
  const availableProcessStageOptions = useMemo(
    () =>
      buildProcessStageOptions(
        processStagesQuery.data ?? [],
        resolveProcessStageValue(watchProcessStage) || watchProcessStage,
      ),
    [processStagesQuery.data, watchProcessStage],
  );
  const normalizedDeploymentScope: DeploymentScope =
    watchDeploymentScope === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
  const availableSystemNameOptions = useMemo(
    () => buildSystemNameOptions(systemTypesQuery.data ?? [], normalizedDeploymentScope, watchSystemName),
    [normalizedDeploymentScope, systemTypesQuery.data, watchSystemName],
  );
  const isDataEntryStage = resolveProcessStageValue(watchProcessStage) === "Ma'lumot kiritish";
  const availableTableOptions = useMemo(
    () => buildClassifierTableOptions(tablesQuery.data ?? [], watchSystemName, watchTableName),
    [tablesQuery.data, watchSystemName, watchTableName],
  );

  useEffect(() => {
    const currentSystemName = form.getValues("systemName");
    const defaultSystemName = getDefaultSystemName(systemTypesQuery.data ?? [], normalizedDeploymentScope);

    if (!currentSystemName && defaultSystemName) {
      form.setValue("systemName", defaultSystemName, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      return;
    }

    if (currentSystemName && !availableSystemNameOptions.includes(currentSystemName) && defaultSystemName) {
      form.setValue("systemName", defaultSystemName, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [availableSystemNameOptions, form, normalizedDeploymentScope, systemTypesQuery.data]);

  useEffect(() => {
    if (!isDataEntryStage) {
      if (form.getValues("tableName")) {
        form.setValue("tableName", "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }
      return;
    }

    if (watchTableName && !availableTableOptions.includes(watchTableName)) {
      form.setValue("tableName", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [availableTableOptions, form, isDataEntryStage, watchTableName]);

  useEffect(() => {
    if (!watchStartDate && !watchFinishDate) {
      return;
    }

    void form.trigger(["startDate", "finishDate"]);
  }, [form, watchFinishDate, watchStartDate]);

  useEffect(() => {
    setIsBuilderExpanded(currentStep === "execution");
  }, [currentStep]);

  const steps: Array<{ id: EditorStep; number: number; title: string }> = [
    {
      id: "overview",
      number: 1,
      title: t("editor.steps.overview.title"),
    },
    {
      id: "execution",
      number: 2,
      title: t("editor.steps.execution.title"),
    },
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const isTransitionPending = overviewAutosaveMutation.isPending || saveMutation.isPending;

  const handleStepChange = async (step: EditorStep) => {
    if (step === currentStep) {
      return;
    }

    if (currentStep === "overview" && step === "execution") {
      const fieldsToValidate: Array<keyof ControlRequest> =
        watchDeploymentScope === "INTERNAL"
          ? [...OVERVIEW_REQUIRED_FIELDS, "directionType"]
          : OVERVIEW_REQUIRED_FIELDS;
      const overviewFieldsToValidate: Array<keyof ControlRequest> =
        isDataEntryStage && availableTableOptions.length > 0
          ? [...fieldsToValidate, "tableName"]
          : fieldsToValidate;
      const isValid = await form.trigger(overviewFieldsToValidate, { shouldFocus: true });
      if (!isValid) {
        return;
      }

      try {
        await overviewAutosaveMutation.mutateAsync(buildOverviewRequest(form.getValues()));
      } catch {
        return;
      }
    }

    setCurrentStep(step);
  };

  const goToStep = (step: EditorStep) => {
    void handleStepChange(step);
  };
  const goToPreviousStep = () => {
    if (isFirstStep) {
      return;
    }

    setCurrentStep(steps[currentStepIndex - 1].id);
  };
  const goToNextStep = () => {
    if (isLastStep) {
      return;
    }

    void handleStepChange(steps[currentStepIndex + 1].id);
  };

  const downloadBasisFileMutation = useMutation({
    mutationFn: async () => {
      if (!persistedControlId) {
        throw new Error("MN identifikatori topilmadi");
      }

      return downloadControlBasisFile(persistedControlId);
    },
    onSuccess: (blob) => {
      const fileName = watchBasisFileName || "mn-asosi";
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error("Faylni yuklab bo'lmadi");
    },
  });

  const handleBasisFileSelected = async (file: File) => {
    if (!isPdfFile(file)) {
      toast.error(pdfOnlyMessage);
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      form.setValue("basisFileName", file.name, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      form.setValue("basisFileContentType", file.type || "application/octet-stream", {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
      form.setValue("basisFileSize", file.size, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
      form.setValue("basisFileBase64", base64, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
      form.setValue("basisFileRemoved", false, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    } catch {
      toast.error("Faylni o'qib bo'lmadi");
    }
  };

  const handleBasisFileRemove = () => {
    form.setValue("basisFileName", "", { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileContentType", "", { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileSize", null, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileBase64", null, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileRemoved", true, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
  };

  return (
    <div className="space-y-6">
      <form
        className="space-y-6 [&_input]:h-11 [&_input]:rounded-[14px] [&_input]:px-4 [&_input]:text-[15px] [&_textarea]:min-h-24 [&_textarea]:rounded-[16px] [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[15px] [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-[14px] [&_[data-slot=select-trigger]]:px-4 [&_[data-slot=select-trigger]]:text-[15px]"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <Tabs
          value={currentStep}
          onValueChange={(value) => goToStep(value as EditorStep)}
          className="items-center"
        >
          <TabsList className="relative mx-auto grid h-auto w-full max-w-xl grid-cols-2 gap-1.5 rounded-[20px] bg-[linear-gradient(180deg,rgba(218,226,237,0.98),rgba(205,214,226,0.88))] p-1 dark:bg-[linear-gradient(180deg,rgba(51,65,85,0.95),rgba(30,41,59,0.86))]">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;

              return (
                <TabsTrigger
                  key={step.id}
                  value={step.id}
                  disabled={isTransitionPending}
                  className={cn(
                    "relative z-10 flex h-auto min-h-[3.1rem] items-center justify-start gap-2.5 rounded-[16px] px-3.5 py-2 text-left data-[state=active]:shadow-none",
                    currentStep === step.id ? "bg-transparent" : "bg-white/26 hover:bg-white/34",
                  )}
                >
                    <span
                      className={cn(
                      "inline-flex h-7 min-w-7 shrink-0 aspect-square items-center justify-center rounded-full border text-[11px] leading-none font-semibold transition-all duration-300",
                        currentStep === step.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCompleted
                          ? "border-primary/70 bg-primary/10 text-primary"
                          : "border-border/70 bg-background/90 text-muted-foreground",
                    )}
                  >
                    {step.number}
                  </span>
                  <span className="text-[0.92rem] font-semibold leading-none">
                    {step.title}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {currentStep === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="overflow-visible border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>
                    <span>Mantiqiy nazorat - </span>
                    <span className="text-primary">{watchUniqueNumber || "LC20260000001"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-12">
                  <Controller
                    control={form.control}
                    name="deploymentScope"
                    rules={{ required: requiredMessages.deploymentScope }}
                    render={({ field, fieldState }) => (
                      <Field label="Tizim turi" className="lg:col-span-3" error={fieldState.error?.message}>
                        <ChoiceCardRadioGroup
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { value: "INTERNAL", label: deploymentScopeLabels.INTERNAL },
                            { value: "EXTERNAL", label: deploymentScopeLabels.EXTERNAL },
                          ]}
                        />
                      </Field>
                    )}
                  />
                  {watchDeploymentScope === "INTERNAL" ? (
                    <Controller
                      control={form.control}
                      name="directionType"
                      rules={{ required: requiredMessages.directionType }}
                      render={({ field, fieldState }) => (
                        <Field label="Yo'nalish" className="lg:col-span-3" error={fieldState.error?.message}>
                          <ChoiceCardRadioGroup
                            name={field.name}
                            value={field.value ?? ""}
                            onChange={(value) => field.onChange(value)}
                            options={[
                              { value: "ENTRY", label: directionTypeLabels.ENTRY },
                              { value: "EXIT", label: directionTypeLabels.EXIT },
                            ]}
                          />
                        </Field>
                      )}
                    />
                  ) : null}
                  <Controller
                    control={form.control}
                    name="systemName"
                    rules={{ required: requiredMessages.systemName }}
                    render={({ field, fieldState }) => (
                      <Field
                        label="Tizim nomi"
                        className={watchDeploymentScope === "INTERNAL" ? "lg:col-span-3" : "lg:col-span-5"}
                        error={fieldState.error?.message}
                      >
                        <SearchableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={availableSystemNameOptions}
                          placeholder={
                            systemTypesQuery.isLoading ? "Tizim nomlari yuklanmoqda..." : "Tizim nomini tanlang"
                          }
                          disabled={systemTypesQuery.isLoading}
                          hasError={Boolean(fieldState.error)}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="controlType"
                    rules={{ required: requiredMessages.controlType }}
                    render={({ field, fieldState }) => (
                      <Field
                        label="Mantiqiy nazorat turi"
                        className={watchDeploymentScope === "INTERNAL" ? "lg:col-span-3" : "lg:col-span-4"}
                        error={fieldState.error?.message}
                      >
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn("w-full", fieldState.error && "border-destructive focus-visible:ring-destructive/20")}>
                            <span className="truncate">{controlTypeLabels[field.value]}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WARNING">{controlTypeLabels.WARNING}</SelectItem>
                            <SelectItem value="BLOCK">{controlTypeLabels.BLOCK}</SelectItem>
                            <SelectItem value="ALLOW">{controlTypeLabels.ALLOW}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Field
                    label="Mantiqiy nazorat nomi"
                    className="lg:col-span-12"
                    error={form.formState.errors.name?.message}
                  >
                    <Input
                      {...form.register("name", { required: requiredMessages.name })}
                      className={form.formState.errors.name ? "border-destructive focus-visible:ring-destructive/20" : ""}
                    />
                  </Field>
                  <Controller
                    control={form.control}
                    name="processStage"
                    rules={{ required: requiredMessages.processStage }}
                    render={({ field, fieldState }) => (
                      <Field
                        label="Mantiqiy nazorat bosqichi"
                        className={isDataEntryStage ? "lg:col-span-4" : "lg:col-span-12"}
                        error={fieldState.error?.message}
                      >
                        <SearchableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={availableProcessStageOptions}
                          placeholder={
                            processStagesQuery.isLoading ? "Bosqichlar yuklanmoqda..." : "Bosqichni tanlang"
                          }
                          disabled={processStagesQuery.isLoading}
                          hasError={Boolean(fieldState.error)}
                        />
                      </Field>
                    )}
                  />
                  {isDataEntryStage ? (
                    <Controller
                      control={form.control}
                      name="tableName"
                      rules={availableTableOptions.length > 0 ? { required: requiredMessages.tableName } : undefined}
                      render={({ field, fieldState }) => (
                        <Field label="Jadval" className="lg:col-span-8" error={fieldState.error?.message}>
                          <SearchableSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={availableTableOptions}
                            placeholder={
                              tablesQuery.isLoading
                                ? "Jadvallar yuklanmoqda..."
                                : availableTableOptions.length === 0
                                  ? "Mos jadval topilmadi"
                                  : "Jadvalni tanlang"
                            }
                            disabled={tablesQuery.isLoading || availableTableOptions.length === 0}
                            hasError={Boolean(fieldState.error)}
                          />
                        </Field>
                      )}
                    />
                  ) : null}
                  <Field
                    label="Mantiqiy nazorat maqsadi"
                    className="lg:col-span-12"
                    error={form.formState.errors.objective?.message}
                  >
                    <Textarea
                      rows={5}
                      {...form.register("objective", { required: requiredMessages.objective })}
                      className={form.formState.errors.objective ? "border-destructive focus-visible:ring-destructive/20" : ""}
                    />
                  </Field>
                  <Field label="Mantiqiy nazorat asosi" className="lg:col-span-12">
                    <Input {...form.register("basis")} />
                  </Field>
                  <Field label="Mantiqiy nazorat asosi hujjati" className="lg:col-span-12">
                    <BasisFileDropzone
                      fileName={watchBasisFileName}
                      fileSize={watchBasisFileSize}
                      hasStoredFile={watchHasStoredBasisFile}
                      contentType={watchBasisFileContentType}
                      onFileSelect={handleBasisFileSelected}
                      onRemove={handleBasisFileRemove}
                      onDownload={watchHasStoredBasisFile ? () => downloadBasisFileMutation.mutate() : undefined}
                      downloading={downloadBasisFileMutation.isPending}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card className="overflow-visible border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Mantiqiy nazorat parametrlari</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="startDate"
                      rules={{
                        required: requiredMessages.startDate,
                        validate: (value) =>
                          isDateRangeValid(value, form.getValues("finishDate")) || dateRangeMessage,
                      }}
                      render={({ field, fieldState }) => (
                        <Field label="Boshlanish sana" error={fieldState.error?.message}>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            max={shiftIsoDate(watchFinishDate, -1)}
                            className={fieldState.error ? "border-destructive focus-visible:ring-destructive/20" : ""}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="finishDate"
                      rules={{
                        required: requiredMessages.finishDate,
                        validate: (value) =>
                          isDateRangeValid(form.getValues("startDate"), value) || dateRangeMessage,
                      }}
                      render={({ field, fieldState }) => (
                        <Field label="Yakunlanish sana" error={fieldState.error?.message}>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            min={shiftIsoDate(watchStartDate, 1)}
                            className={fieldState.error ? "border-destructive focus-visible:ring-destructive/20" : ""}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <div className="space-y-4 rounded-[22px] border border-border/70 bg-background/80 p-4">
                    <Controller
                      control={form.control}
                      name="smsNotificationEnabled"
                      render={({ field }) => (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">SMS xabarnoma</p>
                            <p className="text-sm text-muted-foreground">
                              MN trigger bo'lganda telefonlarga yuborish.
                            </p>
                          </div>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                      )}
                    />

                    {watchSms ? (
                      <Controller
                        control={form.control}
                        name="smsPhones"
                        render={({ field }) => (
                          <Field label="Telefonlar">
                            <TagInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="+99890..."
                              addLabel="Qo'shish"
                            />
                          </Field>
                        )}
                      />
                    ) : null}
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 transition-all hover:border-primary/25 hover:bg-primary/4">
                    <input
                      type="checkbox"
                      checked={watchConfidentiality === "Maxfiy"}
                      onChange={(event) =>
                        form.setValue(
                          "confidentialityLevel",
                          event.target.checked ? "Maxfiy" : "Maxfiy emas",
                          {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          },
                        )
                      }
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                    />
                    <div>
                      <p className="font-medium text-foreground">Maxsus</p>
                      <p className="text-sm text-muted-foreground">Maxfiy mantiqiy nazorat sifatida belgilash.</p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </div>
        ) : null}

        {currentStep === "execution" ? (
            <Card
              className={cn(
                "overflow-visible border-border/70 bg-card/90",
                isBuilderExpanded
                  ? "fixed inset-4 z-50 bg-background/96 shadow-[0_32px_90px_-28px_rgba(15,23,42,0.48)] backdrop-blur-xl"
                  : "",
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
                    <Tabs value={builderViewMode} onValueChange={(value) => setBuilderViewMode(value as BuilderViewMode)}>
                      <TabsList className="relative grid h-auto w-full max-w-[320px] grid-cols-2 gap-1.5 rounded-[18px] bg-muted/80 p-1">
                        <TabsTrigger type="button" value="standard" className="h-10">
                          Odatiy
                        </TabsTrigger>
                        <TabsTrigger type="button" value="constructor" className="h-10">
                          Konstruktor
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="inline-flex h-10 min-w-0 items-center self-start rounded-[18px] border border-border/70 bg-background/88 px-4 text-sm text-foreground shadow-[0_12px_24px_-22px_rgba(15,23,42,0.22)]">
                      <span className="max-w-[24rem] truncate font-medium">{watchControlName || "Mantiqiy nazorat"}</span>
                    </div>
                  </div>
                  {builderViewMode === "standard" ? (
                    <Tabs
                      value={standardBuilderViewMode}
                      onValueChange={(value) => setStandardBuilderViewMode(value as StandardBuilderViewMode)}
                    >
                      <TabsList className="relative grid h-auto w-full max-w-[280px] grid-cols-2 gap-1 rounded-[14px] border border-border/70 bg-background/85 p-0.5">
                        <TabsTrigger type="button" value="complex" className="h-8 text-[11px] font-semibold">
                          Murakkab
                        </TabsTrigger>
                        <TabsTrigger type="button" value="simple" className="h-8 text-[11px] font-semibold">
                          Oddiy
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isComplexStandardMode ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isTransitionPending}
                      onClick={() => complexEditorRef.current?.addCondition()}
                    >
                      <Plus className="size-4" />
                      Qo'shimcha shart qo'shish
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTransitionPending}
                    onClick={() => setIsBuilderExpanded((current) => !current)}
                  >
                    {isBuilderExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    {isBuilderExpanded ? "Kichraytirish" : "Kattalashtirish"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn(isBuilderExpanded ? "h-[calc(100vh-8.5rem)]" : "")}>
                {builderViewMode === "constructor" ? (
                  <RuleCanvasEditor
                    canvas={watchRuleCanvas}
                    preferredSystemType={form.watch("systemName")}
                    rootLabel={watchControlName || "Mantiqiy nazorat"}
                    canvasHeightClassName={builderContentHeightClassName}
                    onCanvasChange={(ruleBuilderCanvas) =>
                      areCanvasStatesEqual(watchRuleCanvas, ruleBuilderCanvas)
                        ? undefined
                        : form.setValue("ruleBuilderCanvas", ruleBuilderCanvas, {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          })
                    }
                  />
                ) : standardBuilderViewMode === "complex" ? (
                  <RuleCanvasComplexEditor
                    ref={complexEditorRef}
                    canvas={watchRuleCanvas}
                    className={builderContentHeightClassName}
                    onCanvasChange={(ruleBuilderCanvas) =>
                      areCanvasStatesEqual(watchRuleCanvas, ruleBuilderCanvas)
                        ? undefined
                        : form.setValue("ruleBuilderCanvas", ruleBuilderCanvas, {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          })
                    }
                  />
                ) : (
                  <RuleCanvasFormEditor
                    canvas={watchRuleCanvas}
                    preferredSystemType={form.watch("systemName")}
                    rootLabel={watchControlName || "Mantiqiy nazorat"}
                    className={builderContentHeightClassName}
                    onCanvasChange={(ruleBuilderCanvas) =>
                      areCanvasStatesEqual(watchRuleCanvas, ruleBuilderCanvas)
                        ? undefined
                        : form.setValue("ruleBuilderCanvas", ruleBuilderCanvas, {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          })
                    }
                  />
                )}
              </CardContent>
            </Card>
        ) : null}

        <section className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/80 px-5 py-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.22)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isLastStep ? t("editor.footer.lastStep") : t("editor.footer.nextAvailable")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLastStep
                ? t("editor.footer.lastStepDescription")
                : `${t("editor.footer.nextStep")}: ${steps[currentStepIndex + 1].title}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isFirstStep || isTransitionPending}>
              <ChevronLeft className="size-4" />
              {t("editor.actions.back")}
            </Button>
            {!isLastStep ? (
              <Button type="button" onClick={goToNextStep} disabled={isTransitionPending}>
                {t("editor.actions.next")}
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isTransitionPending}>
                {isTransitionPending ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </div>
        </section>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 inline-flex">{label}</Label>
      {children}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ChoiceCardRadioGroup({
  name,
  value,
  onChange,
  options,
  columnsClassName = "",
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  columnsClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-8 gap-y-2 pt-1", columnsClassName)}>
      {options.map((option) => {
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="size-4 accent-[var(--primary)]"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hasError = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const estimatedDropdownHeight = 390;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
      }
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setOpenUpward(false);
    }
  }, [open]);

  const filteredOptions = options.filter((option) => option.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

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
          hasError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground hover:border-input",
        )}
      >
        <span className={value ? "truncate text-foreground" : "truncate text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
        >
          <div className="border-b border-border/70 p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Qidirish..."
              className="h-10 rounded-[12px] px-3"
            />
          </div>

          <div className="max-h-[19.5rem] overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="leading-6">{option}</span>
                  {value === option ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Mos natija topilmadi</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BasisFileDropzone({
  fileName,
  fileSize,
  contentType,
  hasStoredFile,
  onFileSelect,
  onRemove,
  onDownload,
  downloading = false,
}: {
  fileName: string;
  fileSize: number | null;
  contentType: string;
  hasStoredFile: boolean;
  onFileSelect: (file: File) => void | Promise<void>;
  onRemove: () => void;
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    await onFileSelect(file);
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const hasFile = Boolean(fileName);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "rounded-[20px] border border-dashed px-4 py-4 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border/70 bg-background/70",
        )}
      >
        <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-4.5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Faylni bu yerga tashlang yoki tanlang</p>
              <p className="text-xs text-muted-foreground">Faqat PDF fayl yuklashingiz mumkin.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Fayl tanlash
          </Button>
        </div>
      </div>

      {hasFile ? (
        <div className="flex flex-col gap-2.5 rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {[formatFileSize(fileSize), hasStoredFile && !contentType ? "Saqlangan fayl" : contentType]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasStoredFile && onDownload ? (
              <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={downloading}>
                <Download className="size-4" />
                {downloading ? "Yuklanmoqda..." : "Yuklab olish"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              Almashtirish
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <X className="size-4" />
              Olib tashlash
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatFileSize(size: number | null) {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Fayl ma'lumotini o'qib bo'lmadi"));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Faylni o'qishda xatolik"));
    reader.readAsDataURL(file);
  });
}
