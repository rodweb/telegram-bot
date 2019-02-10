export type ChatType = 'private'
  | 'group'
  | 'supergroup'
  | 'channel'

export interface Chat {
  id: number,
  type: ChatType,
  title?: string,
  username?: string,
  first_name: string,
  last_name?: string,
}
