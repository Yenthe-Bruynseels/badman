// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import {
  BvlRankingCalc,
  DataBaseHandler,
  getSystemCalc,
  LastRankingPlace,
  logger,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystems,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Transaction } from 'sequelize';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  let transaction = null;

  try {
    const sourceSystem = await RankingSystem.findOne({
      where: {
        name: 'BBF Rating',
      },
      transaction,
    });

    // await RankingSystem.destroy({
    //   where: {
    //     name: {
    //       [Op.not]: 'BBF Rating',
    //     },
    //   },
    //   cascade: true,
    //   transaction,
    // });

    const groups = await sourceSystem.getGroups();


    const system78weeks15games = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '79769246-5a55-4b7e-bd17-ca9ed6a13fb3',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 15 games',
      latestXGamesToUse: 15,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system78weeks20games = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'd8a7a9f2-5f93-4884-83ef-6632da1dae2c',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 20 games',
      latestXGamesToUse: 20,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });


    const system78weeks25games = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'd36581a8-bcd3-48d1-98f2-fd1b9adf46f3',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system78weeks15games1down = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'c327aff1-a0ba-498a-9e7b-202b1da04c65',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 15 games - max 1 down',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
    });

    
    const system78weeks20games1down = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '2688df19-027a-4776-a62b-9deca0cd7952',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 20 games - max 1 down',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
    });

        
    const system78weeks25games1down = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'e60543e9-2b9b-424d-893a-09d37d624ed8',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games - max 1 down',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
    });



    const system78weeksAllGames = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'fb85f869-e6b3-454a-88f3-eae30a619edb',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks',
      primary: false,
      periodUnit: 'weeks',
      periodAmount: 78,
      maxLevelUpPerChange: 1,
      maxLevelDownPerChange: 1,
    });

    // const targets = [
    //   system78weeks15games,
    //   system78weeks20games,
    //   system78weeks25games,
    //   system78weeks15games1down,
    //   system78weeks20games1down,
    //   system78weeks25games1down,
    //   system78weeksAllGames
    // ];
    const targets = [system78weeksAllGames];

    for (const targetSystem of targets) {
      logger.info(`Calculating ${targetSystem.name}`);
      transaction = await DataBaseHandler.sequelizeInstance.transaction();

      // Destroy old
      await destroySystem(targetSystem);

      // Create new
      const resultSystem = await RankingSystem.create(
        {
          ...targetSystem.toJSON(),
        },
        { transaction }
      );

      // Set groups
      await resultSystem.setGroups(groups, { transaction });

      await copyPlaces(transaction, sourceSystem, resultSystem);
      await calulateLastPlace(transaction, resultSystem);
      await transaction.commit();
    }
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();

async function destroySystem(system: RankingSystem) {
  await RankingSystem.destroy({
    where: {
      id: system.id,
    },
    cascade: true,
  });

  await RankingPlace.destroy({
    where: {
      SystemId: system.id,
    },
    cascade: true,
  });

  await RankingPoint.destroy({
    where: {
      SystemId: system.id,
    },
    cascade: true,
  });

  await LastRankingPlace.destroy({
    where: {
      systemId: system.id,
    },
    cascade: true,
  });
}

async function calulateLastPlace(
  transaction: Transaction,
  newSystem: RankingSystem
) {
  const lastUpdate = moment();
  const originalStart = lastUpdate
    .clone()
    .subtract(newSystem.period.amount, newSystem.period.unit)
    .toDate();
  const originalEnd = lastUpdate.toDate();
  const calculator = getSystemCalc(newSystem) as BvlRankingCalc;

  const players = await calculator['getPlayersAsync'](
    originalStart,
    originalEnd,
    transaction
  );
  await calculator['_calculateRankingPlacesAsync'](
    originalStart,
    originalEnd,
    players,
    true,
    transaction
  );
}

async function copyPlaces(
  transaction: Transaction,
  sourceSystem: RankingSystem,
  newSystem: RankingSystem
) {
  newSystem.caluclationIntervalLastUpdate =
    sourceSystem.caluclationIntervalLastUpdate;
  newSystem.updateIntervalAmountLastUpdate =
    sourceSystem.updateIntervalAmountLastUpdate;
  await newSystem.save({ transaction });

  const queryPlaces = `
  INSERT INTO "ranking"."Places" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, "SystemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, '${newSystem.id}' as "SystemId"   
  FROM "ranking"."Places" 
  WHERE "SystemId" = '${sourceSystem.id}'
`;

  await DataBaseHandler.sequelizeInstance.query(queryPlaces, { transaction });
  logger.debug('Copied places');

  const queryLastPlaces = `
  INSERT INTO "ranking"."LastPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, '${newSystem.id}' as "systemId"   
  FROM "ranking"."LastPlaces" 
  WHERE "systemId" = '${sourceSystem.id}'
`;

  await DataBaseHandler.sequelizeInstance.query(queryLastPlaces, {
    transaction,
  });
  logger.debug('Copied LastPlaces');

  const queryPoints = `
  INSERT INTO "ranking"."Points" (id, points, "rankingDate", "differenceInLevel", "playerId", "GameId", "createdAt", "updatedAt", "SystemId" )
  SELECT gen_random_uuid() as id, points, "rankingDate", "differenceInLevel", "playerId", "GameId", "createdAt", "updatedAt", '${newSystem.id}' as "SystemId"
  FROM "ranking"."Points" 
  WHERE "SystemId" = '${sourceSystem.id}'
`;

  await DataBaseHandler.sequelizeInstance.query(queryPoints, { transaction });
  logger.debug('Copied Points');
}
