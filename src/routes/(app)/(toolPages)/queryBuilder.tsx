import { Fields, QueryBuilder, RuleGroupType } from "@query-builder/solid-query-builder";
import { createMemo, createSignal, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { store } from "~/store";

// 导入所有生成的字段规则
import * as QueryBuilderRules from "@db/generated/queryBuilderRules";
import { Select } from "~/components/controls/select";
import { uniqueId } from "lodash-es";
import { getDB } from "@db/repositories/database";
import { Button } from "~/components/controls/button";

export default function Repl() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  // 当前选择的表
  const [selectedTable, setSelectedTable] = createSignal<string>("");

  // 查询数据
  const [queryData, setQueryData] = createSignal<RuleGroupType>({
    id: uniqueId(),
    combinator: "OR",
    rules: [],
  });

  // 获取所有可用的表
  const availableTables = () => {
    const tables: { key: string; name: string; description: string }[] = [];

    if (dictionary()) {
      // 从字典中获取表信息
      Object.entries(dictionary()!.db).forEach(([tableKey, tableInfo]) => {
        tables.push({
          key: tableKey,
          name: tableInfo.selfName,
          description: tableInfo.description,
        });
      });
    }

    return tables.sort((a, b) => a.name.localeCompare(b.name));
  };

  // 根据选择的表获取对应的字段
  const getFieldsForTable = (tableKey: string): Fields[] => {
    const fieldKey = `${tableKey.charAt(0).toUpperCase() + tableKey.slice(1)}Fields`;
    return (QueryBuilderRules as any)[fieldKey] || [];
  };

  // 当前表的字段
  const [fields, setFields] = createSignal<Fields[]>([]);

  // 当表选择改变时更新字段
  const handleTableChange = (tableKey: string) => {
    setSelectedTable(tableKey);
    const tableFields = getFieldsForTable(tableKey);
    setFields(tableFields);

    // 重置查询数据
    setQueryData({
      id: uniqueId(),
      combinator: "OR",
      rules: [],
    });
  };

  const [operators, setOperators] = createSignal([
    { name: "=", value: "=", label: "=" },
    { name: "!=", value: "!=", label: "!=" },
    { name: "<", value: "<", label: "<" },
    { name: ">", value: ">", label: ">" },
    { name: "<=", value: "<=", label: "<=" },
    { name: ">=", value: ">=", label: ">=" },
    { name: "contains", value: "contains", label: "contains" },
    { name: "beginsWith", value: "beginsWith", label: "begins with" },
  ]);

  // =========================
  // SQL 生成（仅预览，不执行）
  // =========================
  const [sqlPreview, setSqlPreview] = createSignal<string>("");
  const [sqlParams, setSqlParams] = createSignal<any[]>([]);

  // 只读查询结果（本地 PGLite）
  type LocalQueryResult = { data: any[]; count: number; sql: string; error?: string };
  const [queryResult, setQueryResult] = createSignal<LocalQueryResult | null>(null);

  // 允许的列（由生成的字段列表提供），防御非法字段名
  const allowedColumns = () => new Set(fields().map((f: any) => f.name ?? f.value ?? f.field));

  const quoteIdent = (name: string) => `"${String(name).replace(/"/g, '""')}"`;

  type BuildResult = { clause: string; params: any[] };

  const opToSql = (op: string, paramIndex: number, rawValue: any): { fragment: string; value: any } => {
    switch (op) {
      case "=":
      case "!=":
      case "<":
      case ">":
      case "<=":
      case ">=":
        return { fragment: `${op} $${paramIndex}`, value: rawValue };
      case "contains":
        return { fragment: `LIKE $${paramIndex}`, value: `%${rawValue}%` };
      case "beginsWith":
        return { fragment: `LIKE $${paramIndex}`, value: `${rawValue}%` };
      default:
        return { fragment: `= $${paramIndex}`, value: rawValue };
    }
  };

  const buildGroup = (group: RuleGroupType, nextIndex: number): BuildResult => {
    const parts: string[] = [];
    const params: any[] = [];

    for (const r of group.rules as any[]) {
      // 子分组
      if (r && Array.isArray(r.rules)) {
        const sub = buildGroup(r as RuleGroupType, nextIndex + params.length + 1);
        if (sub.clause) {
          parts.push(`(${sub.clause})`);
          params.push(...sub.params);
        }
        continue;
      }

      // 普通规则
      const fieldName: string | undefined = r?.field || r?.name;
      const op: string = r?.operator ?? r?.op ?? "=";
      const value: any = r?.value;

      if (!fieldName || !allowedColumns().has(fieldName)) continue; // 跳过非法字段
      if (value === undefined || value === null || value === "") continue; // 跳过空值

      const paramIndex = nextIndex + params.length + 1;
      const mapped = opToSql(op, paramIndex, value);
      parts.push(`${quoteIdent(fieldName)} ${mapped.fragment}`);
      params.push(mapped.value);
    }

    const comb = (group as any).combinator?.toUpperCase?.() === "AND" ? "AND" : "OR";
    return { clause: parts.join(` ${comb} `), params };
  };

  const generateSQL = () => {
    const table = selectedTable();
    if (!table) {
      setSqlPreview("-- 请选择数据表");
      setSqlParams([]);
      return;
    }
    const base = `SELECT * FROM ${quoteIdent(table)}`;
    if (!queryData() || !Array.isArray(queryData().rules) || queryData().rules.length === 0) {
      setSqlPreview(`${base};`);
      setSqlParams([]);
      return;
    }
    const built = buildGroup(queryData(), 0);
    if (!built.clause) {
      setSqlPreview(`${base};`);
      setSqlParams([]);
      return;
    }
    setSqlPreview(`${base} WHERE ${built.clause};`);
    setSqlParams(built.params);
  };

  // 运行只读查询（SELECT），使用 PGLite/Kysely
  const runReadOnly = async () => {
    if (!selectedTable()) return;
    // 确保生成一次最新 SQL/参数
    generateSQL();
    const sql = sqlPreview();
    try {
      const db = await getDB();
      // 只允许 SELECT 开头，避免误操作
      if (!/^\s*SELECT\b/i.test(sql)) {
        throw new Error("仅支持只读查询 (SELECT)");
      }
      // 通过底层方言传入参数：Kysely 的 sql 模板可插入参数，但我们已有数组，走原始连接更直接
      // 这里利用 PGliteDialect 的 executeQuery 支持参数数组
      const exec = (db as any).getExecutor?.() ?? (db as any).executor;
      const result = await exec.executeQuery({ sql, parameters: sqlParams() });
      const rows = result?.rows ?? [];
      setQueryResult({ data: rows as any, count: rows.length, sql, error: undefined as any });
    } catch (error) {
      setQueryResult({ data: [], count: 0, sql, error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div class="p-6 overflow-y-auto">
      {/* 表选择器 */}
      <div class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">查询构建器</h2>

        <div class="space-y-2">
          <label for="table-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            选择数据表
          </label>
          <Select
            value={selectedTable() || ""}
            setValue={handleTableChange}
            options={[
              { label: "请选择成员", value: "" },
              ...availableTables()
                .map((table) => ({
                  label: `${table.name}`,
                  value: table.key,
                }))
                .filter((table) => !table.value.startsWith("_")),
            ]}
            placeholder="请选择数据表"
          />
        </div>
      </div>

      {/* QueryBuilder 组件 */}
      <Show
        when={selectedTable() && fields().length > 0}
        fallback={
          <div class="py-12 text-center text-gray-500 dark:text-gray-400">
            {selectedTable() ? "正在加载字段..." : "请先选择一个数据表"}
          </div>
        }
      >
        <div class="bg-area-color rounded p-3">
          <QueryBuilder
            initialQuery={queryData()}
            fields={fields()}
            operators={operators()}
            allowDragAndDrop
            onQueryChangeHandler={(newQuery) => {
              setQueryData(newQuery);
              console.log(JSON.stringify(newQuery, null, 2));
              console.log(JSON.stringify(queryData(), null, 2));
            }}
            showShiftActions
            disabled={false}
            addSingleRuleToGroup={false}
            showBranches
            showNotToggle="both"
          />
          <div class="mt-4 flex items-center gap-2">
            <Button onClick={generateSQL}>生成 SQL</Button>
            <Button onClick={runReadOnly}>运行（只读）</Button>
          </div>
          <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <div class="mb-1 text-sm font-medium">SQL</div>
              <pre class="rounded bg-gray-50 p-2 text-xs dark:bg-gray-800 dark:text-gray-200">{sqlPreview()}</pre>
            </div>
            <div>
              <div class="mb-1 text-sm font-medium">参数</div>
              <pre class="rounded bg-gray-50 p-2 text-xs dark:bg-gray-800 dark:text-gray-200">{JSON.stringify(sqlParams(), null, 2)}</pre>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
