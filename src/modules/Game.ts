import { Extension, applicationCommand, option, CommandClient, ComponentHookFn, createComponentHook} from '@pikokr/command.ts'
import { ActionRowBuilder, ApplicationCommandOptionType, ApplicationCommandType, BaseInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, Interaction, Message} from 'discord.js'
import { UserDB } from "../../entities/UserDB"
import AppDataSource from "../index"

const cooldown = new Set()
const continunityCooldown = new Set()

export const createCheckDecorator = (fn: ComponentHookFn<[CommandClient, Interaction | Message]>) => createComponentHook('beforeCall', fn)
export const registerOnly = createCheckDecorator(async (client: CommandClient, i: Interaction | Message) => {
  let isRegistered = false
  const userRepository = AppDataSource.getRepository(UserDB)
  
  if (i instanceof BaseInteraction) {
    client
    isRegistered = await userRepository.findOneBy({id: i.user.id,}) != null
  } else if (i instanceof Message) {
    isRegistered = await userRepository.findOneBy({id: i.author.id,}) != null
  }

  if (!isRegistered){
    if(i.channel){
      i.channel.send("등록이 된걸까....?")
    }
    throw "registerOnlyError"
  }
})

class GameExtension extends Extension {
  @applicationCommand({
    name: '등록',
    type: ApplicationCommandType.ChatInput,
    description: 'Register user to Koi_Bot',
  })
  async registerCommand(
    i: ChatInputCommandInteraction,
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'nickname',
      description: 'Your nickname to Koi_Bot',
      required: true,
    })
    name: string,) {
    const userRepository = AppDataSource.getRepository(UserDB)
    const nowUser = await userRepository.findOneBy({
      id: i.user.id,
    })
    if(nowUser != null){
      return i.reply("이미 등록을 마치셨어요!")
    }
    const user = new UserDB()
    user.id = i.user.id
    user.name = name
    user.money = 0

    await userRepository.save(user)
    await i.reply("Register complete!")
  }

  @registerOnly
  @applicationCommand({
    name: '출석',
    type: ApplicationCommandType.ChatInput,
    description: 'Daily attendace',
  })
  async attendanceCommand(i: ChatInputCommandInteraction){
    const userRepository = AppDataSource.getRepository(UserDB)
    const nowUser = await userRepository.findOneBy({
      id: i.user.id,
    })
    if(!nowUser)
      return i.reply("먼가 이상한데")

    if(cooldown.has(nowUser.id)){
      return i.reply("이 명령어는 23시간마다 사용할 수 있어요! 기다려 주세요!")
    }

    if(continunityCooldown.has(nowUser.id)){
      nowUser.money += 150
      await i.reply(`현재 연속 출석중! 100 + 50코인을 획득해서 현재 ${nowUser.money}코인을 가지고 있어요!`)
      continunityCooldown.delete(nowUser.id)
    }
    else{ 
      nowUser.money += 100
      await i.reply(`100코인을 획득해서 현재 ${nowUser.money}코인을 가지고 있어요!`)
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
    amount: number,){
    
    const sleep = async (ms:number) => await new Promise(r => setTimeout(r,ms)); 
    const userRepository = AppDataSource.getRepository(UserDB)
    const nowUser = await userRepository.findOneBy({
      id: i.user.id,
    })
    if(!nowUser)
      return i.reply("먼가 이상한데")

    if(nowUser.money < amount)
      return i.reply("돈 없으면서 사기치지 마라")

    nowUser.money -= amount

    const nowEmbed = new EmbedBuilder()
      .setColor(0x0ab1c2)
      .setTitle(`창업 - 기업 : ${companyName}`)
      .setDescription("현재 턴 수 : 0")
      .setTimestamp()
      .setFooter({text: `${i.user.username}님의 '/창업' 명령어`})
    
    await i.reply({embeds: [nowEmbed]})
    
    const continueButton = new ButtonBuilder()
			.setCustomId('continue')
			.setLabel('Game Continue')
			.setStyle(ButtonStyle.Primary)
    
    const stopButton = new ButtonBuilder()
			.setCustomId('stop')
			.setLabel('Stop')
			.setStyle(ButtonStyle.Danger)
    
    const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(continueButton, stopButton)
    
    const startCoin = amount
    let turn = 0
    while (amount > 10){
      amount = amount - 5
      const opt = Math.random() * 100
      let earn = Math.random()
      if (opt <= 5){
        earn = -100
        nowEmbed.setFields({name : "파산", value : `모든 돈을 잃어 버렸다! (${earn}%)`})
      }
      else if (opt <= 25){
        earn = Math.round(-(10 + earn * 20))
        nowEmbed.setFields({name : "손해를 봤다...", value : `돈을 크게 잃었다! (${earn}%)`})
      }
      else if (opt <= 75){
        earn = Math.round(-5 + earn * 10)
        nowEmbed.setFields({name : "무난한 순황", value : `크게 변화는 없다.. (${earn}%)`})
      }
      else if (opt <= 95){
        earn = Math.round(10 + earn * 20)
        nowEmbed.setFields({name : "좋은 일이 생겼다!", value : `돈을 크게 벌었다! (${earn}%)`})
      }
      else if (opt <= 99.5){
        earn = Math.round(100 + earn * 100)
        nowEmbed.setFields({name : "대박이야!!!!", value : `돈을 엄청 크게 벌었다! (${earn}%)`})
      }
      else{
        earn = 500
        nowEmbed.setFields({name : "초대박이야!!!!", value : `테O라...?? (${earn}%)`})
      }
      amount = Math.round(amount + amount * earn / 100)
      turn = turn + 1
      nowEmbed.setDescription(`현재 턴 수 : ${turn}`)
      nowEmbed.addFields({name: '보유 자금', value : `${amount}코인 (초기 투자금 : ${startCoin}코인 / 유지비 5코인)`})
      try {
        const msg = await i.editReply({embeds : [nowEmbed], components: [row]})
        const collectorFilter = (msg:ButtonInteraction) => msg.user.id === i.user.id;
        try {
          const confirmation = await msg.awaitMessageComponent({ filter: collectorFilter, componentType: ComponentType.Button, time: 10_000 });
          if(confirmation.customId === 'stop'){
            await confirmation.update({content: "게임이 종료되었습니다.", embeds : [nowEmbed], components: []})
            nowUser.money += amount
            userRepository.save(nowUser)
            return
          }
          else{
            await confirmation.update({})
          }
        } catch (e) {
          await i.editReply({content: "반응이 감지되지 않아, 게임이 종료되었습니다.", embeds : [nowEmbed], components: []})
          nowUser.money += amount
          userRepository.save(nowUser)
          return
        }
      } catch (e){
        await i.channel!.send(`${i.user} 메세지가 삭제된거 가타...! 너 혹시 돈 날려서 삭제한건... 아니지?\n메세지를 삭제하면 초기자금만 날라가니까 참고해...!`)
        userRepository.save(nowUser)
        return
      }
    }
    await i.editReply({content: "자본이 10코인 이하로 남아, 게임이 종료되었습니다.", embeds : [nowEmbed], components: []})
    nowUser.money += amount
    userRepository.save(nowUser)
  }
}


export const setup = async () => {
  return new GameExtension()
}
