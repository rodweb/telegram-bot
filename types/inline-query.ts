import { User, Location } from './index'

export interface InlineQuery {
  id: string,
  from: User,
  location?: Location,
  query: string,
  offset: string,
}
