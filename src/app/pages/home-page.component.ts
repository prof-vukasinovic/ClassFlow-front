import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1>Bienvenue sur ClassFlow</h1>
    <button routerLink="/classrooms">
      Accéder à vos classes
    </button>
  `
})
export class HomePageComponent {}