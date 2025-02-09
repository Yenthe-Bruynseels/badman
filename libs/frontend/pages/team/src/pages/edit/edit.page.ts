import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Player, Team, TeamPlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { SubEventType, TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { TeamFieldComponent, TeamPlayersComponent } from '../../components';

@Component({
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,

    // My Modules
    TeamFieldComponent,
    TeamPlayersComponent,
  ],
})
export class EditPageComponent implements OnInit {
  team!: Team;
  group?: FormGroup;

  teamNumbers?: {
    [key in SubEventType]: number[];
  };

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private snackBar: MatSnackBar,
    private apollo: Apollo,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.team = this.route.snapshot.data['team'];
    const teamName = `${this.team.name}`;

    this.seoService.update({
      title: teamName,
      description: `Team ${teamName}`,
      type: 'website',
      keywords: ['team', 'badminton'],
    });
    this.breadcrumbsService.set(
      'club/:id',
      this.route.snapshot.data['club'].name
    );
    this.breadcrumbsService.set('club/:id/team/:id', teamName);

    if (!this.group) {
      this.group = this.fb.group({
        teamNumber: this.fb.control(this.team.teamNumber),
        type: this.fb.control(this.team.type),
        captainId: this.fb.control(this.team.captainId),
        phone: this.fb.control(this.team.phone),
        email: this.fb.control(this.team.email),
        season: this.fb.control(this.team.season),
      });
    }

    if (!this.group.get('players')) {
      this.group.addControl('players', this.fb.array(this.team.players ?? []));
    }
  }

  teamUpdated() {
    const data = this.group?.value;

    return this.apollo
      .mutate<{ createTeam: Partial<Team> }>({
        mutation: gql`
          mutation UpdateTeam($team: TeamUpdateInput!) {
            updateTeam(data: $team) {
              id
            }
          }
        `,
        variables: {
          team: {
            id: data.id,
            teamNumber: data.teamNumber,
            type: data.type,
            captainId: data.captainId,
            phone: data.phone,
            email: data.email,
          },
        },
        refetchQueries: () => ['Team', 'Teams'],
      })
      .subscribe(() => {
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  async playerAdded(player: Player) {
    if (player) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation addPlayerFromTeamMutation($playerId: ID!, $teamId: ID!) {
              addPlayerFromTeam(playerId: $playerId, teamId: $teamId) {
                id
              }
            }
          `,
          variables: {
            playerId: player.id,
            teamId: this.team.id,
          },
          refetchQueries: ['TeamPlayers'],
        })
      );
    }
  }

  async playerRemoved(player: Player) {
    if (player) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromTeamMutation(
              $playerId: ID!
              $teamId: ID!
            ) {
              removePlayerFromTeam(playerId: $playerId, teamId: $teamId) {
                id
              }
            }
          `,
          variables: {
            playerId: player.id,
            teamId: this.team.id,
          },
          refetchQueries: ['TeamPlayers'],
        })
      );
    }
  }

  playerMembershipTypeChanged(args: {
    player: TeamPlayer;
    type: TeamMembershipType;
  }) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateTeamPlayerMembership(
            $teamId: ID!
            $playerId: ID!
            $membershipType: String!
          ) {
            updateTeamPlayerMembership(
              teamId: $teamId
              playerId: $playerId
              membershipType: $membershipType
            ) {
              id
              membershipType
              teamId
            }
          }
        `,
        variables: {
          teamId: this.team.id,
          playerId: args.player.id,
          membershipType: args.type,
        },
        refetchQueries: ['TeamPlayers'],
      })
      .subscribe(() => {
        this.snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
