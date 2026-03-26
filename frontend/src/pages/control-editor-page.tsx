import { startTransition, useEffect, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/page-header";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createControl,
  fetchControl,
  fetchLookups,
  updateControl,
} from "@/lib/api";
import { createDefaultControlRequest, type ControlRequest } from "@/lib/types";

export function ControlEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const controlId = params.id;
  const isEdit = Boolean(controlId);

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
      toast.success("MN saved");
      startTransition(() => navigate(`/controls/${result.id}/edit`, { replace: true }));
    },
    onError: () => {
      toast.error("MN saqlanmadi");
    },
  });

  const watchStatus = form.watch("status");
  const watchSms = form.watch("smsNotificationEnabled");

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t("editor.titleEdit") : t("editor.titleCreate")}
        subtitle={t("editor.subtitle")}
        actions={
          <div className="flex gap-3">
            {isEdit ? (
              <Button variant="outline" onClick={() => navigate(`/controls/${controlId}/builder`)}>
                Builder
              </Button>
            ) : null}
            <Button onClick={form.handleSubmit((values) => saveMutation.mutate(values))} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      />

      <form className="space-y-6" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 rounded-[22px] border border-border/70 bg-card/80 p-1 md:grid-cols-4">
            <TabsTrigger value="overview">{t("editor.overview")}</TabsTrigger>
            <TabsTrigger value="validity">{t("editor.validity")}</TabsTrigger>
            <TabsTrigger value="messaging">{t("editor.messaging")}</TabsTrigger>
            <TabsTrigger value="execution">{t("editor.execution")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Identity</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="MN kodi">
                    <Input {...form.register("code")} placeholder="MN-AT-001" />
                  </Field>
                  <Field label="Unikal raqam">
                    <Input {...form.register("uniqueNumber")} placeholder="UNQ-AT-001" />
                  </Field>
                  <Field label="MN nomi" className="md:col-span-2">
                    <Input {...form.register("name")} />
                  </Field>
                  <Field label="Maqsad" className="md:col-span-2">
                    <Textarea rows={5} {...form.register("objective")} />
                  </Field>
                  <Controller
                    control={form.control}
                    name="systemName"
                    render={({ field }) => (
                      <Field label="Tizim nomi">
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
                      <Field label="MN turi">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WARNING">Ogohlantirish</SelectItem>
                            <SelectItem value="ALLOW">Ruxsat berish</SelectItem>
                            <SelectItem value="BLOCK">Taqiqlash</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Field label="Bosqich">
                    <Input {...form.register("processStage")} placeholder="VERIFICATION" />
                  </Field>
                  <Field label="Muallif">
                    <Input {...form.register("authorName")} />
                  </Field>
                  <Field label="Mas'ul boshqarma">
                    <Input {...form.register("responsibleDepartment")} list="departments" />
                    <datalist id="departments">
                      {(lookupsQuery.data?.dictionaries?.DEPARTMENT ?? []).map((item) => (
                        <option key={item.code} value={item.labels.uzLatn} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Telefon (ichki)">
                    <Input {...form.register("phoneExtension")} />
                  </Field>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Approval & state</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={form.control}
                    name="approvers"
                    render={({ field }) => <Field label="Tasdiqlovchilar"><TagInput value={field.value} onChange={field.onChange} placeholder="Xodim F.I.Sh" /></Field>}
                  />
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Field label="Holat">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Faol</SelectItem>
                            <SelectItem value="SUSPENDED">Vaqtincha to'xtatilgan</SelectItem>
                            <SelectItem value="CANCELLED">Bekor qilingan</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  {watchStatus === "SUSPENDED" ? (
                    <Field label="To'xtash vaqti">
                      <Input type="datetime-local" {...form.register("suspendedUntil")} />
                    </Field>
                  ) : null}
                  <Field label="Prioritet">
                    <Input type="number" {...form.register("priorityOrder", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Maxfiylik">
                    <Input {...form.register("confidentialityLevel")} placeholder="INTERNAL / SECRET" />
                  </Field>
                  <Controller
                    control={form.control}
                    name="conflictMonitoringEnabled"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
                        <div>
                          <p className="font-medium">Conflict monitoring</p>
                          <p className="text-sm text-muted-foreground">Bir-biriga zid MNlarni logga chiqarsin.</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="validity">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Validity</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="Start date">
                    <Input type="date" {...form.register("startDate")} />
                  </Field>
                  <Field label="Finish date">
                    <Input type="date" {...form.register("finishDate")} />
                  </Field>
                  <Field label="Timeout (ms)">
                    <Input type="number" {...form.register("timeoutMs", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Avg execution (ms)">
                    <Input type="number" {...form.register("lastExecutionDurationMs", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Version">
                    <Input type="number" {...form.register("versionNumber", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Auto cancel after days">
                    <Input type="number" {...form.register("autoCancelAfterDays", { valueAsNumber: true })} />
                  </Field>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Scope</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={form.control}
                    name="deploymentScope"
                    render={({ field }) => (
                      <Field label="Internal / external">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTERNAL">Internal</SelectItem>
                            <SelectItem value="EXTERNAL">External</SelectItem>
                            <SelectItem value="HYBRID">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="territories"
                    render={({ field }) => <Field label="Amal qilish hududi"><TagInput value={field.value} onChange={field.onChange} placeholder="Hudud nomi" /></Field>}
                  />
                  <Controller
                    control={form.control}
                    name="posts"
                    render={({ field }) => <Field label="Amal qilish posti"><TagInput value={field.value} onChange={field.onChange} placeholder="Post nomi" /></Field>}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="messaging">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>4-language messages</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Field label="UZBEK">
                    <Textarea rows={3} {...form.register("messages.uzCyrl")} />
                  </Field>
                  <Field label="O'ZBEK">
                    <Textarea rows={3} {...form.register("messages.uzLatn")} />
                  </Field>
                  <Field label="RUS">
                    <Textarea rows={3} {...form.register("messages.ru")} />
                  </Field>
                  <Field label="ENGLISH">
                    <Textarea rows={3} {...form.register("messages.en")} />
                  </Field>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>SMS and help line</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={form.control}
                    name="smsNotificationEnabled"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/80 px-4 py-3">
                        <div>
                          <p className="font-medium">SMS xabarnoma</p>
                          <p className="text-sm text-muted-foreground">MN trigger bo'lganda telefonlarga yuborish.</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                  {watchSms ? (
                    <Controller
                      control={form.control}
                      name="smsPhones"
                      render={({ field }) => <Field label="Telefonlar"><TagInput value={field.value} onChange={field.onChange} placeholder="+99890..." /></Field>}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="execution">
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Rule summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.watch("rules").map((rule, index) => (
                    <div key={`${rule.name}-${index}`} className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{rule.ruleType}</p>
                      <p className="mt-2 font-semibold">{rule.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{rule.description || "No description yet."}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>Designer handoff</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Bu forma MNning barcha biznes atributlarini boshqaradi. Vizual oqim, node aloqalari va child qoidalarni chuqur
                    sozlash uchun builder sahifasiga o'ting.
                  </p>
                  <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/controls/${controlId}/builder` : "/builder")}>
                    Open visual builder
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
