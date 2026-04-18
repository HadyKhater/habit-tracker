import { Component } from '@angular/core';
import { HabitTrackerComponent } from './habit-tracker/habit-tracker';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HabitTrackerComponent],
  template: '<app-habit-tracker />'
})
export class App {}
