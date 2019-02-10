import { InputMessageContent, InlineKeyboardMarkup } from '../index'

export interface InlineQueryResultArticle {
  type: 'article',
  id: string,
  title: string,
  input_message_content: InputMessageContent,
  reply_markup?: InlineKeyboardMarkup,
  url?: string
  hide_url?: boolean
  description?: string
}
