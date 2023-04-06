import { EncounterCompetition, Player } from '@badman/backend-database';
import { Notifier } from '../notifier.base';
import * as webPush from 'web-push';

export class CompetitionEncounterNotEnteredNotifier extends Notifier<
  {
    encounter: EncounterCompetition;
  },
  {
    email: string;
    url: string;
  }
> {
  protected linkType = 'encounterCompetition';
  protected type = 'encounterNotEnteredNotification';

  private readonly options = (url: string, encounter: EncounterCompetition) => {
    return {
      notification: {
        title: 'Invullen uitslag',
        body: `Resultaat ${encounter.home.name} tegen ${encounter.away.name} nog niet ingevuld`,
        actions: [{ action: 'goto', title: 'Ga naar wedstrijd' }],
        data: {
          onActionClick: {
            default: { operation: 'openWindow', url: url },
            goto: { operation: 'openWindow', url: url },
          },
        },
      },
    } as webPush.RequestOptions;
  };

  async notifyPush(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);

    await this.pushService.sendNotification(
      player,
      this.options(args.url, data.encounter)
    );
  }

  async notifyEmail(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);

    await this.mailing.sendNotEnterdMail(
      {
        fullName: player.fullName,
        email: args.email ?? player.email,
        slug: player.slug,
      },
      data.encounter,
      args.url
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return null;
  }
}
