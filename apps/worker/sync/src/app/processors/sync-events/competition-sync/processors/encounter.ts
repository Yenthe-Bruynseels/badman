import {
  EncounterCompetition,
  EventCompetition,
  Game,
} from '@badman/backend-database';
import { VisualService } from '@badman/backend-visual';
import moment from 'moment-timezone';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { XmlTeamMatch, XmlTournament } from '../../../../utils';
import { DrawStepData } from './draw';
import { EntryStepData } from './entry';
import { Logger } from '@nestjs/common';

export interface EncounterStepData {
  encounter: EncounterCompetition;
  internalId: number;
}

export interface EncounterStepOptions {
  newGames?: boolean;
}

export class CompetitionSyncEncounterProcessor extends StepProcessor {
  public event: EventCompetition;
  public draws: DrawStepData[];
  public entries: EntryStepData[];
  private _dbEncounters: EncounterStepData[] = [];
  private encounterOptions: EncounterStepOptions;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions & EncounterStepOptions
  ) {
    options.logger = options.logger || new Logger(CompetitionSyncEncounterProcessor.name);
    super(options);

    this.encounterOptions = options || {};
  }

  public async process(): Promise<EncounterStepData[]> {
    await Promise.all(this.draws.map((e) => this._processEncounters(e)));
    return this._dbEncounters;
  }

  private async _processEncounters({ draw, internalId }: DrawStepData) {
    const encounters = await draw.getEncounterCompetitions({
      transaction: this.transaction,
    });
    const canChange = moment().isBefore(`${this.event.season + 1}-01-01`);

    const visualMatches = (await this.visualService.getMatches(
      this.visualTournament.Code,
      internalId,
      !canChange
    )) as XmlTeamMatch[];

    for (const xmlTeamMatch of visualMatches) {
      if (!xmlTeamMatch) {
        continue;
      }

      const matchDate = moment
        .tz(xmlTeamMatch.MatchTime, 'Europe/Brussels')
        .toDate();
      const dbEncounters = encounters.filter(
        (r) => r.visualCode === `${xmlTeamMatch.Code}`
      );
      let dbEncounter: EncounterCompetition = null;

      if (dbEncounters.length === 1) {
        dbEncounter = dbEncounters[0];
      } else if (dbEncounters.length > 1) {
        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbEncounters;
        dbEncounter = first;

        this.logger.warn('Having multiple? Removing old');
        await this._destroyEncounters(rest);
      }

      const team1 = this.entries.find(
        (e) => e.teamName == xmlTeamMatch?.Team1?.Name
      )?.entry?.team;
      const team2 = this.entries.find(
        (e) => e.teamName == xmlTeamMatch?.Team2?.Name
      )?.entry?.team;

      if (!team1) {
        this.logger.warn(`Team ${xmlTeamMatch?.Team1?.Name} not found`);
      }

      if (!team2) {
        this.logger.warn(`Team ${xmlTeamMatch?.Team2?.Name} not found`);
      }

      if (!dbEncounter) {
        // FInd one with same teams
        dbEncounter = encounters.find(
          (e) =>
            e.homeTeamId === team1?.id &&
            e.awayTeamId === team2?.id &&
            e.drawId === draw.id
        );

        if (!dbEncounter) {
          dbEncounter = await new EncounterCompetition({
            drawId: draw.id,
            visualCode: xmlTeamMatch.Code,
            date: matchDate,
            homeTeamId: team1?.id,
            awayTeamId: team2?.id,
          }).save({ transaction: this.transaction });
        } else {
          dbEncounter.visualCode = xmlTeamMatch.Code;
          await dbEncounter.save({ transaction: this.transaction });
        }
      }

      // Update date if needed
      if (dbEncounter.date !== matchDate) {
        dbEncounter.date = matchDate;
        await dbEncounter.save({ transaction: this.transaction });
      }

      // Check if encounter was before last run, skip if only process new events
      if (this.encounterOptions.newGames && dbEncounter.date < this.lastRun) {
        continue;
      }

      dbEncounter.homeTeamId = team1?.id;
      dbEncounter.awayTeamId = team2?.id;
      await dbEncounter.save({ transaction: this.transaction });

      this._dbEncounters.push({
        encounter: dbEncounter,
        internalId: parseInt(xmlTeamMatch.Code, 10),
      });
    }

    // Remove draw that are not in the xml
    const removedEncounters = encounters.filter((e) => e.visualCode == null);

    await this._destroyEncounters(removedEncounters);
  }

  private async _destroyEncounters(encounter: EncounterCompetition[]) {
    await Game.destroy({
      where: {
        linkType: 'competition',
        linkId: {
          [Op.in]: encounter.map((e) => e.id),
        },
      },
      transaction: this.transaction,
    });

    await EncounterCompetition.destroy({
      where: {
        id: {
          [Op.in]: encounter.map((e) => e.id),
        },
      },
      transaction: this.transaction,
    });
  }
}
