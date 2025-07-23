import { Fields, QueryBuilder, RuleGroupType } from "@query-builder/solid-query-builder";
import { createMemo, createSignal, Show, For, useContext } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { store } from "~/store";

// 导入所有生成的字段规则
import * as QueryBuilderRules from "../../../../db/generated/queryBuilderRules";
import { Select } from "~/components/controls/select";
import { uniqueId } from "lodash-es";

export default function Repl() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

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

  return (
    <div class="space-y-6 p-6">
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
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
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
          />
          <pre>{JSON.stringify(queryData(), null, 2)}</pre>
        </div>
      </Show>
    </div>
  );
}
