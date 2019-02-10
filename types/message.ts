import { User, Chat, Location } from './index'

interface MessageEntity {}

interface Audio {}
interface Document {}
interface PhotoSize {}
interface Video {}
interface Voice {}
interface Contact {}

export interface Message {
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

