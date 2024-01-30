import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class UserDB {
    @PrimaryGeneratedColumn()
    id!: string

    @Column()
    name: string = "";

    @Column("int")
    money: number = 0
}