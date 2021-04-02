import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { RankingService } from 'app/admin/services';
import { LocationDialogComponent } from 'app/club/dialogs/location-dialog/location-dialog.component';
import {
  Claim,
  Club,
  ClubService,
  Player,
  Role,
  RoleService,
  SystemService,
  Team,
  TeamService,
} from 'app/_shared';
import { ClaimService } from 'app/_shared/services/security/claim.service';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { bufferTime, debounceTime, map, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './edit-club.component.html',
  styleUrls: ['./edit-club.component.scss'],
})
export class EditClubComponent implements OnInit {
  club$: Observable<Club>;
  update$ = new BehaviorSubject(0);

  constructor(
    private teamService: TeamService,
    private roleService: RoleService,
    private clubService: ClubService,
    private systemService: SystemService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.club$ = combineLatest([
      this.route.paramMap,
      this.systemService.getPrimarySystem(),
      this.update$.pipe(debounceTime(600)),
    ]).pipe(
      map(([params, systems]) => [params.get('id'), systems.id]),
      switchMap(([id, systemId]) =>
        this.clubService.getClub(id, {
          rankingSystem: systemId,
          includeTeams: false,
          includeRoles: true,
          includeLocations: true,
        })
      )
    );
  }

  async save(club: Club) {
    await this.clubService.updateClub(club).toPromise();
    this._snackBar.open('Saved', null, {
      duration: 1000,
      panelClass: 'success',
    });
  }



  async onPlayerUpdatedFromTeam(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.updatePlayer(team, player).toPromise();
      this._snackBar.open('Player updated', null, {
        duration: 1000,
        panelClass: 'success',
      });
      this.update$.next(null);
    }
  }

  async onPlayerAddedToRole(player: Player, role: Role) {
    if (player && role) {
      await this.roleService.addPlayer(role, player).toPromise();
      this._snackBar.open('Player added', null, {
        duration: 1000,
        panelClass: 'success',
      });
      this.update$.next(null);
    }
  }

  async onPlayerRemovedFromRole(player: Player, role: Role) {
    if (player && role) {
      await this.roleService.removePlayer(role, player).toPromise();
      this._snackBar.open('Player removed', null, {
        duration: 1000,
        panelClass: 'success',
      });
      this.update$.next(null);
    }
  }

  async onEditRole(role: Role, club: Club){
    // [
    //   '/',
    //   'admin',
    //   'club',
    //   club.id,
    //   'edit',
    //   'role',
    //   role.id
    // ]
  }

  async onEditLocation(location: Location, club: Club){
    let dialogRef = this.dialog.open(LocationDialogComponent, {
      data: { location, club },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.update$.next(0);
    });
  }
}
