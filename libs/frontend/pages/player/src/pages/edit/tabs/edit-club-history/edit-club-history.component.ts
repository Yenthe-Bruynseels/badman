import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { Club, Player } from '@badman/frontend-models';
import { BehaviorSubject, map, Observable, switchMap } from 'rxjs';
import { EditClubHistoryDialogComponent } from '../../dialogs';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'badman-edit-club-history',
  templateUrl: './edit-club-history.component.html',
  styleUrls: ['./edit-club-history.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    TranslateModule,
    MomentModule,
    MatDialogModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditClubHistoryComponent implements OnInit {
  update$ = new BehaviorSubject(null);

  @Input()
  player!: Player;

  clubs$!: Observable<Club[]>;

  fetchPlayer = gql`
    query ClubHistory($playerId: ID!) {
      player(id: $playerId) {
        id
        clubs {
          id
          fullName
          clubMembership {
            id
            start
            end
            active
            playerId
            clubId
          }
        }
      }
    }
  `;

  constructor(
    private appollo: Apollo,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.clubs$ = this.update$.pipe(
      switchMap(() =>
        this.appollo.query<{ player: { clubs: Partial<Club>[] } }>({
          fetchPolicy: 'no-cache',
          query: this.fetchPlayer,
          variables: {
            playerId: this.player.id,
          },
        })
      ),
      map((r) => r?.data?.player?.clubs.map((c) => new Club(c))),
      map((r) =>
        r.sort(
          (a, b) =>
            (b?.clubMembership?.start?.getTime() ?? 0) -
            (a?.clubMembership?.start?.getTime() ?? 0)
        )
      )
    );
  }

  editClubMembership(club?: Club) {
    this.dialog
      .open(EditClubHistoryDialogComponent, {
        data: { club },
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((r) => {
        switch (r?.action) {
          case 'update':
            this.appollo
              .mutate<{ updateClubPlayerMembership: boolean }>({
                mutation: gql`
                  mutation UpdateClubPlayerMembership(
                    $data: ClubPlayerMembershipUpdateInput!
                  ) {
                    updateClubPlayerMembership(data: $data)
                  }
                `,
                variables: {
                  data: r.data,
                },
              })
              .subscribe(() => {
                this.update$.next(null);
                this._snackBar.open('Saved', undefined, {
                  duration: 1000,
                  panelClass: 'success',
                });
              });
            break;
          case 'delete':
            this.appollo
              .mutate<{ deleteClubMembership: boolean }>({
                mutation: gql`
                  mutation RemovePlayerFromClub($id: ID!) {
                    removePlayerFromClub(id: $id)
                  }
                `,
                variables: {
                  id: r.data.id,
                },
              })
              .subscribe(() => {
                this.update$.next(null);
                this._snackBar.open('removed', undefined, {
                  duration: 1000,
                  panelClass: 'success',
                });
              });
            break;
          case 'create':
            this.appollo
              .mutate<{ addPlayerToClub: boolean }>({
                mutation: gql`
                  mutation AddPlayerToClub(
                    $data: ClubPlayerMembershipNewInput!
                  ) {
                    addPlayerToClub(data: $data)
                  }
                `,
                variables: {
                  data: { ...r.data, playerId: this.player.id },
                },
              })
              .subscribe(() => {
                this.update$.next(null);
                this._snackBar.open('Created', undefined, {
                  duration: 1000,
                  panelClass: 'success',
                });
              });
            break;
        }
      });
  }
}