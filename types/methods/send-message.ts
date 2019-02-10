import { ReplyMarkup } from '../index'

export interface SendMessage {
  chat_id?: number | string,
  text: string,
  parse_mode?: 'Markdown' | 'HTML',
  disable_web_page_preview?: boolean,
  disable_notification?: boolean,
  replay_to_message_id?: number,
  reply_markup?: ReplyMarkup,
}

