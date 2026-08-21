import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { DemoStepsItem } from '../../models/demo-steps-item.model';
import { DemoStepsService } from '../../services/demo-steps.service';

@Component({
  selector: 'app-home-page',
  imports: [PageTemplateComponent, MaterialModule, RouterLink, AsyncPipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly demoSteps = inject(DemoStepsService);

  readonly demos$: Observable<DemoStepsItem[]> = this.demoSteps.list();
}
