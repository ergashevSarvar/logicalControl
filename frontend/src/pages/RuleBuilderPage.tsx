import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
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
import { controlDetailToRequest, createDefaultControlRequest, type ControlRequest, type ControlRule, type RuleType } from "@/lib/types";

function areCanvasStatesEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function RuleBuilderPage() {
  const navigate = useNavigate();
  const params = useParams();
  const controlId = params.id;
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
      toast.success("Builder saved");
      navigate(`/controls/${result.id}/builder`, { replace: true });
    },
    onError: () => {
      toast.error("Builder save failed");
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
        title="Visual Rule Builder"
        subtitle="Canvas orqali child qoidalarni bog'lang, keyin o'ng panelda ularning atributlarini to'ldiring."
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(controlId ? `/controls/${controlId}/edit` : "/controls/new")}>
              Open form
            </Button>
            <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
              Save builder
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
                <p className="mt-1 text-sm text-muted-foreground">Child qoida #{index + 1}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => removeRule(index)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Rule name">
                  <Input value={rule.name} onChange={(event) => updateRule(index, (current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field label="Rule type">
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

              <Field label="Description">
                <Textarea
                  rows={2}
                  value={rule.description}
                  onChange={(event) => updateRule(index, (current) => ({ ...current, description: event.target.value }))}
                />
              </Field>

              {rule.ruleType === "CONDITION" || rule.ruleType === "GROUP" ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Field">
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
                  <Field label="Operator">
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
                  <Field label="Value">
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
                  <Field label="Action">
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
                  <Field label="Message">
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
