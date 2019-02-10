const debug = require('debug')('bot')

import * as request from 'request-promise'
import { APIGatewayProxyHandler } from 'aws-lambda'

type Response = { statusCode: number, body: string }
type ResponseFn = (body?: any) => Response

const ok: ResponseFn = (body = true) => ({
  statusCode: 200,
  body: JSON.stringify(body),
});

interface User {
  id: number,
  is_bot: boolean,
  first_name: string,
  last_name?: string,
  username?: string
  language_code?: string
}

interface Chat {
  id: number,
  type: 'private' | 'group' | 'supergroup' | 'channel',
  title?: string,
  username?: string,
  first_name: string,
  last_name?: string,
}

interface MessageEntity {}

interface Audio {}
interface Document {}
interface PhotoSize {}
interface Video {}
interface Voice {}
interface Location {}
interface Contact {}

interface Message {
  message_id: number,
  from: User,
  date: number,
  chat: Chat,
  forward_from?: User,
  forward_from_chat?: Chat,
  forward_from_message_id?: number,
  forward_signature?: string,
  forward_date?: number,
  reply_to_message?: Message,
  edit_date?: number,
  media_group_id?: string
  author_signature?: string,
  text?: string,
  entities?: Array<MessageEntity>,
  caption_entities?: Array<MessageEntity>,
  audio?: Audio,
  document?: Document,
  // animation?: Animation,
  // game?: Game,
  photo?: Array<PhotoSize>,
  // sticker?: Sticker,
  video?: Video,
  voice?: Voice,
  // video_note?: VideoNote,
  caption?: string,
  contact?: Contact,
  location?: Location,
}

interface InlineQuery {
  id: string,
  from: User,
  location?: Location,
  query: string,
  offset: string,
}
interface InputTextMessageContent {
  message_text: string,
  parse_mode?: 'Markdown' | 'HTML',
  disable_web_page_preview?: boolean
}
type InputMessageContent = InputTextMessageContent
interface InlineQueryResultArticle {
  type: 'article',
  id: string,
  title: string,
  input_message_content: InputMessageContent,
  reply_markup?: InlineKeyboardMarkup,
  url?: string
  hide_url?: boolean
  description?: string
}
type InlineQueryResult = InlineQueryResultArticle
interface ChosenInlineResult {}
interface CallbackQuery {
  id: string,
  from: User,
  message?: Message,
  inline_message_id?: string
  chat_instance: string,
  data?: string,
  game_short_name?: string
}

interface Update {
  update_id: number,
  message?: Message,
  edited_message?: Message,
  channel_post?: Message,
  edited_channel_post?: Message,
  inline_query?: InlineQuery,
  chosen_inline_result?: ChosenInlineResult,
  callback_query?: CallbackQuery,
}

interface InlineKeyboardMarkup {
  text: string,
  url?: string,
  callback_data?: string
}
interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardMarkup[][]
}
interface KeyboardButton {
  text: string,
  request_contact?: boolean,
  request_location?: boolean
}
interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][],
  resize_keyboard?: boolean,
  one_time_keyboard?: boolean,
  selective?: boolean
}
interface ReplyKeyboardRemove {}
interface ForceReply {}

interface SendMessage {
  chat_id?: number | string,
  text: string,
  parse_mode?: 'Markdown' | 'HTML',
  disable_web_page_preview?: boolean,
  disable_notification?: boolean,
  replay_to_message_id?: number,
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply
}

interface AnswerCallbackQuery {
  callback_query_id: string,
  text?: string,
  show_alert?: boolean,
  url?: string,
  cache_time?: number,
}

interface AnswerInlineQuery {
  inline_query_id: string,
  results: InlineQueryResult[],
  cache_time?: number,
  is_personal?: boolean,
  next_offset?: string,
}

const genHash = (): string => Math.random().toString(36).substring(3, 7)
  + Math.random().toString(36).substring(3, 7)

const notes: {[userId: string]: {[hash: string]: string}} = {}
const addNote = (userId: number, note: string) => {
  if (!notes[userId]) notes[userId] = {}

  const hash = genHash();
  if (notes[userId][hash]) return addNote(userId, note);
  notes[userId][hash] = note;
}

const token = process.env.TELEGRAM_TOKEN

const buildUrl = (method) => `https://api.telegram.org/bot${token}/${method}`

const requestOptions = {
  method: 'POST',
  simple: false,
  resolveWithFullResponse: true,
  forever: true,
}
const buildOptions = (method, form) => ({
  ...requestOptions,
  url: buildUrl(method),
  form,
})

const makeRequest = (method, form) => {
  const opts = buildOptions(method, form)
  if (form.reply_markup) form.reply_markup = JSON.stringify(form.reply_markup)
  if (form.results) form.results = JSON.stringify(form.results)

  return request(opts)
    .then(res => {
      const data = JSON.parse(res.body)
      if (data.ok) {
        debug('HTTP request sent with success')
      }
    })
    .catch(err => {
      debug(err)
    })
}

const sendMessage = (chatId, text) => {
  const form: SendMessage = {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Add note',
            callback_data: 'add',
          },
        ],
        [
          {
            text: 'Cancel',
            callback_data: 'cancel',
          }
        ],
      ],
    },
    // reply_markup: {
    //   keyboard: [
    //     [
    //       {
    //         text: 'teste',
    //       }
    //     ],
    //     [
    //       {
    //         text: 'dois',
    //       },
    //       {
    //         text: 'quatro',
    //         request_contact: true
    //       }
    //     ]
    //   ]
    // }
  }
  return makeRequest('sendMessage', form)
}

const answerCallbackQuery = (cbId, text) => {
  const form: AnswerCallbackQuery = {
    callback_query_id: cbId,
    text,
  }

  return makeRequest('answerCallbackQuery', form)
}

const answerInlineQuery = (iqId, results: InlineQueryResult[]) => {
  const form: AnswerInlineQuery = {
    inline_query_id: iqId,
    cache_time: 10,
    is_personal: true,
    results,
  }

  return makeRequest('answerInlineQuery', form)
}

const handleCallbackQuery = (callbackQuery: CallbackQuery) => {
  const callbackData = callbackQuery.data

  const resp = (callbackData === 'add' ? 'was added' : 'was ignored')

  if (callbackData === 'add') {
    debug('callbackQuery')
    debug(callbackQuery)
    addNote(callbackQuery.from.id, callbackQuery.message.text)
  }

  return answerCallbackQuery(callbackQuery.id, `Your note ${resp}`)
}

const handleInlineQuery = (inlineQuery: InlineQuery) => {
  const iqId = inlineQuery.id
  const results = Object.keys(notes[inlineQuery.from.id] || {})
    .map(key => ({ key, value: notes[inlineQuery.from.id][key] }))
    .filter(({ value }) => value.includes(inlineQuery.query.trim()))
    .map<InlineQueryResult>(({ key, value }) => ({
      type: 'article',
      // description: 'description test',
      id: key,
      title: value.length > 30 ? `${value.substring(0, 27)}...` : value,
      input_message_content: {
        message_text: value,
      }
    }))
  debug('inline results')
  debug(results)
  return answerInlineQuery(iqId, results)
}

const handleTextMessage = (message: Message) => {
  return sendMessage(message.chat.id, message.text)
}

const updateHandler = (update: Update) => {
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query)
  } else if (update.inline_query) {
    return handleInlineQuery(update.inline_query)
  } else {
    return handleTextMessage(update.message)
  }
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const update = JSON.parse(event.body) as Update
  debug(context.functionName, context.functionVersion)

  await updateHandler(update);

  return ok()
}
