/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'infoEvents',
          {
            type: sequelize.DataTypes.JSON,
            allowNull: true,
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'infoEvents',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
