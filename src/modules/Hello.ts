import fs from 'fs'
import axios from 'axios'
import { Extension, applicationCommand, listener, option } from '@pikokr/command.ts'
import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, Message} from 'discord.js'

interface ConversationItem {
  id: string
  output: string
}

interface KoiDB {
  conversations: ConversationItem[]
}

const jsonFile = fs.readFileSync('./data.json', 'utf8')
const jsonData: KoiDB  = JSON.parse(jsonFile)
let messageList = jsonData.conversations

class HelloExtension extends Extension {
  @listener({ event: 'ready' })
  async ready() {
    this.logger.info(`Logged in as ${this.client.user?.tag}`)
    await this.commandClient.fetchOwners()
  } 

  @listener({ event: 'applicationCommandInvokeError', emitter: 'cts' })
  async errorHandler(err: Error) {
    this.logger.error(err)
  }

  @listener({ event: 'messageCreate', emitter: 'discord'})
  async messageHandle(msg: Message) {
    if (!msg.content.startsWith('코이야 ')){
      return
    }
    
    const keyword = msg.content.slice(4)
    const answer = messageList.find((message) => message.id.includes(keyword))

    if(!answer){
      return msg.reply('내가 모르는 말이야...!')
    }

    await msg.reply(answer.output)
  }

  @applicationCommand({
    name: '배워',
    type: ApplicationCommandType.ChatInput,
    description: 'Learn reaction by Koi_Bot',
  })
  async learnCommand(
    i: ChatInputCommandInteraction, 
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'keyword',
      description: 'Input the command input',
      required: true,
    })
    keyword: string,
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'reaction',
      description: 'Input the command output',
      required: true,
    })
    reaction: string,) {

    messageList = 
    [...messageList, {
      "id": keyword,
      "output": reaction
    }]

    const dataDB: KoiDB = {
      conversations : messageList
    }
    const dataJSON = JSON.stringify(dataDB)

    fs.writeFileSync('data.json', dataJSON)

    await i.reply(`${keyword} 라고 물어보면 ${reaction}이라고 대답하면 된다고요? 알겠어요!`)
  }

  @applicationCommand({
    name: '안녕',
    type: ApplicationCommandType.ChatInput,
    description: 'Test command',
  })
  async ping(i: ChatInputCommandInteraction) {
    await i.reply(`Hello, hon20ke!`)
  }

}

export const setup = async () => {
  return new HelloExtension()
}
