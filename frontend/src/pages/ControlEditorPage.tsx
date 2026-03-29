import { startTransition, useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TagInput } from "@/components/common/tag-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createControl,
  fetchControl,
  fetchLookups,
  updateControl,
} from "@/lib/api";
import { createDefaultControlRequest, type ControlRequest } from "@/lib/types";

const stepIds = ["overview", "validity", "messaging", "execution"] as const;

type EditorStep = (typeof stepIds)[number];

export function ControlEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const controlId = params.id;
  const isEdit = Boolean(controlId);
  const [currentStep, setCurrentStep] = useState<EditorStep>("overview");

  const form = useForm<ControlRequest>({
    defaultValues: createDefaultControlRequest(),
  });

  const detailQuery = useQuery({
    queryKey: ["control", controlId],
    queryFn: () => fetchControl(controlId!),
    enabled: isEdit,
  });
  const lookupsQuery = useQuery({
    queryKey: ["lookups"],
    queryFn: fetchLookups,
  });

  useEffect(() => {
    if (detailQuery.data) {
      form.reset({
        ...detailQuery.data,
      });
    }
  }, [detailQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ControlRequest) =>
      isEdit && controlId ? updateControl(controlId, payload) : createControl(payload),
    onSuccess: (result) => {
      toast.success(t("editor.notifications.saved"));
      startTransition(() => navigate(`/controls/${result.id}/edit`, { replace: true }));
    },
    onError: () => {
      toast.error(t("editor.notifications.saveFailed"));
    },
  });

  const watchStatus = form.watch("status");
  const watchSms = form.watch("smsNotificationEnabled");
  const steps: Array<{ id: EditorStep; number: number; title: string; subtitle: string }> = [
    {
      id: "overview",
      number: 1,
      title: t("editor.steps.overview.title"),
      subtitle: t("editor.steps.overview.subtitle"),
    },
    {
      id: "validity",
      number: 2,
      title: t("editor.steps.validity.title"),
      subtitle: t("editor.steps.validity.subtitle"),
    },
    {
      id: "messaging",
      number: 3,
      title: t("editor.steps.messaging.title"),
      subtitle: t("editor.steps.messaging.subtitle"),
    },
    {
      id: "execution",
      number: 4,
      title: t("editor.steps.execution.title"),
      subtitle: t("editor.steps.execution.subtitle"),
    },
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const goToStep = (step: EditorStep) => setCurrentStep(step);
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

    setCurrentStep(steps[currentStepIndex + 1].id);
  };

  return (
    <div className="space-y-6">
      <section className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{t("appName")}</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {isEdit ? t("editor.titleEdit") : t("editor.titleCreate")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("editor.subtitle")}</p>
          </div>
          {isEdit ? (
            <Button variant="outline" type="button" onClick={() => navigate(`/controls/${controlId}/builder`)}>
              {t("editor.actions.builder")}
            </Button>
          ) : null}
        </div>
      </section>

      <form
        className="space-y-6 [&_input]:h-11 [&_input]:rounded-[14px] [&_input]:px-4 [&_input]:text-[15px] [&_textarea]:min-h-24 [&_textarea]:rounded-[16px] [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[15px] [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:rounded-[14px] [&_[data-slot=select-trigger]]:px-4 [&_[data-slot=select-trigger]]:text-[15px]"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <section className="rounded-[30px] border border-border/70 bg-card/90 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.25)] backdrop-blur-xl md:p-6">
            <div className="grid gap-4 md:grid-cols-4 md:gap-0">
              {steps.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = index < currentStepIndex;
                const hasPreviousConnector = index > 0;
                const hasNextConnector = index < steps.length - 1;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className="group relative flex flex-col items-start gap-3 rounded-[22px] px-3 py-2 text-left transition-all duration-200 hover:bg-primary/5 md:items-center md:px-0 md:text-center"
                  >
                    <div className="relative flex h-12 w-full items-center justify-center">
                      {hasPreviousConnector ? (
                        <span
                          className={`absolute left-0 top-1/2 hidden h-[2px] w-1/2 -translate-y-1/2 md:block ${
                            "bg-border/80"
                          }`}
                        />
                      ) : null}
                      {hasNextConnector ? (
                        <span
                          className={`absolute right-0 top-1/2 hidden h-[2px] w-1/2 -translate-y-1/2 md:block ${
                            "bg-border/80"
                          }`}
                        />
                      ) : null}
                      <span
                        className={`relative z-10 flex size-12 items-center justify-center rounded-full border text-base font-semibold transition-all duration-200 ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_22px_-16px_rgba(var(--primary-rgb),0.9)]"
                            : isCompleted
                              ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_18px_-14px_rgba(var(--primary-rgb),0.85)]"
                              : "border-border/70 bg-background text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
                        }`}
                      >
                        {step.number}
                      </span>
                    </div>
                    <div className="space-y-1 md:px-3">
                      <p className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-foreground/85"}`}>
                        {step.title}
                      </p>
                      <p className="max-w-[14rem] text-xs leading-5 text-muted-foreground">{step.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
        </section>

        {currentStep === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.identity")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label={t("editor.fields.code")}>
                    <Input {...form.register("code")} placeholder="MN-AT-001" />
                  </Field>
                  <Field label={t("editor.fields.uniqueNumber")}>
                    <Input {...form.register("uniqueNumber")} placeholder="UNQ-AT-001" />
                  </Field>
                  <Field label={t("editor.fields.name")} className="md:col-span-2">
                    <Input {...form.register("name")} />
                  </Field>
                  <Field label={t("editor.fields.objective")} className="md:col-span-2">
                    <Textarea rows={5} {...form.register("objective")} />
                  </Field>
                  <Controller
                    control={form.control}
                    name="systemName"
                    render={({ field }) => (
                      <Field label={t("editor.fields.systemName")}>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AT">AT</SelectItem>
                            <SelectItem value="EK">EK</SelectItem>
                            <SelectItem value="RW">RW</SelectItem>
                            <SelectItem value="EC">EC</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="controlType"
                    render={({ field }) => (
                      <Field label={t("editor.fields.controlType")}>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WARNING">{t("editor.options.warning")}</SelectItem>
                            <SelectItem value="ALLOW">{t("editor.options.allow")}</SelectItem>
                            <SelectItem value="BLOCK">{t("editor.options.block")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Field label={t("editor.fields.processStage")}>
                    <Input {...form.register("processStage")} placeholder={t("editor.placeholders.processStage")} />
                  </Field>
                  <Field label={t("editor.fields.authorName")}>
                    <Input {...form.register("authorName")} />
                  </Field>
                  <Field label={t("editor.fields.responsibleDepartment")}>
                    <Input {...form.register("responsibleDepartment")} list="departments" />
                    <datalist id="departments">
                      {(lookupsQuery.data?.dictionaries?.DEPARTMENT ?? []).map((item) => (
                        <option key={item.code} value={item.labels.uzLatn} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label={t("editor.fields.phoneExtension")}>
                    <Input {...form.register("phoneExtension")} />
                  </Field>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.approvalState")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={form.control}
                    name="approvers"
                    render={({ field }) => (
                      <Field label={t("editor.fields.approvers")}>
                        <TagInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("editor.placeholders.approver")}
                          addLabel={t("common.add")}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Field label={t("editor.fields.status")}>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">{t("editor.options.active")}</SelectItem>
                            <SelectItem value="SUSPENDED">{t("editor.options.suspended")}</SelectItem>
                            <SelectItem value="CANCELLED">{t("editor.options.cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  {watchStatus === "SUSPENDED" ? (
                    <Field label={t("editor.fields.suspendedUntil")}>
                      <Input type="datetime-local" {...form.register("suspendedUntil")} />
                    </Field>
                  ) : null}
                  <Field label={t("editor.fields.priority")}>
                    <Input type="number" {...form.register("priorityOrder", { valueAsNumber: true })} />
                  </Field>
                  <Field label={t("editor.fields.confidentiality")}>
                    <Input {...form.register("confidentialityLevel")} placeholder={t("editor.placeholders.confidentiality")} />
                  </Field>
                  <Controller
                    control={form.control}
                    name="conflictMonitoringEnabled"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
                        <div>
                          <p className="font-medium">{t("editor.toggles.conflictTitle")}</p>
                          <p className="text-sm text-muted-foreground">{t("editor.toggles.conflictDescription")}</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
        ) : null}

        {currentStep === "validity" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.validity")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label={t("editor.fields.startDate")}>
                    <Input type="date" {...form.register("startDate")} />
                  </Field>
                  <Field label={t("editor.fields.finishDate")}>
                    <Input type="date" {...form.register("finishDate")} />
                  </Field>
                  <Field label={t("editor.fields.timeoutMs")}>
                    <Input type="number" {...form.register("timeoutMs", { valueAsNumber: true })} />
                  </Field>
                  <Field label={t("editor.fields.lastExecutionDurationMs")}>
                    <Input type="number" {...form.register("lastExecutionDurationMs", { valueAsNumber: true })} />
                  </Field>
                  <Field label={t("editor.fields.versionNumber")}>
                    <Input type="number" {...form.register("versionNumber", { valueAsNumber: true })} />
                  </Field>
                  <Field label={t("editor.fields.autoCancelAfterDays")}>
                    <Input type="number" {...form.register("autoCancelAfterDays", { valueAsNumber: true })} />
                  </Field>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.scope")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={form.control}
                    name="deploymentScope"
                    render={({ field }) => (
                      <Field label={t("editor.fields.deploymentScope")}>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTERNAL">{t("editor.options.internal")}</SelectItem>
                            <SelectItem value="EXTERNAL">{t("editor.options.external")}</SelectItem>
                            <SelectItem value="HYBRID">{t("editor.options.hybrid")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="territories"
                    render={({ field }) => (
                      <Field label={t("editor.fields.territories")}>
                        <TagInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("editor.placeholders.territory")}
                          addLabel={t("common.add")}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="posts"
                    render={({ field }) => (
                      <Field label={t("editor.fields.posts")}>
                        <TagInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("editor.placeholders.post")}
                          addLabel={t("common.add")}
                        />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
        ) : null}

        {currentStep === "messaging" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.messages")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Field label={t("editor.messageLabels.uzCyrl")}>
                    <Textarea rows={3} {...form.register("messages.uzCyrl")} />
                  </Field>
                  <Field label={t("editor.messageLabels.uzLatn")}>
                    <Textarea rows={3} {...form.register("messages.uzLatn")} />
                  </Field>
                  <Field label={t("editor.messageLabels.ru")}>
                    <Textarea rows={3} {...form.register("messages.ru")} />
                  </Field>
                  <Field label={t("editor.messageLabels.en")}>
                    <Textarea rows={3} {...form.register("messages.en")} />
                  </Field>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.smsHelp")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={form.control}
                    name="smsNotificationEnabled"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
                        <div>
                          <p className="font-medium">{t("editor.toggles.smsTitle")}</p>
                          <p className="text-sm text-muted-foreground">{t("editor.toggles.smsDescription")}</p>
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
                        <Field label={t("editor.fields.smsPhones")}>
                          <TagInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("editor.placeholders.phone")}
                            addLabel={t("common.add")}
                          />
                        </Field>
                      )}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </div>
        ) : null}

        {currentStep === "execution" ? (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.ruleSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.watch("rules").map((rule, index) => (
                    <div key={`${rule.name}-${index}`} className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{rule.ruleType}</p>
                      <p className="mt-2 font-semibold">{rule.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {rule.description || t("editor.executionTexts.noDescription")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{t("editor.sections.designerHandoff")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-7 text-muted-foreground">{t("editor.executionTexts.handoffDescription")}</p>
                  <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/controls/${controlId}/builder` : "/builder")}>
                    {t("editor.executionTexts.openBuilder")}
                  </Button>
                </CardContent>
              </Card>
            </div>
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
            <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isFirstStep}>
              <ChevronLeft className="size-4" />
              {t("editor.actions.back")}
            </Button>
            {!isLastStep ? (
              <Button type="button" onClick={goToNextStep}>
                {t("editor.actions.next")}
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t("common.saving") : t("common.save")}
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
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 inline-flex">{label}</Label>
      {children}
    </div>
  );
}
