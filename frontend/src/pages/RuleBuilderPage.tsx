import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { RuleCanvasEditor } from "@/components/rules/rule-canvas-editor";
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
import { Textarea } from "@/components/ui/textarea";
import { createControl, fetchControl, updateControl } from "@/lib/api";
import { controlDetailToRequest, createDefaultControlRequest, type ControlRequest, type ControlRule, type LocaleCode, type RuleType } from "@/lib/types";

function areCanvasStatesEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function RuleBuilderPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const controlId = params.id;
  const currentLocale = (i18n.language === "UZ" || i18n.language === "OZ" || i18n.language === "RU" || i18n.language === "EN"
    ? i18n.language
    : "OZ") as LocaleCode;
  const text = {
    title: {
      OZ: "Visual Rule Builder",
      UZ: "Visual Rule Builder",
      RU: "Visual Rule Builder",
      EN: "Visual Rule Builder",
    },
    subtitle: {
      OZ: "Canvas orqali child qoidalarni bog'lang, keyin o'ng panelda ularning atributlarini to'ldiring.",
      UZ: "Canvas орқали child қоидаларни боғланг, кейин ўнг панелда уларнинг атрибутларини тўлдиринг.",
      RU: "Связывайте дочерние правила на canvas, затем заполняйте их атрибуты в правой панели.",
      EN: "Link child rules on the canvas, then fill in their attributes in the right panel.",
    },
    openForm: {
      OZ: "Formani ochish",
      UZ: "Формани очиш",
      RU: "Открыть форму",
      EN: "Open form",
    },
    saveBuilder: {
      OZ: "Builderni saqlash",
      UZ: "Builderни сақлаш",
      RU: "Сохранить builder",
      EN: "Save builder",
    },
    saveSuccess: {
      OZ: "Builder saqlandi",
      UZ: "Builder сақланди",
      RU: "Builder сохранен",
      EN: "Builder saved",
    },
    saveError: {
      OZ: "Builder saqlanmadi",
      UZ: "Builder сақланмади",
      RU: "Не удалось сохранить builder",
      EN: "Failed to save builder",
    },
    childRule: {
      OZ: "Child qoida",
      UZ: "Child қоида",
      RU: "Дочернее правило",
      EN: "Child rule",
    },
    remove: {
      OZ: "O'chirish",
      UZ: "Ўчириш",
      RU: "Удалить",
      EN: "Remove",
    },
    ruleName: {
      OZ: "Qoida nomi",
      UZ: "Қоида номи",
      RU: "Название правила",
      EN: "Rule name",
    },
    ruleType: {
      OZ: "Qoida turi",
      UZ: "Қоида тури",
      RU: "Тип правила",
      EN: "Rule type",
    },
    description: {
      OZ: "Tavsif",
      UZ: "Тавсиф",
      RU: "Описание",
      EN: "Description",
    },
    field: {
      OZ: "Maydon",
      UZ: "Майдон",
      RU: "Поле",
      EN: "Field",
    },
    operator: {
      OZ: "Operator",
      UZ: "Оператор",
      RU: "Оператор",
      EN: "Operator",
    },
    value: {
      OZ: "Qiymat",
      UZ: "Қиймат",
      RU: "Значение",
      EN: "Value",
    },
    action: {
      OZ: "Amal",
      UZ: "Амал",
      RU: "Действие",
      EN: "Action",
    },
    message: {
      OZ: "Xabar",
      UZ: "Хабар",
      RU: "Сообщение",
      EN: "Message",
    },
  } as const;
  const detailQuery = useQuery({
    queryKey: ["control", controlId, "builder"],
    queryFn: () => fetchControl(controlId!),
    enabled: Boolean(controlId),
  });

  const [draft, setDraft] = useState<ControlRequest>(createDefaultControlRequest());

  useEffect(() => {
    if (detailQuery.data) {
      setDraft(controlDetailToRequest(detailQuery.data));
    }
  }, [detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ControlRequest) =>
      controlId ? updateControl(controlId, payload) : createControl(payload),
    onSuccess: (result) => {
      toast.success(text.saveSuccess[currentLocale]);
      navigate(`/controls/${result.id}/builder`, { replace: true });
    },
    onError: () => {
      toast.error(text.saveError[currentLocale]);
    },
  });

  function updateRule(index: number, updater: (current: ControlRule) => ControlRule) {
    setDraft((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) => (ruleIndex === index ? updater(rule) : rule)),
    }));
  }

  function removeRule(index: number) {
    setDraft((current) => ({
      ...current,
      rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index).map((rule, ruleIndex) => ({ ...rule, sortOrder: ruleIndex })),
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={text.title[currentLocale]}
        subtitle={text.subtitle[currentLocale]}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(controlId ? `/controls/${controlId}/edit` : "/controls/new")}>
              {text.openForm[currentLocale]}
            </Button>
            <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
              {text.saveBuilder[currentLocale]}
            </Button>
          </div>
        }
      />

      <RuleCanvasEditor
        canvas={draft.ruleBuilderCanvas}
        rootLabel={draft.name || "Mantiqiy nazorat"}
        preferredSystemType={draft.systemName}
        onCanvasChange={(ruleBuilderCanvas) =>
          setDraft((current) =>
            areCanvasStatesEqual(current.ruleBuilderCanvas, ruleBuilderCanvas)
              ? current
              : { ...current, ruleBuilderCanvas }
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {draft.rules.map((rule, index) => (
          <Card key={`${rule.name}-${index}`} className="border-border/70 bg-card/90">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{rule.name || `Rule ${index + 1}`}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{text.childRule[currentLocale]} #{index + 1}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => removeRule(index)}>
                <Trash2 className="size-4" />
                {text.remove[currentLocale]}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={text.ruleName[currentLocale]}>
                  <Input value={rule.name} onChange={(event) => updateRule(index, (current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field label={text.ruleType[currentLocale]}>
                  <Select value={rule.ruleType} onValueChange={(value) => updateRule(index, (current) => ({ ...current, ruleType: value as RuleType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONDITION">Condition</SelectItem>
                      <SelectItem value="GROUP">Group</SelectItem>
                      <SelectItem value="ACTION">Action</SelectItem>
                      <SelectItem value="RESULT">Result</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label={text.description[currentLocale]}>
                <Textarea
                  rows={2}
                  value={rule.description}
                  onChange={(event) => updateRule(index, (current) => ({ ...current, description: event.target.value }))}
                />
              </Field>

              {rule.ruleType === "CONDITION" || rule.ruleType === "GROUP" ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label={text.field[currentLocale]}>
                    <Input
                      value={String(rule.definition.field ?? "")}
                      onChange={(event) =>
                        updateRule(index, (current) => ({
                          ...current,
                          definition: { ...current.definition, field: event.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={text.operator[currentLocale]}>
                    <Input
                      value={String(rule.definition.operator ?? "")}
                      onChange={(event) =>
                        updateRule(index, (current) => ({
                          ...current,
                          definition: { ...current.definition, operator: event.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={text.value[currentLocale]}>
                    <Input
                      value={String(rule.definition.value ?? "")}
                      onChange={(event) =>
                        updateRule(index, (current) => ({
                          ...current,
                          definition: { ...current.definition, value: event.target.value },
                        }))
                      }
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={text.action[currentLocale]}>
                    <Input
                      value={String(rule.definition.action ?? "")}
                      onChange={(event) =>
                        updateRule(index, (current) => ({
                          ...current,
                          definition: { ...current.definition, action: event.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label={text.message[currentLocale]}>
                    <Input
                      value={String(rule.definition.message ?? "")}
                      onChange={(event) =>
                        updateRule(index, (current) => ({
                          ...current,
                          definition: { ...current.definition, message: event.target.value },
                        }))
                      }
                    />
                  </Field>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

