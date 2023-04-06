import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { EncounterCompetition } from '../event';
import { Player } from '../player.model';

@Table({
  timestamps: true,
  schema: 'personal',
})
@ObjectType({ description: 'The settings' })
export class Notification extends Model {
  constructor(values?: Partial<Notification>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'sendToId')
  sendTo: Player;

  @Field({ nullable: true })
  @Column
  sendToId: string;

  @Field({ nullable: true })
  @Column
  type: string;

  @Field({ nullable: true })
  @Column
  linkId: string;

  @Field({ nullable: true })
  @Column
  linkType: string;

  @Field(() => EncounterCompetition, { nullable: true })
  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  encounter: EncounterCompetition;

  @Field({ nullable: true, defaultValue: false })
  @Column({ defaultValue: false })
  read: boolean;

  @Field({ nullable: true })
  @Column({
    type: DataType.JSON,
  })
  meta: string;

  // Belongs to Encounter
  getEncounter!: BelongsToGetAssociationMixin<EncounterCompetition>;
  setEncounter!: BelongsToSetAssociationMixin<EncounterCompetition, string>;
}

@InputType()
export class NotificationUpdateInput extends PartialType(
  OmitType(Notification, ['createdAt', 'updatedAt', 'encounter', 'sendTo'] as const),
  InputType
) {}

// @InputType()
// export class NotificationNewInput extends PartialType(
//   OmitType(NotificationUpdateInput, ['id'] as const),
//   InputType
// ) {}
