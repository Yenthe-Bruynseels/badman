import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { EventCompetition } from '@badman/frontend-models';
import saveAs from 'file-saver';
import { map, take } from 'rxjs';
import { CP_CONFIG } from '../cp.module';
import { ICpConfig } from '../interfaces';
@Injectable({
  providedIn: 'root',
})
export class CpService {
  constructor(
    private httpClient: HttpClient,
    @Inject(CP_CONFIG)
    private config: ICpConfig
  ) {}

  downloadCp(event: EventCompetition) {
    if (!event?.id) {
      throw new Error('Event is not defined');
    }

    return this.httpClient
      .get(`${this.config.api}`, {
        params: {
          eventId: event.id,
        },
        responseType: 'blob',
      })
      .pipe(
        take(1),
        map((result) => saveAs(result, `${event.name}.cp`))
      );
  }
}
