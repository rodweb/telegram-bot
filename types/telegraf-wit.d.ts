declare module 'telegraf-wit' {
  export class TelegrafWit {
    constructor(token: string | undefined, opts?: { apiVersion: string })
    getMeaning(text: string | undefined): Promise<any>
  }
  export default TelegrafWit
}