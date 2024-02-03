import { config } from './config'
import { CustomizedCommandClient } from './structures'
import { Client } from 'discord.js'
import "reflect-metadata"
import { UserEntity } from './entities/UserEntity'
import { DataSource } from 'typeorm'

const client = new Client({
  intents: ['Guilds', 'DirectMessages', 'GuildMessages', 'MessageContent'],
})

const cts = new CustomizedCommandClient(client)

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "userDB.sql",
  entities: [UserEntity],
  synchronize: true,
  logging: false
})

const start = async () => {
  await AppDataSource.initialize()

  await cts.setup()

  await client.login(config.token)

  await cts.getApplicationCommandsExtension()?.sync()
}

start().then()
