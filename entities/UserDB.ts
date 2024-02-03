import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class UserDB {
    @PrimaryColumn()
    id!: string

    @Column()
    name: string = "";

    @Column("int")
    money: number = 0
}