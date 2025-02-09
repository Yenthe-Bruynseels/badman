import { Player, RankingPlace } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UpdateRankingService {
  private readonly _logger = new Logger(UpdateRankingService.name);

  constructor(private _sequelize: Sequelize) {}

  async processFileUpload(
    data: MembersRolePerGroupData[],
    options: {
      updateCompStatus?: boolean | string;
      removeAllRanking?: boolean | string;
      updateRanking?: boolean | string;
      rankingDate?: Date;
      rankingSystemId?: string;
    } = {
      updateCompStatus: false,
      removeAllRanking: false,
    }
  ) {
    if (!options.rankingDate) {
      throw new Error('Ranking date is required');
    } else if (!options.rankingSystemId) {
      throw new Error('Ranking system id is required');
    } else if (!data || data.length == 0) {
      throw new Error('No data to process');
    }

    // Filter out douplicates and keep the lowest value (best)
    data = data.reduce((acc, member) => {
      const existingMember = acc.find((m) => m.memberId === member.memberId);
      if (!existingMember) {
        acc.push(member);
      } else {
        this._logger.warn(`Duplicate member found: ${member.memberId}`);
        const currentIndex = acc.indexOf(existingMember);
        // the latest startDate is the one we need
        if (moment(member.startDate).isAfter(existingMember.startDate)) {
          acc[currentIndex] = member;
        }

        // else use the lowest ranking of single, double and mixed
        if (
          Math.min(member.single, member.doubles, member.mixed) <
          Math.min(
            existingMember.single,
            existingMember.doubles,
            existingMember.mixed
          )
        ) {
          acc[currentIndex] = member;
        }
      }
      return acc;
    }, [] as MembersRolePerGroupData[]);

    const transaction = await this._sequelize.transaction();
    try {
      this._logger.log('Start processing export members role per group');
      const dataPlayers = await Player.findAll({
        attributes: ['id', 'memberId', 'competitionPlayer', 'gender'],
        where: {
          memberId: data.map((d) => d.memberId),
        },
        transaction,
      });

      // distinct players
      const distinctPlayers = dataPlayers.filter(
        (p, i, a) => a.findIndex((t) => t.memberId === p.memberId) === i
      );

      // Update comp status
      this._logger.debug(
        `Update competition status: ${options.updateCompStatus}`
      );
      if (
        options.updateCompStatus == true ||
        options.updateCompStatus == 'true'
      ) {
        const newCompPlayers = distinctPlayers?.filter(
          (p) => p.competitionPlayer == false
        );

        const removedCompPlayers = await Player.findAll({
          attributes: ['id', 'memberId', 'competitionPlayer'],
          where: {
            memberId: {
              [Op.notIn]: data.map((d) => d.memberId),
            },
            competitionPlayer: true,
          },
          transaction,
        });

        await this.setCompetitionStatus(
          newCompPlayers.map((p) => p.id),
          true,
          transaction
        );
        await this.setCompetitionStatus(
          removedCompPlayers.map((p) => p.id),
          false,
          transaction
        );
      }

      // Remove all ranking
      this._logger.debug(`Remove all ranking: ${options.removeAllRanking}`);
      if (
        options.removeAllRanking == true ||
        options.removeAllRanking == 'true'
      ) {
        await RankingPlace.destroy({
          where: {
            playerId: distinctPlayers.map((p) => p.id) ?? [],
            rankingDate: options.rankingDate,
            systemId: options.rankingSystemId,
          },
          transaction,
        });
      }

      // Update ranking
      this._logger.debug(`Update ranking: ${options.updateRanking}`);

      if (options.updateRanking == true || options.updateRanking == 'true') {
        const places = await RankingPlace.findAll({
          attributes: [
            'id',
            'playerId',
            'systemId',
            'rankingDate',
            'single',
            'singlePoints',
            'double',
            'doublePoints',
            'mix',
            'mixPoints',
          ],
          where: {
            playerId: distinctPlayers?.map((p) => p.id) ?? [],
            rankingDate: options.rankingDate,
            systemId: options.rankingSystemId,
          },
          transaction,
        });

        this._logger.debug(`Found ${places.length} places`);
        const toUpdate: RankingPlace[] = [];

        for (const d of data) {
          const player = distinctPlayers.find((p) => p.memberId === d.memberId);
          if (!player) {
            continue;
          }
          let place = places.find((p) => p?.playerId === player.id);

          if (!place) {
            if (!options.removeAllRanking) {
              this._logger.verbose(
                `Create new ranking place for player: ${player.id}`
              );
            }

            place = new RankingPlace();
            place.playerId = player.id;
            place.rankingDate = options.rankingDate;
            place.systemId = options.rankingSystemId;
          }

          place.single = d.single || place.single;
          place.singlePoints = d.singlePoints || place.singlePoints;
          place.double = d.doubles || place.double;
          place.doublePoints = d.doublesPoints || place.doublePoints;
          place.mix = d.mixed || place.mix;
          place.mixPoints = d.mixedPoints || place.mixPoints;

          toUpdate.push(place);
        }

        this._logger.debug(`Update ${toUpdate.length} places`);

        await RankingPlace.bulkCreate(
          toUpdate?.map((p) => p.toJSON()),
          {
            updateOnDuplicate: [
              'single',
              'double',
              'mix',
              'singlePoints',
              'doublePoints',
              'mixPoints',
            ],
            transaction,
          }
        );
      }

      this._logger.debug('Commit transaction');
      await transaction.commit();
      this._logger.log('End processing export members role per group');
    } catch (error) {
      this._logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  // set competition status
  async setCompetitionStatus(
    idd: string[],
    status: boolean,
    transaction?: Transaction
  ) {
    transaction = transaction || (await this._sequelize.transaction());

    this._logger.verbose(
      `Set competition status: ${status}, amount: ${idd.length}`
    );

    if (idd.length === 0) {
      return;
    }

    const players = await Player.findAll({
      where: {
        id: idd,
      },
      transaction,
    });

    if (players.length === 0) {
      return;
    }

    for (const player of players) {
      player.competitionPlayer = status;
      await player.save({ transaction });
    }
  }
}

export interface MembersRolePerGroupData {
  memberId: string;
  startDate: string;
  firstName: string;
  lastName: string;
  role: string;
  single: number;
  singlePoints: number;
  doubles: number;
  doublesPoints: number;
  mixed: number;
  mixedPoints: number;
}
