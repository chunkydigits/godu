import { AsyncPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@auth0/auth0-angular';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { MaterialModule } from '../../../../core/material.module';
import { problemDetail } from '../../../../core/http-problem';
import { mergeGoduCategories, normaliseCategoryName } from '../../models/godu-categories';
import { canSaveGodu, toSaveGoduRequest } from '../../models/saved-godu.model';
import { StepsItem } from '../../models/steps-item.model';
import { DemoStepsService } from '../../services/demo-steps.service';
import { SavedGodusService } from '../../services/saved-godus.service';

@Component({
  selector: 'app-save-godu-button',
  imports: [MaterialModule, AsyncPipe, FormsModule],
  templateUrl: './save-godu-button.component.html',
  styleUrl: './save-godu-button.component.scss',
})
export class SaveGoduButtonComponent {
  @Output() readonly openChange = new EventEmitter<boolean>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly auth = inject(AuthService);
  private readonly demos = inject(DemoStepsService);
  private readonly savedGodus = inject(SavedGodusService);
  private readonly extrasSubject = new BehaviorSubject<string[]>([]);
  private itemValue!: StepsItem;

  @Input() appearance: 'icon' | 'row' = 'icon';

  @Input({ required: true })
  set item(value: StepsItem) {
    this.itemValue = value;
    this.visible$ = this.visibilityFor(value);
    this.resetPanel();
  }

  get item(): StepsItem {
    return this.itemValue;
  }

  open = false;
  saving = false;
  error: string | null = null;
  selectedCategory: string | null = null;
  customCategory = '';
  visible$!: Observable<boolean>;
  readonly categories$ = combineLatest([this.savedGodus.categories$, this.extrasSubject]).pipe(
    map(([categories, extras]) => mergeGoduCategories(categories, extras)),
  );

  toggle(event: Event): void {
    event.stopPropagation();
    if (this.saving) {
      return;
    }

    this.setOpen(!this.open);
  }

  isSelected(category: string): boolean {
    return (this.selectedCategory ?? '').toLowerCase() === category.toLowerCase();
  }

  selectCategory(category: string): void {
    this.selectedCategory = this.isSelected(category) ? null : category;
    this.customCategory = '';
  }

  addCustomCategory(): void {
    const name = normaliseCategoryName(this.customCategory);
    if (!name) {
      return;
    }

    this.extrasSubject.next([...this.extrasSubject.value, name]);
    this.selectedCategory = name;
    this.customCategory = '';
  }

  confirmSave(): void {
    if (this.saving) {
      return;
    }

    const category = this.selectedCategory ?? normaliseCategoryName(this.customCategory);
    this.saving = true;
    this.error = null;
    this.savedGodus
      .save(toSaveGoduRequest(this.item, this.demos.isDemo(this.item.id), category))
      .subscribe({
        next: () => {
          this.saving = false;
          this.setOpen(false);
        },
        error: (err: unknown) => {
          this.saving = false;
          this.error = problemDetail(err, 'Could not save this Godu.');
        },
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open || this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.setOpen(false);
  }

  private visibilityFor(item: StepsItem): Observable<boolean> {
    return combineLatest([this.auth.isAuthenticated$, this.savedGodus.isSaved$(item.id)]).pipe(
      map(([authenticated, alreadySaved]) =>
        canSaveGodu({
          authenticated,
          alreadySaved,
          isDemo: this.demos.isDemo(item.id),
          visibility: item.visibility,
        }),
      ),
    );
  }

  private setOpen(open: boolean): void {
    if (this.open === open) {
      return;
    }

    this.open = open;
    if (!open) {
      this.selectedCategory = null;
      this.customCategory = '';
      this.error = null;
    }
    this.openChange.emit(open);
  }

  private resetPanel(): void {
    this.open = false;
    this.saving = false;
    this.selectedCategory = null;
    this.customCategory = '';
    this.error = null;
    this.extrasSubject.next([]);
  }
}
