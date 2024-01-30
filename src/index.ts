import { config } from './config'
import { CustomizedCommandClient } from './structures'
import { Client } from 'discord.js'
import "reflect-metadata"
import { UserDB } from '../entities/UserDB'
import { DataSource } from 'typeorm'

const client = new Client({
  intents: ['Guilds', 'DirectMessages', 'GuildMessages', 'MessageContent'],
})

const cts = new CustomizedCommandClient(client)

const start = async () => {
  await cts.setup()

  await client.login(config.token)

  await cts.getApplicationCommandsExtension()?.sync()
}

const AppDataSource = new DataSource({
  type: "sqlite",
  database: "userDB.sql",
  entities: [UserDB],
  synchronize: true,
  logging: false
})

AppDataSource.initialize()
    .then(() => {
        // here you can start to work with your database
    })
    .catch((error) => console.log(error))

export default AppDataSource
start().then()
