import axios from 'axios'
import { Extension, applicationCommand, listener, option } from '@pikokr/command.ts'
import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, EmbedBuilder, Message} from 'discord.js'

interface AuthorItem {
  id: string
  username: string
  avatar: string
  novelIds: string[]
}

interface NovelItem {
  tag: []
  id: string
  title: string
  description: string
  thumbnail: string
  createdAt: string
  updatedAt: string
  author: AuthorItem
  episodeIds: string[]
}

class NovelExtension extends Extension {
  @applicationCommand({
    name: '뮤블검색',
    type: ApplicationCommandType.ChatInput,
    description: 'Search novel at muvel',
  })
  async novelsearchc(
    i: ChatInputCommandInteraction, 
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'title',
      description: 'Input the novel name',
      required: false,
    })
    title: string) {
    var URL = `https://muvel.kimustory.net/api/novels`
    if(title){
        URL = URL + '?title=' + title
    }
    var novelNow!: NovelItem;
    try{
      const {data} = await axios.get<NovelItem[]>(URL)
      novelNow = data[0]
    } catch (error){
        console.log(error)
        return
    }
    console.log(novelNow.author)
    const novelEmbed = new EmbedBuilder()
      .setColor(0x0ab1c2)
      .setTitle(`소설 검색 : ${novelNow.title}`)
      .setThumbnail(`${novelNow.thumbnail}`)
      .addFields(
        { name: '소설 설명', value : `${novelNow.description}`},
        { name: '소설 작가', value : `${novelNow.author.username}`},
        { name: 'CreatedAt', value : `${novelNow.createdAt}`},
        { name: 'UpdateAt', value: `${novelNow.updatedAt}`}
      )
      .setFooter({ text: 'Result of command /뮤블검색'})

    await i.reply({embeds : [novelEmbed]})
  }

}

export const setup = async () => {
  return new NovelExtension()
}
