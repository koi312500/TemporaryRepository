import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity()
export class UserEntity {
  @PrimaryColumn()
  id!: string

  @Column('text')
  name = ''

  @Column('int')
  money = 0
}
