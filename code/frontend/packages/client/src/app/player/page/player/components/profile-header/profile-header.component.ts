import { RankingPlace } from '../../../../../_shared/models/ranking-place.model';
import { Player } from './../../../../../_shared/models/player.model';
import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import * as moment from 'moment';
import { Club } from 'app/_shared';

@Component({
  selector: 'app-profile-header',
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent implements OnInit {
  @Input()
  player: Player;

  @Input()
  mobile: boolean;

  playerAge: number;

  @Input()
  canClaimAccount: {
    canClaim: boolean;
    isClaimedByUser: boolean;
    isUser: boolean;
  };

  @Output()
  claimAccount = new EventEmitter<string>();

  shownRanking: RankingPlace;
  initials: string;

  singleTooltip: string;
  doubleTooltip: string;
  mixTooltip: string;

  playerClub: Club;

  constructor() {}

  ngOnInit(): void {
    this.shownRanking = this.player.lastRanking;

    const lastNames = this.player.lastName.split(' ');
    this.initials = `${this.player.firstName[0]}${lastNames[lastNames.length - 1][0]}`.toUpperCase();

    if (this.shownRanking) {
      const date = moment(this.shownRanking.rankingDate);
      
      if (this.shownRanking.doubleRank != -1) {
        this.doubleTooltip = `Week: ${date.week()}-${date.weekYear()}\r\nWithin level: ${
          this.shownRanking.doubleRank
        } of ${this.shownRanking.totalWithinDoubleLevel}\r\nTotal: ${this.shownRanking.totalDoubleRanking}\r\nUp: ${
          this.shownRanking.doublePoints
        }, down: ${this.shownRanking.doublePointsDowngrade}`;
      }
      if (this.shownRanking.mixRank != -1) {
        this.mixTooltip = `Week: ${date.week()}-${date.weekYear()}\r\nWithin level: ${this.shownRanking.mixRank} of ${
          this.shownRanking.totalWithinMixLevel
        }\r\nTotal: ${this.shownRanking.totalMixRanking}\r\nUp: ${this.shownRanking.mixPoints}, down: ${
          this.shownRanking.mixPointsDowngrade
        }`;
      }
      if (this.shownRanking.singleRank != -1) {
        this.singleTooltip = `Week: ${date.week()}-${date.weekYear()}\r\nWithin level: ${
          this.shownRanking.singleRank
        } of ${this.shownRanking.totalWithinSingleLevel}\r\nTotal: ${this.shownRanking.totalSingleRanking}\r\nUp: ${
          this.shownRanking.singlePoints
        }, down: ${this.shownRanking.singlePointsDowngrade}`;
      }
    }

    if (this.player.clubs) {
      this.playerClub = this.player.clubs[0];
    }
  }
}
