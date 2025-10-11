# Repository 自动生成器实现计划

## 目标

自动从 Prisma schema 生成完整的 Repository 文件，包括：

- 基础类型（T, TInsert, TUpdate, TWithRelations）
- CRUD 方法（支持事务）
- 关系查询定义
- 智能级联删除

## 技术方案

### 1. 使用 Prisma DMMF 作为元数据来源

- 优势：官方标准、类型完整、包含所有关系信息
- 方法：使用 `@prisma/client` 的 `getDMMF()` API

### 2. 核心模块设计

#### RepositoryGenerator (新增)

- 位置：`db/generators/RepositoryGenerator.ts`
- 功能：
  - 解析 DMMF 获取 model 元数据
  - 生成类型定义
  - 生成基础 CRUD 方法
  - 生成关系定义（defineRelations）
  - 生成级联删除逻辑
  - 生成 index.ts 映射文件

#### 关系分析器 (新增工具)

- 位置：`db/generators/utils/relationAnalyzer.ts`
- 功能：
  - 分析 Prisma 关系（一对一、一对多、多对多）
  - 识别反向关系
  - 生成 kysely join 查询代码

#### 级联删除分析器 (新增工具)

- 位置：`db/generators/utils/cascadeAnalyzer.ts`  
- 功能：
  - 根据 `onDelete: Cascade` 推断删除顺序
  - 检测循环依赖
  - 生成级联删除代码
  - 支持配置覆盖（如 item 的重置逻辑）

### 3. 生成模板结构

每个 Repository 文件包含：

```typescript
// 1. 类型定义
export type ModelName = Selectable<modelName>;
export type ModelNameInsert = Insertable<modelName>;
export type ModelNameUpdate = Updateable<modelName>;

// 2. 关系定义
const modelNameSubRelationDefs = defineRelations({...});
export const modelNameRelationsFactory = makeRelations(modelNameSubRelationDefs);
export const ModelNameWithRelationsSchema = z.object({...});
export const modelNameSubRelations = modelNameRelationsFactory.subRelations;

// 3. CRUD 方法
findModelNameById(id, trx?)
findModelNames(params?, trx?)
insertModelName(trx, data)
createModelName(trx, data) // 包含关联数据创建
updateModelName(trx, id, data)
deleteModelName(trx, id) // 智能级联删除
findModelNameWithRelations(id, trx?)

// 4. 类型导出
export type ModelNameWithRelations = Awaited<ReturnType<typeof findModelNameWithRelations>>;
```

### 4. 配置文件支持

创建 `db/generators/repository.config.ts`：

```typescript
export const repositoryConfig = {
  // 跳过生成的 model
  skip: ['session', 'verification_token'],
  
  // 自定义删除逻辑
  customDelete: {
    item: 'resetReferences', // 重置引用而非级联删除
    // 其他特殊情况...
  },
  
  // 自定义关系（如果需要特殊的 join 逻辑）
  customRelations: {
    // model: { relationName: customBuilder }
  }
};
```

### 5. 集成到现有生成器流程

修改 `db/generators/main.ts`：

1. 在 Kysely 类型生成后
2. 添加 Repository 生成步骤
3. 生成到 `db/repositories/generated/` 目录（可选：直接覆盖现有文件）

## 实施步骤

1. **创建 relationAnalyzer 工具**

   - 解析 DMMF 关系元数据
   - 生成 jsonArrayFrom/jsonObjectFrom 代码

2. **创建 cascadeAnalyzer 工具**

   - 分析删除依赖图
   - 生成删除顺序代码

3. **创建 RepositoryGenerator 主类**

   - 实现代码生成逻辑
   - 生成完整 repository 文件

4. **创建配置文件**

   - 定义特殊处理规则

5. **集成到 main.ts**

   - 添加生成步骤

6. **测试验证**

   - 对比生成的代码与手写代码
   - 确保类型安全
   - 验证功能正确性

## 关键文件

- `db/generators/RepositoryGenerator.ts` (新增)
- `db/generators/utils/relationAnalyzer.ts` (新增)
- `db/generators/utils/cascadeAnalyzer.ts` (新增)
- `db/generators/repository.config.ts` (新增)
- `db/generators/main.ts` (修改)
- `db/repositories/index.ts` (生成)

## 注意事项

1. **保持向后兼容**：生成的代码应与现有手写代码结构一致
2. **类型安全**：充分利用 TypeScript 和 Kysely 的类型系统
3. **可扩展性**：通过配置文件支持特殊场景
4. **错误处理**：生成器应有完善的错误提示
5. **增量生成**：支持只生成变更的 model