import { Component, Input, OnChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  startWith,
  Subject,
} from 'rxjs';
import { filter, map, scan, shareReplay, switchMap, tap } from 'rxjs/operators';
import { Game, Player } from '@badman/frontend/models';
import { SystemService } from '@badman/frontend/shared';
import { Apollo } from 'apollo-angular';
import { UserGameQuery } from './UserGamesQuery';

@Component({
  selector: 'badman-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
})
export class GamesComponent implements OnChanges {
  games$!: Observable<Game[][]>;
  currentPage$ = new BehaviorSubject<number>(0);
  pageSize = 15;
  request$?: Observable<Game[]>;

  gameFilter = new FormGroup({
    gameType: new FormControl(undefined),
    eventType: new FormControl(undefined),
  });

  @Input()
  player!: Player;

  constructor(
    private route: ActivatedRoute,
    private systemService: SystemService,
    private apollo: Apollo
  ) {}

  ngOnChanges(): void {
    const reset$ = new Subject();

    const id$ = this.route.paramMap.pipe(
      tap(() => reset$.next(undefined)),
      map((x) => x.get('id')),
      shareReplay(1)
    );

    const system$ = this.systemService
      .getPrimarySystem()
      .pipe(filter((x) => !!x));
    this.games$ = this.gameFilter.valueChanges.pipe(
      startWith(undefined),
      tap(() => this.currentPage$.next(0)),
      switchMap((gameFilter) =>
        combineLatest([id$, system$, this.currentPage$]).pipe(
          switchMap(([playerId, system, page]) => {
            if (!playerId) {
              throw new Error('No player id');
            }

            if (!system) {
              throw new Error('No system');
            }

            if (this.request$) {
              return this.request$;
            } else {
              this.request$ = this.apollo
                .query<{ player: Partial<Player> }>({
                  query: UserGameQuery,
                  variables: {
                    playerId,
                    system: system.id,
                    offset: page * this.pageSize,
                    limit: this.pageSize,
                    where: {
                      gameType: gameFilter?.gameType ?? undefined,
                      linkType: gameFilter?.eventType ?? undefined,
                    },
                  },
                  fetchPolicy: 'no-cache',
                })
                .pipe(
                  map((x) =>
                    x.data?.player?.games?.map((g) => new Game(g, system))
                  ),
                  filter((x) => x !== null)
                ) as Observable<Game[]>;

              return this.request$;
            }
          }),
          scan((acc: Game[][], newGames: Game[]) => {
            if ((newGames?.length ?? 0) > 0) {
              // Find and match same event
              return newGames.reduce((all, curr) => {
                let prevWasSameEvent = false;
                if (all.length > 0) {
                  const prevGame = all[all.length - 1][0];
                  prevWasSameEvent = this._sameEvent(curr, prevGame);
                }
                if (prevWasSameEvent) {
                  // Don't use a .push()
                  // That doesn't trigger the change detection
                  all[all.length - 1] = [...all[all.length - 1], curr];
                } else {
                  all.push([curr]);
                }

                return all;
              }, acc);
            }
            return acc;
          }, [])
        )
      )
    );
  }

  private _sameEvent(game1: Game, game2: Game) {
    if (game1.tournament && game2.tournament) {
      return (
        game2.tournament.subEventTournament?.eventTournament?.id ===
        game1.tournament.subEventTournament?.eventTournament?.id
      );
    } else if (game1.competition && game2.competition) {
      return game2.competition.id === game1.competition.id;
    }

    return false;
  }

  public onScroll(): void {
    if (!this.request$) {
      this.currentPage$.next(this.currentPage$.value + 1);
    }
  }
  private onFinalize(): void {
    this.request$ = undefined;
  }
}