import { Selectable } from 'kysely'
import { view_timestamp } from '~/repositories/db/types'

export type ViewTimestamp = Selectable<view_timestamp>

// default
export const defaultViewTimestamp: ViewTimestamp = {
  timestamp: new Date(),
  statisticsId: "defaultStatisticsId",
};