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

const token = process.env.TELEGRAM_TOKEN || ''
const bucket = process.env.BUCKET || ''

const s3 = new AWS.S3()
const debug = d('telegram-bot')
const Telegraf = t.default;
const bot = new Telegraf(token)
const fetch = f.default

const debugMiddleware: t.Middleware<t.ContextMessageUpdate> = (ctx, next) => {
  if (next) {
    return next().then(() => {
      debug(ctx.update)
    })
  }
}
bot.use(debugMiddleware)

bot.use(ctx => {
  if (ctx.from && ctx.from.username !== 'rodwebr') {
    return ctx.reply(`I'm not allowed to chat with you :(\nPlease talk to @rodwebr`)
  }
  return
})

bot.on('message', (ctx, next) => {
  if (ctx.message && ctx.message.reply_to_message) {
    return ctx.reply(`Note taken: ${ctx.message.text}`)
  }
  if (next) return next()
})

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

bot.hears(/^ping$/gi, ctx => ctx.reply('pong'))

bot.command('help', ctx => ctx.reply(ctx.message!.text!))

bot.command('add', ctx => ctx.reply(`Ok, I'm ready to take notes`, Markup.forceReply().extra()))

export const handler: APIGatewayProxyHandler = async (event) => {
  await bot.handleUpdate(JSON.parse(event.body || ''))

  return {
    statusCode: 200,
    body: '',
  }
}
