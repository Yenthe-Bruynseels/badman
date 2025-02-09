import { getIndexFromPlayers } from '@badman/utils';
import { NotFoundException } from '@nestjs/common';
import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import moment from 'moment';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  Op,
  SaveOptions,
} from 'sequelize';
import {
  BeforeCreate,
  BeforeUpdate,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import { EntryMetaType } from '../../types';
import { Player } from '../player.model';
import { RankingPlace, RankingSystem } from '../ranking';
import { Team } from '../team.model';
import {
  DrawCompetition,
  EventCompetition,
  SubEventCompetition,
} from './competition';
import { Standing } from './standing.model';
import { DrawTournament, SubEventTournament } from './tournament';
import { Relation } from '../../wrapper';

@Table({
  timestamps: true,
  schema: 'event',
  tableName: 'Entries',
} as TableOptions)
@ObjectType({ description: 'A EventEntry' })
export class EventEntry extends Model {
  constructor(values?: Partial<EventEntry>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @BelongsTo(() => Team, 'teamId')
  team?: Relation<Team>;

  @Column(DataType.DATE)
  @Field(() => Date, { nullable: true })
  date?: Date;

  @ForeignKey(() => Team)
  @Field(() => String, { nullable: true })
  @Column(DataType.UUIDV4)
  teamId?: string;

  @BelongsTo(() => Player, 'player1Id')
  player1?: Relation<Player>;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  player1Id!: string;

  @BelongsTo(() => Player, 'player2Id')
  player2?: Relation<Player>;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  player2Id!: string;

  @BelongsTo(() => SubEventTournament, {
    foreignKey: 'subEventId',
    constraints: false,
  })
  subEventTournament?: Relation<SubEventTournament>;

  /**
   * Draw get's deciede upon draw
   */
  @Field(() => DrawTournament, { nullable: true })
  @BelongsTo(() => DrawTournament, {
    foreignKey: 'drawId',
    constraints: false,
  })
  drawTournament?: Relation<DrawTournament>;

  @Field(() => SubEventCompetition, { nullable: true })
  @BelongsTo(() => SubEventCompetition, {
    foreignKey: 'subEventId',
    constraints: false,
  })
  subEventCompetition?: Relation<SubEventCompetition>;

  /**
   * Draw get's deciede upon draw
   */
  @BelongsTo(() => DrawCompetition, {
    foreignKey: 'drawId',
    constraints: false,
  })
  drawCompetition?: Relation<DrawCompetition>;

  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  subEventId?: string;
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  drawId?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  entryType?: string;

  @HasOne(() => Standing)
  standing?: Standing;

  @Field(() => EntryMetaType, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  meta?: Meta;

  // Belongs to Team
  getTeam!: BelongsToGetAssociationMixin<Team>;
  setTeam!: BelongsToSetAssociationMixin<Team, string>;

  // Belongs to Player1
  getPlayer1!: BelongsToGetAssociationMixin<Player>;
  setPlayer1!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to Player2
  getPlayer2!: BelongsToGetAssociationMixin<Player>;
  setPlayer2!: BelongsToSetAssociationMixin<Player, string>;

  getPlayers() {
    if (this.player1Id && this.player2Id) {
      return Promise.all([this.getPlayer1(), this.getPlayer2()]);
    } else {
      return Promise.all([this.getPlayer1()]);
    }
  }

  // Belongs to TournamentSubEvent
  getSubEventTournament!: BelongsToGetAssociationMixin<SubEventTournament>;
  setSubEventTournament!: BelongsToSetAssociationMixin<
    SubEventTournament,
    string
  >;

  // Belongs to TournamentDraw
  getDrawTournament!: BelongsToGetAssociationMixin<DrawTournament>;
  setDrawTournament!: BelongsToSetAssociationMixin<DrawTournament, string>;

  // Belongs to TournamentSubEvent
  getSubEventCompetition!: BelongsToGetAssociationMixin<SubEventCompetition>;
  setSubEventCompetition!: BelongsToSetAssociationMixin<
    SubEventCompetition,
    string
  >;

  // Belongs to drawCompetition
  getDrawCompetition!: BelongsToGetAssociationMixin<DrawCompetition>;
  setDrawCompetition!: BelongsToSetAssociationMixin<DrawCompetition, string>;

  // Has one Standing
  getStanding!: HasOneGetAssociationMixin<Standing>;
  setStanding!: HasOneSetAssociationMixin<Standing, string>;

  // recalculate competition index
  @BeforeUpdate
  @BeforeCreate
  static async recalculateCompetitionIndex(
    instance: EventEntry,
    options: SaveOptions
  ) {
    if (!instance.changed('meta')) {
      return;
    }

    const dbSubEvent = await instance.getSubEventCompetition({
      attributes: [],
      include: [
        {
          model: EventCompetition,
          attributes: ['season', 'usedRankingUnit', 'usedRankingAmount'],
        },
      ],
    });
    if (!dbSubEvent) {
      throw new NotFoundException(`${SubEventCompetition.name}: event`);
    }

    const dbSystem = await RankingSystem.findOne({
      where: {
        primary: true,
      },
      transaction: options?.transaction,
    });

    if (!dbSystem) {
      throw new NotFoundException(`${RankingSystem.name}: primary`);
    }

    if (!dbSubEvent.eventCompetition) {
      throw new Error('Did not include eventCompetition');
    }

    if (!instance.meta?.competition) {
      // not a competition meta
      return;
    }

    const usedRankingDate = moment();
    usedRankingDate.set('year', dbSubEvent.eventCompetition.season);
    usedRankingDate.set(
      dbSubEvent.eventCompetition.usedRankingUnit,
      dbSubEvent.eventCompetition.usedRankingAmount
    );

    const startRanking = usedRankingDate.clone().set('date', 0);
    const endRanking = usedRankingDate.clone().clone().endOf('month');

    const dbRanking = await RankingPlace.findAll({
      where: {
        playerId: instance.meta?.competition?.players?.map((r) => r.id),
        systemId: dbSystem.id,
        rankingDate: {
          [Op.between]: [startRanking.toDate(), endRanking.toDate()],
        },
        updatePossible: true,
      },
      order: [['rankingDate', 'DESC']],
      transaction: options?.transaction,
    });

    instance.meta.competition.players = instance.meta?.competition.players?.map(
      (r) => {
        const ranking = dbRanking.find((ranking) => ranking.playerId === r.id);
        return {
          ...r,
          single:
            ((r?.single ?? -1) == -1 ? ranking?.single : r?.single) ??
            dbSystem.amountOfLevels,
          double:
            ((r?.double ?? -1) == -1 ? ranking?.double : r?.double) ??
            dbSystem.amountOfLevels,
          mix:
            ((r?.mix ?? -1) == -1 ? ranking?.mix : r?.mix) ??
            dbSystem.amountOfLevels,
        };
      }
    );

    const team = await instance.getTeam();
    instance.meta.competition.teamIndex = getIndexFromPlayers(
      team.type,
      instance.meta?.competition.players
    );
  }
}

@InputType()
export class EventEntryCompetitionPlayerMetaInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => Int, { nullable: true })
  single?: number;

  @Field(() => Int, { nullable: true })
  double?: number;

  @Field(() => Int, { nullable: true })
  mix?: number;

  @Field(() => String, { nullable: true })
  gender?: 'M' | 'F';
}
@InputType()
export class EventEntryCompetitionMetaInput {
  @Field(() => Int, { nullable: true })
  teamIndex?: number;

  @Field(() => [EventEntryCompetitionPlayerMetaInput], { nullable: true })
  players?: EventEntryCompetitionPlayerMetaInput[];
}

@InputType()
export class EventEntryTournamentMetaInput {
  @Field(() => Int, { nullable: true })
  place?: number;
}

@InputType()
export class EventEntryMetaInput {
  @Field(() => EventEntryTournamentMetaInput, { nullable: true })
  tournament?: EventEntryTournamentMetaInput;

  @Field(() => EventEntryCompetitionMetaInput, { nullable: true })
  competition?: EventEntryCompetitionMetaInput;
}

@InputType()
export class EventEntryUpdateInput extends PartialType(
  OmitType(EventEntry, [
    'createdAt',
    'updatedAt',
    'drawCompetition',
    'subEventCompetition',
    'drawTournament',
    'subEventTournament',
    'standing',
    'team',
    'meta',
  ] as const),
  InputType
) {
  @Field(() => EventEntryMetaInput, { nullable: true })
  meta?: EventEntryMetaInput;
}

@InputType()
export class EventEntryNewInput extends PartialType(
  OmitType(EventEntryUpdateInput, ['id'] as const),
  InputType
) {}

export interface Meta {
  tournament?: EntryTournament;
  competition?: EntryCompetition;
}

export interface EntryTournament {
  place?: number;
}

export interface EntryCompetition {
  teamIndex?: number;
  players: EntryCompetitionPlayer[];
}

export interface EntryCompetitionPlayer {
  id?: string;
  single?: number;
  double?: number;
  mix?: number;
  gender?: 'M' | 'F';
  levelException?: boolean;
  player?: Relation<Player>;
}
