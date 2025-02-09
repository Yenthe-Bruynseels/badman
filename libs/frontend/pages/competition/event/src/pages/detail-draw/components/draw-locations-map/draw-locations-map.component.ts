import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  DrawCompetition,
  DrawTournament,
  Location,
} from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { NgMapsGoogleModule } from '@ng-maps/google';

@Component({
  selector: 'badman-draw-locations-map',
  templateUrl: './draw-locations-map.component.html',
  styleUrls: ['./draw-locations-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Commmon module
    CommonModule,
    RouterModule,
    TranslateModule,

    NgMapsGoogleModule,
    // Own Modules
  ],
})
export class DrawLocationMapComponent implements OnInit {
  locations: Location[] = [];

  @Input({
    required: true,
  }) drawTournament!: DrawTournament;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    // Fetch locations data
    const query = gql`
      query GetLocationsForEvent($id: ID!, $where: JSONObject) {
        drawCompetition(id: $id) {
          id
          eventEntries {
            teamId
            team {
              locations {
                id
                name
                address
                postalcode
                street
                streetNumber
                city
                state
                phone
                fax
                availibilities(where: $where) {
                  id
                  season
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      id: this.drawTournament.id,
      where: {
        season: 2023,
      }, // You can add filters to the "where" object if needed
    };

    this.apollo
      .query<{
        drawCompetition: DrawCompetition;
      }>({ query, variables })
      .subscribe((response) => {
        this.locations = response.data.drawCompetition.eventEntries
          .map((entry) => entry.team?.locations)
          ?.flat() as Location[];
      });
  }
}
