import { UserEntity } from '../entities/UserEntity'
import { AppDataSource } from '../index'
import {
  Extension,
  applicationCommand,
  createCheckDecorator,
  option,
} from '@pikokr/command.ts'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  BaseInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  DiscordAPIError,
  EmbedBuilder,
  Interaction,
  Message,
  User,
} from 'discord.js'
import fs from 'fs'

const cooldown = new Set<string>()
const continunityCooldown = new Set<string>()

interface CompanyOutputItem {
  type: string
  name: string
  output: string[]
}

interface CompanyOutputDB {
  companyOutputs: CompanyOutputItem[]
}

enum companyType {
  BANKRUPTCY = '0',
  LOSS = '1',
  NORMAL = '2',
  PROFIT = '3',
  BIGPROFIT = '4',
  VERYBIGPROFIT = '5',
}

const companyOutputJson = fs.readFileSync(
  './resources/company-data.json',
  'utf8'
)
const companyOutputData: CompanyOutputDB = JSON.parse(companyOutputJson)
const companyOutputList = companyOutputData.companyOutputs
const userRepository = AppDataSource.getRepository(UserEntity)

export const registerOnly = createCheckDecorator(
  async (_, i: Interaction | Message) => {
    let koiUser: User
    if (i instanceof BaseInteraction)
      if (i.isChatInputCommand()) koiUser = i.user
      else throw new Error('registerOnlyError')
    else if (i instanceof Message) koiUser = i.author
    else throw new Error('registerOnlyError')

    if (await userRepository.existsBy({ id: koiUser.id })) return

    const nowEmbed = new EmbedBuilder()
      .setColor(0x0ab1c2)
      .setTitle('Koi_Bot 등록')
      .setDescription(
        `${koiUser.username}님은 현재 Koi_Bot에 등록되지 않았습니다.`
      )
      .setFields(
        {
          name: '상태',
          value: `${koiUser.username}께서는 현재 Koi_Bot에 가입 및 약관 동의를 하지 않으셨기 때문에, 기능을 사용하실 수 없습니다.`,
        },
        {
          name: '약관',
          value: `Koi_Bot을 사용하시면서, 발생하는 모든 메세지 기록이 특별한 명시 없이 저장되는 것이 허용됩니다.
      Koi_Bot에 당신의 Discord Nickname, ID가 제공됩니다.`,
        },
        {
          name: 'How to agree',
          value: `아래의 ⭕ 을 눌러 약관에 동의하고, 다양한 기능들을 사용해 보세요!`,
        }
      )
      .setTimestamp()
      .setFooter({ text: `${koiUser.username}님의 약관 동의 Embed` })

    const continueButton = new ButtonBuilder()
      .setCustomId('accepted')
      .setEmoji('⭕')
      .setLabel('동의합니다.')
      .setStyle(ButtonStyle.Primary)

    const stopButton = new ButtonBuilder()
      .setCustomId('notaccepted')
      .setEmoji('✖️')
      .setLabel('동의하지 않습니다.')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      continueButton,
      stopButton
    )

    const msg = await i.reply({ embeds: [nowEmbed], components: [row] })
    try {
      const collectorFilter = (msg: ButtonInteraction) =>
        msg.user.id === koiUser.id
      const confirmation = await msg.awaitMessageComponent({
        filter: collectorFilter,
        componentType: ComponentType.Button,
        time: 30_000,
      })
      if (confirmation.customId === 'accepted') {
        await confirmation.update({
          content: '약관을 동의하셨습니다! 명령어를 다시 사용해 주세요!',
          embeds: [],
          components: [],
        })
        const user = new UserEntity()
        user.id = koiUser.id
        user.name = koiUser.username

        await userRepository.save(user)
      } else {
        await confirmation.update({
          content: '약관에 동의하지 않으셨습니다.',
          embeds: [],
          components: [],
        })
      }
    } catch (err) {
      await msg.edit({
        content: '반응이 감지되지 않아, 약관 동의 처리가 되지 않았습니다.',
        embeds: [],
        components: [],
      })
    }
    throw new Error('registerOnlyError')
  }
)

class GameExtension extends Extension {
  @registerOnly
  @applicationCommand({
    name: '출석',
    type: ApplicationCommandType.ChatInput,
    description: 'Daily attendace',
  })
  async attendanceCommand(i: ChatInputCommandInteraction) {
    await i.deferReply()
    const nowUser = await userRepository.findOneBy({
      id: i.user.id,
    })
    if (!nowUser) return i.editReply('먼가 이상한데')

    if (cooldown.has(nowUser.id))
      return i.editReply(
        '이 명령어는 23시간마다 사용할 수 있어요! 기다려 주세요!'
      )

    if (continunityCooldown.has(nowUser.id)) {
      nowUser.money += 150
      await i.editReply(
        `현재 연속 출석중! 100 + 50코인을 획득해서 현재 ${nowUser.money}코인을 가지고 있어요!`
      )
      continunityCooldown.delete(nowUser.id)
    } else {
      nowUser.money += 100
      await i.editReply(
        `100코인을 획득해서 현재 ${nowUser.money}코인을 가지고 있어요!`
      )
    }
    await userRepository.save(nowUser)

    cooldown.add(nowUser.id)
    setTimeout(() => {
      cooldown.delete(nowUser.id)
    }, 3600000 * 23)
    continunityCooldown.add(nowUser.id)
    setTimeout(() => {
      continunityCooldown.delete(nowUser.id)
    }, 3600000 * 48)
  }

  @registerOnly
  @applicationCommand({
    name: '창업',
    type: ApplicationCommandType.ChatInput,
    description: 'Make your company and earn money!',
  })
  async companyCommand(
    i: ChatInputCommandInteraction,
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'companyname',
      description: 'Your company name',
      required: true,
    })
    companyName: string,
    @option({
      type: ApplicationCommandOptionType.Integer,
      name: 'amount',
      description: 'Company starting money',
      required: true,
    })
    startCoin: number
  ) {
    await i.deferReply()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nowUser = (await userRepository.findOneBy({
      id: i.user.id,
    }))!

    if (nowUser.money < startCoin)
      return i.editReply('돈 없으면서 사기치지 마라')

    if (nowUser.money <= 10)
      return i.editReply('초기 자본은 10코인을 초과해야 해..')

    nowUser.money -= startCoin
    userRepository.save(nowUser)

    const nowEmbed = new EmbedBuilder()
      .setColor(0x0ab1c2)
      .setTitle(`창업 - 기업 : ${companyName}`)
      .setDescription('현재 턴 수 : 0')
      .setTimestamp()
      .setFooter({ text: `${i.user.username}님의 '/창업' 명령어` })

    const continueButton = new ButtonBuilder()
      .setCustomId('continue')
      .setLabel('Game Continue')
      .setStyle(ButtonStyle.Primary)

    const stopButton = new ButtonBuilder()
      .setCustomId('stop')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      continueButton,
      stopButton
    )

    let amount = startCoin
    let turn = 0
    while (amount > 10) {
      amount = amount - 5
      const opt = Math.random() * 100
      let earn = Math.random(),
        type: string
      if (opt <= 5) {
        type = companyType.BANKRUPTCY
        earn = -100
      } else if (opt <= 25) {
        type = companyType.LOSS
        earn = Math.round(-(10 + earn * 20))
      } else if (opt <= 75) {
        type = companyType.NORMAL
        earn = Math.round(-5 + earn * 10)
      } else if (opt <= 95) {
        type = companyType.PROFIT
        earn = Math.round(10 + earn * 20)
      } else if (opt <= 99.5) {
        type = companyType.BIGPROFIT
        earn = Math.round(100 + earn * 100)
      } else {
        type = companyType.VERYBIGPROFIT
        earn = 500
      }
      amount = Math.round(amount + (amount * earn) / 100)
      turn = turn + 1

      const answerList = companyOutputList.find(
        (message) => message.type == type
      )?.output
      const answerTitle = companyOutputList.find(
        (message) => message.type == type
      )?.name
      const answer = answerList
        ? answerList[Math.floor(Math.random() * answerList.length)]
        : ''
      nowEmbed.setFields(
        { name: `${answerTitle}`, value: `${answer} (${earn}%)` },
        {
          name: '보유 자금',
          value: `${amount}코인 (초기 투자금 : ${startCoin}코인 / 유지비 5코인)`,
        }
      )
      nowEmbed.setDescription(`현재 턴 수 : ${turn}`)

      try {
        const msg = await i.editReply({ embeds: [nowEmbed], components: [row] })
        try {
          const collectorFilter = (msg: ButtonInteraction) =>
            msg.user.id === i.user.id
          const confirmation = await msg.awaitMessageComponent({
            filter: collectorFilter,
            componentType: ComponentType.Button,
            time: 30_000,
          })
          if (confirmation.customId === 'stop') {
            await confirmation.update({
              content: '게임이 종료되었습니다.',
              embeds: [nowEmbed],
              components: [],
            })
            nowUser.money += amount
            userRepository.save(nowUser)
            return
          } else {
            await confirmation.update({})
          }
        } catch (err) {
          nowUser.money += amount
          userRepository.save(nowUser)
          await i.editReply({
            content: '반응이 감지되지 않아, 게임이 종료되었습니다.',
            embeds: [nowEmbed],
            components: [],
          })
          return
        }
      } catch (err) {
        if (err instanceof DiscordAPIError)
          return i.channel?.send(
            `${i.user} 메세지가 삭제된거 가타...! 너 혹시 돈 날려서 삭제한건... 아니지?\n메세지를 삭제하면 초기자금만 날라가니까 참고해...!`
          )
        else return i.channel?.send(`알 수 없는 오류가 발생했습니다!\n${err}`)
      }
    }
    nowUser.money += amount
    userRepository.save(nowUser)
    await i.editReply({
      content: '자본이 10코인 이하로 남아, 게임이 종료되었습니다.',
      embeds: [nowEmbed],
      components: [],
    })
  }
}

export const setup = async () => {
  return new GameExtension()
}
