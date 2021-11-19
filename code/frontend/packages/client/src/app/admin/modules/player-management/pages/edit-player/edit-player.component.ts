import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Claim, Player, PlayerService, SystemService } from 'app/_shared';
import { ClaimService } from 'app/_shared/services/security/claim.service';
import { combineLatest, Observable, lastValueFrom } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { RankingPlace } from './../../../../../_shared/models/ranking-place.model';
@Component({
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.scss'],
})
export class EditPlayerComponent implements OnInit {
  player$!: Observable<Player>;

  constructor(
    private playerService: PlayerService,
    private systemService: SystemService,
    private claimService: ClaimService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(map((x) => x.get('id')));

    const system$ = this.systemService.getPrimarySystem().pipe(filter((x) => !!x));

    this.player$ = combineLatest([id$, system$]).pipe(
      switchMap(([playerId, system]) => this.playerService.getPlayer(playerId!, system!.id!))
    );
  }

  async claimChanged(args: { claim: Claim; checked: boolean }, player: Player) {
    await lastValueFrom(this.claimService.updateGlobalUserClaim(player.id!, args.claim.id!, args.checked));
  }

  async onRankingPlaceChanged(rankingPlace: Partial<RankingPlace>) {
    await lastValueFrom(this.playerService.updatePlayerRanking(rankingPlace));
  }
  async onPlayerUpdated(player: Partial<Player>) {
    await lastValueFrom(this.playerService.updatePlayer(player));
  }
}
