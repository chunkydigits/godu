import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { problemDetail } from '../../../../core/http-problem';
import { MaterialModule } from '../../../../core/material.module';
import { SavedGoduItem } from '../../models/saved-godu.model';
import { SavedGodusService } from '../../services/saved-godus.service';

interface SavedView {
  loading: boolean;
  items: SavedGoduItem[];
  categories: string[];
  filter: string | null;
  error: string | null;
}

@Component({
  selector: 'app-saved-godus-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe, DatePipe],
  templateUrl: './saved-godus-page.component.html',
  styleUrl: './saved-godus-page.component.scss',
})
export class SavedGodusPageComponent {
  private readonly savedGodus = inject(SavedGodusService);
  private readonly filterSubject = new BehaviorSubject<string | null>(null);

  filter: string | null = null;
  removingId: string | null = null;

  readonly view$: Observable<SavedView> = combineLatest([
    this.savedGodus.hydrated$,
    this.savedGodus.items$,
    this.savedGodus.categories$,
    this.filterSubject,
  ]).pipe(
    map(([hydrated, items, categories, filter]) => ({
      loading: !hydrated,
      items: this.filtered(items, filter),
      categories: categories.filter((category) =>
        items.some((item) => (item.category ?? '').toLowerCase() === category.toLowerCase()),
      ),
      filter,
      error: null,
    })),
    catchError((err: unknown) =>
      of({
        loading: false,
        items: [],
        categories: [],
        filter: this.filter,
        error: problemDetail(err, 'Could not load saved Godus.'),
      }),
    ),
  );

  setFilter(category: string | null): void {
    this.filter = this.filter === category ? null : category;
    this.filterSubject.next(this.filter);
  }

  remove(item: SavedGoduItem): void {
    if (this.removingId) {
      return;
    }

    this.removingId = item.goduId;
    this.savedGodus.remove(item.goduId).subscribe({
      next: () => {
        this.removingId = null;
      },
      error: () => {
        this.removingId = null;
      },
    });
  }

  private filtered(items: SavedGoduItem[], filter: string | null): SavedGoduItem[] {
    if (!filter) {
      return items;
    }

    return items.filter((item) => (item.category ?? '').toLowerCase() === filter.toLowerCase());
  }
}
