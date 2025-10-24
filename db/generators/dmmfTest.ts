import { getDMMF } from '@prisma/internals'
import { readFileSync } from 'fs'
import { PATHS } from './config/generator.config'
 
// 加载Prisma Schema
async function loadSchema(path: string) {
  const schema = readFileSync(path, 'utf-8')
  return getDMMF({ datamodel: schema })
}
 
// 构建实体关系图
function buildEntityRelationshipGraph(dmmf: any) {
  const graph: Record<string, string[]> = {}
  
  // 初始化所有模型节点
  dmmf.datamodel.models.forEach((model: any) => {
    graph[model.name] = []
  })
  
  // 添加关系边
  dmmf.datamodel.models.forEach((model: any) => {
    model.fields.forEach((field: any) => {
      if (field.kind === 'object' && field.relationName) {
        // 添加双向关系
        graph[model.name].push(field.type)
        if (!graph[field.type]) graph[field.type] = []
        graph[field.type].push(model.name)
      }
    })
  })
  
  return graph
}
 
// 计算传递闭包，获取所有可达路径
function computeTransitiveClosure(graph: Record<string, string[]>) {
  const closure: Record<string, Set<string>> = {}
  const nodes = Object.keys(graph)
  
  // 初始化闭包
  nodes.forEach(node => {
    closure[node] = new Set([node])
  })
  
  // Floyd-Warshall算法计算传递闭包
  for (const k of nodes) {
    for (const i of nodes) {
      for (const j of nodes) {
        if (graph[i].includes(k) && graph[k].includes(j)) {
          if (closure[i].has(k) && closure[k].has(j)) {
            closure[i].add(j)
          }
        }
      }
    }
  }
  
  return closure
}
 
// 查找两个实体间的所有血缘路径
function findAllLineagePaths(
  graph: Record<string, string[]>, 
  start: string, 
  end: string, 
  path: string[] = []
): string[][] {
  const currentPath = [...path, start]
  
  // 终止条件：到达目标节点
  if (start === end) {
    return [currentPath]
  }
  
  // 防止循环引用
  if (path.includes(start)) {
    return []
  }
  
  // 递归查找所有路径
  const paths: string[][] = []
  for (const neighbor of graph[start] || []) {
    const neighborPaths = findAllLineagePaths(graph, neighbor, end, currentPath)
    paths.push(...neighborPaths)
  }
  
  return paths
}
 
// 主函数：分析数据血缘
async function analyzeDataLineage(schemaPath: string) {
  const dmmf = await loadSchema(schemaPath)
  const graph = buildEntityRelationshipGraph(dmmf)
  const closure = computeTransitiveClosure(graph)
  
  return {
    entities: Object.keys(graph),
    directRelations: graph,
    allRelations: closure,
    findPaths: (start: string, end: string) => findAllLineagePaths(graph, start, end)
  }
}
 
// 使用示例
analyzeDataLineage(PATHS.baseSchema).then(lineage => {
  console.log('实体关系:', lineage.directRelations)
  console.log('Order到Category的血缘路径:', lineage.findPaths('Order', 'Category'))
})