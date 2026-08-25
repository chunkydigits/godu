import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MaterialModule } from '../../../../core/material.module';
import {
  combineMinutesSeconds,
  parseSeconds,
  splitSeconds,
} from '../../models/duration';

@Component({
  selector: 'app-duration-input',
  imports: [MaterialModule],
  templateUrl: './duration-input.component.html',
  styleUrl: './duration-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DurationInputComponent),
      multi: true,
    },
  ],
})
export class DurationInputComponent implements ControlValueAccessor {
  @Input() label = 'Duration';
  @Input() hint: string | null = null;
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  /** When true, a blank field stores null instead of 0. */
  @Input() allowEmpty = false;

  split = false;
  disabled = false;
  secondsText = '';
  minutesText = '';
  secondsPartText = '';

  private total: number | null = null;
  private userChoseMode = false;
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get secondsLabel(): string {
    return `${this.label} (s)`;
  }

  get maxMinutes(): number | null {
    return this.max != null ? Math.floor(this.max / 60) : null;
  }

  get toggleLabel(): string {
    return this.split ? 'Enter as seconds' : 'Enter as minutes and seconds';
  }

  writeValue(value: number | string | null | undefined): void {
    this.total = parseSeconds(value);
    if (!this.userChoseMode && this.total != null && this.total > 60) {
      this.split = true;
    }
    this.syncFieldsFromTotal();
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  toggleSplit(): void {
    if (this.disabled) {
      return;
    }
    this.userChoseMode = true;
    this.split = !this.split;
    this.syncFieldsFromTotal();
    this.onTouched();
  }

  onSecondsInput(event: Event): void {
    this.secondsText = inputValue(event);
    this.emitTotal(parseSeconds(this.secondsText));
  }

  onMinutesInput(event: Event): void {
    this.minutesText = inputValue(event);
    this.emitSplit();
  }

  onSecondsPartInput(event: Event): void {
    this.secondsPartText = inputValue(event);
    this.emitSplit();
  }

  markTouched(): void {
    this.onTouched();
  }

  private emitSplit(): void {
    const minutesEmpty = this.minutesText.trim() === '';
    const secondsEmpty = this.secondsPartText.trim() === '';
    if (this.allowEmpty && minutesEmpty && secondsEmpty) {
      this.emitTotal(null);
      return;
    }
    let minutes = parseSeconds(this.minutesText) ?? 0;
    let seconds = parseSeconds(this.secondsPartText) ?? 0;
    if (seconds >= 60) {
      minutes += Math.floor(seconds / 60);
      seconds %= 60;
      this.minutesText = String(minutes);
      this.secondsPartText = String(seconds);
    }
    this.emitTotal(combineMinutesSeconds(minutes, seconds));
  }

  private emitTotal(total: number | null): void {
    if (total == null && !this.allowEmpty) {
      total = 0;
    }
    this.total = total;
    this.onChange(total);
  }

  private syncFieldsFromTotal(): void {
    if (this.total == null) {
      this.secondsText = '';
      this.minutesText = '';
      this.secondsPartText = '';
      return;
    }
    this.secondsText = String(this.total);
    const parts = splitSeconds(this.total);
    this.minutesText = String(parts.minutes);
    this.secondsPartText = String(parts.seconds);
  }
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
