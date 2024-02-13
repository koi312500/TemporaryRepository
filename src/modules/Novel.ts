import { Extension, applicationCommand, option } from '@pikokr/command.ts'
import axios from 'axios'
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js'

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
  async novelsearch(
    i: ChatInputCommandInteraction,
    @option({
      type: ApplicationCommandOptionType.String,
      name: 'title',
      description: 'Input the novel name',
      required: false,
    })
    title: string
  ) {
    await i.deferReply()
    let novelNow: NovelItem
    try {
      const { data } = await axios.get<NovelItem[]>(
        'https://muvel.kimustory.net/api/novels' +
          (title ? `?title=${title}` : '')
      )
      novelNow = data[0]
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return i.editReply(
          'API 통신 오류입니다. 잠시후 다시 시도해 주시기 바랍니다.'
        )
      }
      this.logger.error(error)
      return i.editReply(`오류가 발생했습니다. :(`)
    }
    if (!novelNow) {
      return i.editReply('해당하는 소설이 없습니다.')
    }

    const novelEmbed = new EmbedBuilder()
      .setColor(0x0ab1c2)
      .setTitle(`소설 검색 : ${novelNow.title}`)
      .setThumbnail(`${novelNow.thumbnail} `)
      .addFields(
        { name: '소설 설명', value: `${novelNow.description} ` },
        { name: '소설 작가', value: `${novelNow.author.username} ` },
        { name: 'CreatedAt', value: `${novelNow.createdAt} ` },
        { name: 'UpdateAt', value: `${novelNow.updatedAt} ` }
      )
      .setFooter({ text: 'Result of command /뮤블검색' })

    await i.editReply({ embeds: [novelEmbed] })
  }
}

export const setup = async () => {
  return new NovelExtension()
}
