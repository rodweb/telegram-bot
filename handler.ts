// const tableName = process.env.DYNAMODB_TABLE as string;

// const dynamoDb = new AWS.DynamoDB.DocumentClient()

// async function getNote(id: string) {
//   const params = {
//     TableName: tableName,
//     Key: {
//       id,
//     }
//   }

//   const result = await dynamoDb.get(params).promise()
//   if (result) {
//     return result.Item && result.Item.text;
//   }

//   return null;
// }

// async function addNote(userId: number, text: string): Promise<string> {
//   const timestamp = new Date().getTime()
//   const id = uuid.v1()

//   const params = {
//     TableName: tableName,
//     Item: {
//       type: 'nma/text',
//       id,
//       userId,
//       text,
//       createdAt: timestamp,
//       updatedAt: timestamp,
//     },
//   };

//   // write the pet to the database
//   await dynamoDb.put(params).promise();

//   return id
// }

import * as t from 'telegraf'
import * as AWS from 'aws-sdk'
import { Response } from 'node-fetch';
import { APIGatewayProxyHandler } from 'aws-lambda';
import * as f from 'node-fetch'
import { Markup } from 'telegraf';
import * as d from 'debug'
// import { PhotoSize } from 'telegraf/typings/telegram-types';
//
import axios from 'axios';

interface Activity {
    activity: string
    type: string
}
const boredUrl = 'http://www.boredapi.com/api/activity/';
const bored = {
    random: async () => {
        const result = await axios.get<Activity>(boredUrl);
        if (result.status === 200) {
            return result.data
        }
        return { activity: 'failed', type: 'failed' }
    }
}

const apiFlashUrl = 'https://api.apiflash.com/v1/urltoimage'
const apiFlash = {
    url: async (url: string) => {
        const result = await axios.get(`${apiFlashUrl}?access_key=${process.env.APIFLASH_TOKEN}&url=${url}`, { responseType: 'stream' });
        return result.data;
    }
}

const token = process.env.TELEGRAM_TOKEN || ''
const bucket = process.env.BUCKET || ''

const s3 = new AWS.S3()
const debug = d('telegram-bot')
const Telegraf = t.default;
const bot = new Telegraf(token)
const fetch = f.default

const debugMiddleware: t.Middleware<t.ContextMessageUpdate> = (ctx, next) => {
  debug('debugMiddeware')
  debug(ctx.update)
  if (next) return next()
}

bot.use(debugMiddleware)

bot.use((ctx, next) => {
  if (ctx.from && ctx.from.username !== process.env.TELEGRAM_HANDLE) {
    return ctx.reply(`I'm not allowed to chat with you :(\nPlease talk to @rodweb`)
  }
  if (next) return next()
})

bot.catch(debug)

bot.start(ctx => ctx.reply(`Welcome, ${ctx.from!.first_name}!`))

bot.on('message', (ctx, next) => {
  if (ctx.message && ctx.message.reply_to_message) {
    return ctx.reply(`Note taken: ${ctx.message.text}`)
  }
  if (next) return next()
})

// import * as tw from 'telegraf-wit'
// const TelegrafWit = tw.default
// const wit = new TelegrafWit(process.env.WIT_TOKEN, { apiVersion: '20190216' })

// bot.on('text', (ctx) => {
//   return wit.getMeaning(ctx.message!.text)
//     .then((result: any) => {
//       // reply to user with wit result
//       return ctx.reply(JSON.stringify(result, null, 2))
//     })
// })

const upload = (id: string, url: string) => fetch(url)
  .then(resp => resp.buffer())
  .then(buffer => (
    s3.putObject({
      Bucket: bucket,
      Key: id,
      Body: buffer
    }).promise())
)

const download = (id: string) => (
  s3.getObject({
    Bucket: bucket,
    Key: id,
  }).createReadStream()
)

bot.on('document', ctx =>
  ctx.telegram.getFileLink(ctx.message!.document!.file_id)
    .then<Response>(fetch)
    .then(resp => resp.buffer())
    .then(buffer => (
      s3.putObject({
        Bucket: bucket,
        Key: ctx.message!.document!.file_id,
        Body: buffer,
      }).promise()
    ))
    .then(() => (
      s3.getObject({
        Bucket: bucket,
        Key: ctx.message!.document!.file_id,
      }).createReadStream()
    ))
    .then(source => ctx.replyWithDocument({ source, filename: ctx.message!.document!.file_name }, {
      caption: ctx.message!.document!.file_name,
    }))
)

// const biggerPhotos = (acc: PhotoSize[], curr: PhotoSize) => {
//   const found = acc.find(x => x.file_id === curr.file_id)
//   if (found) {
//     if (found.width < curr.width)
//       return [...acc.filter(x => x.file_id !== curr.file_id), curr]
//   }
//   return [...acc, curr]
// }

import { Wit } from 'node-wit'

const client = new Wit({
  accessToken: process.env.WIT_TOKEN || '',
})

bot.on('photo', ctx => {
  if (!ctx.message || !ctx.message.photo) return
  debug(ctx.message.photo)
  const ids = ctx.message.photo
    .filter(photo => photo.height === 1280 || photo.width === 1280)
    // .reduce(biggerPhotos, [])
    .map(photo => photo.file_id)
  return Promise.all(ctx.message.photo
    .filter(photo => photo.height === 1280 || photo.width === 1280)
    .map(photo => ctx.telegram.getFileLink(photo.file_id)))
    .then(urls =>
      Promise.all(Array.from(ids.keys())
        .map(i => upload(ids[i], urls[i])))
    )
    .then(() =>
      Promise.all(Array.from(ids.keys())
        .map(i => download(ids[i])))
    )
    .then(sources =>
      Promise.all(sources
        .map(source => ctx.replyWithPhoto({ source })))
    )
})

bot.hears(/^http/gi, ctx => apiFlash.url(ctx.message!.text!)
    .then(source => ctx.replyWithPhoto({ source })))

bot.hears(/^ping$/gi, ctx => ctx.reply('pong'))

bot.command('help', ctx => ctx.reply(ctx.message!.text!))

bot.command('add', ctx => ctx.reply(`Ok, I'm ready to take notes`, Markup.forceReply().extra()))

bot.command('bored', ctx => bored.random().then(res => ctx.reply(res.activity)))

// type Entity = 'reminder' | 'datetime'
type ReminderEntity = { value: string }
type DatetimeGrain = 'hour' | 'day' | string
type DatetimeValue = { value: string, grain: DatetimeGrain }
type DatetimeEntity = { values: DatetimeValue[] }
interface Entities {
  [entity: string]: any;
  reminder: ReminderEntity[]
  datetime: DatetimeEntity[]
}
declare interface MessageResponse {
  entities: Entities
}

import * as moment from 'moment'

bot.on('text', ctx =>
  client.message(ctx.message!.text!, {})
  .then((resp: MessageResponse) => {
    if (resp.entities.reminder && resp.entities.reminder.length) {
      const reminder = resp.entities.reminder[0].value
      if (resp.entities.datetime && resp.entities.datetime.length) {
        const at = moment(resp.entities.datetime[0].values[0].value)
        return ctx
          .reply(`I will remind you to '${reminder}' ${at.fromNow()}`)
      }
    }
    return ctx.reply(JSON.stringify(resp, null, 2))
  }))

export const handler: APIGatewayProxyHandler = async (event) => {
  await bot.handleUpdate(JSON.parse(event.body || ''))

  return {
    statusCode: 200,
    body: '',
  }
}
