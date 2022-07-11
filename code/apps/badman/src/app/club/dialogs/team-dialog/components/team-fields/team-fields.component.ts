import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime, pairwise, startWith } from 'rxjs/operators';
import { Club, Player, Team } from '../../../../../_shared';

@Component({
  selector: 'badman-team-fields',
  templateUrl: './team-fields.component.html',
  styleUrls: ['./team-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFieldsComponent implements OnInit, OnChanges {
  @Output() onTeamUpdated = new EventEmitter<Partial<Team>>();
  @Output() onCaptainUpdated = new EventEmitter<Partial<Player>>();
  @Output() onLocationAdded = new EventEmitter<string>();
  @Output() onLocationRemoved = new EventEmitter<string>();

  @Input()
  team: Team = {} as Team;

  @Input()
  club!: Club;

  @Input()
  allowEditType!: boolean;

  @Input()
  form!: FormGroup;

  teamForm!: FormGroup;

  locationControl!: FormControl;
  teamNumbers!: number[];

  ngOnChanges(changes: SimpleChanges) {
    const teamChanges = changes['team'];
    if (teamChanges.previousValue?.id != teamChanges.currentValue?.id) {
      if (this.team.id) {
        this.teamForm?.get('teamNumber')?.enable();
      } else {
        this.teamForm?.get('teamNumber')?.disable();
      }
    }
  }

  ngOnInit() {
    this.allowEditType = this.allowEditType ?? true;

    const numberControl = new FormControl(this.team.teamNumber);
    const typeControl = new FormControl(this.team.type);
    const preferredTimeControl = new FormControl(this.team.preferredTime);
    const preferredDayControl = new FormControl(this.team.preferredDay);

    const captainIdControl = new FormControl(this.team.captain?.id);
    const phoneControl = new FormControl(this.team.phone);
    const emailControl = new FormControl(this.team.email);

    this.locationControl = new FormControl(
      this.team.locations?.map((r) => r.id) ?? []
    );

    this.teamForm = new FormGroup({
      teamNumber: numberControl,
      type: typeControl,
      preferredTime: preferredTimeControl,
      preferredDay: preferredDayControl,
      captainId: captainIdControl,
      phone: phoneControl,
      email: emailControl,
    });

    if (this.team.id) {
      numberControl.enable();
    } else {
      numberControl.disable();
    }

    if (this.allowEditType) {
      typeControl.enable();
    } else {
      typeControl.disable();
    }

    this.form.addControl('team', this.teamForm);

    if (this.team.id) {
      this.calcTeamsOfType(this.team.type);
    }

    typeControl.valueChanges.subscribe((type) => {
      this.calcTeamsOfType(type);
    });

    this.locationControl.valueChanges
      .pipe(
        debounceTime(600),
        startWith(this.team.locations?.map((r) => r.id) ?? []),
        pairwise()
      )
      .subscribe(async ([prev, next]) => {
        const removed = prev.filter((item: any) => next.indexOf(item) < 0);
        const added = next.filter((item: any) => prev.indexOf(item) < 0);

        for (const add of added) {
          this.onLocationAdded.next(add);
        }
        for (const remove of removed) {
          this.onLocationRemoved.next(remove);
        }
      });

    this.teamForm.valueChanges.pipe(debounceTime(600)).subscribe(async (e) => {
      if (this.team?.id != null) {
        this.onTeamUpdated.next({
          id: this.team?.id,
          type: e?.type,
          teamNumber: e?.teamNumber,
          abbreviation: e?.abbreviation,
          preferredTime: e?.preferredTime,
          preferredDay: e?.preferredDay,
          captainId: e?.captainId,
          email: e?.email,
          phone: e?.phone,
        });
      }
    });
  }

  private calcTeamsOfType(type?: string) {
    let teamsOfType =
      this.club.teams?.filter((r) => r.type == type).length ?? 0;
    if (this.team.id == null) {
      teamsOfType++;
      this.teamForm.patchValue({ teamNumber: teamsOfType });
    }
    this.teamNumbers = [...Array(teamsOfType).keys()].map((a) => a + 1);
  }

  async selectedCaptain(player: Player) {
    const current = this.teamForm.value;
    this.teamForm.patchValue({
      phone: current?.phone ?? player.phone,
      email: current?.email ?? player.email,
      id: player.id,
      captainId: player.id,
    });
  }
}