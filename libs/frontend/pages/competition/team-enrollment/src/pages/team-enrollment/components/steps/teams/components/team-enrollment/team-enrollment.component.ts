import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PlayerSearchComponent } from '@badman/frontend-components';
import {
  EntryCompetitionPlayer,
  SubEventCompetition,
  Team,
} from '@badman/frontend-models';
import { SubEventType, SubEventTypeEnum } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { TeamValidationResult } from '../../../../../models';
import { EnrollmentMessageComponent } from '../enrollment-message';
import { TeamComponent } from '../team';

@Component({
  selector: 'badman-team-enrollment',
  standalone: true,
  imports: [
    CommonModule,

    // Material
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    FormsModule,

    // Own
    TeamComponent,
    EnrollmentMessageComponent,
    TranslateModule,
  ],
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  @Input()
  group!: FormGroup;

  @Input()
  season!: number;

  @Input()
  subEvents!: {
    [key in SubEventType]: SubEventCompetition[];
  };

  @Input()
  type!: SubEventTypeEnum;

  @Input()
  validation?: TeamValidationResult;

  @Output()
  removeTeam = new EventEmitter<Team>();

  @Output()
  changeTeamNumber = new EventEmitter<Team>();

  team!: FormControl<Team>;
  subEvent!: FormControl<string>;
  players!: FormArray<FormControl<EntryCompetitionPlayer>>;

  ngOnInit(): void {
    this.team = this.group.get('team') as FormControl<Team>;

    const entry = this.group.get('entry');

    this.subEvent = entry?.get('subEventId') as FormControl<string>;
    this.players = entry?.get('players') as FormArray<
      FormControl<EntryCompetitionPlayer>
    >;
  }
}
