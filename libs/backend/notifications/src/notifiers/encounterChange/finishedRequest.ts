import {
  EncounterCompetition,
  NotificationOptionsTypes,
  Player,
} from '@badman/backend-database';
import { Notifier } from '../notifier.base';
import { unitOfTime } from 'moment';
import { RequestOptions } from 'web-push';

export class CompetitionEncounterChangeFinishRequestNotifier extends Notifier<{
  encounter: EncounterCompetition;
  locationHasChanged: boolean;
  isHome: boolean;
}> {
  protected linkType = 'encounterCompetition';
  protected type: keyof NotificationOptionsTypes =
    'encounterChangeFinishedNotification';
  protected allowedInterval: unitOfTime.Diff = 'minute';

  private readonly options = (encounter: EncounterCompetition) => {
    return {
      notification: {
        title: 'Verplaatsing afgewerkt',
        body: `De verplaatsings aanvraag voor ${encounter.home?.name} - ${encounter.away?.name} is afgewerkt`,
      },
    } as RequestOptions;
  };

  async notifyPush(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: {
      encounter: EncounterCompetition;
      locationHasChanged: boolean;
      isHome: boolean;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(
      player,
      this.options(data.encounter)
    );
  }

  async notifyEmail(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: {
      encounter: EncounterCompetition;
      locationHasChanged: boolean;
      isHome: boolean;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    const email = args?.email ?? player.email;

    if (!email) {
      this.logger.debug(`No email found for ${player.fullName}`);
      return;
    }

    if (!player?.slug) {
      this.logger.debug(`No slug found for ${player.fullName}`);
      return;
    }

    await this.mailing.sendRequestFinishedMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data.encounter,
      data.isHome,
      data.locationHasChanged
    );
  }
  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: {
      encounter: EncounterCompetition;
      locationHasChanged: boolean;
      isHome: boolean;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
