import { InlineQueryResult } from '../index'

export interface AnswerInlineQuery {
  inline_query_id: string,
  results: InlineQueryResult[],
  cache_time?: number,
  is_personal?: boolean,
  next_offset?: string,
}

