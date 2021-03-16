import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Imported } from 'app/_shared';
import {
  CompetitionEvent,
  CompetitionSubEvent,
  Event,
  EventType,
  TournamentEvent,
} from 'app/_shared/models';
import { environment } from 'environments/environment';
import { BehaviorSubject, concat, of } from 'rxjs';
import { map, share, tap, toArray } from 'rxjs/operators';
const getCompetitionEventQuery = require('graphql-tag/loader!../../graphql/events/queries/GetCompetition.graphql');
const getTournamentEventQuery = require('graphql-tag/loader!../../graphql/events/queries/GetTournament.graphql');

const getCompetitionEventsQuery = require('graphql-tag/loader!../../graphql/events/queries/GetCompetitions.graphql');
const getTournamentEventsQuery = require('graphql-tag/loader!../../graphql/events/queries/GetTournaments.graphql');

const importedQuery = require('graphql-tag/loader!../../graphql/importedEvents/queries/GetImported.graphql');


const addEventMutation = require('graphql-tag/loader!../../graphql/events/mutations/addEvent.graphql');
const deleteEventMutation = require('graphql-tag/loader!../../graphql/importedEvents/mutations/DeleteImportedEvent.graphql');


const updateCompetitionEvent = require('graphql-tag/loader!../../graphql/events/mutations/UpdateCompetitionEvent.graphql');


@Injectable({
  providedIn: 'root',
})
export class EventService {
  public importStatus$ = new BehaviorSubject<{
    completed: boolean;
    finished: number;
    total: number;
  }>({ completed: true, finished: 0, total: 0 });

  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  getEvents(args?: {
    first?: number;
    after?: string;
    type: EventType;
    where: { [key: string]: any };
  }) {
    return this.apollo
      .query<{
        eventCompetitions?: {
          total: number;
          edges: { cursor: string; node: Event }[];
        };
        eventTournaments?: {
          total: number;
          edges: { cursor: string; node: Event }[];
        };
      }>({
        query:
          args.type == EventType.TOERNAMENT
            ? getTournamentEventsQuery
            : getCompetitionEventsQuery,
        variables: {
          first: args.first,
          after: args.after,
          where: args.where,
        },
      })
      .pipe(
        map((x) => {
          if (x.data.eventCompetitions) {
            x.data.eventCompetitions.edges = x.data.eventCompetitions.edges.map(
              (x) => {
                x.node = new CompetitionEvent(x.node);
                return x;
              }
            );
          }
          if (x.data.eventTournaments) {
            x.data.eventTournaments.edges = x.data.eventTournaments.edges.map(
              (x) => {
                x.node = new TournamentEvent(x.node);
                return x;
              }
            );
          }

          return x.data;
        })
      );
  }

  getCompetitionEvent(id: string, args?: {}) {
    return this.apollo
      .query<{
        eventCompetition: CompetitionEvent;
      }>({
        query: getCompetitionEventQuery,
        variables: {
          id,
        },
      })
      .pipe(map((x) => new CompetitionEvent(x.data.eventCompetition)));
  }

  getTournamentEvent(id: string, args?: {}) {
    return this.apollo
      .query<{
        eventTournament: TournamentEvent;
      }>({
        query: getTournamentEventQuery,
        variables: {
          id,
        },
      })
      .pipe(map((x) => new TournamentEvent(x.data.eventTournament)));
  }


  updateCompetitionEvent(event: Partial<CompetitionEvent>) {
    return this.apollo
      .mutate<{
        updateEventCompetition: CompetitionEvent;
      }>({
        mutation: updateCompetitionEvent,
        variables: {
          event
        }
      })
      .pipe(map((x) => new CompetitionEvent(x.data.updateEventCompetition)));
  }

  getImported(order: string, first: number, after: string) {
    return this.apollo
      .query<{
        imported: {
          total: number;
          edges: { cursor: string; node: Imported }[];
        };
      }>({
        query: importedQuery,
        variables: {
          order,
          first,
          after,
        },
      })
      .pipe(
        map((x) => {
          if (x.data.imported) {
            x.data.imported.edges = x.data.imported.edges.map((x) => {
              x.node = new Imported(x.node);
              return x;
            });
          }
          return x.data;
        })
      );
  }

  startImport(imported: Imported) {
    return this.httpClient.put(
      `${environment.api}/${environment.apiVersion}/import/start/${imported.id}/${imported.event.id}`,
      null
    );
  }

  findEvent(name: string, uniCode: string, type: EventType) {
    return this.apollo
      .query<{
        eventCompetitions?: {
          total: number;
          edges?: { cursor: string; node: Event }[];
        };
        eventTournaments?: {
          total: number;
          edges?: { cursor: string; node: Event }[];
        };
      }>({
        query:
          type == EventType.TOERNAMENT
            ? getTournamentEventsQuery
            : getCompetitionEventsQuery,
        variables: {
          where: {
            $or: [
              {
                name: name,
              },
              {
                uniCode: uniCode ?? '',
              },
            ],
          },
        },
      })
      .pipe(
        map((x) => {
          if (x.data.eventCompetitions || x.data.eventCompetitions) {
            const events = [
              ...(x.data.eventCompetitions?.edges ?? []),
              ...(x.data.eventTournaments?.edges ?? []),
            ].map((e) => {
              e.node = new Event(e.node);
              return e;
            });

            return events.map((x) => x.node);
          } else {
            return null;
          }
        })
      );
  }

  addEvent(event: Event) {
    return this.apollo
      .mutate<{ addEvent: Event }>({
        mutation: addEventMutation,
        variables: {
          event: {
            ...event,
            id: -1,
          },
        },
      })
      .pipe(map((x) => new Event(x.data.addEvent)));
  }

  upload(files: FileList) {
    this.importStatus$.next({
      completed: false,
      finished: 0,
      total: files.length,
    });
    const fileArray = [];
    const requests = [];

    // copy to usable array
    for (let i = 0; i < files.length; i++) {
      fileArray.push(files[i]);
    }

    // process chunked
    while (fileArray.length > 0) {
      var chunk = fileArray.splice(0, 5);

      let formData = new FormData();
      chunk.forEach((file) => {
        formData.append('upload', file);
      });

      let params = new HttpParams();

      const options = {
        params: params,
        reportProgress: true,
      };

      const req = new HttpRequest(
        'POST',
        `${environment.api}/${environment.apiVersion}/import/file`,
        formData,
        options
      );

      requests.push(
        this.httpClient.request(req).pipe(
          share(),
          tap((r) => {
            const finished = this.importStatus$.value.finished + 1;
            this.importStatus$.next({
              total: this.importStatus$.value.total,
              finished: finished,
              completed: finished > this.importStatus$.value.total,
            });
          })
        )
      );
    }

    return concat(...requests).pipe(toArray());
  }

  deleteImportedEvent(event: { id: string }) {
    return this.apollo.mutate({
      mutation: deleteEventMutation,
      variables: {
        event,
      },
    });
  }
}
