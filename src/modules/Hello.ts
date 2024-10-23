import { end_check } from '../utils/korean'
import {
  Extension,
  applicationCommand,
  listener,
  option,
  ownerOnly,
} from '@pikokr/command.ts'
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Message,
} from 'discord.js'
import fs from 'fs'

interface ConversationItem {
  id: string
  output: string
}

interface KoiDB {
  conversations: ConversationItem[]
}

const conversationFile = fs.readFileSync(
  './resources/conversation-data.json',
  'utf8'
)
const conversationData: KoiDB = JSON.parse(conversationFile)
const messageList = conversationData.conversations

class HelloExtension extends Extension {
  @listener({ event: 'ready' })
  async ready() {
    this.logger.info(`Logged in as ${this.client.user?.tag}`)
    await this.commandClient.fetchOwners()
  }

  @listener({ event: 'applicationCommandInvokeError', emitter: 'cts' })
  async errorHandler(err: Error) {
    if (err.message == 'registerOnlyError') return
    this.logger.error(err)
  }

  @listener({ event: 'messageCreate', emitter: 'discord' })
  async messageHandle(msg: Message) {
    if (!msg.content.startsWith('코이야 ')) {
      return
    }
    if (msg.author.bot) return

    const keyword = msg.content.slice(4)
    const answers: ConversationItem[] = messageList.filter(
      (message) => message.id == keyword
    )

    if (answers.length == 0) {
      return msg.reply('내가 모르는 말이야...!')
    }

    const answer = answers[Math.floor(Math.random() * answers.length)]

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
    reaction: string
  ) {
    if (/<@!?(\d+)>/.test(reaction))
      return i.reply('너 멘션을 포함하고 있는거지! 너 그러면 안되는거야!')
    if (reaction.length > 900 || keyword.length > 900)
      return i.reply(
        '그렇게 긴 문장을 나보고 외우게 시키다니... 코이는 바보라서 그런거 못 외우니까..\
        \n그런건 나한테 시키지 말기! (900자 이상 텍스트는 등록되지 않습니다.)'
      )
    messageList.push({
      id: keyword,
      output: reaction,
    })

    const dataDB: KoiDB = {
      conversations: messageList,
    }
    const dataJSON = JSON.stringify(dataDB)

    fs.writeFileSync('./resources/conversation-data.json', dataJSON)
    await i.reply(
      `${keyword} ${end_check(
        keyword,
        '이'
      )}라고 물어보면 ${reaction} ${end_check(
        reaction,
        '이'
      )}라고 대답하면 된다고요? 알겠어요!`
    )
  }

  @applicationCommand({
    name: '잊어',
    type: ApplicationCommandType.ChatInput,
    description: 'Forget reaction by Koi_Bot',
  })
  async forgetCommand(
    i: ChatInputCommandInteraction,
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'keyword',
      description: 'Input the command input',
      required: true,
    })
    keyword: string
  ) {
    const answers: ConversationItem[] = messageList.filter((message) =>
      message.id.includes(keyword)
    )

    if (answers.length == 0) {
      await i.reply('배운적도 없는 말이야...!')
      return
    }

    for (let i = 0; i < messageList.length; i++) {
      if (messageList[i].id === keyword) {
        messageList.splice(i, 1)
      }
    }

    const dataDB: KoiDB = {
      conversations: messageList,
    }
    const dataJSON = JSON.stringify(dataDB)

    fs.writeFileSync('./resources/conversation-data.json', dataJSON)
    await i.reply(`${keyword} ${end_check(keyword, '이')}라는게 뭐죠?`)
  }

  @applicationCommand({
    name: '안녕',
    type: ApplicationCommandType.ChatInput,
    description: 'Test command',
  })
  async ping(i: ChatInputCommandInteraction) {
    await i.reply('Hello, KOI3125!')
  }

  @ownerOnly
  @applicationCommand({
    name: 'stop',
    type: ApplicationCommandType.ChatInput,
    description: "Developer's command",
  })
  async stop(i: ChatInputCommandInteraction) {
    await i.reply('코이 사라질게...')
    process.exit()
  }
}

export const setup = async () => {
  return new HelloExtension()
}
