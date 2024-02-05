import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class UserEntity {
  @PrimaryColumn()
  id!: string

  @Column()
  name = ''

  @Column('int')
  money = 0
}
