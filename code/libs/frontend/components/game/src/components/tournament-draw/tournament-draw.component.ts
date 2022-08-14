import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TournamentDraw } from '@badman/frontend/models';

@Component({
  selector: 'badman-tournament-draw',
  templateUrl: './tournament-draw.component.html',
  styleUrls: ['./tournament-draw.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDrawComponent {
  @Input() draw!: TournamentDraw;
}