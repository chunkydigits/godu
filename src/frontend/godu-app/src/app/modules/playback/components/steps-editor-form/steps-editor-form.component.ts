import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../core/material.module';

@Component({
  selector: 'app-steps-editor-form',
  imports: [MaterialModule, ReactiveFormsModule],
  templateUrl: './steps-editor-form.component.html',
  styleUrl: './steps-editor-form.component.scss',
})
export class StepsEditorFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() continuousSoundtrackEnabled = false;

  @Output() readonly addStep = new EventEmitter<void>();
  @Output() readonly removeStep = new EventEmitter<number>();

  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }
}
