import { Selectable } from 'kysely'
import { usage_timestamp } from '~/repositories/db/types'

export type UsageTimestamp = Selectable<usage_timestamp>

// default
export const defaultUsageTimestamp: UsageTimestamp = {
  timestamp: new Date(),
  statisticsId: "defaultStatisticsId",
};