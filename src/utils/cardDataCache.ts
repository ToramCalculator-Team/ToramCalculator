// 科学的临时缓存机制，避免重复请求卡片数据，仅在本 session 内有效

import { DBDataConfig } from "~/routes/(app)/(functionPage)/wiki/dataConfig/dataConfig";

export interface CardGroupItem {
  type: string;
  id: string;
}

const cardDataCache = new Map<string, any>();

/**
 * 获取单个卡片数据，带临时缓存
 */
export async function getCardData(type: string, id: string, forceRefresh: boolean = false): Promise<any> {
  const key = `${type}-${id}`;
  if (!forceRefresh && cardDataCache.has(key)) {
    return cardDataCache.get(key);
  }
  const config = DBDataConfig[type as keyof typeof DBDataConfig];
  if (config?.dataFetcher) {
    const data = await config.dataFetcher(id);
    cardDataCache.set(key, data);
    return data;
  }
  return null;
}

/**
 * 获取卡片组数据，批量带缓存
 */
export async function getCardDatas(cardGroup: CardGroupItem[], forceRefresh: boolean = false): Promise<any[]> {
  return await Promise.all(
    cardGroup.map(({ type, id }) => getCardData(type, id, forceRefresh))
  );
}

/**
 * 清空缓存（如需强制刷新全部）
 */
export function clearCardDataCache() {
  cardDataCache.clear();
} 