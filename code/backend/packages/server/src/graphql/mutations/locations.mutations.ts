import {
  ApiError,
  AuthenticatedRequest,
  Availability,
  canExecute,
  DataBaseHandler,
  Location,
  logger
} from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLNonNull } from 'graphql';
import { AvailabilityInputType, AvailabilityType, LocationInputType, LocationType } from '../types';

export const addLocationMutation = {
  type: LocationType,
  args: {
    location: {
      name: 'Location',
      type: new GraphQLNonNull(LocationInputType)
    },
    clubId: {
      name: 'clubId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { location, clubId },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`${clubId}_add:location`, 'edit-any:club'] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const [locationDb, created] = await Location.findOrCreate({
        where: {
          name: location.name,
          clubId
        },
        defaults: location,
        transaction
      });

      if (created) {
        await locationDb.setClub(clubId, { transaction });
      }

      await transaction.commit();
      return locationDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeLocationMutation = {
  type: LocationType,
  args: {
    locationId: {
      name: 'locationId',
      type: GraphQLID
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { locationId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(locationId, { transaction });

      if (!dbLocation) {
        logger.debug('location', { data: dbLocation });
        throw new ApiError({
          code: 404,
          message: 'Location not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`${dbLocation.clubId}_remove:location`, 'edit-any:club']
      });

      await dbLocation.destroy({ transaction });

      await transaction.commit();
      return dbLocation;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateTournamentEventLocationMutation = {
  type: LocationType,
  args: {
    locationId: {
      name: 'locationId',
      type: GraphQLID
    },
    eventId: {
      name: 'eventId',
      type: GraphQLID
    },
    use: {
      name: 'use',
      type: GraphQLBoolean
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { locationId, eventId, use },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(locationId, { transaction });

      if (!dbLocation) {
        throw new ApiError({
          code: 404,
          message: 'location not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`${dbLocation.clubId}_edit:location`, 'edit-any:club']
      });

      if (use) {
        await dbLocation.addEventTournament(eventId, { transaction });
      } else {
        await dbLocation.removeEventTournament(eventId, { transaction });
      }

      await transaction.commit();
      return dbLocation;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateLocationMutation = {
  type: LocationType,
  args: {
    location: {
      name: 'Location',
      type: LocationInputType
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { location },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(location.id, { transaction });

      if (!dbLocation) {
        logger.debug('location', { data: dbLocation });
        throw new ApiError({
          code: 404,
          message: 'Location not found'
        });
      }
      canExecute(context?.req?.user, {
        anyPermissions: [`${dbLocation.clubId}_edit:location`, 'edit-any:club']
      });

      await dbLocation.update(location, { transaction });
      await transaction.commit();
      return dbLocation;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateLocationAvailibiltyMutation = {
  type: AvailabilityType,
  args: {
    availibilty: {
      name: 'Availability',
      type: AvailabilityInputType
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { availibilty },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbAvailability = await Availability.findByPk(availibilty.id, {
        include: [
          {
            model: Location
          }
        ],
        transaction
      });

      if (!dbAvailability) {
        logger.debug('availibilty', { data: dbAvailability });
        throw new ApiError({
          code: 404,
          message: 'Availibilty not found'
        });
      }
      canExecute(context?.req?.user, {
        anyPermissions: [`${dbAvailability.location.clubId}_edit:location`, 'edit-any:club']
      });

      await dbAvailability.update(availibilty, { transaction });
      await transaction.commit();
      return dbAvailability;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const addLocationAvailibiltyMutation = {
  type: AvailabilityType,
  args: {
    availibilty: {
      name: 'Availability',
      type: AvailabilityInputType
    },
    locationId: {
      name: 'locationId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { availibilty, locationId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbLocation = await Location.findByPk(locationId, {
        transaction
      });

      if (!dbLocation) {
        logger.debug('location', { data: dbLocation });
        throw new ApiError({
          code: 404,
          message: 'Location not found'
        });
      }
      canExecute(context?.req?.user, {
        anyPermissions: [`${dbLocation.clubId}_edit:location`, 'edit-any:club']
      });

      const dbAvailability = await Availability.create(
        { ...availibilty, locationId },
        { transaction }
      );

      // await dbLocation.update(location, { transaction });
      await transaction.commit();
      return dbAvailability;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
