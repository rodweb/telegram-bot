export interface AnswerCallbackQuery {
  callback_query_id: string,
  text?: string,
  show_alert?: boolean,
  url?: string,
  cache_time?: number,
}
