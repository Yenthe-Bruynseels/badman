import {
  GroupSubEventCompetition,
  GroupSubEventTournament,
  GroupSystems,
  RankingSystem,
  RankingSystemGroup,
  SubEventCompetition,
  SubEventTournament
} from '@badvlasim/shared';

export class SystemGroupBuilder {
  private systemGroup: RankingSystemGroup;

  private systems: string[] = [];
  private subEventTournaments: string[] = [];
  private subEventCompetitions: string[] = [];

  constructor() {
    this.systemGroup = new RankingSystemGroup();
  }

  static Create(): SystemGroupBuilder {
    return new SystemGroupBuilder();
  }

  WithSystem(system: RankingSystem): SystemGroupBuilder {
    this.systems.push(system.id);
    return this;
  }

  WithCompetition(subEventCompetition: SubEventCompetition): SystemGroupBuilder {
    this.subEventCompetitions.push(subEventCompetition.id);
    return this;
  }

  WithTournament(subEventTournament: SubEventTournament): SystemGroupBuilder {
    this.subEventTournaments.push(subEventTournament.id);
    return this;
  }

  async Build() {
    try {
      await this.systemGroup.save();

      for (const systemId of this.systems) {
        await new GroupSystems({
          systemId: systemId,
          groupId: this.systemGroup.id
        }).save();
      }

      for (const subEventTournamentId of this.subEventTournaments) {
        await new GroupSubEventTournament({
          subEventId: subEventTournamentId,
          groupId: this.systemGroup.id
        }).save();
      }

      for (const subEventCompetitionId of this.subEventCompetitions) {
        await new GroupSubEventCompetition({
          subEventId: subEventCompetitionId,
          groupId: this.systemGroup.id
        }).save();
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    return this.systemGroup;
  }
}
