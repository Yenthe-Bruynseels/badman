import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import {
  ActivatedRoute,
  ParamMap,
  Params,
  Router,
  RouterModule,
} from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Game, Player, RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { Observable, Subject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ListGamesComponent, PeriodSelectionComponent } from './components';
import { RankingEvolutionComponent } from './components/ranking-evolution';

@Component({
  templateUrl: './ranking-breakdown.page.html',
  styleUrls: ['./ranking-breakdown.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,

    // Material
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatProgressBarModule,

    // Own Components
    ListGamesComponent,
    PeriodSelectionComponent,
    RankingEvolutionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingBreakdownPageComponent implements OnInit, OnDestroy {
  loadingGames = false;
  player!: Player;

  updateUsersTrigger = new Subject<void>();

  destroy$ = new Subject<void>();

  data$!: Observable<{
    games: Game[];
    type: string;
  }>;

  games$!: Observable<Game[]>;
  system$!: Observable<RankingSystem | null>;

  period = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
    game: new FormControl(),
    next: new FormControl(),
  });

  gameFilter = new FormGroup({
    gameType: new FormControl(),
    period: this.period,
    includedIgnored: new FormControl(false),
    includedUpgrade: new FormControl(true),
    includedDowngrade: new FormControl(true),
    includeOutOfScope: new FormControl(false),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private systemService: RankingSystemService,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.player = data['player'];
      this.seoService.update({
        title: `Ranking breakdown ${this.player.fullName}`,
        description: `Ranking breakdown ${this.player.fullName}`,
        type: 'website',
        keywords: ['ranking', 'breakdown', 'player', 'badminton'],
      });
      this.breadcrumbsService.set('player/:id', this.player.fullName);

      const routeParam$ = this.route.paramMap.pipe(
        distinctUntilChanged(),
        shareReplay(1)
      );
      const queryParam$ = this.route.queryParams.pipe(
        distinctUntilChanged(),
        shareReplay(1)
      );

      // Load query filters and update the form
      this._loadFilters(routeParam$, queryParam$)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // load system
          this.system$ = this._loadSystem().pipe(
            tap((system) => {
              if (system == null) {
                return;
              }
              const end = null;

              // Default we take next update interval, if no end is given
              const endPeriod =
                (end ?? null) == null
                  ? moment(system.caluclationIntervalLastUpdate)
                  : moment(end);
              const startPeriod = endPeriod
                .clone()
                .subtract(system.periodAmount, system.periodUnit);
              const gamePeriod = startPeriod
                .clone()
                .subtract(
                  system.updateIntervalAmount,
                  system.updateIntervalUnit
                );

              const nextPeriod = startPeriod
                .clone()
                .add(
                  system.caluclationIntervalAmount,
                  system.calculationIntervalUnit
                );

              this.period.setValue({
                start: startPeriod,
                end: endPeriod,
                game: gamePeriod,
                next: nextPeriod,
              });
            })
          );

          this.games$ = this._loadGames();
        });

      // if the filters change, we need to update the query params
      this.gameFilter.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((filters) => {
          const queryParams: Params = {};

          queryParams['includedIgnored'] = filters['includedIgnored']
            ? true
            : undefined;
          queryParams['includedUpgrade'] = filters['includedUpgrade']
            ? undefined
            : false;
          queryParams['includedDowngrade'] = filters['includedDowngrade']
            ? undefined
            : false;
          queryParams['includeOutOfScope'] = filters['includeOutOfScope']
            ? true
            : undefined;

          const commands =
            filters['gameType'] !== this.route.snapshot.paramMap.get('type')
              ? ['..', `${filters['gameType']}`]
              : [];

          // only navigate if the filters are different
          if (
            JSON.stringify(this.route.snapshot.queryParams) ===
            JSON.stringify(queryParams)
          ) {
            return;
          }

          // update the query params
          this.router.navigate(commands, {
            relativeTo: this.route,
            queryParams,
          });
        });
    });
  }

  private _loadFilters(
    routeParam$: Observable<ParamMap>,
    queryParam$: Observable<Params>
  ) {
    // Get params on startup
    return combineLatest([routeParam$, queryParam$]).pipe(
      takeUntil(this.destroy$),
      tap(([params, queries]) => {
        const filters: { [key: string]: unknown } = {};

        if (params.get('type')) {
          filters['gameType'] = params.get('type');
        } else {
          throw new Error('No type given');
        }

        if (queries['includedIgnored']) {
          filters['includedIgnored'] = queries['includedIgnored'] == 'true';
        }
        if (queries['includedUpgrade']) {
          filters['includedUpgrade'] = queries['includedUpgrade'] == 'true';
        }
        if (queries['includedDowngrade']) {
          filters['includedDowngrade'] = queries['includedDowngrade'] == 'true';
        }
        if (queries['includeOutOfScope']) {
          filters['includeOutOfScope'] = queries['includeOutOfScope'] == 'true';
        }

        this.gameFilter.patchValue(filters);
      }),
      shareReplay(1),
      distinctUntilChanged((a, b) => {
        return JSON.stringify(a) === JSON.stringify(b);
      })
    );
  }

  private _loadSystem() {
    return this.systemService.getPrimarySystemsWhere().pipe(
      switchMap((query) =>
        this.apollo
          .query<{ rankingSystems: RankingSystem[] }>({
            query: gql`
              query getPrimary($where: JSONObject) {
                rankingSystems(where: $where) {
                  id
                  differenceForUpgrade
                  differenceForDowngrade
                  updateIntervalAmountLastUpdate
                  caluclationIntervalLastUpdate
                  calculationIntervalUnit
                  caluclationIntervalAmount
                  minNumberOfGamesUsedForUpgrade
                  updateIntervalAmount
                  updateIntervalUnit
                  periodAmount
                  periodUnit
                  pointsToGoUp
                  pointsWhenWinningAgainst
                  pointsToGoDown
                  amountOfLevels
                  latestXGamesToUse
                }
              }
            `,
            variables: {
              where: query,
            },
          })
          .pipe(
            transferState('primarySystem', this.stateTransfer, this.platformId),
            map((x) =>
              x?.data.rankingSystems[0]
                ? new RankingSystem(x.data.rankingSystems[0])
                : null
            )
          )
      )
    );
  }

  private _loadGames() {
    return combineLatest([
      this.system$,
      this.gameFilter.valueChanges,
      this.period.valueChanges,
    ]).pipe(
      tap(() => (this.loadingGames = true)),
      takeUntil(this.destroy$),
      switchMap(([system, gameFilter, period]) => {
        const type = gameFilter.gameType;
        const end = period.end;
        const start = period.game;

        return this.apollo
          .query<{ player: Player }>({
            fetchPolicy: 'no-cache',
            query: gql`
              query PlayerGames(
                $where: JSONObject
                $playerId: ID!
                $rankingType: ID!
              ) {
                player(id: $playerId) {
                  id
                  games(where: $where) {
                    id
                    playedAt
                    winner
                    status
                    players {
                      id
                      team
                      player
                      fullName
                      single
                      double
                      mix
                    }
                    rankingPoints(where: { systemId: $rankingType }) {
                      id
                      differenceInLevel
                      playerId
                      points
                    }
                  }
                }
              }
            `,
            variables: {
              where: {
                gameType:
                  type == 'single' ? 'S' : type == 'double' ? 'D' : 'MX',
                playedAt: {
                  $between: [start, end],
                },
              },
              playerId: this.player.id,
              rankingType: system?.id,
            },
          })
          .pipe(
            map((x) => x.data.player.games?.map((g) => new Game(g)) ?? []),
            map((games) =>
              games.filter((game) => (game.rankingPoints?.length ?? 0) > 0)
            )
          );
      }),
      tap(() => (this.loadingGames = false))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
