import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity()
export class UserEntity {
  @PrimaryColumn()
  id!: string

  @Column('string')
  name = ''

  @Column('int')
  money = 0
}
