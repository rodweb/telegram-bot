export interface KeyboardButton {
  text: string,
  request_contact?: boolean,
  request_location?: boolean
}

export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][],
  resize_keyboard?: boolean,
  one_time_keyboard?: boolean,
  selective?: boolean
}
