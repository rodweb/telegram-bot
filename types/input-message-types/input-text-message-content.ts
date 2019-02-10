export interface InputTextMessageContent {
  message_text: string,
  parse_mode?: 'Markdown' | 'HTML',
  disable_web_page_preview?: boolean
}
