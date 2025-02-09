import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { DrawTournament } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class DrawResolver {
  constructor(
    private apollo: Apollo,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const drawId = route.params['id'];

    return this.apollo
      .query<{ drawTournament: Partial<DrawTournament> }>({
        query: gql`
          query GetDraw($id: ID!) {
            drawTournament(id: $id) {
              id # needed for caching
              name
              eventEntries {
                id
                players {
                  id
                  slug
                  fullName
                }
                standing {
                  id
                  position
                  played
                  points
                  gamesWon
                  gamesLost
                  setsWon
                  setsLost
                  totalPointsWon
                  totalPointsLost
                  tied
                  won
                  lost
                  riser
                  faller
                }
              }
            }
          }
        `,
        variables: {
          id: drawId,
        },
      })
      .pipe(
        transferState('drawKey-' + drawId, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.drawTournament) {
            throw new Error('No draw found');
          }
          return new DrawTournament(result.data.drawTournament);
        }),

        first()
      );
  }
}
