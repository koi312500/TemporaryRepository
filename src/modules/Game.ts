import axios from 'axios'
import { Extension, applicationCommand, listener, option, CommandClient, ComponentHookFn, createComponentHook, OwnerOnlyError } from '@pikokr/command.ts'
import { ApplicationCommandOptionType, ApplicationCommandType, BaseInteraction, ChatInputCommandInteraction, EmbedBuilder, Interaction, Message, User} from 'discord.js'
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

    
    cooldown.add(nowUser.id)
      setTimeout(() => {
        cooldown.delete(nowUser.id)
      }, 3600000 * 23)
    continunityCooldown.add(nowUser.id)
      setTimeout(() => {
        continunityCooldown.delete(nowUser.id)
      }, 3600000 * 48)
  }
}



export const setup = async () => {
  return new GameExtension()
}
