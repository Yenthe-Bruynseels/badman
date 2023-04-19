import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Role } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class RoleResolver {
  constructor(private apollo: Apollo) {}

  resolve(route: ActivatedRouteSnapshot) {
    const roleId = route.params['id'];

    return this.apollo
      .query<{ role: Partial<Role> }>({
        query: gql`
          query Role($id: ID!) {
            role(id: $id) {
              id
              name
              claims {
                name
              }
            }
          }
        `,
        variables: {
          id: roleId,
        },
      })
      .pipe(
        transferState('roleKey-' + roleId),
        map((result) => {
          if (!result?.data.role) {
            throw new Error('No role');
          }
          return new Role(result.data.role);
        }),
        first()
      );
  }
}
