import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Reorder, motion, useDragControls } from "motion/react";
import { Braces, ChevronDown, Database, Server, Trash2 } from "lucide-react";

import {
  SqlCodeEditor,
  extractSelectProjectionColumns,
  type SqlProjectionColumn,
  type SqlCodeEditorInsertionRequest,
} from "@/components/rules/rule-canvas-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSqlQueryExecutionStatus, startSqlQueryExecution } from "@/lib/api";
import { buildClassifierServerOptions, classifierQueryKeys, getClassifierServers, getClassifierTables } from "@/lib/classifiers";
import type { ClassifierServer, ClassifierTable, SqlQueryExecutionResult, SqlQueryExecutionStatusResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type RuleCanvasComplexEditorProps = {
  canvas: Record<string, unknown>;
  onCanvasChange: (canvas: Record<string, unknown>) => void;
  className?: string;
};

export type RuleCanvasComplexEditorHandle = {
  addCondition: () => void;
};

type ComplexCondition = {
  id: string;
  parameterName: string;
  serverName: string;
  orderNumber: number;
  sqlQuery: string;
};

type SqlHeaderDragHandleProps = {
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  title?: string;
  className?: string;
};

type ComplexOutputToken = {
  id: string;
  paramName: string;
  columnName: string;
  label: string;
  tokenText: string;
};

type ComplexConditionCardContentProps = {
  condition: ComplexCondition;
  conditionTitle: string;
  isFirstCondition: boolean;
  serverOptions: string[];
  serversLoading: boolean;
  classifierTables: ClassifierTable[];
  availableTokens: ComplexOutputToken[];
  pendingInsertion: SqlCodeEditorInsertionRequest | null;
  onUpdateCondition: (conditionId: string, updater: (condition: ComplexCondition) => ComplexCondition) => void;
  onChangeServerName: (conditionId: string, serverName: string) => void;
  onRequestTokenInsert: (conditionId: string, text: string) => void;
  onInsertionHandled: (conditionId: string, requestId: string) => void;
  onRunCondition: (conditionId: string, serverName: string) => Promise<SqlQueryExecutionStatusResponse>;
  onRemoveCondition: (conditionId: string) => void;
  headerDragHandleProps?: SqlHeaderDragHandleProps;
};

type SortableComplexConditionCardProps = ComplexConditionCardContentProps & {
  isDragging: boolean;
  onDragStateChange: (conditionId: string | null) => void;
};

function createUniqueId(prefix = "condition") {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeComplexConditions(source: unknown): ComplexCondition[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item, index) => {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};

    return {
      id: String(raw.id ?? createUniqueId("complex-condition")),
      parameterName: `param${index + 1}`,
      serverName: String(raw.serverName ?? ""),
      orderNumber: index + 1,
      sqlQuery: String(raw.sqlQuery ?? ""),
    };
  });
}

function resequenceConditions(conditions: ComplexCondition[]) {
  return conditions.map((condition, index) => ({
    ...condition,
    parameterName: `param${index + 1}`,
    orderNumber: index + 1,
  }));
}

function createEmptyCondition(nextIndex: number): ComplexCondition {
  return {
    id: createUniqueId("complex-condition"),
    parameterName: `param${nextIndex}`,
    serverName: "",
    orderNumber: nextIndex,
    sqlQuery: "",
  };
}

function toServerOptions(rows: ClassifierServer[], currentValue: string) {
  return buildClassifierServerOptions(rows, currentValue);
}

const COMPLEX_QUERY_TOKEN_REGEX = /\{\{\s*(param\d+)\.([A-Za-z_][\w$]*)\s*\}\}/g;
const COMPLEX_QUERY_RESULT_LIMIT = 1000;
const SQL_RUNNER_POLL_INTERVAL_MS = 900;

function delay(timeoutMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
}

function createSyntheticExecution(
  serverName: string,
  status: SqlQueryExecutionStatusResponse["status"],
  logMessage: string,
  result: SqlQueryExecutionResult | null,
  errorMessage: string | null = null,
  timestamps?: {
    createdAt?: string;
    startedAt?: string;
    finishedAt?: string;
  },
) {
  const now = new Date().toISOString();

  return {
    executionId: `complex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status,
    serverName,
    logMessage,
    errorMessage,
    stopAvailable: false,
    createdAt: timestamps?.createdAt ?? now,
    startedAt: timestamps?.startedAt ?? timestamps?.createdAt ?? now,
    finishedAt: timestamps?.finishedAt ?? now,
    result,
  } satisfies SqlQueryExecutionStatusResponse;
}

function normalizeColumnKey(columnName: string) {
  return columnName.trim().toLowerCase();
}

function toSqlLiteral(value: string | null) {
  if (value === null) {
    return "null";
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    return value.trim();
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function applyProjectionColumnNames(sqlQuery: string, result: SqlQueryExecutionResult) {
  const projection = extractSelectProjectionColumns(sqlQuery);
  if (!projection.isSelectQuery || projection.columns.length !== result.columns.length) {
    return result;
  }

  return {
    ...result,
    columns: projection.columns.map((column) => column.displayName),
  } satisfies SqlQueryExecutionResult;
}

async function executeSqlAndWait(sql: string, serverName: string) {
  const startedExecution = await startSqlQueryExecution({
    sql,
    serverName,
  });

  let attempts = 0;
  while (attempts < 240) {
    const execution = await fetchSqlQueryExecutionStatus(startedExecution.executionId);
    if (execution.status !== "QUEUED" && execution.status !== "RUNNING") {
      return execution;
    }

    attempts += 1;
    await delay(SQL_RUNNER_POLL_INTERVAL_MS);
  }

  return createSyntheticExecution(serverName, "FAILED", "SQL query bajarilmadi", null, "Query kutish vaqti tugadi");
}

function mergeExecutionResults(
  serverName: string,
  sourceResults: SqlQueryExecutionResult[],
  timestamps?: {
    createdAt?: string;
    startedAt?: string;
    finishedAt?: string;
  },
) {
  if (sourceResults.length === 0) {
    return createSyntheticExecution(serverName, "COMPLETED", "Natija topilmadi", {
      columns: [],
      rows: [],
      totalRows: 0,
      truncated: false,
    }, null, timestamps);
  }

  const baselineColumns = sourceResults[0]?.columns ?? [];
  const sameShape = sourceResults.every(
    (result) => result.columns.length === baselineColumns.length && result.columns.every((column, index) => column === baselineColumns[index]),
  );

  if (!sameShape) {
    return createSyntheticExecution(
      serverName,
      "FAILED",
      "SQL query bajarilmadi",
      null,
      "Oldingi parametrlar bilan query turli ustun tuzilmasini qaytardi",
      timestamps,
    );
  }

  const aggregatedRows: Array<Array<string | null>> = [];
  let totalRows = 0;
  let truncated = false;

  sourceResults.forEach((result) => {
    totalRows += result.totalRows;

    result.rows.forEach((row) => {
      if (aggregatedRows.length < COMPLEX_QUERY_RESULT_LIMIT) {
        aggregatedRows.push([...row]);
      } else {
        truncated = true;
      }
    });

    if (result.truncated) {
      truncated = true;
    }
  });

  const result = {
    columns: baselineColumns,
    rows: aggregatedRows,
    totalRows,
    truncated,
  } satisfies SqlQueryExecutionResult;

  return createSyntheticExecution(
    serverName,
    "COMPLETED",
    totalRows === 0
      ? "Natija topilmadi"
      : truncated
        ? "Natija cheklangan hajmda yuklandi"
        : "Natija muvaffaqiyatli yuklandi",
    result,
    null,
    timestamps,
  );
}

function ComplexField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Database;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </Label>
      {children}
    </div>
  );
}

function ComplexConditionCardContent({
  condition,
  conditionTitle,
  isFirstCondition,
  serverOptions,
  serversLoading,
  classifierTables,
  availableTokens,
  pendingInsertion,
  onUpdateCondition,
  onChangeServerName,
  onRequestTokenInsert,
  onInsertionHandled,
  onRunCondition,
  onRemoveCondition,
  headerDragHandleProps,
}: ComplexConditionCardContentProps) {
  const groupedTokens = useMemo(() => {
    const groups = new Map<string, ComplexOutputToken[]>();

    availableTokens.forEach((token) => {
      const items = groups.get(token.paramName) ?? [];
      items.push(token);
      groups.set(token.paramName, items);
    });

    return [...groups.entries()];
  }, [availableTokens]);

  return (
    <div className="grid items-stretch xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-3 bg-muted/18 p-3.5 xl:border-r xl:border-border/70">
        <ComplexField label="Parametr nomi" icon={Database}>
          <Input value={`param${condition.orderNumber}`} readOnly className="bg-muted/40 font-semibold" />
        </ComplexField>

        <ComplexField label="Server nomi" icon={Server}>
          <Select
            value={condition.serverName || undefined}
            onValueChange={(value) => onChangeServerName(condition.id, value ?? "")}
            disabled={serversLoading || serverOptions.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  serversLoading ? "Serverlar yuklanmoqda..." : serverOptions.length === 0 ? "Server topilmadi" : "Serverni tanlang"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {serverOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ComplexField>

        <ComplexField label="Tartib raqami">
          <Input value={String(condition.orderNumber)} readOnly className="bg-muted/40 font-semibold" />
        </ComplexField>
      </div>

      <div className="min-w-0 border-t border-border/70 xl:border-t-0">
        <SqlCodeEditor
          value={condition.sqlQuery}
          onChange={(nextValue) =>
            onUpdateCondition(condition.id, (current) => ({
              ...current,
              sqlQuery: nextValue,
            }))
          }
          placeholder="select * from ..."
          headerLabel={null}
          headerContent={
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-emerald-700">
                {conditionTitle}
              </span>
              <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground">
                #{condition.orderNumber}
              </span>
            </div>
          }
          toolbarLeadingActions={
            <>
              {availableTokens.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[10px] border-border/80 bg-background/90"
                      >
                        <Braces className="size-4" />
                        Oldingi natijalar
                        <ChevronDown className="size-3.5 opacity-70" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent className="w-[280px]">
                    {groupedTokens.map(([paramName, tokens]) => (
                      <DropdownMenuGroup key={paramName}>
                        <DropdownMenuLabel>{paramName}</DropdownMenuLabel>
                        {tokens.map((token) => (
                          <DropdownMenuItem
                            key={token.id}
                            onClick={() => onRequestTokenInsert(condition.id, token.tokenText)}
                            className="flex items-start"
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="font-medium text-foreground">{token.label}</span>
                              <span className="text-xs text-muted-foreground">{token.tokenText}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {!isFirstCondition ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveCondition(condition.id)}
                  className="rounded-[10px] border-rose-200 bg-rose-50/80 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
                >
                  <Trash2 className="size-4" />
                  O'chirish
                </Button>
              ) : null}
            </>
          }
          minHeightClassName="h-[240px]"
          headerDragHandleProps={headerDragHandleProps}
          showSelectedColumnsPanel
          pendingInsertion={pendingInsertion}
          onInsertionHandled={(requestId) => onInsertionHandled(condition.id, requestId)}
          getSelectedColumnDragText={(column: SqlProjectionColumn) => `{{${condition.parameterName}.${column.displayName}}}`}
          selectedColumnDragContextId={condition.id}
          disallowSelectedColumnSelfDrop
          queryExecutionContext={{
            serverName: condition.serverName,
            serverOptions,
            onServerNameChange: (nextServerName) => onChangeServerName(condition.id, nextServerName),
            classifierTables,
            runExecution: ({ serverName }) => onRunCondition(condition.id, serverName),
          }}
          className="h-[240px] rounded-none border-0 bg-transparent shadow-none"
        />
      </div>
    </div>
  );
}

function SortableComplexConditionCard({
  condition,
  conditionTitle,
  isFirstCondition,
  serverOptions,
  serversLoading,
  classifierTables,
  availableTokens,
  pendingInsertion,
  onUpdateCondition,
  onChangeServerName,
  onRequestTokenInsert,
  onInsertionHandled,
  onRunCondition,
  onRemoveCondition,
  isDragging,
  onDragStateChange,
}: SortableComplexConditionCardProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={condition.id}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      onDragStart={() => onDragStateChange(condition.id)}
      onDragEnd={() => onDragStateChange(null)}
      whileDrag={{
        scale: 1.012,
        boxShadow: "0 28px 58px -28px rgba(15,23,42,0.34)",
      }}
      transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.8 }}
      className={cn(
        "sql-editor-transform-safe relative overflow-hidden rounded-[20px] border border-border/70 bg-background/96 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.22)]",
        isDragging && "z-30 ring-1 ring-primary/20 shadow-[0_28px_58px_-28px_rgba(15,23,42,0.34)]",
      )}
    >
      <ComplexConditionCardContent
        condition={condition}
        conditionTitle={conditionTitle}
        isFirstCondition={isFirstCondition}
        serverOptions={serverOptions}
        serversLoading={serversLoading}
        classifierTables={classifierTables}
        availableTokens={availableTokens}
        pendingInsertion={pendingInsertion}
        onUpdateCondition={onUpdateCondition}
        onChangeServerName={onChangeServerName}
        onRequestTokenInsert={onRequestTokenInsert}
        onInsertionHandled={onInsertionHandled}
        onRunCondition={onRunCondition}
        onRemoveCondition={onRemoveCondition}
        headerDragHandleProps={{
          onPointerDown: (event) => {
            event.preventDefault();
            dragControls.start(event, { snapToCursor: false });
          },
          title: "Shart joyini surish",
        }}
      />
    </Reorder.Item>
  );
}

export const RuleCanvasComplexEditor = forwardRef<RuleCanvasComplexEditorHandle, RuleCanvasComplexEditorProps>(
function RuleCanvasComplexEditor({
  canvas,
  onCanvasChange,
  className,
}: RuleCanvasComplexEditorProps, ref) {
  const [draggingConditionId, setDraggingConditionId] = useState<string | null>(null);
  const [pendingInsertions, setPendingInsertions] = useState<Record<string, SqlCodeEditorInsertionRequest | null>>({});
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

  const servers = useMemo(() => serversQuery.data ?? [], [serversQuery.data]);
  const classifierTables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  const conditions = useMemo(() => normalizeComplexConditions(canvas.complexConditions), [canvas.complexConditions]);

  const commitConditions = (nextConditions: ComplexCondition[]) => {
    onCanvasChange({
      ...canvas,
      complexConditions: resequenceConditions(nextConditions),
    });
  };

  useEffect(() => {
    if (conditions.length === 0) {
      commitConditions([createEmptyCondition(1)]);
    }
  }, [conditions.length]);

  const renderedConditions = conditions.length > 0 ? conditions : [createEmptyCondition(1)];
  const firstCondition = renderedConditions[0];
  const additionalConditions = renderedConditions.slice(1);
  const additionalConditionIds = useMemo(() => additionalConditions.map((condition) => condition.id), [additionalConditions]);
  const conditionsById = useMemo(
    () => new Map(renderedConditions.map((condition) => [condition.id, condition])),
    [renderedConditions],
  );
  const availableTokensByConditionId = useMemo(() => {
    const tokensByConditionId = new Map<string, ComplexOutputToken[]>();

    renderedConditions.forEach((condition, conditionIndex) => {
      const tokens = renderedConditions.slice(0, conditionIndex).flatMap((previousCondition) => {
        const projection = extractSelectProjectionColumns(previousCondition.sqlQuery);
        if (!projection.isSelectQuery) {
          return [];
        }

        return projection.columns.map((column) => ({
          id: `${condition.id}-${previousCondition.parameterName}-${column.displayName}`,
          paramName: previousCondition.parameterName,
          columnName: column.displayName,
          label: `${previousCondition.parameterName}.${column.displayName}`,
          tokenText: `{{${previousCondition.parameterName}.${column.displayName}}}`,
        }));
      });

      tokensByConditionId.set(condition.id, tokens);
    });

    return tokensByConditionId;
  }, [renderedConditions]);

  const addCondition = () => {
    commitConditions([...renderedConditions, createEmptyCondition(renderedConditions.length + 1)]);
  };

  useImperativeHandle(
    ref,
    () => ({
      addCondition,
    }),
    [renderedConditions],
  );

  const updateCondition = (conditionId: string, updater: (condition: ComplexCondition) => ComplexCondition) => {
    commitConditions(renderedConditions.map((condition) => (condition.id === conditionId ? updater(condition) : condition)));
  };

  const changeServerName = (conditionId: string, serverName: string) => {
    const initialConditionId = renderedConditions[0]?.id;

    commitConditions(
      renderedConditions.map((condition) => {
        if (condition.id === conditionId) {
          return {
            ...condition,
            serverName,
          };
        }

        if (initialConditionId && condition.id === initialConditionId) {
          return {
            ...condition,
            serverName,
          };
        }

        return condition;
      }),
    );
  };

  const requestTokenInsert = (conditionId: string, text: string) => {
    setPendingInsertions((current) => ({
      ...current,
      [conditionId]: {
        id: createUniqueId("sql-token"),
        text,
      },
    }));
  };

  const markTokenInsertionHandled = (conditionId: string, requestId: string) => {
    setPendingInsertions((current) => {
      if (current[conditionId]?.id !== requestId) {
        return current;
      }

      return {
        ...current,
        [conditionId]: null,
      };
    });
  };

  const runCondition = useCallback(
    async (conditionId: string, serverName: string) => {
      const overallStartedAt = new Date().toISOString();
      const targetIndex = renderedConditions.findIndex((condition) => condition.id === conditionId);
      if (targetIndex < 0) {
        return createSyntheticExecution(serverName, "FAILED", "SQL query bajarilmadi", null, "Shart topilmadi", {
          createdAt: overallStartedAt,
          startedAt: overallStartedAt,
          finishedAt: new Date().toISOString(),
        });
      }

      const executionMap = new Map<string, SqlQueryExecutionResult>();

      const buildRowContexts = (paramName: string) => {
        const result = executionMap.get(paramName);
        if (!result) {
          throw new Error(`${paramName} uchun oldingi natija topilmadi`);
        }

        if (result.rows.length === 0) {
          throw new Error(`${paramName} bo'yicha natija topilmadi`);
        }

        return result.rows.map((row) => {
          const rowMap = new Map<string, string | null>();
          result.columns.forEach((column, index) => {
            rowMap.set(normalizeColumnKey(column), row[index] ?? null);
          });
          return rowMap;
        });
      };

      const substituteSqlTokens = (sourceSql: string, rowContexts: Map<string, Map<string, string | null>>) =>
        sourceSql.replace(COMPLEX_QUERY_TOKEN_REGEX, (_match, rawParamName: string, rawColumnName: string) => {
          const paramContext = rowContexts.get(rawParamName.toLowerCase());
          if (!paramContext) {
            throw new Error(`${rawParamName}.${rawColumnName} uchun qiymat topilmadi`);
          }

          const normalizedColumnName = normalizeColumnKey(rawColumnName);
          if (!paramContext.has(normalizedColumnName)) {
            throw new Error(`${rawParamName}.${rawColumnName} ustuni topilmadi`);
          }

          return toSqlLiteral(paramContext.get(normalizedColumnName) ?? null);
        });

      const buildResolvedQueries = (sourceSql: string) => {
        const referencedParams = [...sourceSql.matchAll(COMPLEX_QUERY_TOKEN_REGEX)].map((match) => match[1]?.toLowerCase() ?? "");
        const uniqueParams = [...new Set(referencedParams.filter((paramName) => paramName.length > 0))];

        if (uniqueParams.length === 0) {
          return [sourceSql];
        }

        const contexts = uniqueParams.map((paramName) => ({
          paramName,
          rows: buildRowContexts(paramName),
        }));

        const combinations: Array<Map<string, Map<string, string | null>>> = [];

        const walk = (index: number, current: Map<string, Map<string, string | null>>) => {
          if (index >= contexts.length) {
            combinations.push(new Map(current));
            return;
          }

          const context = contexts[index];
          context.rows.forEach((row) => {
            current.set(context.paramName, row);
            walk(index + 1, current);
            current.delete(context.paramName);
          });
        };

        walk(0, new Map());

        return [...new Set(combinations.map((context) => substituteSqlTokens(sourceSql, context)))];
      };

      for (const condition of renderedConditions.slice(0, targetIndex + 1)) {
        const resolvedQueries = buildResolvedQueries(condition.sqlQuery);
        const resolvedResults: SqlQueryExecutionResult[] = [];

        for (const resolvedQuery of resolvedQueries) {
          const execution = await executeSqlAndWait(resolvedQuery, condition.serverName || serverName);
          if (execution.status !== "COMPLETED" || !execution.result) {
            return {
              ...execution,
              serverName: condition.serverName || serverName,
              errorMessage:
                execution.errorMessage ??
                `${condition.parameterName} query bajarilmadi`,
              logMessage: execution.logMessage || "SQL query bajarilmadi",
            };
          }

          resolvedResults.push(applyProjectionColumnNames(condition.sqlQuery, execution.result));
        }

        const mergedExecution = mergeExecutionResults(condition.serverName || serverName, resolvedResults);
        if (mergedExecution.status !== "COMPLETED" || !mergedExecution.result) {
          return mergedExecution;
        }

        executionMap.set(condition.parameterName.toLowerCase(), mergedExecution.result);
      }

      const finalCondition = renderedConditions[targetIndex];
      const finalResult = executionMap.get(finalCondition.parameterName.toLowerCase());
      if (!finalResult) {
        return createSyntheticExecution(serverName, "FAILED", "SQL query bajarilmadi", null, "Yakuniy natija topilmadi");
      }

      return createSyntheticExecution(
        finalCondition.serverName || serverName,
        "COMPLETED",
        finalResult.totalRows === 0
          ? "Natija topilmadi"
          : finalResult.truncated
            ? "Natija cheklangan hajmda yuklandi"
            : "Natija muvaffaqiyatli yuklandi",
        finalResult,
        null,
        {
          createdAt: overallStartedAt,
          startedAt: overallStartedAt,
          finishedAt: new Date().toISOString(),
        },
      );
    },
    [renderedConditions],
  );

  const removeCondition = (conditionId: string) => {
    commitConditions(renderedConditions.filter((condition) => condition.id !== conditionId));
  };

  const handleAdditionalConditionsReorder = (nextConditionIds: string[]) => {
    if (!firstCondition) {
      return;
    }

    const nextAdditionalConditions = nextConditionIds.flatMap((conditionId) => {
      const condition = conditionsById.get(conditionId);
      return condition ? [condition] : [];
    });

    commitConditions([firstCondition, ...nextAdditionalConditions]);
  };

  return (
    <div className={cn("h-full overflow-auto pr-1", className)}>
      <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] shadow-[0_22px_48px_-30px_rgba(15,23,42,0.22)]">
        <CardContent className="flex flex-col gap-4 pt-6">
          {firstCondition ? (
            <motion.div
              layout="position"
              transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.8 }}
              className="sql-editor-transform-safe relative overflow-hidden rounded-[20px] border border-border/70 bg-background/96 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.22)]"
            >
              <ComplexConditionCardContent
                condition={firstCondition}
                conditionTitle="Dastlabki shart"
                isFirstCondition
                serverOptions={toServerOptions(servers, firstCondition.serverName)}
                serversLoading={serversQuery.isLoading}
                classifierTables={classifierTables}
                availableTokens={availableTokensByConditionId.get(firstCondition.id) ?? []}
                pendingInsertion={pendingInsertions[firstCondition.id] ?? null}
                onUpdateCondition={updateCondition}
                onChangeServerName={changeServerName}
                onRequestTokenInsert={requestTokenInsert}
                onInsertionHandled={markTokenInsertionHandled}
                onRunCondition={runCondition}
                onRemoveCondition={removeCondition}
              />
            </motion.div>
          ) : null}

          {additionalConditions.length > 0 ? (
            <Reorder.Group
              as="div"
              axis="y"
              values={additionalConditionIds}
              onReorder={handleAdditionalConditionsReorder}
              layoutScroll
              className="flex flex-col gap-4"
            >
              {additionalConditions.map((condition) => (
                <SortableComplexConditionCard
                  key={condition.id}
                  condition={condition}
                  conditionTitle="Qo'shimcha shart"
                  isFirstCondition={false}
                  serverOptions={toServerOptions(servers, condition.serverName)}
                  serversLoading={serversQuery.isLoading}
                  classifierTables={classifierTables}
                  availableTokens={availableTokensByConditionId.get(condition.id) ?? []}
                  pendingInsertion={pendingInsertions[condition.id] ?? null}
                  onUpdateCondition={updateCondition}
                  onChangeServerName={changeServerName}
                  onRequestTokenInsert={requestTokenInsert}
                  onInsertionHandled={markTokenInsertionHandled}
                  onRunCondition={runCondition}
                  onRemoveCondition={removeCondition}
                  isDragging={draggingConditionId === condition.id}
                  onDragStateChange={setDraggingConditionId}
                />
              ))}
            </Reorder.Group>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
});

RuleCanvasComplexEditor.displayName = "RuleCanvasComplexEditor";
