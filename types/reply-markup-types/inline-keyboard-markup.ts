export interface InlineKeyboardButton {
  text: string,
  url?: string,
  callback_data?: string
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][]
}
