import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, ChangeDetectionStrategy, Component, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { RankingService } from 'app/admin/services';
import { SimulateService } from 'app/admin/services/simulate.service';
import { RankingSystem, SystemService } from 'app/_shared';
import * as moment from 'moment';
import { BehaviorSubject, lastValueFrom, merge, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './overview-ranking-systems.component.html',
  styleUrls: ['./overview-ranking-systems.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewRankingSystemsComponent implements AfterViewInit {
  populateOptions: string[] = [];

  dataSource = new MatTableDataSource();
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  rankingSelection = new SelectionModel<RankingSystem>(true, []);
  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  displayedColumns: string[] = [
    'select',
    'running',
    'primary',
    'name',
    'procentWinning',
    'procentLosing',
    'latestXGamesToUse',
    'options',
  ];

  updateHappend = new BehaviorSubject(true);

  minDate: FormControl;
  maxDate: FormControl;

  forceStartDate = false;
  startingRankings = false;

  constructor(
    private systemsService: SystemService,
    private rankingService: RankingService,
    private simulateService: SimulateService,
    private dialog: MatDialog
  ) {
    this.minDate = new FormControl(moment([2017, 8, 1]), [Validators.required]);
    this.maxDate = new FormControl(moment([2020, 3, 1]), [Validators.required]);
  }

  ngAfterViewInit() {
    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
    merge(this.sort.sortChange, this.paginator.page, this.updateHappend)
      .pipe(
        startWith({}),
        switchMap((sort, page) => {
          this.isLoadingResults = true;
          return this.systemsService.getSystems(this.sort.active, this.sort.direction, this.paginator.pageIndex, this.paginator.pageSize);
        }),
        map((data) => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = false;
          this.resultsLength = data.length;

          return data;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          // Catch if the GitHub API has reached its rate limit. Return empty data.
          this.isRateLimitReached = true;
          return of([]);
        }),
        distinctUntilChanged(),
        tap((_) => this.rankingSelection.clear())
      )
      .subscribe((data) => (this.dataSource.data = data));
  }

  watchSystem(system: RankingSystem) {
    this.systemsService.watchSystem(system);
  }

  async calculate() {
    await lastValueFrom(
      this.simulateService
        .calculateRanking(
          this.rankingSelection.selected.map((x) => x.id!),
          this.maxDate.value,
          this.forceStartDate ? this.minDate.value : null,
          this.startingRankings
        )
        .pipe(tap((_) => this.updateHappend.next(true)))
    );
  }

  async download(type?: string) {
    await this.rankingService.downloadRankingAsync(
      this.rankingSelection.selected.map((x) => x.id!),
      type
    );
  }
  async reset(templateRef: TemplateRef<any>) {
    const dialogRef = this.dialog.open(templateRef);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await lastValueFrom(
          this.simulateService
            .resetRanking(this.rankingSelection.selected.map((x) => x.id!))
            .pipe(tap((_) => this.updateHappend.next(true)))
        );
      }
    });
  }

  isAllSelected() {
    const numSelected = this.rankingSelection.selected.length;
    const numRows = this.resultsLength;
    return numSelected === numRows;
  }

  async makePrimary(systemId: RankingSystem) {
    await lastValueFrom(
      this.systemsService
        .updateSystem({
          id: systemId.id,
          primary: true,
        })
        .pipe(tap((_) => this.updateHappend.next(true)))
    );
  }
  async deleteSystem(systemId: string) {
    await lastValueFrom(this.systemsService.deleteSystem(systemId).pipe(tap((_) => this.updateHappend.next(true))));
  }
}
