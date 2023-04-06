import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { SelectEventComponent } from '@badman/frontend-components';
import { EventCompetition, Team } from '@badman/frontend-models';
import { SubEventType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, pairwise, startWith } from 'rxjs';

@Component({
  selector: 'badman-events-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    SelectEventComponent,
    ReactiveFormsModule,

    // Material
    MatCheckboxModule,
  ],
  templateUrl: './events.step.html',
  styleUrls: ['./events.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsStepComponent implements OnInit {
  provWhere = { allowEnlisting: true, type: 'PROV' };

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormControl<string[] | null>;

  @Input()
  controlName = 'events';

  provFormControl = new FormControl<EventCompetition | null>(null, [
    Validators.required,
  ]);
  provInitialId?: string;

  loadedEvents = new Map<string, string>();

  checkboxes = {
    PROV: false,
    LIGA: false,
    NATIONAL: false,
  };

  constructor(private apollo: Apollo, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormControl<string[]>;
    }

    if (!this.control) {
      this.control = new FormControl<string[]>([]);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    this.provFormControl.valueChanges
      .pipe(startWith(null), pairwise())
      .subscribe(([old, event]) => {
        if (!event?.id) {
          return;
        }
        this.loadedEvents.set('PROV', event?.id);
        this._addEvent(event?.id);
        this.control?.setValue(
          this.control?.value?.filter((value) => value != old?.id) ?? []
        );
      });

    this._loadInitialEvents();
  }

  async select(event: MatCheckboxChange, name: 'PROV' | 'LIGA' | 'NATIONAL') {
    this.checkboxes[name] = event.checked;

    if (!event.checked) {
      if (name == 'PROV') {
        this.provFormControl?.setValue(null);
      }

      this.control?.setValue(
        this.control?.value?.filter(
          (value) => value != this.loadedEvents.get(name)
        ) ?? []
      );
      return;
    }

    if (name == 'PROV') {
      return;
    }

    const result = await lastValueFrom(
      this.apollo.query<{
        eventCompetitions: {
          count: number;
          rows: Partial<EventCompetition>[];
        };
      }>({
        query: gql`
          query EventCompetitions($where: JSONObject) {
            eventCompetitions(where: $where) {
              count
              rows {
                id
              }
            }
          }
        `,
        variables: {
          where: {
            allowEnlisting: true,
            type: name,
          },
        },
      })
    );

    const resultEvent = result.data?.eventCompetitions?.rows?.[0]?.id;
    if (!resultEvent) {
      return;
    }
    this._addEvent(resultEvent);
    this.loadedEvents.set(name, resultEvent);
  }

  private _addEvent(event?: string) {
    if (event && !this.control?.value?.includes(event)) {
      this.control?.setValue([...(this.control?.value ?? []), event]);
    }
  }

  private _loadInitialEvents() {
    const teams = this.group.get('teams') as FormGroup<{
      [key in SubEventType]: FormControl<Team[]>;
    }>;

    teams?.valueChanges.pipe(startWith(teams.value)).subscribe((teams) => {
      // find if any team was selected previous year or if current year is already present select those
      const competitions: EventCompetition[] = [];

      [
        ...(teams.F ?? []),
        ...(teams.M ?? []),
        ...(teams.MX ?? []),
        ...(teams.NATIONAL ?? []),
      ].forEach((team) => {
        if (team.entry?.competitionSubEvent?.eventCompetition) {
          if (
            !competitions.find(
              (c) =>
                c.id ==
                (team.entry?.competitionSubEvent?.eventCompetition?.id ?? '')
            )
          ) {
            competitions.push(team.entry.competitionSubEvent.eventCompetition);
          }
        }
      });

      if (competitions.length > 0) {
        const prov = competitions.find((c) => c.type == 'PROV');
        if (prov) {
          this.apollo
            .query<{
              eventCompetitions: {
                count: number;
                rows: Partial<EventCompetition>[];
              };
            }>({
              query: gql`
                query EventCompetitions($where: JSONObject) {
                  eventCompetitions(where: $where) {
                    count
                    rows {
                      id
                      name
                      type
                    }
                  }
                }
              `,
              variables: {
                where: {
                  ...this.provWhere,
                },
              },
            })
            .subscribe((result) => {
              // strip years from event name (PBO competitie 2023-2024)
              const nameWithoutYears =
                prov.name?.replace(/\d{4}-\d{4}/, '') ?? '';

              const find = result.data?.eventCompetitions?.rows?.find(
                (c) => (c.name?.indexOf(nameWithoutYears) ?? -1) > -1
              );

              if (find) {
                this.provInitialId = find.id;
              }

              this.select({ checked: true } as MatCheckboxChange, 'PROV');
              this.cdr.markForCheck();
            });
        }

        if (competitions?.some((c) => c.type == 'LIGA')) {
          this.select({ checked: true } as MatCheckboxChange, 'LIGA');
        }

        if (competitions?.some((c) => c.type == 'NATIONAL')) {
          this.select({ checked: true } as MatCheckboxChange, 'NATIONAL');
        }
      }
    });
  }
}
