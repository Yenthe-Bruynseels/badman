import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PlayerSearchComponent,
} from '@badman/frontend-components';
import { Player } from '@badman/frontend-models';
import { SubEventType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'badman-team-fields',
  templateUrl: './fields.component.html',
  styleUrls: ['./fields.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    FormsModule,

    // Material
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatOptionModule,
    HasClaimComponent,
    MatSelectModule,

    // Own modules
    HasClaimComponent,
    PlayerSearchComponent,
  ],
})
export class TeamFieldComponent implements OnInit {
  @Input()
  teamNumbers?: {
    [key in SubEventType]: number[];
  };

  options?: number[];

  @Input()
  group?: FormGroup;

  ngOnInit(): void {
    if (!this.group) {
      throw new Error('No group provided');
    }

    this.group.get('teamNumber')?.disable();
    if (this.group.value.id) {
      this.group.get('type')?.disable();
    }

    this.group
      .get('type')
      ?.valueChanges.pipe(startWith(this.group.get('type')?.value))
      .subscribe((type) => {
        if (!this.teamNumbers) {
          return;
        }

        if (type) {
          // find max number
          const max = Math.max(
            ...(this.teamNumbers?.[type as SubEventType] ?? [])
          );

          // if the teamnumber is not set, set it to max + 1
          if (!this.group?.get('teamNumber')?.value) {
            this.group?.get('teamNumber')?.setValue(max + 1);
          }

          // options should be all up to max + 1
          this.options = Array.from({ length: max + 1 }, (_, i) => i + 1);

          this.group?.get('teamNumber')?.enable();
        }
      });
  }

  async onCaptainSelect(player: Partial<Player>) {
    this.group?.patchValue({
      captainId: player.id,
      email: player.email,
      phone: player.phone,
    });
  }
}
