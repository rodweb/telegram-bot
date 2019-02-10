const debug = require('debug')('bot')

import * as request from 'request-promise'
import { APIGatewayProxyHandler } from 'aws-lambda'

import {
  Update,
  Message,
  SendMessage,
  CallbackQuery,
  AnswerCallbackQuery,
  InlineQuery,
  InlineQueryResult,
  AnswerInlineQuery,
} from './types'

type Response = { statusCode: number, body: string }
type ResponseFn = (body?: any) => Response

const ok: ResponseFn = (body = true) => ({
  statusCode: 200,
  body: JSON.stringify(body),
});

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
