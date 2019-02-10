const debug = require('debug')('bot')
const request = require('request-promise')

import { APIGatewayProxyHandler } from 'aws-lambda'

type Response = { statusCode: number, body: string }
type ResponseFn = (body?: any) => Response

const ok: ResponseFn = (body = true) => ({
  statusCode: 200,
  body: JSON.stringify(body),
});

interface Message {

}

interface Update {
  update_id: number,
  message?: Message,
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
  return makeRequest('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: JSON.stringify({
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
    }),
  })
}

const answerCallbackQuery = (cbId, text) => {
  return makeRequest('answerCallbackQuery', {
    callback_query_id: cbId,
    text,
  })
}

const handleCallbackQuery = (callbackQuery) => {
  const callbackData = callbackQuery.data
  debug(callbackData)
  const callbackText = callbackQuery.message.text
  debug(callbackText)

  const resp = (callbackData === 'add' ? 'was added' : 'was ignored')

  return answerCallbackQuery(callbackQuery.id, `Your note ${resp}`)
}

const handleTextMessage = (message) => {
  return sendMessage(message.chat.id, message.text)
}

const updateHandler = (body) => {
  if (body.callback_query) {
    return handleCallbackQuery(body.callback_query)
  } else {
    return handleTextMessage(body.message)
  }
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const body: Update = JSON.parse(event.body)
  debug(context.functionName, context.functionVersion)

  await updateHandler(body);

  return ok()
}
