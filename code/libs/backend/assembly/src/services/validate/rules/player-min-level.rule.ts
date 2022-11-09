import { SubEventType } from '@badman/backend-database';
import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

export class PlayerMinLevelRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const {
      team,
      single1,
      single2,
      single3,
      single4,
      double1,
      double2,
      double3,
      double4,
      type,
      subEvent,
    } = assembly;

    const errors = [] as ValidationError[];
    let valid = true;

    if (team.teamNumber != 1) {
      for (const player of [
        single1,
        single2,
        single3,
        single4,
        ...double1,
        ...double2,
        ...double3,
        ...double4,
      ]) {
        const ranking = player?.rankingPlaces?.[0];

        if (!ranking) {
          continue;
        }

        if (ranking.single < subEvent.maxLevel) {
          valid = false;
          errors.push({
            message: 'team-assembly.error.player-min-level',
            params: {
              fullName: player?.fullName,
              ranking: ranking.single,
              rankingType: 'single',
            },
          });
        }

        if (ranking.double < subEvent.maxLevel) {
          valid = false;
          errors.push({
            message: 'team-assembly.error.player-min-level',
            params: {
              fullName: player?.fullName,
              ranking: ranking.double,
              rankingType: 'double',
            },
          });
        }

        if (type === SubEventType.MX && ranking.mix < subEvent.maxLevel) {
          valid = false;
          errors.push({
            message: 'team-assembly.error.player-min-level',
            params: {
              fullName: player?.fullName,
              ranking: ranking.mix,
              rankingType: 'mix',
            },
          });
        }
      }
    }

    return {
      valid,
      errors,
    };
  }
}
