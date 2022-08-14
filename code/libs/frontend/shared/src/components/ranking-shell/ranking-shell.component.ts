import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ConfigService } from '@badman/frontend/config';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Player } from '@badman/frontend/models';
import { DeviceService, UserService } from '../../services';

@Component({
  templateUrl: './ranking-shell.component.html',
  styleUrls: ['./ranking-shell.component.scss'],
})
export class RankingShellComponent implements OnDestroy, OnInit {
  private mobileQueryListener!: () => void;
  profile$!: Observable<Player>;
  canEnroll$!: Observable<boolean>;
  version?: string;

  constructor(
    private user: UserService,
    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef,
    private apollo: Apollo,
    private config: ConfigService
  ) {}

  ngOnInit() {
    this.version = this.config.appConfig?.version ?? '0.0.0';
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    this.profile$ = this.user.profile$.pipe(
      filter((x) => x !== null)
    ) as Observable<Player>;

    this.canEnroll$ = this.apollo
      .query<{
        tournamentEvents: { count: number };
        competitionEvents: { count: number };
      }>({
        query: gql`
          # we request only first one, because if it's more that means it's open
          query CanEnroll($where: JSONObject) {
            # tournamentEvents(first: 1, where: $where) {
            #   total
            #   edges {
            #     cursor
            #   }
            # }
            eventCompetitions(take: 1, where: $where) {
              count
            }
          }
        `,
        variables: {
          where: {
            allowEnlisting: true,
          },
        },
      })
      .pipe(
        map(
          (events) =>
            events?.data?.tournamentEvents?.count != 0 ||
            events?.data?.competitionEvents?.count != 0
        )
      );
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }
}
