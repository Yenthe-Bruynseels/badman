import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { EventCompetition } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class EventResolver {
  constructor(private apollo: Apollo) {}

  resolve(route: ActivatedRouteSnapshot) {
    const eventId = route.params['id'];

    return this.apollo
      .query<{ eventCompetition: Partial<EventCompetition> }>({
        query: gql`
          query EventCompetition($id: ID!) {
            eventCompetition(id: $id) {
              id
              name
              slug
              startYear
              openDate
              closeDate
              visualCode
              official
              lastSync
              subEventCompetitions {
                id
                name
                eventType
                level
                maxLevel
                minBaseIndex
                maxBaseIndex
                drawCompetitions {
                  id
                  name
                  size
                }
              }
            }
          }
        `,
        variables: {
          id: eventId,
        },
      })
      .pipe(
        transferState(`eventKey-${eventId}`),
        map((result) => {
          if (!result?.data.eventCompetition) {
            throw new Error('No event found!');
          }
          return new EventCompetition(result.data.eventCompetition);
        }),
        first()
      );
  }
}
